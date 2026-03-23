import { Router, Request, Response } from 'express';
import { eq, and, lt } from 'drizzle-orm';
import { db } from './db';
import {
  actionItems,
  healthGoals,
  familyMembers,
  type ActionItem,
  type HealthGoal,
  insertActionItemSchema,
} from '@shared/schema';
import { CareGapsService, PatientHealthContext } from './care-gaps-service';

const router = Router();

const careGapsService = new CareGapsService();

// ============================================
// Demo fallback data
// ============================================

function getDemoCareCompletionSummary(familyMemberId: string) {
  return {
    familyMemberId: parseInt(familyMemberId),
    careGaps: [
      {
        id: 'demo-gap-1',
        measure: 'Annual Wellness Visit',
        status: 'open',
        priority: 'medium',
        description: 'Annual wellness visit is due. Last visit was over 12 months ago.',
        dueDate: '2026-04-15',
      },
      {
        id: 'demo-gap-2',
        measure: 'Blood Pressure Screening',
        status: 'open',
        priority: 'high',
        description: 'Blood pressure has not been measured in the last 2 years.',
        dueDate: '2026-03-30',
      },
      {
        id: 'demo-gap-3',
        measure: 'Cholesterol Screening',
        status: 'closed',
        priority: 'low',
        description: 'Lipid panel completed within recommended timeframe.',
        dueDate: null,
      },
    ],
    referrals: [
      {
        id: 1,
        title: 'Referral to Endocrinologist',
        description: 'Follow up on elevated A1C levels',
        priority: 'high',
        status: 'pending',
        category: 'referral',
        dueDate: '2026-04-01',
      },
      {
        id: 2,
        title: 'Dermatology Annual Screening',
        description: 'Annual skin cancer screening recommended',
        priority: 'medium',
        status: 'scheduled',
        category: 'referral',
        scheduledDate: '2026-05-10',
        dueDate: '2026-06-01',
      },
    ],
    actionItems: [
      {
        id: 3,
        title: 'Schedule flu vaccination',
        description: 'Annual influenza vaccination due',
        priority: 'medium',
        status: 'pending',
        category: 'preventive',
        dueDate: '2026-04-30',
      },
    ],
    completionRate: 42,
    totalItems: 6,
    completedItems: 2,
    overdueItems: 1,
  };
}

function getDemoOverdueItems(familyMemberId: string) {
  const today = new Date().toISOString().split('T')[0];
  return {
    familyMemberId: parseInt(familyMemberId),
    overdueItems: [
      {
        id: 1,
        title: 'Referral to Endocrinologist',
        description: 'Follow up on elevated A1C levels',
        priority: 'high',
        status: 'pending',
        category: 'referral',
        dueDate: '2026-03-01',
        daysOverdue: 22,
      },
    ],
    asOf: today,
  };
}

// ============================================
// GET /:familyMemberId/summary
// Aggregate care gaps + referral action items + completion percentage
// ============================================

router.get('/:familyMemberId/summary', async (req: Request, res: Response) => {
  try {
    const { familyMemberId } = req.params;
    const memberId = parseInt(familyMemberId);

    if (isNaN(memberId)) {
      return res.status(400).json({ error: 'Invalid family member ID' });
    }

    // If no DB available, return demo data
    if (!db) {
      return res.json(getDemoCareCompletionSummary(familyMemberId));
    }

    // Fetch family member
    const [member] = await db
      .select()
      .from(familyMembers)
      .where(eq(familyMembers.id, memberId));

    if (!member) {
      return res.status(404).json({ error: 'Family member not found' });
    }

    // Fetch action items for this member (referrals and follow-ups)
    const allActionItems: ActionItem[] = await db
      .select()
      .from(actionItems)
      .where(eq(actionItems.familyMemberId, memberId));

    const referrals = allActionItems.filter(
      (item) => item.category === 'referral'
    );
    const followUps = allActionItems.filter(
      (item) => item.category === 'follow_up'
    );
    const otherItems = allActionItems.filter(
      (item) => item.category !== 'referral' && item.category !== 'follow_up'
    );

    // Fetch health goals
    const goals: HealthGoal[] = await db
      .select()
      .from(healthGoals)
      .where(eq(healthGoals.familyMemberId, memberId));

    // Calculate completion
    const totalItems = allActionItems.length + goals.length;
    const completedActionItems = allActionItems.filter(
      (item) => item.status === 'completed'
    ).length;
    const achievedGoals = goals.filter(
      (goal) => goal.status === 'achieved'
    ).length;
    const completedItems = completedActionItems + achievedGoals;

    const today = new Date().toISOString().split('T')[0];
    const overdueItems = allActionItems.filter(
      (item) =>
        item.status !== 'completed' &&
        item.status !== 'cancelled' &&
        item.dueDate &&
        item.dueDate < today
    ).length;

    const completionRate =
      totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 100;

    // Try to get care gaps from CareGapsService if FHIR session is active
    let careGaps: any[] = [];
    if (member.fhirSessionId) {
      try {
        // Build a minimal patient context for care gap evaluation
        // In a full implementation, this would fetch from the FHIR session
        const dob = member.dateOfBirth || '1985-06-15';
        const minimalContext: PatientHealthContext = {
          patient: {
            id: `patient-${memberId}`,
            resourceType: 'Patient' as const,
            name: [{ family: member.name, given: [member.name.split(' ')[0]] }],
            birthDate: dob,
            gender: member.gender || 'unknown',
          },
          conditions: [],
          observations: [],
          medications: [],
          immunizations: [],
        };
        careGaps = careGapsService.evaluateAllCareGaps(minimalContext);
      } catch (err) {
        console.warn('Could not evaluate care gaps from FHIR session:', err);
      }
    }

    res.json({
      familyMemberId: memberId,
      careGaps,
      referrals,
      actionItems: [...followUps, ...otherItems],
      completionRate,
      totalItems,
      completedItems,
      overdueItems,
    });
  } catch (error) {
    console.error('Error fetching care completion summary:', error);
    res.status(500).json({ error: 'Failed to fetch care completion summary' });
  }
});

// ============================================
// POST /:familyMemberId/referral
// Create referral tracking item
// ============================================

router.post('/:familyMemberId/referral', async (req: Request, res: Response) => {
  try {
    const { familyMemberId } = req.params;
    const memberId = parseInt(familyMemberId);

    if (isNaN(memberId)) {
      return res.status(400).json({ error: 'Invalid family member ID' });
    }

    if (!db) {
      // Demo mode: return a synthetic response
      return res.status(201).json({
        id: Math.floor(Math.random() * 10000),
        familyMemberId: memberId,
        title: req.body.title || 'New Referral',
        description: req.body.description || null,
        priority: req.body.priority || 'medium',
        status: 'pending',
        category: 'referral',
        dueDate: req.body.dueDate || null,
        scheduledDate: req.body.scheduledDate || null,
        scheduledProvider: req.body.scheduledProvider || null,
        scheduledLocation: req.body.scheduledLocation || null,
        careGapId: req.body.careGapId || null,
        createdAt: new Date().toISOString(),
        completedAt: null,
        _demo: true,
      });
    }

    // Validate the family member exists
    const [member] = await db
      .select()
      .from(familyMembers)
      .where(eq(familyMembers.id, memberId));

    if (!member) {
      return res.status(404).json({ error: 'Family member not found' });
    }

    // Validate and insert the referral action item
    const referralData = {
      familyMemberId: memberId,
      title: req.body.title,
      description: req.body.description || null,
      priority: req.body.priority || 'medium',
      status: 'pending' as const,
      category: 'referral',
      dueDate: req.body.dueDate || null,
      scheduledDate: req.body.scheduledDate || null,
      scheduledProvider: req.body.scheduledProvider || null,
      scheduledLocation: req.body.scheduledLocation || null,
      careGapId: req.body.careGapId || null,
    };

    if (!referralData.title) {
      return res.status(400).json({ error: 'Title is required for a referral' });
    }

    const [inserted] = await db
      .insert(actionItems)
      .values(referralData)
      .returning();

    res.status(201).json(inserted);
  } catch (error) {
    console.error('Error creating referral:', error);
    res.status(500).json({ error: 'Failed to create referral' });
  }
});

// ============================================
// GET /:familyMemberId/overdue
// Items past due date
// ============================================

router.get('/:familyMemberId/overdue', async (req: Request, res: Response) => {
  try {
    const { familyMemberId } = req.params;
    const memberId = parseInt(familyMemberId);

    if (isNaN(memberId)) {
      return res.status(400).json({ error: 'Invalid family member ID' });
    }

    if (!db) {
      return res.json(getDemoOverdueItems(familyMemberId));
    }

    const today = new Date().toISOString().split('T')[0];

    // Fetch all action items that are overdue
    const allItems: ActionItem[] = await db
      .select()
      .from(actionItems)
      .where(eq(actionItems.familyMemberId, memberId));

    const overdueItems = allItems
      .filter(
        (item) =>
          item.status !== 'completed' &&
          item.status !== 'cancelled' &&
          item.dueDate &&
          item.dueDate < today
      )
      .map((item) => {
        const dueDate = new Date(item.dueDate!);
        const now = new Date();
        const daysOverdue = Math.floor(
          (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        return {
          ...item,
          daysOverdue,
        };
      })
      .sort((a, b) => b.daysOverdue - a.daysOverdue);

    // Also check health goals past target date
    const allGoals: HealthGoal[] = await db
      .select()
      .from(healthGoals)
      .where(eq(healthGoals.familyMemberId, memberId));

    const overdueGoals = allGoals
      .filter(
        (goal) =>
          goal.status === 'active' &&
          goal.targetDate &&
          goal.targetDate < today
      )
      .map((goal) => {
        const targetDate = new Date(goal.targetDate!);
        const now = new Date();
        const daysOverdue = Math.floor(
          (now.getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        return {
          ...goal,
          type: 'health_goal' as const,
          daysOverdue,
        };
      });

    res.json({
      familyMemberId: memberId,
      overdueItems,
      overdueGoals,
      asOf: today,
    });
  } catch (error) {
    console.error('Error fetching overdue items:', error);
    res.status(500).json({ error: 'Failed to fetch overdue items' });
  }
});

export default router;
