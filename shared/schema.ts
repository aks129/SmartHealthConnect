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
