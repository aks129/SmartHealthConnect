import { Router, Request, Response } from 'express';
import { eq, and, desc } from 'drizzle-orm';
import { db } from './db';
import {
  refillRequests,
  insertRefillRequestSchema,
} from '@shared/schema';

const router = Router();

const API_BASE = process.env.SMARTHEALTHCONNECT_API_URL || 'http://localhost:5050';

// In-memory fallback for demo / no-DB mode
let demoRefillRequests: any[] = [];

// Demo medications used when FHIR endpoint is unavailable
const DEMO_MEDICATIONS = [
  {
    id: 'med-lisinopril',
    medicationName: 'Lisinopril 10mg',
    authoredOn: '2025-11-01',
    status: 'active',
    refillsUsed: 3,
  },
  {
    id: 'med-metformin',
    medicationName: 'Metformin 500mg',
    authoredOn: '2025-10-15',
    status: 'active',
    refillsUsed: 4,
  },
  {
    id: 'med-atorvastatin',
    medicationName: 'Atorvastatin 20mg',
    authoredOn: '2025-12-01',
    status: 'active',
    refillsUsed: 2,
  },
];

/**
 * Compute refill status for a medication
 */
function computeRefillStatus(med: {
  id: string;
  medicationName: string;
  authoredOn: string;
  status: string;
  refillsUsed: number;
  daysSupply?: number;
}) {
  const daysSupply = med.daysSupply || 30;
  const authoredDate = new Date(med.authoredOn);
  const refillsUsed = med.refillsUsed || 0;

  // Next refill date = authoredOn + daysSupply * (refillsUsed + 1)
  const nextRefillDate = new Date(authoredDate);
  nextRefillDate.setDate(nextRefillDate.getDate() + daysSupply * (refillsUsed + 1));

  const today = new Date();
  const daysRemaining = Math.ceil(
    (nextRefillDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  let refillStatus: 'ok' | 'refill_soon' | 'overdue' = 'ok';
  if (daysRemaining <= 0) {
    refillStatus = 'overdue';
  } else if (daysRemaining <= 7) {
    refillStatus = 'refill_soon';
  }

  return {
    medicationId: med.id,
    medicationName: med.medicationName,
    authoredOn: med.authoredOn,
    daysSupply,
    refillsUsed,
    nextRefillDate: nextRefillDate.toISOString().split('T')[0],
    daysRemaining,
    refillStatus,
  };
}

// GET /:familyMemberId/status - Check refill status for all medications
router.get('/:familyMemberId/status', async (req: Request, res: Response) => {
  try {
    const familyMemberId = parseInt(req.params.familyMemberId);

    // Try to fetch medications from FHIR endpoint
    let medications: any[] = [];
    try {
      const response = await fetch(`${API_BASE}/api/fhir/medicationrequest`);
      if (response.ok) {
        const data = await response.json();
        // Transform FHIR MedicationRequest entries
        const entries = data.entry || data || [];
        medications = (Array.isArray(entries) ? entries : []).map((entry: any) => {
          const resource = entry.resource || entry;
          return {
            id: resource.id || `med-${Date.now()}`,
            medicationName:
              resource.medicationCodeableConcept?.text ||
              resource.medicationCodeableConcept?.coding?.[0]?.display ||
              'Unknown Medication',
            authoredOn: resource.authoredOn || '2025-10-01',
            status: resource.status || 'active',
            refillsUsed: resource.dispenseRequest?.numberOfRepeatsAllowed
              ? Math.max(0, (resource.dispenseRequest.numberOfRepeatsAllowed || 3) - 1)
              : 2,
          };
        });
      }
    } catch {
      // FHIR endpoint not available, use demo data
    }

    // Fall back to demo medications if nothing returned
    if (medications.length === 0) {
      medications = DEMO_MEDICATIONS;
    }

    const statuses = medications.map(computeRefillStatus);

    // If DB is available, join with refill requests
    let pendingRequests: any[] = [];
    if (db) {
      try {
        pendingRequests = await db
          .select()
          .from(refillRequests)
          .where(
            and(
              eq(refillRequests.familyMemberId, familyMemberId),
              eq(refillRequests.status, 'pending')
            )
          );
      } catch {
        // DB not available
      }
    } else {
      pendingRequests = demoRefillRequests.filter(
        (r) => r.familyMemberId === familyMemberId && r.status === 'pending'
      );
    }

    // Merge pending request info into statuses
    const enrichedStatuses = statuses.map((s) => {
      const pending = pendingRequests.find(
        (r: any) => r.medicationName === s.medicationName || r.medicationId === s.medicationId
      );
      return {
        ...s,
        hasPendingRefillRequest: !!pending,
        pendingRequestId: pending?.id || null,
      };
    });

    res.json({
      familyMemberId,
      medications: enrichedStatuses,
      overdueCount: enrichedStatuses.filter((s) => s.refillStatus === 'overdue').length,
      refillSoonCount: enrichedStatuses.filter((s) => s.refillStatus === 'refill_soon').length,
    });
  } catch (error) {
    console.error('Error fetching refill status:', error);
    res.status(500).json({ error: 'Failed to fetch refill status' });
  }
});

// POST /:familyMemberId/request - Create refill request
router.post('/:familyMemberId/request', async (req: Request, res: Response) => {
  try {
    const familyMemberId = parseInt(req.params.familyMemberId);
    const { medicationName, medicationId, pharmacyName, daysSupply, notes } = req.body;

    if (!medicationName) {
      return res.status(400).json({ error: 'medicationName is required' });
    }

    const refillData = {
      familyMemberId,
      medicationName,
      medicationId: medicationId || null,
      pharmacyName: pharmacyName || null,
      daysSupply: daysSupply || 30,
      notes: notes || null,
      status: 'pending' as const,
    };

    if (db) {
      try {
        const validation = insertRefillRequestSchema.safeParse(refillData);
        if (!validation.success) {
          return res.status(400).json({ error: validation.error.errors });
        }

        const [newRequest] = await db
          .insert(refillRequests)
          .values(validation.data)
          .returning();

        return res.status(201).json(newRequest);
      } catch {
        // Fall through to in-memory
      }
    }

    // In-memory fallback
    const demoRequest = {
      id: demoRefillRequests.length + 1,
      ...refillData,
      lastFilledDate: null,
      nextRefillDate: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    demoRefillRequests.push(demoRequest);
    res.status(201).json(demoRequest);
  } catch (error) {
    console.error('Error creating refill request:', error);
    res.status(500).json({ error: 'Failed to create refill request' });
  }
});

// GET /:familyMemberId/timeline - Refill timeline for next N days
router.get('/:familyMemberId/timeline', async (req: Request, res: Response) => {
  try {
    const familyMemberId = parseInt(req.params.familyMemberId);
    const days = parseInt(req.query.days as string) || 90;

    // Get medications (same logic as status endpoint)
    let medications: any[] = [];
    try {
      const response = await fetch(`${API_BASE}/api/fhir/medicationrequest`);
      if (response.ok) {
        const data = await response.json();
        const entries = data.entry || data || [];
        medications = (Array.isArray(entries) ? entries : []).map((entry: any) => {
          const resource = entry.resource || entry;
          return {
            id: resource.id || `med-${Date.now()}`,
            medicationName:
              resource.medicationCodeableConcept?.text ||
              resource.medicationCodeableConcept?.coding?.[0]?.display ||
              'Unknown Medication',
            authoredOn: resource.authoredOn || '2025-10-01',
            status: resource.status || 'active',
            refillsUsed: 2,
          };
        });
      }
    } catch {
      // FHIR endpoint not available
    }

    if (medications.length === 0) {
      medications = DEMO_MEDICATIONS;
    }

    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + days);

    // Compute upcoming refill events within the window
    const timeline: any[] = [];

    for (const med of medications) {
      const daysSupply = med.daysSupply || 30;
      const authoredDate = new Date(med.authoredOn);
      const refillsUsed = med.refillsUsed || 0;

      // Project future refill dates within the window
      for (let refill = refillsUsed + 1; refill <= refillsUsed + 12; refill++) {
        const refillDate = new Date(authoredDate);
        refillDate.setDate(refillDate.getDate() + daysSupply * refill);

        if (refillDate > endDate) break;
        if (refillDate < today) continue;

        timeline.push({
          medicationName: med.medicationName,
          medicationId: med.id,
          refillDate: refillDate.toISOString().split('T')[0],
          refillNumber: refill,
          daysFromNow: Math.ceil(
            (refillDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
          ),
        });
      }
    }

    // Sort by refill date
    timeline.sort((a, b) => a.refillDate.localeCompare(b.refillDate));

    res.json({
      familyMemberId,
      days,
      startDate: today.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      timeline,
    });
  } catch (error) {
    console.error('Error fetching refill timeline:', error);
    res.status(500).json({ error: 'Failed to fetch refill timeline' });
  }
});

export default router;
