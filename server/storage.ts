import { users, type User, type InsertUser, type FhirSession, type InsertFhirSession, 
  type ChatMessage, type InsertChatMessage, chatMessages } from "@shared/schema";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // FHIR Session Management
  createFhirSession(session: InsertFhirSession): Promise<FhirSession>;
  getFhirSession(id: number): Promise<FhirSession | undefined>;
  getCurrentFhirSession(): Promise<FhirSession | undefined>;
  endCurrentFhirSession(): Promise<boolean>;
  
  // Chat Message Management
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  getChatMessages(fhirSessionId: number, limit?: number): Promise<ChatMessage[]>;
  clearChatHistory(fhirSessionId: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private fhirSessions: Map<number, FhirSession>;
  private userCurrentId: number;
  private sessionCurrentId: number;

  constructor() {
    this.users = new Map();
    this.fhirSessions = new Map();
    this.userCurrentId = 1;
    this.sessionCurrentId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userCurrentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  
  async createFhirSession(insertSession: InsertFhirSession): Promise<FhirSession> {
    const id = this.sessionCurrentId++;
    const createdAt = new Date();
    
    // Ensure all properties are properly set (not undefined)
    const session: FhirSession = {
      id,
      createdAt,
      provider: insertSession.provider,
      patientId: insertSession.patientId || null,
      scope: insertSession.scope || null,
      userId: insertSession.userId || null,
      accessToken: insertSession.accessToken || null,
      refreshToken: insertSession.refreshToken || null,
      tokenExpiry: insertSession.tokenExpiry || null,
      fhirServer: insertSession.fhirServer || null,
      state: insertSession.state || null
    };
    
    this.fhirSessions.set(id, session);
    return session;
  }
  
  async getFhirSession(id: number): Promise<FhirSession | undefined> {
    return this.fhirSessions.get(id);
  }
  
  async getCurrentFhirSession(): Promise<FhirSession | undefined> {
    // In memory storage we'll just return the latest session
    // In a real app with authentication, you'd get the session associated with the user
    const sessions = Array.from(this.fhirSessions.values());
    
    if (sessions.length === 0) {
      return undefined;
    }
    
    // Sort by id in descending order to get the latest session
    return sessions.sort((a, b) => b.id - a.id)[0];
  }
  
  async endCurrentFhirSession(): Promise<boolean> {
    const currentSession = await this.getCurrentFhirSession();
    
    if (!currentSession) {
      return false;
    }
    
    // Remove the session
    this.fhirSessions.delete(currentSession.id);
    return true;
  }
}

export const storage = new MemStorage();
