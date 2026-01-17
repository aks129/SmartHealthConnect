import { Router, Request, Response } from 'express';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { db } from './db';
import {
  scheduledAppointments,
  prefilledForms,
  formTemplates,
  actionItems,
  familyMembers,
  scheduleActionInputSchema,
  type ScheduledAppointment,
  type PrefilledForm,
  type FormTemplate,
  type FamilyMember,
} from '@shared/schema';

const router = Router();

// ============================================
// Form Templates
// ============================================

// Standard intake form field mappings (FHIR paths)
export const standardIntakeFields = [
  { fieldId: 'patient_name', fieldType: 'text', label: 'Full Name', fhirPath: 'Patient.name[0].given + Patient.name[0].family', required: true },
  { fieldId: 'dob', fieldType: 'date', label: 'Date of Birth', fhirPath: 'Patient.birthDate', required: true },
  { fieldId: 'gender', fieldType: 'select', label: 'Gender', fhirPath: 'Patient.gender', required: true },
  { fieldId: 'phone', fieldType: 'text', label: 'Phone Number', fhirPath: 'Patient.telecom[phone].value', required: true },
  { fieldId: 'email', fieldType: 'text', label: 'Email Address', fhirPath: 'Patient.telecom[email].value', required: false },
  { fieldId: 'address', fieldType: 'text', label: 'Street Address', fhirPath: 'Patient.address[0].line', required: true },
  { fieldId: 'city', fieldType: 'text', label: 'City', fhirPath: 'Patient.address[0].city', required: true },
  { fieldId: 'state', fieldType: 'text', label: 'State', fhirPath: 'Patient.address[0].state', required: true },
  { fieldId: 'zip', fieldType: 'text', label: 'ZIP Code', fhirPath: 'Patient.address[0].postalCode', required: true },
  { fieldId: 'emergency_contact', fieldType: 'text', label: 'Emergency Contact Name', fhirPath: '', required: true },
  { fieldId: 'emergency_phone', fieldType: 'text', label: 'Emergency Contact Phone', fhirPath: '', required: true },
  { fieldId: 'allergies', fieldType: 'multiselect', label: 'Known Allergies', fhirPath: 'AllergyIntolerance[*].code.text', required: false },
  { fieldId: 'medications', fieldType: 'multiselect', label: 'Current Medications', fhirPath: 'MedicationRequest[*].medicationCodeableConcept.text', required: false },
  { fieldId: 'conditions', fieldType: 'multiselect', label: 'Medical Conditions', fhirPath: 'Condition[*].code.text', required: false },
  { fieldId: 'surgeries', fieldType: 'textarea', label: 'Past Surgeries', fhirPath: 'Procedure[*].code.text', required: false },
  { fieldId: 'family_history', fieldType: 'textarea', label: 'Family Medical History', fhirPath: '', required: false },
  { fieldId: 'insurance_provider', fieldType: 'text', label: 'Insurance Provider', fhirPath: 'Coverage.payor[0].display', required: false },
  { fieldId: 'insurance_id', fieldType: 'text', label: 'Insurance ID Number', fhirPath: 'Coverage.subscriberId', required: false },
  { fieldId: 'primary_care', fieldType: 'text', label: 'Primary Care Physician', fhirPath: '', required: false },
  { fieldId: 'reason_for_visit', fieldType: 'textarea', label: 'Reason for Visit', fhirPath: '', required: true },
];

// Get all form templates
router.get('/templates', async (req: Request, res: Response) => {
  try {
    const templates = await db
      .select()
      .from(formTemplates)
      .where(eq(formTemplates.isActive, true))
      .orderBy(formTemplates.name);

    res.json(templates);
  } catch (error) {
    console.error('Error fetching form templates:', error);
    res.status(500).json({ error: 'Failed to fetch form templates' });
  }
});

// Get single form template
router.get('/templates/:id', async (req: Request, res: Response) => {
  try {
    const templateId = parseInt(req.params.id);

    const [template] = await db
      .select()
      .from(formTemplates)
      .where(eq(formTemplates.id, templateId))
      .limit(1);

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json(template);
  } catch (error) {
    console.error('Error fetching form template:', error);
    res.status(500).json({ error: 'Failed to fetch form template' });
  }
});

// Get standard intake form fields
router.get('/templates/standard/fields', async (_req: Request, res: Response) => {
  res.json(standardIntakeFields);
});

// ============================================
// Scheduled Appointments
// ============================================

// Get appointments for a family member
router.get('/appointments/:memberId', async (req: Request, res: Response) => {
  try {
    const memberId = parseInt(req.params.memberId);
    const { status, upcoming } = req.query;

    let appointments;

    if (upcoming === 'true') {
      // Only future appointments
      appointments = await db
        .select()
        .from(scheduledAppointments)
        .where(
          and(
            eq(scheduledAppointments.familyMemberId, memberId),
            gte(scheduledAppointments.scheduledDateTime, new Date())
          )
        )
        .orderBy(scheduledAppointments.scheduledDateTime);
    } else if (status && typeof status === 'string') {
      appointments = await db
        .select()
        .from(scheduledAppointments)
        .where(
          and(
            eq(scheduledAppointments.familyMemberId, memberId),
            eq(scheduledAppointments.status, status)
          )
        )
        .orderBy(desc(scheduledAppointments.scheduledDateTime));
    } else {
      appointments = await db
        .select()
        .from(scheduledAppointments)
        .where(eq(scheduledAppointments.familyMemberId, memberId))
        .orderBy(desc(scheduledAppointments.scheduledDateTime));
    }

    res.json(appointments);
  } catch (error) {
    console.error('Error fetching appointments:', error);
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
});

// Get all upcoming appointments for user's family
router.get('/appointments', async (req: Request, res: Response) => {
  try {
    const userId = 1; // Demo user

    // Get all family members
    const members = await db
      .select()
      .from(familyMembers)
      .where(eq(familyMembers.userId, userId));

    const memberIds = members.map((m: FamilyMember) => m.id);

    if (memberIds.length === 0) {
      return res.json([]);
    }

    // Get upcoming appointments with member info
    const appointments = await db
      .select({
        appointment: scheduledAppointments,
        memberName: familyMembers.name,
      })
      .from(scheduledAppointments)
      .innerJoin(familyMembers, eq(scheduledAppointments.familyMemberId, familyMembers.id))
      .where(gte(scheduledAppointments.scheduledDateTime, new Date()))
      .orderBy(scheduledAppointments.scheduledDateTime);

    res.json(appointments);
  } catch (error) {
    console.error('Error fetching all appointments:', error);
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
});

// Schedule appointment (from action item)
router.post('/appointments', async (req: Request, res: Response) => {
  try {
    const validation = scheduleActionInputSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({ error: validation.error.errors });
    }

    const data = validation.data;

    // Get the action item to get family member ID
    const [action] = await db
      .select()
      .from(actionItems)
      .where(eq(actionItems.id, data.actionItemId))
      .limit(1);

    if (!action) {
      return res.status(404).json({ error: 'Action item not found' });
    }

    // Create the appointment
    const [appointment] = await db
      .insert(scheduledAppointments)
      .values({
        familyMemberId: action.familyMemberId,
        actionItemId: data.actionItemId,
        providerName: data.providerName,
        facilityName: data.facilityName,
        facilityAddress: data.facilityAddress,
        scheduledDateTime: new Date(data.scheduledDateTime),
        appointmentType: data.appointmentType,
        durationMinutes: data.durationMinutes,
        notes: data.notes,
        status: 'scheduled',
      })
      .returning();

    // Update the action item status
    await db
      .update(actionItems)
      .set({
        status: 'scheduled',
        scheduledDate: data.scheduledDateTime,
        scheduledProvider: data.providerName,
        scheduledLocation: data.facilityName,
      })
      .where(eq(actionItems.id, data.actionItemId));

    res.status(201).json(appointment);
  } catch (error) {
    console.error('Error scheduling appointment:', error);
    res.status(500).json({ error: 'Failed to schedule appointment' });
  }
});

// Quick schedule (without action item)
router.post('/appointments/quick', async (req: Request, res: Response) => {
  try {
    const { familyMemberId, ...appointmentData } = req.body;

    const [appointment] = await db
      .insert(scheduledAppointments)
      .values({
        familyMemberId,
        scheduledDateTime: new Date(appointmentData.scheduledDateTime),
        ...appointmentData,
        status: 'scheduled',
      })
      .returning();

    res.status(201).json(appointment);
  } catch (error) {
    console.error('Error creating quick appointment:', error);
    res.status(500).json({ error: 'Failed to create appointment' });
  }
});

// Update appointment
router.put('/appointments/:id', async (req: Request, res: Response) => {
  try {
    const appointmentId = parseInt(req.params.id);
    const updates = req.body;

    if (updates.scheduledDateTime) {
      updates.scheduledDateTime = new Date(updates.scheduledDateTime);
    }

    const [updated] = await db
      .update(scheduledAppointments)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(scheduledAppointments.id, appointmentId))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    res.json(updated);
  } catch (error) {
    console.error('Error updating appointment:', error);
    res.status(500).json({ error: 'Failed to update appointment' });
  }
});

// Cancel appointment
router.post('/appointments/:id/cancel', async (req: Request, res: Response) => {
  try {
    const appointmentId = parseInt(req.params.id);

    const [updated] = await db
      .update(scheduledAppointments)
      .set({ status: 'cancelled', updatedAt: new Date() })
      .where(eq(scheduledAppointments.id, appointmentId))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    // If linked to an action item, update its status back to pending
    if (updated.actionItemId) {
      await db
        .update(actionItems)
        .set({
          status: 'pending',
          scheduledDate: null,
          scheduledProvider: null,
          scheduledLocation: null,
        })
        .where(eq(actionItems.id, updated.actionItemId));
    }

    res.json(updated);
  } catch (error) {
    console.error('Error cancelling appointment:', error);
    res.status(500).json({ error: 'Failed to cancel appointment' });
  }
});

// Complete appointment
router.post('/appointments/:id/complete', async (req: Request, res: Response) => {
  try {
    const appointmentId = parseInt(req.params.id);

    const [updated] = await db
      .update(scheduledAppointments)
      .set({ status: 'completed', updatedAt: new Date() })
      .where(eq(scheduledAppointments.id, appointmentId))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    // If linked to an action item, mark it complete
    if (updated.actionItemId) {
      await db
        .update(actionItems)
        .set({
          status: 'completed',
          completedAt: new Date(),
        })
        .where(eq(actionItems.id, updated.actionItemId));
    }

    res.json(updated);
  } catch (error) {
    console.error('Error completing appointment:', error);
    res.status(500).json({ error: 'Failed to complete appointment' });
  }
});

// ============================================
// Form Pre-fill
// ============================================

// Generate pre-filled form for appointment
router.post('/forms/prefill', async (req: Request, res: Response) => {
  try {
    const { familyMemberId, templateId, appointmentId } = req.body;

    // Get family member data
    const [member] = await db
      .select()
      .from(familyMembers)
      .where(eq(familyMembers.id, familyMemberId))
      .limit(1);

    if (!member) {
      return res.status(404).json({ error: 'Family member not found' });
    }

    // In production, this would fetch FHIR data and map it to form fields
    // For now, we'll create a demo pre-filled form
    const prefilledData = {
      patient_name: member.name,
      dob: member.dateOfBirth || '',
      gender: member.gender || '',
      // Other fields would be populated from FHIR data
      allergies: [],
      medications: [],
      conditions: [],
    };

    const [form] = await db
      .insert(prefilledForms)
      .values({
        familyMemberId,
        templateId: templateId || 1, // Default template
        appointmentId,
        filledData: prefilledData,
        status: 'ready',
      })
      .returning();

    // Link to appointment if provided
    if (appointmentId) {
      await db
        .update(scheduledAppointments)
        .set({ prefilledFormId: form.id })
        .where(eq(scheduledAppointments.id, appointmentId));
    }

    res.status(201).json(form);
  } catch (error) {
    console.error('Error creating pre-filled form:', error);
    res.status(500).json({ error: 'Failed to create pre-filled form' });
  }
});

// Get pre-filled form
router.get('/forms/:id', async (req: Request, res: Response) => {
  try {
    const formId = parseInt(req.params.id);

    const [form] = await db
      .select()
      .from(prefilledForms)
      .where(eq(prefilledForms.id, formId))
      .limit(1);

    if (!form) {
      return res.status(404).json({ error: 'Form not found' });
    }

    res.json(form);
  } catch (error) {
    console.error('Error fetching pre-filled form:', error);
    res.status(500).json({ error: 'Failed to fetch form' });
  }
});

// Update pre-filled form
router.put('/forms/:id', async (req: Request, res: Response) => {
  try {
    const formId = parseInt(req.params.id);
    const { filledData, status } = req.body;

    const [updated] = await db
      .update(prefilledForms)
      .set({
        filledData,
        status,
        lastModified: new Date(),
      })
      .where(eq(prefilledForms.id, formId))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Form not found' });
    }

    res.json(updated);
  } catch (error) {
    console.error('Error updating pre-filled form:', error);
    res.status(500).json({ error: 'Failed to update form' });
  }
});

// Submit pre-filled form
router.post('/forms/:id/submit', async (req: Request, res: Response) => {
  try {
    const formId = parseInt(req.params.id);

    const [updated] = await db
      .update(prefilledForms)
      .set({
        status: 'submitted',
        submittedAt: new Date(),
      })
      .where(eq(prefilledForms.id, formId))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Form not found' });
    }

    res.json(updated);
  } catch (error) {
    console.error('Error submitting form:', error);
    res.status(500).json({ error: 'Failed to submit form' });
  }
});

// Get forms for a family member
router.get('/forms/member/:memberId', async (req: Request, res: Response) => {
  try {
    const memberId = parseInt(req.params.memberId);

    const forms = await db
      .select()
      .from(prefilledForms)
      .where(eq(prefilledForms.familyMemberId, memberId))
      .orderBy(desc(prefilledForms.generatedAt));

    res.json(forms);
  } catch (error) {
    console.error('Error fetching forms:', error);
    res.status(500).json({ error: 'Failed to fetch forms' });
  }
});

export default router;
