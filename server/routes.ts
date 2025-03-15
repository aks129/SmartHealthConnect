import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import FHIR from 'fhirclient';

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // Current FHIR session route
  app.get('/api/fhir/sessions/current', async (req: Request, res: Response) => {
    try {
      // In a real app with user auth, you'd get this from the session
      // For now, just get the most recently created session
      const session = await storage.getCurrentFhirSession();
      
      if (!session) {
        return res.status(401).json({ message: 'No active FHIR session' });
      }
      
      // Don't expose sensitive data like tokens
      const sanitizedSession = {
        id: session.id,
        provider: session.provider,
        fhirServer: session.fhirServer,
        patientId: session.patientId,
        scope: session.scope,
        createdAt: session.createdAt
      };
      
      res.json(sanitizedSession);
    } catch (error) {
      console.error('Error getting current FHIR session:', error);
      res.status(500).json({ message: 'Failed to retrieve current FHIR session' });
    }
  });
  
  // Create a new FHIR session
  app.post('/api/fhir/sessions', async (req: Request, res: Response) => {
    try {
      const session = await storage.createFhirSession(req.body);
      
      // Don't expose sensitive data like tokens
      const sanitizedSession = {
        id: session.id,
        provider: session.provider,
        fhirServer: session.fhirServer,
        patientId: session.patientId,
        scope: session.scope,
        createdAt: session.createdAt
      };
      
      res.status(201).json(sanitizedSession);
    } catch (error) {
      console.error('Error creating FHIR session:', error);
      res.status(500).json({ message: 'Failed to create FHIR session' });
    }
  });
  
  // End current FHIR session
  app.delete('/api/fhir/sessions/current', async (req: Request, res: Response) => {
    try {
      const result = await storage.endCurrentFhirSession();
      
      if (!result) {
        return res.status(404).json({ message: 'No active session to end' });
      }
      
      res.status(200).json({ message: 'Session ended successfully' });
    } catch (error) {
      console.error('Error ending FHIR session:', error);
      res.status(500).json({ message: 'Failed to end FHIR session' });
    }
  });
  
  // Get patient information
  app.get('/api/fhir/patient', async (req: Request, res: Response) => {
    try {
      const session = await storage.getCurrentFhirSession();
      
      if (!session) {
        return res.status(401).json({ message: 'No active FHIR session' });
      }
      
      // Create an authenticated FHIR client
      const client = await createFhirClient(session);
      
      // Get the patient data
      const patient = await client.request(`Patient/${session.patientId}`);
      
      res.json(patient);
    } catch (error) {
      console.error('Error fetching patient data:', error);
      res.status(500).json({ message: 'Failed to fetch patient data' });
    }
  });
  
  // Get conditions
  app.get('/api/fhir/condition', async (req: Request, res: Response) => {
    try {
      const session = await storage.getCurrentFhirSession();
      
      if (!session) {
        return res.status(401).json({ message: 'No active FHIR session' });
      }
      
      // Create an authenticated FHIR client
      const client = await createFhirClient(session);
      
      // Get conditions for the patient
      const conditions = await client.request(`Condition?patient=${session.patientId}`);
      
      res.json(conditions.entry ? conditions.entry.map((entry: any) => entry.resource) : []);
    } catch (error) {
      console.error('Error fetching conditions:', error);
      res.status(500).json({ message: 'Failed to fetch conditions' });
    }
  });
  
  // Get observations
  app.get('/api/fhir/observation', async (req: Request, res: Response) => {
    try {
      const session = await storage.getCurrentFhirSession();
      
      if (!session) {
        return res.status(401).json({ message: 'No active FHIR session' });
      }
      
      // Create an authenticated FHIR client
      const client = await createFhirClient(session);
      
      // Get observations for the patient, sorted by date
      const observations = await client.request(
        `Observation?patient=${session.patientId}&_sort=-date&_count=50`
      );
      
      res.json(observations.entry ? observations.entry.map((entry: any) => entry.resource) : []);
    } catch (error) {
      console.error('Error fetching observations:', error);
      res.status(500).json({ message: 'Failed to fetch observations' });
    }
  });
  
  // Get medication requests
  app.get('/api/fhir/medicationrequest', async (req: Request, res: Response) => {
    try {
      const session = await storage.getCurrentFhirSession();
      
      if (!session) {
        return res.status(401).json({ message: 'No active FHIR session' });
      }
      
      // Create an authenticated FHIR client
      const client = await createFhirClient(session);
      
      // Get medication requests for the patient
      const medications = await client.request(
        `MedicationRequest?patient=${session.patientId}&_sort=-date`
      );
      
      res.json(medications.entry ? medications.entry.map((entry: any) => entry.resource) : []);
    } catch (error) {
      console.error('Error fetching medications:', error);
      res.status(500).json({ message: 'Failed to fetch medications' });
    }
  });
  
  // Get allergies
  app.get('/api/fhir/allergyintolerance', async (req: Request, res: Response) => {
    try {
      const session = await storage.getCurrentFhirSession();
      
      if (!session) {
        return res.status(401).json({ message: 'No active FHIR session' });
      }
      
      // Create an authenticated FHIR client
      const client = await createFhirClient(session);
      
      // Get allergies for the patient
      const allergies = await client.request(
        `AllergyIntolerance?patient=${session.patientId}`
      );
      
      res.json(allergies.entry ? allergies.entry.map((entry: any) => entry.resource) : []);
    } catch (error) {
      console.error('Error fetching allergies:', error);
      res.status(500).json({ message: 'Failed to fetch allergies' });
    }
  });
  
  // Get immunizations
  app.get('/api/fhir/immunization', async (req: Request, res: Response) => {
    try {
      const session = await storage.getCurrentFhirSession();
      
      if (!session) {
        return res.status(401).json({ message: 'No active FHIR session' });
      }
      
      // Create an authenticated FHIR client
      const client = await createFhirClient(session);
      
      // Get immunizations for the patient
      const immunizations = await client.request(
        `Immunization?patient=${session.patientId}&_sort=-date`
      );
      
      res.json(immunizations.entry ? immunizations.entry.map((entry: any) => entry.resource) : []);
    } catch (error) {
      console.error('Error fetching immunizations:', error);
      res.status(500).json({ message: 'Failed to fetch immunizations' });
    }
  });
  
  return httpServer;
}

// Helper function to create an authenticated FHIR client
async function createFhirClient(session: any) {
  // Create a client configuration based on the session
  const clientConfig = {
    baseUrl: session.fhirServer,
    tokenResponse: {
      access_token: session.accessToken,
      refresh_token: session.refreshToken,
      expires_in: 3600, // Assume 1 hour if we don't know
      token_type: 'Bearer',
      scope: session.scope
    }
  };
  
  // Create a client with the configuration
  return FHIR.client(clientConfig);
}
