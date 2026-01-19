import { pgTable, text, serial, integer, boolean, jsonb, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  profilePicture: text("profile_picture"),
  theme: text("theme").default("system"),
  notificationPreferences: jsonb("notification_preferences"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  firstName: true,
  lastName: true,
  profilePicture: true,
  theme: true,
  notificationPreferences: true,
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
  // HAPI FHIR server migration information
  migrated: boolean("migrated").default(false),
  migrationDate: timestamp("migration_date"),
  migrationCounts: jsonb("migration_counts"),
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
  interpretation: z.array(z.object({
    coding: z.array(z.object({
      system: z.string().optional(),
      code: z.string().optional(),
      display: z.string().optional(),
    })).optional(),
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

// Insurance Resources
export const coverageSchema = z.object({
  id: z.string(),
  resourceType: z.literal("Coverage"),
  status: z.string(),
  subscriber: z.object({
    reference: z.string().optional(),
    display: z.string().optional(),
  }).optional(),
  subscriberId: z.string().optional(),
  beneficiary: z.object({
    reference: z.string(),
  }),
  relationship: z.object({
    coding: z.array(z.object({
      system: z.string().optional(),
      code: z.string().optional(),
      display: z.string().optional(),
    })).optional(),
  }).optional(),
  period: z.object({
    start: z.string().optional(),
    end: z.string().optional(),
  }).optional(),
  payor: z.array(z.object({
    reference: z.string().optional(),
    display: z.string().optional(),
  })),
  class: z.array(z.object({
    type: z.object({
      coding: z.array(z.object({
        system: z.string().optional(),
        code: z.string().optional(),
        display: z.string().optional(),
      })).optional(),
    }).optional(),
    value: z.string().optional(),
    name: z.string().optional(),
  })).optional(),
  network: z.string().optional(),
  costToBeneficiary: z.array(z.object({
    type: z.object({
      coding: z.array(z.object({
        system: z.string().optional(),
        code: z.string().optional(),
        display: z.string().optional(),
      })).optional(),
    }).optional(),
    valueQuantity: z.object({
      value: z.number().optional(),
      unit: z.string().optional(),
      system: z.string().optional(),
      code: z.string().optional(),
    }).optional(),
    valueMoney: z.object({
      value: z.number().optional(),
      currency: z.string().optional(),
    }).optional(),
  })).optional(),
});

export const claimSchema = z.object({
  id: z.string(),
  resourceType: z.literal("Claim"),
  status: z.string(),
  type: z.object({
    coding: z.array(z.object({
      system: z.string().optional(),
      code: z.string().optional(),
      display: z.string().optional(),
    })).optional(),
  }).optional(),
  use: z.string(),
  patient: z.object({
    reference: z.string(),
  }),
  billablePeriod: z.object({
    start: z.string().optional(),
    end: z.string().optional(),
  }).optional(),
  created: z.string(),
  provider: z.object({
    reference: z.string().optional(),
    display: z.string().optional(),
  }).optional(),
  priority: z.object({
    coding: z.array(z.object({
      system: z.string().optional(),
      code: z.string().optional(),
      display: z.string().optional(),
    })).optional(),
  }).optional(),
  insurance: z.array(z.object({
    focal: z.boolean().optional(),
    coverage: z.object({
      reference: z.string().optional(),
      display: z.string().optional(),
    }),
  })),
  item: z.array(z.object({
    sequence: z.number(),
    productOrService: z.object({
      coding: z.array(z.object({
        system: z.string().optional(),
        code: z.string().optional(),
        display: z.string().optional(),
      })).optional(),
      text: z.string().optional(),
    }),
    servicedDate: z.string().optional(),
    unitPrice: z.object({
      value: z.number().optional(),
      currency: z.string().optional(),
    }).optional(),
    net: z.object({
      value: z.number().optional(),
      currency: z.string().optional(),
    }).optional(),
  })).optional(),
  total: z.object({
    value: z.number().optional(),
    currency: z.string().optional(),
  }).optional(),
});

export const explanationOfBenefitSchema = z.object({
  id: z.string(),
  resourceType: z.literal("ExplanationOfBenefit"),
  status: z.string(),
  type: z.object({
    coding: z.array(z.object({
      system: z.string().optional(),
      code: z.string().optional(),
      display: z.string().optional(),
    })).optional(),
  }).optional(),
  use: z.string(),
  patient: z.object({
    reference: z.string(),
  }),
  created: z.string(),
  insurer: z.object({
    reference: z.string().optional(),
    display: z.string().optional(),
  }).optional(),
  provider: z.object({
    reference: z.string().optional(),
    display: z.string().optional(),
  }).optional(),
  outcome: z.string(),
  insurance: z.array(z.object({
    focal: z.boolean().optional(),
    coverage: z.object({
      reference: z.string().optional(),
      display: z.string().optional(),
    }),
  })),
  item: z.array(z.object({
    sequence: z.number(),
    productOrService: z.object({
      coding: z.array(z.object({
        system: z.string().optional(),
        code: z.string().optional(),
        display: z.string().optional(),
      })).optional(),
      text: z.string().optional(),
    }),
    servicedDate: z.string().optional(),
    adjudication: z.array(z.object({
      category: z.object({
        coding: z.array(z.object({
          system: z.string().optional(),
          code: z.string().optional(),
          display: z.string().optional(),
        })).optional(),
      }),
      amount: z.object({
        value: z.number().optional(),
        currency: z.string().optional(),
      }).optional(),
    })).optional(),
  })).optional(),
  total: z.array(z.object({
    category: z.object({
      coding: z.array(z.object({
        system: z.string().optional(),
        code: z.string().optional(),
        display: z.string().optional(),
      })).optional(),
    }),
    amount: z.object({
      value: z.number().optional(),
      currency: z.string().optional(),
    }).optional(),
  })).optional(),
  payment: z.object({
    amount: z.object({
      value: z.number().optional(),
      currency: z.string().optional(),
    }).optional(),
    date: z.string().optional(),
  }).optional(),
});

export type Coverage = z.infer<typeof coverageSchema>;
export type Claim = z.infer<typeof claimSchema>;
export type ExplanationOfBenefit = z.infer<typeof explanationOfBenefitSchema>;

export const practitionerSchema = z.object({
  resourceType: z.literal('Practitioner'),
  id: z.string(),
  name: z.array(z.object({
    use: z.string().optional(),
    family: z.string().optional(),
    given: z.array(z.string()).optional(),
    prefix: z.array(z.string()).optional(),
    suffix: z.array(z.string()).optional(),
    text: z.string().optional(),
  })).optional(),
  telecom: z.array(z.object({
    system: z.string().optional(),
    value: z.string().optional(),
    use: z.string().optional(),
  })).optional(),
  address: z.array(z.object({
    use: z.string().optional(),
    type: z.string().optional(),
    text: z.string().optional(),
    line: z.array(z.string()).optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postalCode: z.string().optional(),
    country: z.string().optional(),
  })).optional(),
  gender: z.string().optional(),
  birthDate: z.string().optional(),
  qualification: z.array(z.object({
    identifier: z.array(z.object({
      system: z.string().optional(),
      value: z.string().optional(),
    })).optional(),
    code: z.object({
      coding: z.array(z.object({
        system: z.string().optional(),
        code: z.string().optional(),
        display: z.string().optional(),
      })).optional(),
      text: z.string().optional(),
    }).optional(),
    period: z.object({
      start: z.string().optional(),
      end: z.string().optional(),
    }).optional(),
    issuer: z.object({
      reference: z.string().optional(),
      display: z.string().optional(),
    }).optional(),
  })).optional(),
});

export const organizationSchema = z.object({
  resourceType: z.literal('Organization'),
  id: z.string(),
  identifier: z.array(z.object({
    system: z.string().optional(),
    value: z.string().optional(),
  })).optional(),
  active: z.boolean().optional(),
  type: z.array(z.object({
    coding: z.array(z.object({
      system: z.string().optional(),
      code: z.string().optional(),
      display: z.string().optional(),
    })).optional(),
    text: z.string().optional(),
  })).optional(),
  name: z.string().optional(),
  alias: z.array(z.string()).optional(),
  telecom: z.array(z.object({
    system: z.string().optional(),
    value: z.string().optional(),
    use: z.string().optional(),
  })).optional(),
  address: z.array(z.object({
    use: z.string().optional(),
    type: z.string().optional(),
    text: z.string().optional(),
    line: z.array(z.string()).optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postalCode: z.string().optional(),
    country: z.string().optional(),
  })).optional(),
  partOf: z.object({
    reference: z.string().optional(),
    display: z.string().optional(),
  }).optional(),
});

export const locationSchema = z.object({
  resourceType: z.literal('Location'),
  id: z.string(),
  status: z.string().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  mode: z.string().optional(),
  type: z.array(z.object({
    coding: z.array(z.object({
      system: z.string().optional(),
      code: z.string().optional(),
      display: z.string().optional(),
    })).optional(),
    text: z.string().optional(),
  })).optional(),
  telecom: z.array(z.object({
    system: z.string().optional(),
    value: z.string().optional(),
    use: z.string().optional(),
  })).optional(),
  address: z.object({
    use: z.string().optional(),
    type: z.string().optional(),
    text: z.string().optional(),
    line: z.array(z.string()).optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postalCode: z.string().optional(),
    country: z.string().optional(),
  }).optional(),
  position: z.object({
    longitude: z.number().optional(),
    latitude: z.number().optional(),
    altitude: z.number().optional(),
  }).optional(),
  managingOrganization: z.object({
    reference: z.string().optional(),
    display: z.string().optional(),
  }).optional(),
});

export const appointmentSchema = z.object({
  resourceType: z.literal('Appointment'),
  id: z.string(),
  status: z.string().optional(),
  serviceCategory: z.array(z.object({
    coding: z.array(z.object({
      system: z.string().optional(),
      code: z.string().optional(),
      display: z.string().optional(),
    })).optional(),
  })).optional(),
  serviceType: z.array(z.object({
    coding: z.array(z.object({
      system: z.string().optional(),
      code: z.string().optional(),
      display: z.string().optional(),
    })).optional(),
  })).optional(),
  specialty: z.array(z.object({
    coding: z.array(z.object({
      system: z.string().optional(),
      code: z.string().optional(),
      display: z.string().optional(),
    })).optional(),
  })).optional(),
  appointmentType: z.object({
    coding: z.array(z.object({
      system: z.string().optional(),
      code: z.string().optional(),
      display: z.string().optional(),
    })).optional(),
  }).optional(),
  reasonCode: z.array(z.object({
    coding: z.array(z.object({
      system: z.string().optional(),
      code: z.string().optional(),
      display: z.string().optional(),
    })).optional(),
    text: z.string().optional(),
  })).optional(),
  start: z.string().optional(),
  end: z.string().optional(),
  minutesDuration: z.number().optional(),
  participant: z.array(z.object({
    type: z.array(z.object({
      coding: z.array(z.object({
        system: z.string().optional(),
        code: z.string().optional(),
        display: z.string().optional(),
      })).optional(),
    })).optional(),
    actor: z.object({
      reference: z.string().optional(),
      display: z.string().optional(),
    }).optional(),
    required: z.string().optional(),
    status: z.string().optional(),
  })),
  description: z.string().optional(),
  location: z.array(z.object({
    location: z.object({
      reference: z.string().optional(),
      display: z.string().optional(),
    }),
    status: z.string().optional(),
  })).optional(),
});

export const practitionerRoleSchema = z.object({
  resourceType: z.literal('PractitionerRole'),
  id: z.string(),
  active: z.boolean().optional(),
  period: z.object({
    start: z.string().optional(),
    end: z.string().optional(),
  }).optional(),
  practitioner: z.object({
    reference: z.string().optional(),
    display: z.string().optional(),
  }).optional(),
  organization: z.object({
    reference: z.string().optional(),
    display: z.string().optional(),
  }).optional(),
  code: z.array(z.object({
    coding: z.array(z.object({
      system: z.string().optional(),
      code: z.string().optional(),
      display: z.string().optional(),
    })).optional(),
    text: z.string().optional(),
  })).optional(),
  specialty: z.array(z.object({
    coding: z.array(z.object({
      system: z.string().optional(),
      code: z.string().optional(),
      display: z.string().optional(),
    })).optional(),
    text: z.string().optional(),
  })).optional(),
  location: z.array(z.object({
    reference: z.string().optional(),
    display: z.string().optional(),
  })).optional(),
  telecom: z.array(z.object({
    system: z.string().optional(),
    value: z.string().optional(),
    use: z.string().optional(),
  })).optional(),
  availableTime: z.array(z.object({
    daysOfWeek: z.array(z.string()).optional(),
    allDay: z.boolean().optional(),
    availableStartTime: z.string().optional(),
    availableEndTime: z.string().optional(),
  })).optional(),
});

// Export the types
export type Practitioner = z.infer<typeof practitionerSchema>;
export type Organization = z.infer<typeof organizationSchema>;
export type Location = z.infer<typeof locationSchema>;
export type Appointment = z.infer<typeof appointmentSchema>;
export type PractitionerRole = z.infer<typeof practitionerRoleSchema>;

// ============================================
// PHASE 1: Family Health Management Tables
// ============================================

// Family member relationships
export const familyMembers = pgTable("family_members", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  relationship: text("relationship").notNull(), // 'self', 'child', 'spouse', 'parent', 'sibling'
  dateOfBirth: text("date_of_birth"), // ISO date string
  fhirSessionId: integer("fhir_session_id").references(() => fhirSessions.id),
  avatarUrl: text("avatar_url"),
  isPrimary: boolean("is_primary").default(false),
  gender: text("gender"), // 'male', 'female', 'other'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertFamilyMemberSchema = createInsertSchema(familyMembers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertFamilyMember = z.infer<typeof insertFamilyMemberSchema>;
export type FamilyMember = typeof familyMembers.$inferSelect;

// Health narratives (AI-generated summaries)
export const healthNarratives = pgTable("health_narratives", {
  id: serial("id").primaryKey(),
  familyMemberId: integer("family_member_id").references(() => familyMembers.id).notNull(),
  narrativeType: text("narrative_type").notNull(), // 'overview', 'condition_focus', 'preventive', 'growth', 'medication'
  title: text("title"),
  content: text("content").notNull(),
  sourceData: jsonb("source_data"), // References to FHIR resources used
  keyInsights: jsonb("key_insights"), // Array of key insights extracted from narrative
  generatedAt: timestamp("generated_at").defaultNow(),
  validUntil: timestamp("valid_until"), // When narrative should be regenerated
  aiModel: text("ai_model"),
});

export const insertHealthNarrativeSchema = createInsertSchema(healthNarratives).omit({
  id: true,
  generatedAt: true,
});

export type InsertHealthNarrative = z.infer<typeof insertHealthNarrativeSchema>;
export type HealthNarrative = typeof healthNarratives.$inferSelect;

// Health goals for tracking
export const healthGoals = pgTable("health_goals", {
  id: serial("id").primaryKey(),
  familyMemberId: integer("family_member_id").references(() => familyMembers.id).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  targetValue: integer("target_value"), // Numeric target value
  currentValue: integer("current_value"), // Numeric current value
  unit: text("unit"),
  category: text("category"), // 'weight', 'a1c', 'bp', 'activity', 'nutrition', 'sleep', 'custom'
  status: text("status").default("active"), // 'active', 'achieved', 'paused', 'cancelled'
  targetDate: text("target_date"), // ISO date string
  progress: integer("progress").default(0), // 0-100 percentage
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertHealthGoalSchema = createInsertSchema(healthGoals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertHealthGoal = z.infer<typeof insertHealthGoalSchema>;
export type HealthGoal = typeof healthGoals.$inferSelect;

// Action items (care gaps + custom tasks)
export const actionItems = pgTable("action_items", {
  id: serial("id").primaryKey(),
  familyMemberId: integer("family_member_id").references(() => familyMembers.id).notNull(),
  careGapId: text("care_gap_id"), // Reference to FHIR care gap if applicable
  title: text("title").notNull(),
  description: text("description"),
  priority: text("priority").default("medium"), // 'high', 'medium', 'low'
  status: text("status").default("pending"), // 'pending', 'scheduled', 'completed', 'cancelled'
  dueDate: text("due_date"), // ISO date string
  scheduledDate: text("scheduled_date"), // ISO date string
  scheduledProvider: text("scheduled_provider"),
  scheduledLocation: text("scheduled_location"),
  category: text("category"), // 'preventive', 'chronic', 'wellness', 'follow_up', 'custom'
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const insertActionItemSchema = createInsertSchema(actionItems).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export type InsertActionItem = z.infer<typeof insertActionItemSchema>;
export type ActionItem = typeof actionItems.$inferSelect;

// ============================================
// PHASE 2: Scheduling & Form Pre-fill Tables
// ============================================

// Scheduled appointments (beyond FHIR appointments)
export const scheduledAppointments = pgTable("scheduled_appointments", {
  id: serial("id").primaryKey(),
  familyMemberId: integer("family_member_id").references(() => familyMembers.id).notNull(),
  actionItemId: integer("action_item_id").references(() => actionItems.id),
  providerName: text("provider_name"),
  providerNpi: text("provider_npi"),
  facilityName: text("facility_name"),
  facilityAddress: text("facility_address"),
  appointmentType: text("appointment_type"), // 'office_visit', 'procedure', 'lab', 'imaging', 'telehealth'
  scheduledDateTime: timestamp("scheduled_date_time"),
  durationMinutes: integer("duration_minutes"),
  status: text("status").default("scheduled"), // 'scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'
  confirmationNumber: text("confirmation_number"),
  notes: text("notes"),
  reminderSent: boolean("reminder_sent").default(false),
  prefilledFormId: integer("prefilled_form_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertScheduledAppointmentSchema = createInsertSchema(scheduledAppointments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertScheduledAppointment = z.infer<typeof insertScheduledAppointmentSchema>;
export type ScheduledAppointment = typeof scheduledAppointments.$inferSelect;

// Form templates for pre-fill
export const formTemplates = pgTable("form_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  providerType: text("provider_type"), // 'general', 'specialist', 'lab', 'imaging', 'dental', 'vision'
  fields: jsonb("fields").notNull(), // Array of IntakeFormField
  version: integer("version").default(1),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertFormTemplateSchema = createInsertSchema(formTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertFormTemplate = z.infer<typeof insertFormTemplateSchema>;
export type FormTemplate = typeof formTemplates.$inferSelect;

// Pre-filled forms ready for appointments
export const prefilledForms = pgTable("prefilled_forms", {
  id: serial("id").primaryKey(),
  familyMemberId: integer("family_member_id").references(() => familyMembers.id).notNull(),
  templateId: integer("template_id").references(() => formTemplates.id).notNull(),
  appointmentId: integer("appointment_id").references(() => scheduledAppointments.id),
  filledData: jsonb("filled_data").notNull(), // Pre-filled form data
  status: text("status").default("draft"), // 'draft', 'ready', 'submitted', 'verified'
  generatedAt: timestamp("generated_at").defaultNow(),
  submittedAt: timestamp("submitted_at"),
  lastModified: timestamp("last_modified").defaultNow(),
});

export const insertPrefilledFormSchema = createInsertSchema(prefilledForms).omit({
  id: true,
  generatedAt: true,
  submittedAt: true,
  lastModified: true,
});

export type InsertPrefilledForm = z.infer<typeof insertPrefilledFormSchema>;
export type PrefilledForm = typeof prefilledForms.$inferSelect;

// ============================================
// PHASE 3: Proactive Health Alerts & Digests
// ============================================

// Health alerts and notifications
export const healthAlerts = pgTable("health_alerts", {
  id: serial("id").primaryKey(),
  familyMemberId: integer("family_member_id").references(() => familyMembers.id).notNull(),
  alertType: text("alert_type").notNull(), // 'care_gap_due', 'trend_concern', 'medication_refill', 'appointment_reminder', 'milestone', 'custom'
  category: text("category"), // 'medication_reminder', 'appointment_upcoming', 'care_gap', 'goal_milestone', 'health_trend', 'preventive_care', 'follow_up_needed'
  priority: text("priority").default("medium"), // 'urgent', 'high', 'medium', 'low'
  title: text("title").notNull(),
  message: text("message").notNull(),
  actionUrl: text("action_url"),
  actionLabel: text("action_label"),
  metadata: jsonb("metadata"), // Additional context data
  scheduledFor: timestamp("scheduled_for"),
  sentAt: timestamp("sent_at"),
  readAt: timestamp("read_at"),
  dismissedAt: timestamp("dismissed_at"),
  relatedEntityType: text("related_entity_type"), // 'care_gap', 'observation', 'medication', 'appointment'
  relatedEntityId: text("related_entity_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertHealthAlertSchema = createInsertSchema(healthAlerts).omit({
  id: true,
  sentAt: true,
  readAt: true,
  dismissedAt: true,
  createdAt: true,
});

export type InsertHealthAlert = z.infer<typeof insertHealthAlertSchema>;
export type HealthAlert = typeof healthAlerts.$inferSelect;

// Weekly health digests
export const healthDigests = pgTable("health_digests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  weekStartDate: timestamp("week_start_date").notNull(),
  weekEndDate: timestamp("week_end_date"),
  summary: jsonb("summary").notNull(), // Full digest content with appointments, goals, actions
  highlights: jsonb("highlights"), // Key highlights from the week
  appointmentCount: integer("appointment_count").default(0),
  actionItemCount: integer("action_item_count").default(0),
  completedActionsCount: integer("completed_actions_count").default(0),
  status: text("status").default("pending"), // 'pending', 'sent', 'failed'
  generatedAt: timestamp("generated_at").defaultNow(),
  readAt: timestamp("read_at"),
  sentAt: timestamp("sent_at"),
  deliveryMethod: text("delivery_method").default("email"), // 'email', 'push', 'in_app'
});

export const insertHealthDigestSchema = createInsertSchema(healthDigests).omit({
  id: true,
  generatedAt: true,
  sentAt: true,
});

export type InsertHealthDigest = z.infer<typeof insertHealthDigestSchema>;
export type HealthDigest = typeof healthDigests.$inferSelect;

// ============================================
// HIPAA Audit Logs - Required for compliance
// ============================================
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  userEmail: text("user_email"),
  action: text("action").notNull(), // CREATE, READ, UPDATE, DELETE, ACCESS, EXPORT
  resourceType: text("resource_type").notNull(), // PATIENT, CONDITION, OBSERVATION, etc.
  resourceId: text("resource_id"),
  ipAddress: text("ip_address").notNull(),
  userAgent: text("user_agent"),
  endpoint: text("endpoint").notNull(),
  method: text("method").notNull(),
  statusCode: integer("status_code").notNull(),
  success: boolean("success").notNull(),
  errorMessage: text("error_message"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
});

export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;

// ============================================
// Refresh Tokens - For secure token rotation
// ============================================
export const refreshTokens = pgTable("refresh_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  revokedAt: timestamp("revoked_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  userAgent: text("user_agent"),
  ipAddress: text("ip_address"),
});

export type RefreshToken = typeof refreshTokens.$inferSelect;

// ============================================
// Zod Schemas for API Validation
// ============================================

// Family member validation schema
export const familyMemberInputSchema = z.object({
  name: z.string().min(1, "Name is required"),
  relationship: z.enum(['self', 'child', 'spouse', 'parent', 'sibling', 'other']),
  dateOfBirth: z.string().optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  avatarUrl: z.string().url().optional(),
  isPrimary: z.boolean().optional(),
});

// Health narrative request schema
export const narrativeRequestSchema = z.object({
  familyMemberId: z.number(),
  narrativeType: z.enum(['overview', 'condition_focus', 'preventive', 'growth', 'medication']),
  forceRegenerate: z.boolean().optional(),
});

// Health goal input schema
export const healthGoalInputSchema = z.object({
  familyMemberId: z.number(),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  targetValue: z.number().optional(),
  currentValue: z.number().optional(),
  unit: z.string().optional(),
  category: z.enum(['weight', 'a1c', 'bp', 'activity', 'nutrition', 'sleep', 'custom']).optional(),
  targetDate: z.string().optional(),
});

// Action item input schema
export const actionItemInputSchema = z.object({
  familyMemberId: z.number(),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  priority: z.enum(['high', 'medium', 'low']).optional(),
  dueDate: z.string().optional(),
  category: z.enum(['preventive', 'chronic', 'wellness', 'follow_up', 'custom']).optional(),
  careGapId: z.string().optional(),
});

// Schedule action input schema
export const scheduleActionInputSchema = z.object({
  actionItemId: z.number(),
  providerName: z.string().optional(),
  facilityName: z.string().optional(),
  facilityAddress: z.string().optional(),
  scheduledDateTime: z.string(),
  appointmentType: z.enum(['office_visit', 'procedure', 'lab', 'imaging', 'telehealth']).optional(),
  durationMinutes: z.number().optional(),
  notes: z.string().optional(),
});

// Health alert input schema
export const healthAlertInputSchema = z.object({
  familyMemberId: z.number(),
  alertType: z.enum(['care_gap_due', 'trend_concern', 'medication_refill', 'appointment_reminder', 'milestone', 'custom']).optional(),
  category: z.enum(['medication_reminder', 'appointment_upcoming', 'care_gap', 'goal_milestone', 'health_trend', 'preventive_care', 'follow_up_needed']).optional(),
  priority: z.enum(['urgent', 'high', 'medium', 'low']).optional(),
  title: z.string().min(1, "Title is required"),
  message: z.string().min(1, "Message is required"),
  actionUrl: z.string().optional(),
  actionLabel: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  scheduledFor: z.string().optional(),
});
