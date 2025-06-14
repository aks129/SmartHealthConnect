import { eq, desc, and } from 'drizzle-orm';
import { db } from './db';
import { 
  users, fhirSessions, chatMessages,
  type User, type InsertUser,
  type FhirSession, type InsertFhirSession,
  type ChatMessage, type InsertChatMessage
} from '@shared/schema';
import { IStorage } from './storage';

export class DatabaseStorage implements IStorage {
  // User Management
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  // FHIR Session Management
  async createFhirSession(insertSession: InsertFhirSession): Promise<FhirSession> {
    // Create the session data with appropriate defaults
    const sessionData = {
      provider: insertSession.provider,
      userId: insertSession.userId || null,
      accessToken: insertSession.accessToken || null,
      refreshToken: insertSession.refreshToken || null,
      tokenExpiry: insertSession.tokenExpiry || null,
      fhirServer: insertSession.fhirServer || null,
      patientId: insertSession.patientId || null,
      scope: insertSession.scope || null,
      state: insertSession.state || null,
      current: insertSession.current || false,
      endedAt: null
    };

    // If current is set to true, find any other current sessions and set them to false
    if (sessionData.current) {
      await db
        .update(fhirSessions)
        .set({ 
          current: false,
          endedAt: new Date()
        })
        .where(eq(fhirSessions.current, true));
    }

    const [session] = await db
      .insert(fhirSessions)
      .values(sessionData)
      .returning();
    
    return session;
  }

  async getFhirSession(id: number): Promise<FhirSession | undefined> {
    const [session] = await db
      .select()
      .from(fhirSessions)
      .where(eq(fhirSessions.id, id));
    
    return session || undefined;
  }

  async getCurrentFhirSession(): Promise<FhirSession | undefined> {
    const [session] = await db
      .select()
      .from(fhirSessions)
      .where(eq(fhirSessions.current, true));
    
    return session || undefined;
  }

  async endCurrentFhirSession(): Promise<boolean> {
    const result = await db
      .update(fhirSessions)
      .set({ current: false, endedAt: new Date() })
      .where(eq(fhirSessions.current, true))
      .returning();
    
    return result.length > 0;
  }
  
  async updateFhirSessionMigration(
    sessionId: number, 
    migrated: boolean, 
    counts?: Record<string, number>
  ): Promise<FhirSession> {
    const updateData: Partial<FhirSession> = { migrated };
    
    if (migrated) {
      updateData.migrationDate = new Date();
      updateData.migrationCounts = counts || null;
    } else {
      updateData.migrationDate = null;
      updateData.migrationCounts = null;
    }
    
    const [updatedSession] = await db
      .update(fhirSessions)
      .set(updateData)
      .where(eq(fhirSessions.id, sessionId))
      .returning();
    
    if (!updatedSession) {
      throw new Error(`FHIR session with ID ${sessionId} not found`);
    }
    
    return updatedSession;
  }

  // Chat Message Management
  async createChatMessage(insertMessage: InsertChatMessage): Promise<ChatMessage> {
    const [message] = await db
      .insert(chatMessages)
      .values(insertMessage)
      .returning();
    
    return message;
  }

  async getChatMessages(fhirSessionId: number, limit?: number): Promise<ChatMessage[]> {
    let query = db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.fhirSessionId, fhirSessionId))
      .orderBy(chatMessages.timestamp);
    
    if (limit && limit > 0) {
      return (await query).slice(-limit);
    }
    
    return await query;
  }

  async clearChatHistory(fhirSessionId: number): Promise<boolean> {
    const result = await db
      .delete(chatMessages)
      .where(eq(chatMessages.fhirSessionId, fhirSessionId))
      .returning();
    
    return result.length > 0;
  }
}