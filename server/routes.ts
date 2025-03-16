import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import FHIR from 'fhirclient';
import { v4 as uuidv4 } from 'uuid';
import { generateHealthResponse, type HealthContext, type ChatHistoryItem } from './ai-service';
import { z } from 'zod';
import { insertChatMessageSchema } from '../shared/schema';

// Sample FHIR data for demo purposes
const samplePatient = {
  resourceType: "Patient",
  id: "demo-patient-1",
  active: true,
  name: [
    {
      use: "official",
      family: "Smith",
      given: ["John", "William"]
    }
  ],
  telecom: [
    {
      system: "phone",
      value: "555-123-4567",
      use: "home"
    },
    {
      system: "email",
      value: "john.smith@example.com",
      use: "work"
    }
  ],
  gender: "male",
  birthDate: "1980-07-15",
  address: [
    {
      use: "home",
      line: ["123 Main St"],
      city: "Anytown",
      state: "CA",
      postalCode: "12345",
      country: "USA"
    }
  ],
  identifier: [
    {
      use: "official",
      type: {
        coding: [
          {
            system: "http://terminology.hl7.org/CodeSystem/v2-0203",
            code: "MR",
            display: "Medical Record Number"
          }
        ],
        text: "Medical Record Number"
      },
      system: "http://hospital.example.org",
      value: "MRN-7893214"
    }
  ]
};

const sampleConditions = [
  {
    resourceType: "Condition",
    id: "demo-condition-1",
    clinicalStatus: {
      coding: [
        {
          system: "http://terminology.hl7.org/CodeSystem/condition-clinical",
          code: "active",
          display: "Active"
        }
      ]
    },
    verificationStatus: {
      coding: [
        {
          system: "http://terminology.hl7.org/CodeSystem/condition-ver-status",
          code: "confirmed",
          display: "Confirmed"
        }
      ]
    },
    category: [
      {
        coding: [
          {
            system: "http://terminology.hl7.org/CodeSystem/condition-category",
            code: "problem-list-item",
            display: "Problem List Item"
          }
        ]
      }
    ],
    code: {
      coding: [
        {
          system: "http://snomed.info/sct",
          code: "73211009",
          display: "Diabetes mellitus type 2"
        }
      ],
      text: "Type 2 Diabetes"
    },
    subject: {
      reference: "Patient/demo-patient-1",
      display: "John William Smith"
    },
    onsetDateTime: "2018-03-15",
    recordedDate: "2018-03-15"
  },
  {
    resourceType: "Condition",
    id: "demo-condition-2",
    clinicalStatus: {
      coding: [
        {
          system: "http://terminology.hl7.org/CodeSystem/condition-clinical",
          code: "active",
          display: "Active"
        }
      ]
    },
    verificationStatus: {
      coding: [
        {
          system: "http://terminology.hl7.org/CodeSystem/condition-ver-status",
          code: "confirmed",
          display: "Confirmed"
        }
      ]
    },
    category: [
      {
        coding: [
          {
            system: "http://terminology.hl7.org/CodeSystem/condition-category",
            code: "problem-list-item",
            display: "Problem List Item"
          }
        ]
      }
    ],
    code: {
      coding: [
        {
          system: "http://snomed.info/sct",
          code: "38341003",
          display: "Hypertension"
        }
      ],
      text: "Hypertension"
    },
    subject: {
      reference: "Patient/demo-patient-1",
      display: "John William Smith"
    },
    onsetDateTime: "2019-08-10",
    recordedDate: "2019-08-10"
  },
  {
    resourceType: "Condition",
    id: "demo-condition-3",
    clinicalStatus: {
      coding: [
        {
          system: "http://terminology.hl7.org/CodeSystem/condition-clinical",
          code: "resolved",
          display: "Resolved"
        }
      ]
    },
    verificationStatus: {
      coding: [
        {
          system: "http://terminology.hl7.org/CodeSystem/condition-ver-status",
          code: "confirmed",
          display: "Confirmed"
        }
      ]
    },
    category: [
      {
        coding: [
          {
            system: "http://terminology.hl7.org/CodeSystem/condition-category",
            code: "encounter-diagnosis",
            display: "Encounter Diagnosis"
          }
        ]
      }
    ],
    code: {
      coding: [
        {
          system: "http://snomed.info/sct",
          code: "8098009",
          display: "Acute bacterial sinusitis"
        }
      ],
      text: "Acute Sinusitis"
    },
    subject: {
      reference: "Patient/demo-patient-1",
      display: "John William Smith"
    },
    onsetDateTime: "2023-01-05",
    abatementDateTime: "2023-01-20",
    recordedDate: "2023-01-06"
  }
];

const sampleObservations = [
  {
    resourceType: "Observation",
    id: "demo-observation-1",
    status: "final",
    category: [
      {
        coding: [
          {
            system: "http://terminology.hl7.org/CodeSystem/observation-category",
            code: "laboratory",
            display: "Laboratory"
          }
        ],
        text: "Laboratory"
      }
    ],
    code: {
      coding: [
        {
          system: "http://loinc.org",
          code: "2093-3",
          display: "Cholesterol [Mass/volume] in Serum or Plasma"
        }
      ],
      text: "Cholesterol"
    },
    subject: {
      reference: "Patient/demo-patient-1",
      display: "John William Smith"
    },
    effectiveDateTime: "2023-02-15T08:30:00Z",
    issued: "2023-02-15T12:45:00Z",
    valueQuantity: {
      value: 210,
      unit: "mg/dL",
      system: "http://unitsofmeasure.org",
      code: "mg/dL"
    },
    referenceRange: [
      {
        low: {
          value: 0,
          unit: "mg/dL",
          system: "http://unitsofmeasure.org",
          code: "mg/dL"
        },
        high: {
          value: 200,
          unit: "mg/dL",
          system: "http://unitsofmeasure.org",
          code: "mg/dL"
        },
        text: "0-200 mg/dL"
      }
    ],
    interpretation: [
      {
        coding: [
          {
            system: "http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation",
            code: "H",
            display: "High"
          }
        ],
        text: "High"
      }
    ]
  },
  {
    resourceType: "Observation",
    id: "demo-observation-2",
    status: "final",
    category: [
      {
        coding: [
          {
            system: "http://terminology.hl7.org/CodeSystem/observation-category",
            code: "laboratory",
            display: "Laboratory"
          }
        ],
        text: "Laboratory"
      }
    ],
    code: {
      coding: [
        {
          system: "http://loinc.org",
          code: "2571-8",
          display: "Triglyceride [Mass/volume] in Serum or Plasma"
        }
      ],
      text: "Triglycerides"
    },
    subject: {
      reference: "Patient/demo-patient-1",
      display: "John William Smith"
    },
    effectiveDateTime: "2023-02-15T08:30:00Z",
    issued: "2023-02-15T12:45:00Z",
    valueQuantity: {
      value: 110,
      unit: "mg/dL",
      system: "http://unitsofmeasure.org",
      code: "mg/dL"
    },
    referenceRange: [
      {
        low: {
          value: 0,
          unit: "mg/dL",
          system: "http://unitsofmeasure.org",
          code: "mg/dL"
        },
        high: {
          value: 150,
          unit: "mg/dL",
          system: "http://unitsofmeasure.org",
          code: "mg/dL"
        },
        text: "0-150 mg/dL"
      }
    ],
    interpretation: [
      {
        coding: [
          {
            system: "http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation",
            code: "N",
            display: "Normal"
          }
        ],
        text: "Normal"
      }
    ]
  },
  {
    resourceType: "Observation",
    id: "demo-observation-3",
    status: "final",
    category: [
      {
        coding: [
          {
            system: "http://terminology.hl7.org/CodeSystem/observation-category",
            code: "vital-signs",
            display: "Vital Signs"
          }
        ],
        text: "Vital Signs"
      }
    ],
    code: {
      coding: [
        {
          system: "http://loinc.org",
          code: "8867-4",
          display: "Heart rate"
        }
      ],
      text: "Heart Rate"
    },
    subject: {
      reference: "Patient/demo-patient-1",
      display: "John William Smith"
    },
    effectiveDateTime: "2023-03-10T09:15:00Z",
    issued: "2023-03-10T09:20:00Z",
    valueQuantity: {
      value: 72,
      unit: "beats/minute",
      system: "http://unitsofmeasure.org",
      code: "/min"
    },
    referenceRange: [
      {
        low: {
          value: 60,
          unit: "beats/minute",
          system: "http://unitsofmeasure.org",
          code: "/min"
        },
        high: {
          value: 100,
          unit: "beats/minute",
          system: "http://unitsofmeasure.org",
          code: "/min"
        },
        text: "60-100 beats/minute"
      }
    ],
    interpretation: [
      {
        coding: [
          {
            system: "http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation",
            code: "N",
            display: "Normal"
          }
        ],
        text: "Normal"
      }
    ]
  },
  {
    resourceType: "Observation",
    id: "demo-observation-4",
    status: "final",
    category: [
      {
        coding: [
          {
            system: "http://terminology.hl7.org/CodeSystem/observation-category",
            code: "vital-signs",
            display: "Vital Signs"
          }
        ],
        text: "Vital Signs"
      }
    ],
    code: {
      coding: [
        {
          system: "http://loinc.org",
          code: "8480-6",
          display: "Systolic blood pressure"
        }
      ],
      text: "Blood Pressure"
    },
    subject: {
      reference: "Patient/demo-patient-1",
      display: "John William Smith"
    },
    effectiveDateTime: "2023-03-10T09:15:00Z",
    issued: "2023-03-10T09:20:00Z",
    component: [
      {
        code: {
          coding: [
            {
              system: "http://loinc.org",
              code: "8480-6",
              display: "Systolic blood pressure"
            }
          ],
          text: "Systolic"
        },
        valueQuantity: {
          value: 138,
          unit: "mmHg",
          system: "http://unitsofmeasure.org",
          code: "mm[Hg]"
        },
        interpretation: [
          {
            coding: [
              {
                system: "http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation",
                code: "H",
                display: "High"
              }
            ],
            text: "High"
          }
        ]
      },
      {
        code: {
          coding: [
            {
              system: "http://loinc.org",
              code: "8462-4",
              display: "Diastolic blood pressure"
            }
          ],
          text: "Diastolic"
        },
        valueQuantity: {
          value: 88,
          unit: "mmHg",
          system: "http://unitsofmeasure.org",
          code: "mm[Hg]"
        },
        interpretation: [
          {
            coding: [
              {
                system: "http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation",
                code: "N",
                display: "Normal"
              }
            ],
            text: "Normal"
          }
        ]
      }
    ]
  }
];

const sampleMedications = [
  {
    resourceType: "MedicationRequest",
    id: "demo-medication-1",
    status: "active",
    intent: "order",
    medicationCodeableConcept: {
      coding: [
        {
          system: "http://www.nlm.nih.gov/research/umls/rxnorm",
          code: "897122",
          display: "Metformin 500 MG Oral Tablet"
        }
      ],
      text: "Metformin 500 mg oral tablet"
    },
    subject: {
      reference: "Patient/demo-patient-1",
      display: "John William Smith"
    },
    authoredOn: "2022-10-15",
    requester: {
      reference: "Practitioner/demo-practitioner-1",
      display: "Dr. Jane Williams"
    },
    dosageInstruction: [
      {
        text: "Take 1 tablet by mouth twice daily with meals",
        timing: {
          repeat: {
            frequency: 2,
            period: 1,
            periodUnit: "d"
          }
        },
        route: {
          coding: [
            {
              system: "http://snomed.info/sct",
              code: "26643006",
              display: "Oral route"
            }
          ],
          text: "Oral"
        },
        doseAndRate: [
          {
            type: {
              coding: [
                {
                  system: "http://terminology.hl7.org/CodeSystem/dose-rate-type",
                  code: "ordered",
                  display: "Ordered"
                }
              ]
            },
            doseQuantity: {
              value: 1,
              unit: "tablet",
              system: "http://terminology.hl7.org/CodeSystem/v3-orderableDrugForm",
              code: "TAB"
            }
          }
        ]
      }
    ]
  },
  {
    resourceType: "MedicationRequest",
    id: "demo-medication-2",
    status: "active",
    intent: "order",
    medicationCodeableConcept: {
      coding: [
        {
          system: "http://www.nlm.nih.gov/research/umls/rxnorm",
          code: "197361",
          display: "Amlodipine 5 MG Oral Tablet"
        }
      ],
      text: "Amlodipine 5 mg oral tablet"
    },
    subject: {
      reference: "Patient/demo-patient-1",
      display: "John William Smith"
    },
    authoredOn: "2022-09-05",
    requester: {
      reference: "Practitioner/demo-practitioner-1",
      display: "Dr. Jane Williams"
    },
    dosageInstruction: [
      {
        text: "Take 1 tablet by mouth once daily",
        timing: {
          repeat: {
            frequency: 1,
            period: 1,
            periodUnit: "d"
          }
        },
        route: {
          coding: [
            {
              system: "http://snomed.info/sct",
              code: "26643006",
              display: "Oral route"
            }
          ],
          text: "Oral"
        },
        doseAndRate: [
          {
            type: {
              coding: [
                {
                  system: "http://terminology.hl7.org/CodeSystem/dose-rate-type",
                  code: "ordered",
                  display: "Ordered"
                }
              ]
            },
            doseQuantity: {
              value: 1,
              unit: "tablet",
              system: "http://terminology.hl7.org/CodeSystem/v3-orderableDrugForm",
              code: "TAB"
            }
          }
        ]
      }
    ]
  }
];

const sampleAllergies = [
  {
    resourceType: "AllergyIntolerance",
    id: "demo-allergy-1",
    clinicalStatus: {
      coding: [
        {
          system: "http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical",
          code: "active",
          display: "Active"
        }
      ]
    },
    verificationStatus: {
      coding: [
        {
          system: "http://terminology.hl7.org/CodeSystem/allergyintolerance-verification",
          code: "confirmed",
          display: "Confirmed"
        }
      ]
    },
    type: "allergy",
    category: ["medication"],
    criticality: "high",
    code: {
      coding: [
        {
          system: "http://www.nlm.nih.gov/research/umls/rxnorm",
          code: "7980",
          display: "Penicillin"
        }
      ],
      text: "Penicillin"
    },
    patient: {
      reference: "Patient/demo-patient-1",
      display: "John William Smith"
    },
    onsetDateTime: "2015-06-12",
    recordedDate: "2015-06-12",
    recorder: {
      reference: "Practitioner/demo-practitioner-1",
      display: "Dr. Jane Williams"
    },
    reaction: [
      {
        substance: {
          coding: [
            {
              system: "http://www.nlm.nih.gov/research/umls/rxnorm",
              code: "7980",
              display: "Penicillin"
            }
          ]
        },
        manifestation: [
          {
            coding: [
              {
                system: "http://snomed.info/sct",
                code: "247472004",
                display: "Hives"
              }
            ],
            text: "Hives"
          }
        ],
        severity: "severe"
      }
    ]
  }
];

const sampleImmunizations = [
  {
    resourceType: "Immunization",
    id: "demo-immunization-1",
    status: "completed",
    vaccineCode: {
      coding: [
        {
          system: "http://hl7.org/fhir/sid/cvx",
          code: "158",
          display: "Influenza, injectable, quadrivalent, contains preservative"
        }
      ],
      text: "Influenza vaccine"
    },
    patient: {
      reference: "Patient/demo-patient-1",
      display: "John William Smith"
    },
    occurrenceDateTime: "2022-10-30",
    primarySource: true,
    location: {
      reference: "Location/demo-location-1",
      display: "Community Clinic"
    },
    performer: [
      {
        actor: {
          reference: "Practitioner/demo-practitioner-1",
          display: "Dr. Jane Williams"
        }
      }
    ],
    note: [
      {
        text: "Patient tolerated the vaccination well with no immediate adverse effects."
      }
    ]
  },
  {
    resourceType: "Immunization",
    id: "demo-immunization-2",
    status: "completed",
    vaccineCode: {
      coding: [
        {
          system: "http://hl7.org/fhir/sid/cvx",
          code: "208",
          display: "COVID-19, mRNA, LNP-S, PF, 30 mcg/0.3 mL dose"
        }
      ],
      text: "COVID-19 mRNA Vaccine"
    },
    patient: {
      reference: "Patient/demo-patient-1",
      display: "John William Smith"
    },
    occurrenceDateTime: "2021-03-15",
    primarySource: true,
    location: {
      reference: "Location/demo-location-1",
      display: "Community Clinic"
    },
    performer: [
      {
        actor: {
          reference: "Practitioner/demo-practitioner-2",
          display: "Dr. Michael Chen"
        }
      }
    ],
    lotNumber: "EH9899",
    expirationDate: "2021-06-30",
    site: {
      coding: [
        {
          system: "http://snomed.info/sct",
          code: "368208006",
          display: "Left upper arm structure"
        }
      ]
    },
    doseQuantity: {
      value: 0.3,
      unit: "mL",
      system: "http://unitsofmeasure.org",
      code: "mL"
    }
  }
];

// Demo FHIR client that returns sample data
class DemoFhirClient {
  patientId: string;
  
  constructor(patientId: string) {
    this.patientId = patientId;
  }

  async request(resourceUrl: string) {
    // Parse the resource request
    if (resourceUrl.startsWith('Patient/')) {
      return samplePatient;
    } else if (resourceUrl.startsWith('Condition?patient=')) {
      return {
        resourceType: "Bundle",
        type: "searchset",
        entry: sampleConditions.map(resource => ({ resource }))
      };
    } else if (resourceUrl.startsWith('Observation?patient=')) {
      return {
        resourceType: "Bundle",
        type: "searchset",
        entry: sampleObservations.map(resource => ({ resource }))
      };
    } else if (resourceUrl.startsWith('MedicationRequest?patient=')) {
      return {
        resourceType: "Bundle",
        type: "searchset",
        entry: sampleMedications.map(resource => ({ resource }))
      };
    } else if (resourceUrl.startsWith('AllergyIntolerance?patient=')) {
      return {
        resourceType: "Bundle",
        type: "searchset",
        entry: sampleAllergies.map(resource => ({ resource }))
      };
    } else if (resourceUrl.startsWith('Immunization?patient=')) {
      return {
        resourceType: "Bundle",
        type: "searchset",
        entry: sampleImmunizations.map(resource => ({ resource }))
      };
    } else {
      return { entry: [] };
    }
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // Demo connection endpoint
  app.post('/api/fhir/demo/connect', async (req: Request, res: Response) => {
    try {
      // Create a demo FHIR session
      const sessionData = {
        provider: 'demo',
        accessToken: 'demo_access_token_' + uuidv4(),
        refreshToken: 'demo_refresh_token_' + uuidv4(),
        tokenExpiry: new Date(Date.now() + 3600 * 1000), // 1 hour from now
        fhirServer: '/api/fhir/demo',
        patientId: 'demo-patient-1',
        scope: 'patient/*.read',
        state: uuidv4()
      };
      
      // Save to storage
      const session = await storage.createFhirSession(sessionData);
      
      res.status(200).json({
        success: true,
        message: 'Demo session created successfully'
      });
    } catch (error) {
      console.error('Error creating demo session:', error);
      res.status(500).json({ message: 'Failed to create demo session' });
    }
  });
  
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
  
  // Chat API Endpoints
  
  // Get chat history
  app.get('/api/chat/messages', async (req: Request, res: Response) => {
    try {
      const session = await storage.getCurrentFhirSession();
      
      if (!session) {
        return res.status(401).json({ message: 'No active FHIR session' });
      }
      
      // Get query parameter for limit (optional)
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      
      // Get chat messages for the current session
      const messages = await storage.getChatMessages(session.id, limit);
      
      res.json(messages);
    } catch (error) {
      console.error('Error fetching chat messages:', error);
      res.status(500).json({ message: 'Failed to fetch chat messages' });
    }
  });
  
  // Send new message and get AI response
  app.post('/api/chat/messages', async (req: Request, res: Response) => {
    try {
      const session = await storage.getCurrentFhirSession();
      
      if (!session) {
        return res.status(401).json({ message: 'No active FHIR session' });
      }
      
      // Validate request body
      const messageSchema = insertChatMessageSchema.extend({
        content: z.string().min(1, "Message content cannot be empty")
      });
      
      const validatedMessage = messageSchema.parse({
        ...req.body,
        role: 'user',
        fhirSessionId: session.id
      });
      
      // Save user message to storage
      const userMessage = await storage.createChatMessage(validatedMessage);
      
      // Gather patient health context for AI response
      const healthContext: HealthContext = {};
      
      try {
        // Create FHIR client
        const client = await createFhirClient(session);
        
        // Fetch patient data
        const patient = await client.request(`Patient/${session.patientId}`);
        healthContext.patient = patient;
        
        // Fetch conditions
        const conditions = await client.request(`Condition?patient=${session.patientId}`);
        healthContext.conditions = conditions.entry ? 
          conditions.entry.map((entry: any) => entry.resource) : [];
        
        // Fetch observations (limited to most recent)
        const observations = await client.request(
          `Observation?patient=${session.patientId}&_sort=-date&_count=20`
        );
        healthContext.observations = observations.entry ? 
          observations.entry.map((entry: any) => entry.resource) : [];
        
        // Fetch medications
        const medications = await client.request(
          `MedicationRequest?patient=${session.patientId}&status=active`
        );
        healthContext.medications = medications.entry ? 
          medications.entry.map((entry: any) => entry.resource) : [];
        
        // Fetch allergies
        const allergies = await client.request(
          `AllergyIntolerance?patient=${session.patientId}`
        );
        healthContext.allergies = allergies.entry ? 
          allergies.entry.map((entry: any) => entry.resource) : [];
        
        // Fetch immunizations
        const immunizations = await client.request(
          `Immunization?patient=${session.patientId}`
        );
        healthContext.immunizations = immunizations.entry ? 
          immunizations.entry.map((entry: any) => entry.resource) : [];
        
      } catch (error) {
        console.error('Error gathering health context:', error);
        // Continue with limited context if there was an error
      }
      
      // Get recent chat history
      const chatHistory = await storage.getChatMessages(session.id, 10);
      
      // Format chat history for AI prompt
      const formattedHistory: ChatHistoryItem[] = chatHistory.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      }));
      
      // Generate AI response
      const aiResponseText = await generateHealthResponse(
        validatedMessage.content,
        healthContext,
        formattedHistory
      );
      
      // Save AI response to storage
      const aiResponseMessage = await storage.createChatMessage({
        fhirSessionId: session.id,
        role: 'assistant',
        content: aiResponseText,
        contextData: {
          healthContextSnapshot: healthContext,
          timestamp: new Date().toISOString()
        }
      });
      
      // Return both the original message and the response
      res.status(201).json({
        userMessage,
        aiResponse: aiResponseMessage
      });
      
    } catch (error) {
      console.error('Error processing chat message:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: 'Invalid message format', 
          errors: error.errors 
        });
      }
      
      res.status(500).json({ message: 'Failed to process chat message' });
    }
  });
  
  // Clear chat history
  app.delete('/api/chat/messages', async (req: Request, res: Response) => {
    try {
      const session = await storage.getCurrentFhirSession();
      
      if (!session) {
        return res.status(401).json({ message: 'No active FHIR session' });
      }
      
      // Clear chat history for the current session
      const deleted = await storage.clearChatHistory(session.id);
      
      if (deleted) {
        res.status(200).json({ message: 'Chat history cleared successfully' });
      } else {
        res.status(404).json({ message: 'No chat messages found to delete' });
      }
    } catch (error) {
      console.error('Error clearing chat history:', error);
      res.status(500).json({ message: 'Failed to clear chat history' });
    }
  });
  
  return httpServer;
}

// Helper function to create an authenticated FHIR client
async function createFhirClient(session: any) {
  // Special handling for demo provider
  if (session.provider === 'demo') {
    return new DemoFhirClient(session.patientId);
  }
  
  // Create a client configuration based on the session
  const clientConfig: any = {
    serverUrl: session.fhirServer,
    tokenResponse: {
      access_token: session.accessToken,
      refresh_token: session.refreshToken,
      expires_in: 3600, // Assume 1 hour if we don't know
      token_type: 'Bearer' as const, // Force the correct type
      scope: session.scope
    }
  };
  
  // Create a client with the configuration
  return FHIR.client(clientConfig);
}
