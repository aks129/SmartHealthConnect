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
  private chatMessages: Map<number, ChatMessage>;
  private userCurrentId: number;
  private sessionCurrentId: number;
  private messageCurrentId: number;

  constructor() {
    this.users = new Map();
    this.fhirSessions = new Map();
    this.chatMessages = new Map();
    this.userCurrentId = 1;
    this.sessionCurrentId = 1;
    this.messageCurrentId = 1;
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
  
  async createChatMessage(insertMessage: InsertChatMessage): Promise<ChatMessage> {
    const id = this.messageCurrentId++;
    const timestamp = new Date();
    
    const message: ChatMessage = {
      id,
      timestamp,
      fhirSessionId: insertMessage.fhirSessionId,
      role: insertMessage.role,
      content: insertMessage.content,
      contextData: insertMessage.contextData ?? null
    };
    
    this.chatMessages.set(id, message);
    return message;
  }
  
  async getChatMessages(fhirSessionId: number, limit?: number): Promise<ChatMessage[]> {
    // Filter messages by FHIR session ID
    const messages = Array.from(this.chatMessages.values())
      .filter(message => message.fhirSessionId === fhirSessionId)
      // Sort by timestamp in ascending order (oldest first for conversation flow)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    // Apply limit if specified
    if (limit !== undefined && limit > 0) {
      return messages.slice(-limit); // Return the latest 'limit' messages
    }
    
    return messages;
  }
  
  async clearChatHistory(fhirSessionId: number): Promise<boolean> {
    let deleted = false;
    
    // Find all messages for this session and remove them
    // Convert to array first to avoid iterator issues
    const entries = Array.from(this.chatMessages.entries());
    for (const [id, message] of entries) {
      if (message.fhirSessionId === fhirSessionId) {
        this.chatMessages.delete(id);
        deleted = true;
      }
    }
    
    return deleted;
  }
}

// Import DatabaseStorage
import { DatabaseStorage } from './database-storage';

// Export an instance of DatabaseStorage for persistent storage
export const storage = new DatabaseStorage();
