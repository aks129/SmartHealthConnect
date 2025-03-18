import { Request, Response } from 'express';
import { z } from 'zod';
import { storage } from './storage';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { db } from './db';

// Validation schemas
const updateProfileSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email().optional(),
  profilePicture: z.string().optional(),
});

const updateThemeSchema = z.object({
  theme: z.enum(["light", "dark", "system"]),
});

const updateNotificationsSchema = z.object({
  emailNotifications: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
  careGapAlerts: z.boolean().optional(),
  medicationReminders: z.boolean().optional(),
  appointmentReminders: z.boolean().optional(),
  healthSummaries: z.boolean().optional(),
});

// Register user-related API routes
export async function registerUserRoutes(app: any) {
  // Get current user profile
  app.get('/api/user/profile', async (req: Request, res: Response) => {
    try {
      // In a real app, this would use authenticated user ID
      // For demo purposes, use first user or create one if none exists
      let user = await db.select().from(users).limit(1);
      
      if (!user || user.length === 0) {
        // Create a default user if none exists
        const [newUser] = await db.insert(users).values({
          username: 'demo_user',
          password: 'password123',
          theme: 'system',
          notificationPreferences: {
            emailNotifications: true,
            pushNotifications: true,
            careGapAlerts: true,
            medicationReminders: true,
            appointmentReminders: true,
            healthSummaries: true
          }
        }).returning();
        
        return res.json(newUser);
      }
      
      return res.json(user[0]);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return res.status(500).json({ error: 'Failed to fetch user profile' });
    }
  });

  // Update user profile
  app.patch('/api/user/profile', async (req: Request, res: Response) => {
    try {
      const data = updateProfileSchema.parse(req.body);
      
      // In a real app, this would use authenticated user ID
      const [firstUser] = await db.select({ id: users.id }).from(users).limit(1);
      if (!firstUser) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      const [updated] = await db.update(users)
        .set({
          ...data,
          updatedAt: new Date()
        })
        .where(eq(users.id, firstUser.id))
        .returning();
      
      return res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error('Error updating user profile:', error);
      return res.status(500).json({ error: 'Failed to update user profile' });
    }
  });

  // Update theme preference
  app.patch('/api/user/theme', async (req: Request, res: Response) => {
    try {
      const { theme } = updateThemeSchema.parse(req.body);
      
      // In a real app, this would use authenticated user ID
      const [firstUser] = await db.select({ id: users.id }).from(users).limit(1);
      if (!firstUser) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      const [updated] = await db.update(users)
        .set({
          theme,
          updatedAt: new Date()
        })
        .where(eq(users.id, firstUser.id))
        .returning();
      
      return res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error('Error updating theme preference:', error);
      return res.status(500).json({ error: 'Failed to update theme preference' });
    }
  });

  // Update notification preferences
  app.patch('/api/user/notifications', async (req: Request, res: Response) => {
    try {
      const notificationData = updateNotificationsSchema.parse(req.body);
      
      // In a real app, this would use authenticated user ID
      const [firstUser] = await db.select().from(users).limit(1);
      if (!firstUser) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Merge with existing preferences
      const currentPreferences = firstUser.notificationPreferences || {};
      const updatedPreferences = { ...currentPreferences, ...notificationData };
      
      const [updated] = await db.update(users)
        .set({
          notificationPreferences: updatedPreferences,
          updatedAt: new Date()
        })
        .where(eq(users.id, firstUser.id))
        .returning();
      
      return res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error('Error updating notification preferences:', error);
      return res.status(500).json({ error: 'Failed to update notification preferences' });
    }
  });
}