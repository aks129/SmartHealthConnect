import { Router, Request, Response } from 'express';
import { eq, and, gte, lte, desc, isNull } from 'drizzle-orm';
import { db } from './db';
import {
  healthAlerts,
  healthDigests,
  familyMembers,
  actionItems,
  scheduledAppointments,
  healthGoals,
  healthAlertInputSchema,
  type HealthAlert,
  type HealthDigest,
  type FamilyMember,
} from '@shared/schema';

const router = Router();

// ============================================
// Health Alert Types and Rules
// ============================================

export type AlertCategory =
  | 'medication_reminder'
  | 'appointment_upcoming'
  | 'care_gap'
  | 'goal_milestone'
  | 'health_trend'
  | 'preventive_care'
  | 'follow_up_needed';

export type AlertPriority = 'low' | 'medium' | 'high' | 'urgent';

// Alert generation rules
const alertRules = {
  appointmentReminder: {
    daysBeforeAppointment: [7, 3, 1], // Send reminders at 7, 3, and 1 day before
    priority: 'medium' as AlertPriority,
  },
  careGapAlert: {
    checkIntervalDays: 30, // Check for care gaps monthly
    priority: 'high' as AlertPriority,
  },
  goalProgress: {
    checkIntervalDays: 7, // Weekly goal progress check
    priority: 'low' as AlertPriority,
  },
};

// ============================================
// Health Alerts
// ============================================

// Get alerts for a user
router.get('/alerts', async (req: Request, res: Response) => {
  try {
    const userId = 1; // Demo user
    const { unreadOnly, category, memberId } = req.query;

    // Get family member IDs for this user
    const members = await db
      .select()
      .from(familyMembers)
      .where(eq(familyMembers.userId, userId));

    const memberIds = members.map((m: FamilyMember) => m.id);

    if (memberIds.length === 0) {
      return res.json([]);
    }

    let alerts;

    if (unreadOnly === 'true') {
      alerts = await db
        .select({
          alert: healthAlerts,
          memberName: familyMembers.name,
        })
        .from(healthAlerts)
        .innerJoin(familyMembers, eq(healthAlerts.familyMemberId, familyMembers.id))
        .where(isNull(healthAlerts.readAt))
        .orderBy(desc(healthAlerts.createdAt));
    } else {
      alerts = await db
        .select({
          alert: healthAlerts,
          memberName: familyMembers.name,
        })
        .from(healthAlerts)
        .innerJoin(familyMembers, eq(healthAlerts.familyMemberId, familyMembers.id))
        .orderBy(desc(healthAlerts.createdAt))
        .limit(50);
    }

    res.json(alerts);
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

// Get alerts for a specific family member
router.get('/alerts/member/:memberId', async (req: Request, res: Response) => {
  try {
    const memberId = parseInt(req.params.memberId);

    const alerts = await db
      .select()
      .from(healthAlerts)
      .where(eq(healthAlerts.familyMemberId, memberId))
      .orderBy(desc(healthAlerts.createdAt))
      .limit(20);

    res.json(alerts);
  } catch (error) {
    console.error('Error fetching member alerts:', error);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

// Create a new alert
router.post('/alerts', async (req: Request, res: Response) => {
  try {
    const validation = healthAlertInputSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({ error: validation.error.errors });
    }

    const data = validation.data;

    const [alert] = await db
      .insert(healthAlerts)
      .values({
        familyMemberId: data.familyMemberId,
        alertType: data.alertType || 'custom',
        category: data.category,
        title: data.title,
        message: data.message,
        priority: data.priority,
        actionUrl: data.actionUrl,
        metadata: data.metadata || {},
      })
      .returning();

    res.status(201).json(alert);
  } catch (error) {
    console.error('Error creating alert:', error);
    res.status(500).json({ error: 'Failed to create alert' });
  }
});

// Mark alert as read
router.post('/alerts/:id/read', async (req: Request, res: Response) => {
  try {
    const alertId = parseInt(req.params.id);

    const [updated] = await db
      .update(healthAlerts)
      .set({ readAt: new Date() })
      .where(eq(healthAlerts.id, alertId))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    res.json(updated);
  } catch (error) {
    console.error('Error marking alert as read:', error);
    res.status(500).json({ error: 'Failed to update alert' });
  }
});

// Mark all alerts as read
router.post('/alerts/read-all', async (req: Request, res: Response) => {
  try {
    const userId = 1; // Demo user

    // Get family member IDs
    const members = await db
      .select()
      .from(familyMembers)
      .where(eq(familyMembers.userId, userId));

    const memberIds = members.map((m: FamilyMember) => m.id);

    if (memberIds.length === 0) {
      return res.json({ updated: 0 });
    }

    // Update all unread alerts for this user's family members
    const result = await db
      .update(healthAlerts)
      .set({ readAt: new Date() })
      .where(isNull(healthAlerts.readAt));

    res.json({ updated: true });
  } catch (error) {
    console.error('Error marking alerts as read:', error);
    res.status(500).json({ error: 'Failed to update alerts' });
  }
});

// Dismiss alert
router.post('/alerts/:id/dismiss', async (req: Request, res: Response) => {
  try {
    const alertId = parseInt(req.params.id);

    const [updated] = await db
      .update(healthAlerts)
      .set({
        dismissedAt: new Date(),
        readAt: new Date(), // Also mark as read
      })
      .where(eq(healthAlerts.id, alertId))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    res.json(updated);
  } catch (error) {
    console.error('Error dismissing alert:', error);
    res.status(500).json({ error: 'Failed to dismiss alert' });
  }
});

// Get unread alert count
router.get('/alerts/count', async (req: Request, res: Response) => {
  try {
    const userId = 1; // Demo user

    const members = await db
      .select()
      .from(familyMembers)
      .where(eq(familyMembers.userId, userId));

    const memberIds = members.map((m: FamilyMember) => m.id);

    if (memberIds.length === 0) {
      return res.json({ count: 0 });
    }

    const alerts = await db
      .select()
      .from(healthAlerts)
      .where(isNull(healthAlerts.readAt));

    res.json({ count: alerts.length });
  } catch (error) {
    console.error('Error counting alerts:', error);
    res.status(500).json({ error: 'Failed to count alerts' });
  }
});

// ============================================
// Weekly Health Digest
// ============================================

// Get digests for a user
router.get('/digests', async (req: Request, res: Response) => {
  try {
    const userId = 1; // Demo user

    const digests = await db
      .select()
      .from(healthDigests)
      .where(eq(healthDigests.userId, userId))
      .orderBy(desc(healthDigests.weekStartDate))
      .limit(10);

    res.json(digests);
  } catch (error) {
    console.error('Error fetching digests:', error);
    res.status(500).json({ error: 'Failed to fetch digests' });
  }
});

// Get latest digest
router.get('/digests/latest', async (req: Request, res: Response) => {
  try {
    const userId = 1; // Demo user

    const [digest] = await db
      .select()
      .from(healthDigests)
      .where(eq(healthDigests.userId, userId))
      .orderBy(desc(healthDigests.weekStartDate))
      .limit(1);

    if (!digest) {
      return res.status(404).json({ error: 'No digest found' });
    }

    res.json(digest);
  } catch (error) {
    console.error('Error fetching latest digest:', error);
    res.status(500).json({ error: 'Failed to fetch digest' });
  }
});

// Generate weekly digest
router.post('/digests/generate', async (req: Request, res: Response) => {
  try {
    const userId = 1; // Demo user

    // Calculate week boundaries
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    // Get all family members
    const members = await db
      .select()
      .from(familyMembers)
      .where(eq(familyMembers.userId, userId));

    // Collect digest data
    const digestData = {
      familyMembers: members.map((m: FamilyMember) => ({
        id: m.id,
        name: m.name,
        relationship: m.relationship,
      })),
      appointments: [] as any[],
      completedActions: [] as any[],
      pendingActions: [] as any[],
      goalProgress: [] as any[],
      highlights: [] as string[],
    };

    // Get appointments for the week
    const appointments = await db
      .select({
        appointment: scheduledAppointments,
        memberName: familyMembers.name,
      })
      .from(scheduledAppointments)
      .innerJoin(familyMembers, eq(scheduledAppointments.familyMemberId, familyMembers.id))
      .where(
        and(
          gte(scheduledAppointments.scheduledDateTime, weekStart),
          lte(scheduledAppointments.scheduledDateTime, weekEnd)
        )
      );

    digestData.appointments = appointments;

    // Get completed actions this week
    const completedActions = await db
      .select({
        action: actionItems,
        memberName: familyMembers.name,
      })
      .from(actionItems)
      .innerJoin(familyMembers, eq(actionItems.familyMemberId, familyMembers.id))
      .where(
        and(
          eq(actionItems.status, 'completed'),
          gte(actionItems.completedAt, weekStart)
        )
      );

    digestData.completedActions = completedActions;

    // Get pending actions
    const pendingActions = await db
      .select({
        action: actionItems,
        memberName: familyMembers.name,
      })
      .from(actionItems)
      .innerJoin(familyMembers, eq(actionItems.familyMemberId, familyMembers.id))
      .where(eq(actionItems.status, 'pending'));

    digestData.pendingActions = pendingActions;

    // Get active health goals
    const goals = await db
      .select({
        goal: healthGoals,
        memberName: familyMembers.name,
      })
      .from(healthGoals)
      .innerJoin(familyMembers, eq(healthGoals.familyMemberId, familyMembers.id))
      .where(eq(healthGoals.status, 'active'));

    digestData.goalProgress = goals;

    // Generate highlights
    if (completedActions.length > 0) {
      digestData.highlights.push(
        `Great job! ${completedActions.length} health action${completedActions.length > 1 ? 's were' : ' was'} completed this week.`
      );
    }

    if (appointments.length > 0) {
      digestData.highlights.push(
        `${appointments.length} appointment${appointments.length > 1 ? 's are' : ' is'} scheduled for this week.`
      );
    }

    if (pendingActions.length > 0) {
      digestData.highlights.push(
        `${pendingActions.length} health action${pendingActions.length > 1 ? 's need' : ' needs'} attention.`
      );
    }

    // Create the digest
    const [digest] = await db
      .insert(healthDigests)
      .values({
        userId,
        weekStartDate: weekStart,
        weekEndDate: weekEnd,
        summary: digestData,
        highlights: digestData.highlights,
        appointmentCount: appointments.length,
        actionItemCount: pendingActions.length,
        completedActionsCount: completedActions.length,
      })
      .returning();

    res.status(201).json(digest);
  } catch (error) {
    console.error('Error generating digest:', error);
    res.status(500).json({ error: 'Failed to generate digest' });
  }
});

// Mark digest as read
router.post('/digests/:id/read', async (req: Request, res: Response) => {
  try {
    const digestId = parseInt(req.params.id);

    const [updated] = await db
      .update(healthDigests)
      .set({ readAt: new Date() })
      .where(eq(healthDigests.id, digestId))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Digest not found' });
    }

    res.json(updated);
  } catch (error) {
    console.error('Error marking digest as read:', error);
    res.status(500).json({ error: 'Failed to update digest' });
  }
});

// ============================================
// Proactive Alert Generation
// ============================================

// Generate appointment reminders
export async function generateAppointmentReminders(): Promise<void> {
  try {
    const now = new Date();

    for (const daysBefore of alertRules.appointmentReminder.daysBeforeAppointment) {
      const targetDate = new Date(now);
      targetDate.setDate(now.getDate() + daysBefore);

      // Find appointments on the target date
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      const appointments = await db
        .select({
          appointment: scheduledAppointments,
          memberName: familyMembers.name,
        })
        .from(scheduledAppointments)
        .innerJoin(familyMembers, eq(scheduledAppointments.familyMemberId, familyMembers.id))
        .where(
          and(
            eq(scheduledAppointments.status, 'scheduled'),
            gte(scheduledAppointments.scheduledDateTime, startOfDay),
            lte(scheduledAppointments.scheduledDateTime, endOfDay)
          )
        );

      // Create alerts for each appointment
      for (const { appointment, memberName } of appointments) {
        // Check for existing alert by alertType and relatedEntityId
        const existingAlert = await db
          .select()
          .from(healthAlerts)
          .where(
            and(
              eq(healthAlerts.familyMemberId, appointment.familyMemberId),
              eq(healthAlerts.alertType, 'appointment_reminder'),
              eq(healthAlerts.relatedEntityId, String(appointment.id))
            )
          )
          .limit(1);

        if (existingAlert.length === 0) {
          await db.insert(healthAlerts).values({
            familyMemberId: appointment.familyMemberId,
            alertType: 'appointment_reminder',
            category: 'appointment_upcoming',
            title: `Upcoming Appointment for ${memberName}`,
            message: `${memberName} has an appointment with ${appointment.providerName || 'their provider'} ${daysBefore === 1 ? 'tomorrow' : `in ${daysBefore} days`}.`,
            priority: daysBefore === 1 ? 'high' : 'medium',
            actionUrl: `/appointments/${appointment.id}`,
            relatedEntityType: 'appointment',
            relatedEntityId: String(appointment.id),
            metadata: { appointmentId: appointment.id, daysBefore },
          });
        }
      }
    }
  } catch (error) {
    console.error('Error generating appointment reminders:', error);
  }
}

// Generate goal milestone alerts
export async function generateGoalAlerts(): Promise<void> {
  try {
    const goals = await db
      .select({
        goal: healthGoals,
        memberName: familyMembers.name,
      })
      .from(healthGoals)
      .innerJoin(familyMembers, eq(healthGoals.familyMemberId, familyMembers.id))
      .where(eq(healthGoals.status, 'active'));

    for (const { goal, memberName } of goals) {
      // Check for milestone achievements (50%, 75%, 100%)
      const progress = goal.currentValue && goal.targetValue
        ? (goal.currentValue / goal.targetValue) * 100
        : 0;

      const milestones = [50, 75, 100];

      for (const milestone of milestones) {
        if (progress >= milestone) {
          // Check for existing alert by alertType and relatedEntityId
          const existingAlert = await db
            .select()
            .from(healthAlerts)
            .where(
              and(
                eq(healthAlerts.familyMemberId, goal.familyMemberId),
                eq(healthAlerts.alertType, 'milestone'),
                eq(healthAlerts.relatedEntityId, `${goal.id}-${milestone}`)
              )
            )
            .limit(1);

          if (existingAlert.length === 0) {
            await db.insert(healthAlerts).values({
              familyMemberId: goal.familyMemberId,
              alertType: 'milestone',
              category: 'goal_milestone',
              title: milestone === 100
                ? `Goal Achieved: ${goal.title}`
                : `${milestone}% Progress on ${goal.title}`,
              message: milestone === 100
                ? `Congratulations! ${memberName} has achieved their health goal: ${goal.title}!`
                : `${memberName} has reached ${milestone}% of their goal: ${goal.title}. Keep going!`,
              priority: milestone === 100 ? 'high' : 'low',
              actionUrl: `/goals/${goal.id}`,
              relatedEntityType: 'goal',
              relatedEntityId: `${goal.id}-${milestone}`,
              metadata: { goalId: goal.id, milestone },
            });
          }
        }
      }
    }
  } catch (error) {
    console.error('Error generating goal alerts:', error);
  }
}

// Run all proactive alert generators
router.post('/alerts/generate', async (req: Request, res: Response) => {
  try {
    await generateAppointmentReminders();
    await generateGoalAlerts();

    res.json({ success: true, message: 'Alerts generated successfully' });
  } catch (error) {
    console.error('Error generating proactive alerts:', error);
    res.status(500).json({ error: 'Failed to generate alerts' });
  }
});

export default router;
