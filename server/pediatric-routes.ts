import { Router, Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { db } from './db';
import { familyMembers, type Immunization } from '@shared/schema';
import {
  CDC_IMMUNIZATION_SCHEDULE,
  AAP_WELLCHILD_SCHEDULE,
  SCHOOL_REQUIRED_VACCINES,
  type VaccineSchedule,
  type WellChildVisit,
} from './cdc-schedule';

const router = Router();

// ============================================
// Helper: Calculate age in months from DOB
// ============================================

function ageInMonths(dob: string): number {
  const birthDate = new Date(dob);
  const now = new Date();
  const months =
    (now.getFullYear() - birthDate.getFullYear()) * 12 +
    (now.getMonth() - birthDate.getMonth());
  // Adjust if day hasn't occurred yet this month
  if (now.getDate() < birthDate.getDate()) {
    return months - 1;
  }
  return months;
}

// ============================================
// Helper: Determine dose status
// ============================================

type DoseStatus = 'complete' | 'due' | 'overdue' | 'not_yet_due';

interface VaccineDoseStatus {
  doseNumber: number;
  status: DoseStatus;
  ageMonthsMin: number;
  ageMonthsMax: number;
}

interface VaccineStatus {
  vaccine: string;
  abbreviation: string;
  dosesRequired: number;
  dosesReceived: number;
  status: DoseStatus;
  nextDueAgeMonths: number | null;
  doses: VaccineDoseStatus[];
}

function evaluateVaccineStatus(
  schedule: VaccineSchedule,
  currentAgeMonths: number,
  receivedCvxCodes: string[]
): VaccineStatus {
  // Count how many doses of this vaccine have been received by matching CVX codes
  const matchingCodes = schedule.doses[0]?.cvxCodes || [];
  const dosesReceived = receivedCvxCodes.filter((code) =>
    matchingCodes.includes(code)
  ).length;

  const doseStatuses: VaccineDoseStatus[] = schedule.doses.map((dose) => {
    if (dose.doseNumber <= dosesReceived) {
      return {
        doseNumber: dose.doseNumber,
        status: 'complete' as DoseStatus,
        ageMonthsMin: dose.ageMonthsMin,
        ageMonthsMax: dose.ageMonthsMax,
      };
    }

    if (currentAgeMonths < dose.ageMonthsMin) {
      return {
        doseNumber: dose.doseNumber,
        status: 'not_yet_due' as DoseStatus,
        ageMonthsMin: dose.ageMonthsMin,
        ageMonthsMax: dose.ageMonthsMax,
      };
    }

    if (currentAgeMonths > dose.ageMonthsMax) {
      return {
        doseNumber: dose.doseNumber,
        status: 'overdue' as DoseStatus,
        ageMonthsMin: dose.ageMonthsMin,
        ageMonthsMax: dose.ageMonthsMax,
      };
    }

    return {
      doseNumber: dose.doseNumber,
      status: 'due' as DoseStatus,
      ageMonthsMin: dose.ageMonthsMin,
      ageMonthsMax: dose.ageMonthsMax,
    };
  });

  // Overall status: worst status among remaining doses
  const remainingDoses = doseStatuses.filter((d) => d.status !== 'complete');
  let overallStatus: DoseStatus = 'complete';
  if (remainingDoses.some((d) => d.status === 'overdue')) {
    overallStatus = 'overdue';
  } else if (remainingDoses.some((d) => d.status === 'due')) {
    overallStatus = 'due';
  } else if (remainingDoses.some((d) => d.status === 'not_yet_due')) {
    overallStatus = 'not_yet_due';
  }

  // Next due age: first incomplete dose's ageMonthsMin
  const nextDueDose = doseStatuses.find((d) => d.status !== 'complete');
  const nextDueAgeMonths = nextDueDose ? nextDueDose.ageMonthsMin : null;

  return {
    vaccine: schedule.name,
    abbreviation: schedule.abbreviation,
    dosesRequired: schedule.doses.length,
    dosesReceived: Math.min(dosesReceived, schedule.doses.length),
    status: overallStatus,
    nextDueAgeMonths,
    doses: doseStatuses,
  };
}

// ============================================
// Helper: Extract CVX codes from FHIR immunizations
// ============================================

function extractCvxCodes(immunizations: Immunization[]): string[] {
  const codes: string[] = [];
  for (const imm of immunizations) {
    if (imm.vaccineCode?.coding) {
      for (const coding of imm.vaccineCode.coding) {
        if (coding.code) {
          codes.push(coding.code);
        }
      }
    }
  }
  return codes;
}

// ============================================
// Helper: Get family member DOB
// ============================================

async function getFamilyMemberDob(
  memberId: number
): Promise<{ dob: string; name: string } | null> {
  if (!db) {
    return null;
  }

  const [member] = await db
    .select()
    .from(familyMembers)
    .where(eq(familyMembers.id, memberId));

  if (!member) {
    return null;
  }

  return {
    dob: member.dateOfBirth || '1985-06-15',
    name: member.name,
  };
}

// Demo DOB for when no DB is available
const DEMO_CHILD_DOB = '2024-01-15'; // ~26 months old as of March 2026
const DEMO_ADULT_DOB = '1985-06-15';

// ============================================
// GET /:familyMemberId/immunization-schedule
// Compare CDC schedule against member's age and FHIR immunizations
// ============================================

router.get(
  '/:familyMemberId/immunization-schedule',
  async (req: Request, res: Response) => {
    try {
      const { familyMemberId } = req.params;
      const memberId = parseInt(familyMemberId);

      if (isNaN(memberId)) {
        return res.status(400).json({ error: 'Invalid family member ID' });
      }

      // Get member DOB
      const memberInfo = await getFamilyMemberDob(memberId);
      const dob = memberInfo?.dob || DEMO_CHILD_DOB;
      const memberName = memberInfo?.name || 'Demo Child';
      const currentAge = ageInMonths(dob);

      // Try to get FHIR immunization data
      let receivedCvxCodes: string[] = [];
      let fhirImmunizations: Immunization[] = [];

      // Check for a useDemo query param or lack of FHIR session
      const useDemo = req.query.demo === 'true' || !db;

      if (!useDemo) {
        try {
          // Attempt internal fetch of FHIR immunization data
          // In production, this would use the FHIR client directly
          const baseUrl = `http://localhost:${process.env.PORT || 5000}`;
          const response = await fetch(`${baseUrl}/api/fhir/immunization`, {
            headers: {
              cookie: req.headers.cookie || '',
            },
          });
          if (response.ok) {
            const data = await response.json();
            if (Array.isArray(data)) {
              fhirImmunizations = data;
              receivedCvxCodes = extractCvxCodes(fhirImmunizations);
            }
          }
        } catch (err) {
          // FHIR data not available, continue with empty immunizations
          console.warn('Could not fetch FHIR immunization data:', err);
        }
      }

      // Evaluate each vaccine
      const vaccineStatuses = CDC_IMMUNIZATION_SCHEDULE.map((schedule) =>
        evaluateVaccineStatus(schedule, currentAge, receivedCvxCodes)
      );

      // Summary stats
      const totalVaccines = vaccineStatuses.length;
      const complete = vaccineStatuses.filter(
        (v) => v.status === 'complete'
      ).length;
      const due = vaccineStatuses.filter((v) => v.status === 'due').length;
      const overdue = vaccineStatuses.filter(
        (v) => v.status === 'overdue'
      ).length;
      const notYetDue = vaccineStatuses.filter(
        (v) => v.status === 'not_yet_due'
      ).length;

      res.json({
        familyMemberId: memberId,
        memberName,
        dateOfBirth: dob,
        currentAgeMonths: currentAge,
        vaccines: vaccineStatuses,
        summary: {
          totalVaccines,
          complete,
          due,
          overdue,
          notYetDue,
          completionPercentage:
            totalVaccines > 0
              ? Math.round((complete / totalVaccines) * 100)
              : 0,
        },
        fhirDataAvailable: fhirImmunizations.length > 0,
      });
    } catch (error) {
      console.error('Error evaluating immunization schedule:', error);
      res
        .status(500)
        .json({ error: 'Failed to evaluate immunization schedule' });
    }
  }
);

// ============================================
// GET /:familyMemberId/wellchild-visits
// AAP schedule for member's age
// ============================================

router.get(
  '/:familyMemberId/wellchild-visits',
  async (req: Request, res: Response) => {
    try {
      const { familyMemberId } = req.params;
      const memberId = parseInt(familyMemberId);

      if (isNaN(memberId)) {
        return res.status(400).json({ error: 'Invalid family member ID' });
      }

      const memberInfo = await getFamilyMemberDob(memberId);
      const dob = memberInfo?.dob || DEMO_CHILD_DOB;
      const memberName = memberInfo?.name || 'Demo Child';
      const currentAge = ageInMonths(dob);

      // If patient is an adult (>= 216 months / 18 years), provide adult-specific response
      if (currentAge >= 216) {
        return res.json({
          familyMemberId: memberId,
          memberName,
          dateOfBirth: dob,
          currentAgeMonths: currentAge,
          message:
            'Patient is over 18 years old. AAP well-child visit schedule applies to pediatric patients (0-18 years). Consider adult preventive care guidelines (USPSTF).',
          completed: AAP_WELLCHILD_SCHEDULE,
          upcoming: [],
          nextVisit: null,
        });
      }

      // Split visits into completed (age has passed) and upcoming
      const completed: WellChildVisit[] = [];
      const upcoming: WellChildVisit[] = [];

      for (const visit of AAP_WELLCHILD_SCHEDULE) {
        if (visit.ageMonths <= currentAge) {
          completed.push(visit);
        } else {
          upcoming.push(visit);
        }
      }

      // Next visit is the first upcoming visit
      const nextVisit = upcoming.length > 0 ? upcoming[0] : null;

      // Calculate months until next visit
      const monthsUntilNext = nextVisit
        ? nextVisit.ageMonths - currentAge
        : null;

      res.json({
        familyMemberId: memberId,
        memberName,
        dateOfBirth: dob,
        currentAgeMonths: currentAge,
        completed,
        upcoming,
        nextVisit: nextVisit
          ? {
              ...nextVisit,
              monthsUntilDue: monthsUntilNext,
            }
          : null,
        totalVisits: AAP_WELLCHILD_SCHEDULE.length,
        completedCount: completed.length,
      });
    } catch (error) {
      console.error('Error fetching well-child visits:', error);
      res.status(500).json({ error: 'Failed to fetch well-child visits' });
    }
  }
);

// ============================================
// GET /:familyMemberId/school-compliance
// Check school-required vaccines
// ============================================

router.get(
  '/:familyMemberId/school-compliance',
  async (req: Request, res: Response) => {
    try {
      const { familyMemberId } = req.params;
      const memberId = parseInt(familyMemberId);

      if (isNaN(memberId)) {
        return res.status(400).json({ error: 'Invalid family member ID' });
      }

      const state = (req.query.state as string) || 'default';
      const requiredVaccineAbbreviations =
        SCHOOL_REQUIRED_VACCINES[state] || SCHOOL_REQUIRED_VACCINES['default'];

      const memberInfo = await getFamilyMemberDob(memberId);
      const dob = memberInfo?.dob || DEMO_CHILD_DOB;
      const memberName = memberInfo?.name || 'Demo Child';
      const currentAge = ageInMonths(dob);

      // Get FHIR immunization data
      let receivedCvxCodes: string[] = [];
      const useDemo = req.query.demo === 'true' || !db;

      if (!useDemo) {
        try {
          const baseUrl = `http://localhost:${process.env.PORT || 5000}`;
          const response = await fetch(`${baseUrl}/api/fhir/immunization`, {
            headers: {
              cookie: req.headers.cookie || '',
            },
          });
          if (response.ok) {
            const data = await response.json();
            if (Array.isArray(data)) {
              receivedCvxCodes = extractCvxCodes(data);
            }
          }
        } catch (err) {
          console.warn('Could not fetch FHIR immunization data:', err);
        }
      }

      // Check each required vaccine
      const requiredSchedules = CDC_IMMUNIZATION_SCHEDULE.filter((s) =>
        requiredVaccineAbbreviations.includes(s.abbreviation)
      );

      const completeVaccines: string[] = [];
      const missingVaccines: {
        vaccine: string;
        abbreviation: string;
        dosesReceived: number;
        dosesRequired: number;
        status: DoseStatus;
      }[] = [];

      for (const schedule of requiredSchedules) {
        const status = evaluateVaccineStatus(
          schedule,
          currentAge,
          receivedCvxCodes
        );

        if (status.status === 'complete') {
          completeVaccines.push(schedule.abbreviation);
        } else {
          missingVaccines.push({
            vaccine: schedule.name,
            abbreviation: schedule.abbreviation,
            dosesReceived: status.dosesReceived,
            dosesRequired: status.dosesRequired,
            status: status.status,
          });
        }
      }

      const isCompliant = missingVaccines.length === 0;

      res.json({
        familyMemberId: memberId,
        memberName,
        dateOfBirth: dob,
        currentAgeMonths: currentAge,
        state: state === 'default' ? 'Default (all states)' : state,
        compliant: isCompliant,
        complete: completeVaccines,
        missing: missingVaccines,
        totalRequired: requiredVaccineAbbreviations.length,
        totalComplete: completeVaccines.length,
        fhirDataAvailable: receivedCvxCodes.length > 0,
        note: receivedCvxCodes.length === 0
          ? 'No immunization records found. Connect a FHIR data source for accurate compliance checking.'
          : undefined,
      });
    } catch (error) {
      console.error('Error checking school compliance:', error);
      res.status(500).json({ error: 'Failed to check school compliance' });
    }
  }
);

export default router;
