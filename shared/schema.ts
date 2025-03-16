import { pgTable, text, serial, integer, boolean, jsonb, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// FHIR Resources
export const fhirSessions = pgTable("fhir_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  provider: text("provider").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  tokenExpiry: timestamp("token_expiry"),
  fhirServer: text("fhir_server"),
  patientId: text("patient_id"),
  scope: text("scope"),
  state: text("state"),
  current: boolean("current").default(false),
  endedAt: timestamp("ended_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertFhirSessionSchema = createInsertSchema(fhirSessions).omit({
  id: true,
  createdAt: true,
});

export type InsertFhirSession = z.infer<typeof insertFhirSessionSchema>;
export type FhirSession = typeof fhirSessions.$inferSelect;

// FHIR Resource Schemas (used for validation)
export const patientSchema = z.object({
  id: z.string(),
  resourceType: z.literal("Patient"),
  name: z.array(z.object({
    family: z.string().optional(),
    given: z.array(z.string()).optional(),
    text: z.string().optional(),
  })).optional(),
  birthDate: z.string().optional(),
  gender: z.string().optional(),
  telecom: z.array(z.object({
    system: z.string(),
    value: z.string(),
    use: z.string().optional(),
  })).optional(),
  address: z.array(z.object({
    line: z.array(z.string()).optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postalCode: z.string().optional(),
    country: z.string().optional(),
  })).optional(),
  identifier: z.array(z.object({
    system: z.string().optional(),
    value: z.string(),
    type: z.object({
      coding: z.array(z.object({
        system: z.string().optional(),
        code: z.string().optional(),
        display: z.string().optional(),
      })).optional(),
    }).optional(),
  })).optional(),
});

export const conditionSchema = z.object({
  id: z.string(),
  resourceType: z.literal("Condition"),
  subject: z.object({
    reference: z.string(),
  }),
  code: z.object({
    coding: z.array(z.object({
      system: z.string().optional(),
      code: z.string().optional(),
      display: z.string().optional(),
    })).optional(),
    text: z.string().optional(),
  }).optional(),
  clinicalStatus: z.object({
    coding: z.array(z.object({
      system: z.string().optional(),
      code: z.string().optional(),
      display: z.string().optional(),
    })).optional(),
  }).optional(),
  verificationStatus: z.object({
    coding: z.array(z.object({
      system: z.string().optional(),
      code: z.string().optional(),
      display: z.string().optional(),
    })).optional(),
  }).optional(),
  category: z.array(z.object({
    coding: z.array(z.object({
      system: z.string().optional(),
      code: z.string().optional(),
      display: z.string().optional(),
    })).optional(),
  })).optional(),
  onsetDateTime: z.string().optional(),
  recordedDate: z.string().optional(),
});

export const observationSchema = z.object({
  id: z.string(),
  resourceType: z.literal("Observation"),
  subject: z.object({
    reference: z.string(),
  }),
  code: z.object({
    coding: z.array(z.object({
      system: z.string().optional(),
      code: z.string().optional(),
      display: z.string().optional(),
    })).optional(),
    text: z.string().optional(),
  }),
  valueQuantity: z.object({
    value: z.number().optional(),
    unit: z.string().optional(),
    system: z.string().optional(),
    code: z.string().optional(),
  }).optional(),
  valueString: z.string().optional(),
  valueCodeableConcept: z.object({
    coding: z.array(z.object({
      system: z.string().optional(),
      code: z.string().optional(),
      display: z.string().optional(),
    })).optional(),
    text: z.string().optional(),
  }).optional(),
  referenceRange: z.array(z.object({
    low: z.object({
      value: z.number().optional(),
      unit: z.string().optional(),
    }).optional(),
    high: z.object({
      value: z.number().optional(),
      unit: z.string().optional(),
    }).optional(),
    text: z.string().optional(),
  })).optional(),
  status: z.string().optional(),
  effectiveDateTime: z.string().optional(),
  issued: z.string().optional(),
});

export const medicationRequestSchema = z.object({
  id: z.string(),
  resourceType: z.literal("MedicationRequest"),
  subject: z.object({
    reference: z.string(),
  }),
  medicationCodeableConcept: z.object({
    coding: z.array(z.object({
      system: z.string().optional(),
      code: z.string().optional(),
      display: z.string().optional(),
    })).optional(),
    text: z.string().optional(),
  }).optional(),
  medicationReference: z.object({
    reference: z.string().optional(),
    display: z.string().optional(),
  }).optional(),
  status: z.string().optional(),
  authoredOn: z.string().optional(),
  dosageInstruction: z.array(z.object({
    text: z.string().optional(),
    timing: z.object({
      code: z.object({
        text: z.string().optional(),
      }).optional(),
    }).optional(),
  })).optional(),
});

export const allergyIntoleranceSchema = z.object({
  id: z.string(),
  resourceType: z.literal("AllergyIntolerance"),
  patient: z.object({
    reference: z.string(),
  }),
  code: z.object({
    coding: z.array(z.object({
      system: z.string().optional(),
      code: z.string().optional(),
      display: z.string().optional(),
    })).optional(),
    text: z.string().optional(),
  }),
  clinicalStatus: z.object({
    coding: z.array(z.object({
      system: z.string().optional(),
      code: z.string().optional(),
      display: z.string().optional(),
    })).optional(),
  }).optional(),
  verificationStatus: z.object({
    coding: z.array(z.object({
      system: z.string().optional(),
      code: z.string().optional(),
      display: z.string().optional(),
    })).optional(),
  }).optional(),
  type: z.string().optional(),
  category: z.array(z.string()).optional(),
  criticality: z.string().optional(),
  recordedDate: z.string().optional(),
  reaction: z.array(z.object({
    manifestation: z.array(z.object({
      coding: z.array(z.object({
        system: z.string().optional(),
        code: z.string().optional(),
        display: z.string().optional(),
      })).optional(),
      text: z.string().optional(),
    })).optional(),
    severity: z.string().optional(),
  })).optional(),
});

export const immunizationSchema = z.object({
  id: z.string(),
  resourceType: z.literal("Immunization"),
  patient: z.object({
    reference: z.string(),
  }),
  vaccineCode: z.object({
    coding: z.array(z.object({
      system: z.string().optional(),
      code: z.string().optional(),
      display: z.string().optional(),
    })).optional(),
    text: z.string().optional(),
  }),
  status: z.string(),
  occurrenceDateTime: z.string().optional(),
  primarySource: z.boolean().optional(),
  doseQuantity: z.object({
    value: z.number().optional(),
    unit: z.string().optional(),
  }).optional(),
});

export type Patient = z.infer<typeof patientSchema>;
export type Condition = z.infer<typeof conditionSchema>;
export type Observation = z.infer<typeof observationSchema>;
export type MedicationRequest = z.infer<typeof medicationRequestSchema>;
export type AllergyIntolerance = z.infer<typeof allergyIntoleranceSchema>;
export type Immunization = z.infer<typeof immunizationSchema>;

export const careGapSchema = z.object({
  id: z.string(),
  patientId: z.string(),
  title: z.string(),
  status: z.enum(['due', 'satisfied', 'not_applicable']),
  description: z.string(),
  dueDate: z.string().optional(),
  lastPerformedDate: z.string().optional(),
  recommendedAction: z.string(),
  measureId: z.string(),
  measurePeriodStart: z.string().optional(),
  measurePeriodEnd: z.string().optional(),
  category: z.enum(['preventive', 'chronic', 'wellness']),
  priority: z.enum(['high', 'medium', 'low']).optional(),
  reason: z.string().optional(),
});

export type CareGap = z.infer<typeof careGapSchema>;

// Chat Messages for AI conversation feature
export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  fhirSessionId: integer("fhir_session_id").references(() => fhirSessions.id).notNull(),
  role: text("role").notNull(), // "user" or "assistant"
  content: text("content").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  contextData: json("context_data"), // Store any relevant health data for context
});

// Define the insert schema for chat messages
export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  timestamp: true,
});

// Define types for chat messages
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;
