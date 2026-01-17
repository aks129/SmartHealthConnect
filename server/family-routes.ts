import { Router, Request, Response } from 'express';
import { eq, and, desc } from 'drizzle-orm';
import { db } from './db';
import {
  familyMembers,
  healthNarratives,
  healthGoals,
  actionItems,
  familyMemberInputSchema,
  healthGoalInputSchema,
  actionItemInputSchema,
  narrativeRequestSchema,
  type FamilyMember,
  type HealthNarrative,
  type HealthGoal,
  type ActionItem,
} from '@shared/schema';
import { generateHealthNarrative } from './narrative-service';

const router = Router();

// ============================================
// Family Members CRUD
// ============================================

// Get all family members for current user
router.get('/members', async (req: Request, res: Response) => {
  try {
    // For demo, use userId = 1; in production, get from session
    const userId = 1;

    const members = await db
      .select()
      .from(familyMembers)
      .where(eq(familyMembers.userId, userId))
      .orderBy(desc(familyMembers.isPrimary), familyMembers.name);

    res.json(members);
  } catch (error) {
    console.error('Error fetching family members:', error);
    res.status(500).json({ error: 'Failed to fetch family members' });
  }
});

// Get single family member
router.get('/members/:id', async (req: Request, res: Response) => {
  try {
    const memberId = parseInt(req.params.id);

    const [member] = await db
      .select()
      .from(familyMembers)
      .where(eq(familyMembers.id, memberId))
      .limit(1);

    if (!member) {
      return res.status(404).json({ error: 'Family member not found' });
    }

    res.json(member);
  } catch (error) {
    console.error('Error fetching family member:', error);
    res.status(500).json({ error: 'Failed to fetch family member' });
  }
});

// Create family member
router.post('/members', async (req: Request, res: Response) => {
  try {
    const userId = 1; // Demo user
    const validation = familyMemberInputSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({ error: validation.error.errors });
    }

    const data = validation.data;

    // If this is the first member or marked as primary, handle primary flag
    if (data.isPrimary) {
      // Unset any existing primary member
      await db
        .update(familyMembers)
        .set({ isPrimary: false })
        .where(eq(familyMembers.userId, userId));
    }

    const [newMember] = await db
      .insert(familyMembers)
      .values({
        userId,
        name: data.name,
        relationship: data.relationship,
        dateOfBirth: data.dateOfBirth,
        gender: data.gender,
        avatarUrl: data.avatarUrl,
        isPrimary: data.isPrimary || false,
      })
      .returning();

    res.status(201).json(newMember);
  } catch (error) {
    console.error('Error creating family member:', error);
    res.status(500).json({ error: 'Failed to create family member' });
  }
});

// Update family member
router.put('/members/:id', async (req: Request, res: Response) => {
  try {
    const memberId = parseInt(req.params.id);
    const userId = 1; // Demo user
    const validation = familyMemberInputSchema.partial().safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({ error: validation.error.errors });
    }

    const data = validation.data;

    // If setting as primary, unset others
    if (data.isPrimary) {
      await db
        .update(familyMembers)
        .set({ isPrimary: false })
        .where(eq(familyMembers.userId, userId));
    }

    const [updated] = await db
      .update(familyMembers)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(familyMembers.id, memberId))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Family member not found' });
    }

    res.json(updated);
  } catch (error) {
    console.error('Error updating family member:', error);
    res.status(500).json({ error: 'Failed to update family member' });
  }
});

// Delete family member
router.delete('/members/:id', async (req: Request, res: Response) => {
  try {
    const memberId = parseInt(req.params.id);

    const [deleted] = await db
      .delete(familyMembers)
      .where(eq(familyMembers.id, memberId))
      .returning();

    if (!deleted) {
      return res.status(404).json({ error: 'Family member not found' });
    }

    res.json({ success: true, deleted });
  } catch (error) {
    console.error('Error deleting family member:', error);
    res.status(500).json({ error: 'Failed to delete family member' });
  }
});

// Link FHIR session to family member
router.post('/members/:id/link-fhir', async (req: Request, res: Response) => {
  try {
    const memberId = parseInt(req.params.id);
    const { fhirSessionId } = req.body;

    const [updated] = await db
      .update(familyMembers)
      .set({ fhirSessionId, updatedAt: new Date() })
      .where(eq(familyMembers.id, memberId))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Family member not found' });
    }

    res.json(updated);
  } catch (error) {
    console.error('Error linking FHIR session:', error);
    res.status(500).json({ error: 'Failed to link FHIR session' });
  }
});

// ============================================
// Health Narratives
// ============================================

// Get narratives for a family member
router.get('/narratives/:memberId', async (req: Request, res: Response) => {
  try {
    const memberId = parseInt(req.params.memberId);

    const narratives = await db
      .select()
      .from(healthNarratives)
      .where(eq(healthNarratives.familyMemberId, memberId))
      .orderBy(desc(healthNarratives.generatedAt));

    res.json(narratives);
  } catch (error) {
    console.error('Error fetching narratives:', error);
    res.status(500).json({ error: 'Failed to fetch narratives' });
  }
});

// Generate new narrative
router.post('/narratives/generate', async (req: Request, res: Response) => {
  try {
    const validation = narrativeRequestSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({ error: validation.error.errors });
    }

    const { familyMemberId, narrativeType, forceRegenerate } = validation.data;

    // Check for existing valid narrative (unless force regenerate)
    if (!forceRegenerate) {
      const [existing] = await db
        .select()
        .from(healthNarratives)
        .where(
          and(
            eq(healthNarratives.familyMemberId, familyMemberId),
            eq(healthNarratives.narrativeType, narrativeType)
          )
        )
        .orderBy(desc(healthNarratives.generatedAt))
        .limit(1);

      // If valid narrative exists (less than 7 days old), return it
      if (existing && existing.validUntil && new Date(existing.validUntil) > new Date()) {
        return res.json(existing);
      }
    }

    // Generate new narrative
    const narrative = await generateHealthNarrative(familyMemberId, narrativeType);

    // Save to database
    const [saved] = await db
      .insert(healthNarratives)
      .values({
        familyMemberId,
        narrativeType,
        title: narrative.title,
        content: narrative.content,
        sourceData: narrative.sourceData,
        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Valid for 7 days
        aiModel: 'gpt-3.5-turbo',
      })
      .returning();

    res.json(saved);
  } catch (error) {
    console.error('Error generating narrative:', error);
    res.status(500).json({ error: 'Failed to generate narrative' });
  }
});

// ============================================
// Health Goals
// ============================================

// Get goals for a family member
router.get('/goals/:memberId', async (req: Request, res: Response) => {
  try {
    const memberId = parseInt(req.params.memberId);

    const goals = await db
      .select()
      .from(healthGoals)
      .where(eq(healthGoals.familyMemberId, memberId))
      .orderBy(desc(healthGoals.createdAt));

    res.json(goals);
  } catch (error) {
    console.error('Error fetching goals:', error);
    res.status(500).json({ error: 'Failed to fetch goals' });
  }
});

// Create health goal
router.post('/goals', async (req: Request, res: Response) => {
  try {
    const validation = healthGoalInputSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({ error: validation.error.errors });
    }

    const [newGoal] = await db
      .insert(healthGoals)
      .values(validation.data)
      .returning();

    res.status(201).json(newGoal);
  } catch (error) {
    console.error('Error creating goal:', error);
    res.status(500).json({ error: 'Failed to create goal' });
  }
});

// Update health goal
router.put('/goals/:id', async (req: Request, res: Response) => {
  try {
    const goalId = parseInt(req.params.id);
    const updates = req.body;

    const [updated] = await db
      .update(healthGoals)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(healthGoals.id, goalId))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    res.json(updated);
  } catch (error) {
    console.error('Error updating goal:', error);
    res.status(500).json({ error: 'Failed to update goal' });
  }
});

// Delete health goal
router.delete('/goals/:id', async (req: Request, res: Response) => {
  try {
    const goalId = parseInt(req.params.id);

    const [deleted] = await db
      .delete(healthGoals)
      .where(eq(healthGoals.id, goalId))
      .returning();

    if (!deleted) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting goal:', error);
    res.status(500).json({ error: 'Failed to delete goal' });
  }
});

// ============================================
// Action Items
// ============================================

// Get action items for a family member
router.get('/actions/:memberId', async (req: Request, res: Response) => {
  try {
    const memberId = parseInt(req.params.memberId);
    const { status } = req.query;

    let query = db
      .select()
      .from(actionItems)
      .where(eq(actionItems.familyMemberId, memberId));

    // Optionally filter by status
    if (status && typeof status === 'string') {
      query = db
        .select()
        .from(actionItems)
        .where(
          and(
            eq(actionItems.familyMemberId, memberId),
            eq(actionItems.status, status)
          )
        );
    }

    const items = await query.orderBy(
      desc(actionItems.priority),
      actionItems.dueDate
    );

    res.json(items);
  } catch (error) {
    console.error('Error fetching action items:', error);
    res.status(500).json({ error: 'Failed to fetch action items' });
  }
});

// Get all pending action items for user's family
router.get('/actions', async (req: Request, res: Response) => {
  try {
    const userId = 1; // Demo user

    // Get all family members for user
    const members = await db
      .select()
      .from(familyMembers)
      .where(eq(familyMembers.userId, userId));

    const memberIds = members.map((m: FamilyMember) => m.id);

    if (memberIds.length === 0) {
      return res.json([]);
    }

    // Get all pending action items for all family members
    const items = await db
      .select({
        actionItem: actionItems,
        memberName: familyMembers.name,
      })
      .from(actionItems)
      .innerJoin(familyMembers, eq(actionItems.familyMemberId, familyMembers.id))
      .where(eq(actionItems.status, 'pending'))
      .orderBy(desc(actionItems.priority), actionItems.dueDate);

    res.json(items);
  } catch (error) {
    console.error('Error fetching all action items:', error);
    res.status(500).json({ error: 'Failed to fetch action items' });
  }
});

// Create action item
router.post('/actions', async (req: Request, res: Response) => {
  try {
    const validation = actionItemInputSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({ error: validation.error.errors });
    }

    const [newItem] = await db
      .insert(actionItems)
      .values(validation.data)
      .returning();

    res.status(201).json(newItem);
  } catch (error) {
    console.error('Error creating action item:', error);
    res.status(500).json({ error: 'Failed to create action item' });
  }
});

// Schedule an action item
router.post('/actions/:id/schedule', async (req: Request, res: Response) => {
  try {
    const actionId = parseInt(req.params.id);
    const { scheduledDate, scheduledProvider, scheduledLocation } = req.body;

    const [updated] = await db
      .update(actionItems)
      .set({
        status: 'scheduled',
        scheduledDate,
        scheduledProvider,
        scheduledLocation,
      })
      .where(eq(actionItems.id, actionId))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Action item not found' });
    }

    res.json(updated);
  } catch (error) {
    console.error('Error scheduling action:', error);
    res.status(500).json({ error: 'Failed to schedule action' });
  }
});

// Complete an action item
router.post('/actions/:id/complete', async (req: Request, res: Response) => {
  try {
    const actionId = parseInt(req.params.id);

    const [updated] = await db
      .update(actionItems)
      .set({
        status: 'completed',
        completedAt: new Date(),
      })
      .where(eq(actionItems.id, actionId))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Action item not found' });
    }

    res.json(updated);
  } catch (error) {
    console.error('Error completing action:', error);
    res.status(500).json({ error: 'Failed to complete action' });
  }
});

// Update action item
router.put('/actions/:id', async (req: Request, res: Response) => {
  try {
    const actionId = parseInt(req.params.id);
    const updates = req.body;

    const [updated] = await db
      .update(actionItems)
      .set(updates)
      .where(eq(actionItems.id, actionId))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Action item not found' });
    }

    res.json(updated);
  } catch (error) {
    console.error('Error updating action item:', error);
    res.status(500).json({ error: 'Failed to update action item' });
  }
});

// Delete action item
router.delete('/actions/:id', async (req: Request, res: Response) => {
  try {
    const actionId = parseInt(req.params.id);

    const [deleted] = await db
      .delete(actionItems)
      .where(eq(actionItems.id, actionId))
      .returning();

    if (!deleted) {
      return res.status(404).json({ error: 'Action item not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting action item:', error);
    res.status(500).json({ error: 'Failed to delete action item' });
  }
});

// ============================================
// Family Dashboard Summary
// ============================================

// Get comprehensive family health summary
router.get('/summary', async (req: Request, res: Response) => {
  try {
    const userId = 1; // Demo user

    // Get all family members
    const members = await db
      .select()
      .from(familyMembers)
      .where(eq(familyMembers.userId, userId));

    // Get pending action items count per member
    const actionCounts = await Promise.all(
      members.map(async (member: FamilyMember) => {
        const items = await db
          .select()
          .from(actionItems)
          .where(
            and(
              eq(actionItems.familyMemberId, member.id),
              eq(actionItems.status, 'pending')
            )
          );
        return { memberId: member.id, pendingActions: items.length };
      })
    );

    // Combine data
    const summary = members.map((member: FamilyMember) => ({
      ...member,
      pendingActions: actionCounts.find(c => c.memberId === member.id)?.pendingActions || 0,
    }));

    res.json({
      members: summary,
      totalPendingActions: actionCounts.reduce((sum, c) => sum + c.pendingActions, 0),
    });
  } catch (error) {
    console.error('Error fetching family summary:', error);
    res.status(500).json({ error: 'Failed to fetch family summary' });
  }
});

export default router;
