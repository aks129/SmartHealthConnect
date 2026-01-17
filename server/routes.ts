import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import FHIR from 'fhirclient';
import { v4 as uuidv4 } from 'uuid';
import { generateHealthResponse, type HealthContext, type ChatHistoryItem } from './ai-service';
import { careGapsService, type PatientHealthContext } from './care-gaps-service';
import { z } from 'zod';
import { insertChatMessageSchema, type Coverage, type Claim, type ExplanationOfBenefit } from '../shared/schema';
import { registerUserRoutes } from './user-routes';
import familyRoutes from './family-routes';
import schedulingService from './scheduling-service';
import notificationService from './notification-service';

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

// Added a second sample patient for demonstration purposes
const samplePatient2 = {
  resourceType: "Patient",
  id: "demo-patient-2",
  active: true,
  name: [
    {
      use: "official",
      family: "Johnson",
      given: ["Emily", "Rose"]
    }
  ],
  telecom: [
    {
      system: "phone",
      value: "555-987-6543",
      use: "mobile"
    },
    {
      system: "email",
      value: "emily.johnson@example.com",
      use: "home"
    }
  ],
  gender: "female",
  birthDate: "1992-03-20",
  address: [
    {
      use: "home",
      line: ["456 Oak Ave"],
      city: "Metropolis",
      state: "NY",
      postalCode: "10001",
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
      value: "MRN-1234567"
    }
  ]
};

const samplePatients = [samplePatient, samplePatient2];


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
  },
  {
    resourceType: "Condition",
    id: "demo-condition-4",
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
          code: "373722005",
          display: "Asthma"
        }
      ],
      text: "Asthma"
    },
    subject: {
      reference: "Patient/demo-patient-2",
      display: "Emily Rose Johnson"
    },
    onsetDateTime: "2010-05-20",
    recordedDate: "2010-05-20",
    note: [
      {
        text: "Intermittent asthma, controlled with inhaler as needed."
      }
    ]
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
          code: "85354-9",
          display: "Blood pressure panel with all children optional"
        }
      ],
      text: "Blood Pressure"
    },
    subject: {
      reference: "Patient/demo-patient-1",
      display: "John William Smith"
    },
    effectiveDateTime: "2023-03-15T10:30:00Z",
    issued: "2023-03-15T10:32:00Z",
    component: [
      {
        code: {
          coding: [
            {
              system: "http://loinc.org",
              code: "8480-6",
              display: "Systolic blood pressure"
            }
          ]
        },
        valueQuantity: {
          value: 140,
          unit: "mmHg",
          system: "http://unitsofmeasure.org",
          code: "mm[Hg]"
        }
      },
      {
        code: {
          coding: [
            {
              system: "http://loinc.org",
              code: "8462-4",
              display: "Diastolic blood pressure"
            }
          ]
        },
        valueQuantity: {
          value: 90,
          unit: "mmHg",
          system: "http://unitsofmeasure.org",
          code: "mm[Hg]"
        }
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
          code: "4548-4",
          display: "Hemoglobin A1c/Hemoglobin.total in Blood"
        }
      ],
      text: "Hemoglobin A1c"
    },
    subject: {
      reference: "Patient/demo-patient-1",
      display: "John William Smith"
    },
    effectiveDateTime: "2023-02-15T08:30:00Z",
    issued: "2023-02-15T14:20:00Z",
    valueQuantity: {
      value: 7.2,
      unit: "%",
      system: "http://unitsofmeasure.org",
      code: "%"
    },
    referenceRange: [
      {
        high: {
          value: 7.0,
          unit: "%",
          system: "http://unitsofmeasure.org",
          code: "%"
        },
        text: "<7.0% (optimal diabetic control)"
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
        text: "Above Target"
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
          code: "29463-7",
          display: "Body Weight"
        }
      ],
      text: "Weight"
    },
    subject: {
      reference: "Patient/demo-patient-1",
      display: "John William Smith"
    },
    effectiveDateTime: "2023-03-15T10:30:00Z",
    issued: "2023-03-15T10:30:00Z",
    valueQuantity: {
      value: 195,
      unit: "lbs",
      system: "http://unitsofmeasure.org",
      code: "[lb_av]"
    }
  },
  {
    resourceType: "Observation",
    id: "demo-observation-5",
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
          code: "8302-2",
          display: "Body height"
        }
      ],
      text: "Height"
    },
    subject: {
      reference: "Patient/demo-patient-1",
      display: "John William Smith"
    },
    effectiveDateTime: "2023-03-15T10:30:00Z",
    issued: "2023-03-15T10:30:00Z",
    valueQuantity: {
      value: 72,
      unit: "in",
      system: "http://unitsofmeasure.org",
      code: "[in_i]"
    }
  },
  {
    resourceType: "Observation",
    id: "demo-observation-6",
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
      text: "Total Cholesterol"
    },
    subject: {
      reference: "Patient/demo-patient-1",
      display: "John William Smith"
    },
    effectiveDateTime: "2023-02-15T08:30:00Z",
    issued: "2023-02-15T12:45:00Z",
    valueQuantity: {
      value: 220,
      unit: "mg/dL",
      system: "http://unitsofmeasure.org",
      code: "mg/dL"
    },
    referenceRange: [
      {
        high: {
          value: 200,
          unit: "mg/dL",
          system: "http://unitsofmeasure.org",
          code: "mg/dL"
        },
        text: "<200 mg/dL (desirable)"
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
    id: "demo-observation-7",
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
          code: "718-7",
          display: "Hemoglobin [Mass/volume] in Blood"
        }
      ],
      text: "Hemoglobin"
    },
    subject: {
      reference: "Patient/demo-patient-2",
      display: "Emily Rose Johnson"
    },
    effectiveDateTime: "2023-03-20T09:15:00Z",
    issued: "2023-03-20T15:30:00Z",
    valueQuantity: {
      value: 11.8,
      unit: "g/dL",
      system: "http://unitsofmeasure.org",
      code: "g/dL"
    },
    referenceRange: [
      {
        low: {
          value: 12.0,
          unit: "g/dL"
        },
        high: {
          value: 15.5,
          unit: "g/dL"
        },
        text: "12.0-15.5 g/dL"
      }
    ],
    interpretation: [
      {
        coding: [
          {
            system: "http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation",
            code: "L",
            display: "Low"
          }
        ],
        text: "Low"
      }
    ]
  },
  {
    resourceType: "Observation",
    id: "demo-observation-8",
    status: "final",
    category: [
      {
        coding: [
          {
            system: "http://terminology.hl7.org/CodeSystem/observation-category",
            code: "survey",
            display: "Survey"
          }
        ],
        text: "Assessment"
      }
    ],
    code: {
      coding: [
        {
          system: "http://loinc.org",
          code: "72133-2",
          display: "Patient Health Questionnaire 9 item (PHQ-9) total score [Reported]"
        }
      ],
      text: "PHQ-9 Depression Score"
    },
    subject: {
      reference: "Patient/demo-patient-2",
      display: "Emily Rose Johnson"
    },
    effectiveDateTime: "2023-03-10T14:00:00Z",
    issued: "2023-03-10T14:15:00Z",
    valueQuantity: {
      value: 12,
      unit: "score",
      system: "http://unitsofmeasure.org",
      code: "{score}"
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
        text: "Moderate Depression"
      }
    ],
    note: [
      {
        text: "Score indicates moderate depression symptoms. Patient reports improved mood with current treatment plan."
      }
    ]
  },
  {
    resourceType: "Observation",
    id: "demo-observation-9",
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
          code: "39156-5",
          display: "Body mass index (BMI) [Ratio]"
        }
      ],
      text: "BMI"
    },
    subject: {
      reference: "Patient/demo-patient-1",
      display: "John William Smith"
    },
    effectiveDateTime: "2023-03-15T10:30:00Z",
    issued: "2023-03-15T10:32:00Z",
    valueQuantity: {
      value: 27.1,
      unit: "kg/m2",
      system: "http://unitsofmeasure.org",
      code: "kg/m2"
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
        text: "Overweight"
      }
    ]
  },
  {
    resourceType: "Observation",
    id: "demo-observation-10",
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
          code: "33747-0",
          display: "Glucose [Mass/volume] in Serum or Plasma --fasting"
        }
      ],
      text: "Fasting Glucose"
    },
    subject: {
      reference: "Patient/demo-patient-1",
      display: "John William Smith"
    },
    effectiveDateTime: "2023-02-15T08:30:00Z",
    issued: "2023-02-15T12:45:00Z",
    valueQuantity: {
      value: 135,
      unit: "mg/dL",
      system: "http://unitsofmeasure.org",
      code: "mg/dL"
    },
    referenceRange: [
      {
        high: {
          value: 100,
          unit: "mg/dL",
          system: "http://unitsofmeasure.org",
          code: "mg/dL"
        },
        text: "<100 mg/dL (normal)"
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
        text: "Elevated"
      }
    ]
  },
  {
    resourceType: "Observation",
    id: "demo-observation-11",
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
          code: "8310-5",
          display: "Body temperature"
        }
      ],
      text: "Temperature"
    },
    subject: {
      reference: "Patient/demo-patient-2",
      display: "Emily Rose Johnson"
    },
    effectiveDateTime: "2023-03-20T09:00:00Z",
    issued: "2023-03-20T09:01:00Z",
    valueQuantity: {
      value: 98.6,
      unit: "degF",
      system: "http://unitsofmeasure.org",
      code: "[degF]"
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
  },
  {
    resourceType: "Observation",
    id: "demo-observation-12",
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
          code: "6690-2",
          display: "Leukocytes [#/volume] in Blood by Automated count"
        }
      ],
      text: "White Blood Cell Count"
    },
    subject: {
      reference: "Patient/demo-patient-2",
      display: "Emily Rose Johnson"
    },
    effectiveDateTime: "2023-03-20T09:15:00Z",
    issued: "2023-03-20T15:30:00Z",
    valueQuantity: {
      value: 8500,
      unit: "/uL",
      system: "http://unitsofmeasure.org",
      code: "/uL"
    },
    referenceRange: [
      {
        low: {
          value: 4500,
          unit: "/uL"
        },
        high: {
          value: 11000,
          unit: "/uL"
        },
        text: "4500-11000/uL"
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
  },
  {
    resourceType: "MedicationRequest",
    id: "demo-medication-3",
    status: "active",
    intent: "order",
    medicationCodeableConcept: {
      coding: [
        {
          system: "http://www.nlm.nih.gov/research/umls/rxnorm",
          code: "108456",
          display: "Atorvastatin 40 MG Oral Tablet"
        }
      ],
      text: "Atorvastatin 40 mg oral tablet"
    },
    subject: {
      reference: "Patient/demo-patient-2",
      display: "Emily Rose Johnson"
    },
    authoredOn: "2023-01-20",
    requester: {
      reference: "Practitioner/demo-practitioner-2",
      display: "Dr. Robert Johnson"
    },
    dosageInstruction: [
      {
        text: "Take 1 tablet by mouth once daily in the evening",
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
              value: 40,
              unit: "mg",
              system: "http://unitsofmeasure.org",
              code: "mg"
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
          code: "7804",
          display: "Penicillin"
        }
      ],
      text: "Penicillin"
    },
    patient: {
      reference: "Patient/demo-patient-1",
      display: "John William Smith"
    },
    recordedDate: "2015-08-20",
    reaction: [
      {
        manifestation: [
          {
            coding: [
              {
                system: "http://snomed.info/sct",
                code: "247472004",
                display: "Weal"
              }
            ],
            text: "Hives"
          }
        ],
        severity: "moderate",
        onset: "2015-08-19"
      }
    ],
    note: [
      {
        text: "Patient developed hives and itching after taking penicillin for strep throat in 2015."
      }
    ]
  },
  {
    resourceType: "AllergyIntolerance",
    id: "demo-allergy-2",
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
    category: ["food"],
    criticality: "low",
    code: {
      coding: [
        {
          system: "http://snomed.info/sct",
          code: "227493005",
          display: "Cashew nuts"
        }
      ],
      text: "Cashew Nuts"
    },
    patient: {
      reference: "Patient/demo-patient-2",
      display: "Emily Rose Johnson"
    },
    recordedDate: "2019-03-10",
    reaction: [
      {
        manifestation: [
          {
            coding: [
              {
                system: "http://snomed.info/sct",
                code: "271807003",
                display: "Eruption of skin"
              }
            ],
            text: "Skin rash"
          }
        ],
        severity: "mild"
      }
    ]
  },
  {
    resourceType: "AllergyIntolerance",
    id: "demo-allergy-3",
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
    type: "intolerance",
    category: ["medication"],
    criticality: "low",
    code: {
      coding: [
        {
          system: "http://www.nlm.nih.gov/research/umls/rxnorm",
          code: "1191",
          display: "Aspirin"
        }
      ],
      text: "Aspirin"
    },
    patient: {
      reference: "Patient/demo-patient-1",
      display: "John William Smith"
    },
    recordedDate: "2020-06-15",
    reaction: [
      {
        manifestation: [
          {
            coding: [
              {
                system: "http://snomed.info/sct",
                code: "162059005",
                display: "Upset stomach"
              }
            ],
            text: "Stomach upset"
          }
        ],
        severity: "mild"
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
          code: "207",
          display: "SARS-COV-2 (COVID-19) vaccine, mRNA, spike protein, LNP, preservative free, 30 mcg/0.3mL dose"
        }
      ],
      text: "COVID-19 mRNA Vaccine (Pfizer-BioNTech)"
    },
    patient: {
      reference: "Patient/demo-patient-1",
      display: "John William Smith"
    },
    occurrenceDateTime: "2022-05-15T14:30:00Z",
    primarySource: true,
    location: {
      reference: "Location/demo-location-1",
      display: "Boston Medical Center - Main Campus"
    },
    manufacturer: {
      display: "Pfizer-BioNTech"
    },
    lotNumber: "ABC123",
    expirationDate: "2023-05-15",
    site: {
      coding: [
        {
          system: "http://terminology.hl7.org/CodeSystem/v3-ActSite",
          code: "LA",
          display: "Left arm"
        }
      ]
    },
    route: {
      coding: [
        {
          system: "http://terminology.hl7.org/CodeSystem/v3-RouteOfAdministration",
          code: "IM",
          display: "Injection, intramuscular"
        }
      ]
    },
    doseQuantity: {
      value: 0.3,
      unit: "mL"
    }
  },
  {
    resourceType: "Immunization",
    id: "demo-immunization-2",
    status: "completed",
    vaccineCode: {
      coding: [
        {
          system: "http://hl7.org/fhir/sid/cvx",
          code: "207",
          display: "SARS-COV-2 (COVID-19) vaccine, mRNA, spike protein, LNP, preservative free, 30 mcg/0.3mL dose"
        }
      ],
      text: "COVID-19 mRNA Vaccine Booster (Pfizer-BioNTech)"
    },
    patient: {
      reference: "Patient/demo-patient-1",
      display: "John William Smith"
    },
    occurrenceDateTime: "2022-11-20T11:15:00Z",
    primarySource: true,
    location: {
      reference: "Location/demo-location-2",
      display: "Cambridge Health Alliance - Primary Care"
    },
    manufacturer: {
      display: "Pfizer-BioNTech"
    },
    lotNumber: "DEF456",
    site: {
      coding: [
        {
          system: "http://terminology.hl7.org/CodeSystem/v3-ActSite",
          code: "RA",
          display: "Right arm"
        }
      ]
    },
    route: {
      coding: [
        {
          system: "http://terminology.hl7.org/CodeSystem/v3-RouteOfAdministration",
          code: "IM",
          display: "Injection, intramuscular"
        }
      ]
    }
  },
  {
    resourceType: "Immunization",
    id: "demo-immunization-3",
    status: "completed",
    vaccineCode: {
      coding: [
        {
          system: "http://hl7.org/fhir/sid/cvx",
          code: "141",
          display: "Influenza, seasonal, injectable"
        }
      ],
      text: "Seasonal Flu Vaccine"
    },
    patient: {
      reference: "Patient/demo-patient-1",
      display: "John William Smith"
    },
    occurrenceDateTime: "2022-10-01T15:45:00Z",
    primarySource: true,
    location: {
      reference: "Location/demo-location-1",
      display: "Boston Medical Center - Main Campus"
    },
    manufacturer: {
      display: "Sanofi Pasteur"
    },
    site: {
      coding: [
        {
          system: "http://terminology.hl7.org/CodeSystem/v3-ActSite",
          code: "LA",
          display: "Left arm"
        }
      ]
    },
    route: {
      coding: [
        {
          system: "http://terminology.hl7.org/CodeSystem/v3-RouteOfAdministration",
          code: "IM",
          display: "Injection, intramuscular"
        }
      ]
    }
  },
  {
    resourceType: "Immunization",
    id: "demo-immunization-4",
    status: "completed",
    vaccineCode: {
      coding: [
        {
          system: "http://hl7.org/fhir/sid/cvx",
          code: "21",
          display: "Varicella virus vaccine"
        }
      ],
      text: "Chickenpox Vaccine"
    },
    patient: {
      reference: "Patient/demo-patient-2",
      display: "Emily Rose Johnson"
    },
    occurrenceDateTime: "1980-04-10T10:00:00Z",
    primarySource: false,
    reportOrigin: {
      coding: [
        {
          system: "http://terminology.hl7.org/CodeSystem/immunization-origin",
          code: "record",
          display: "Written Record"
        }
      ],
      text: "Historical record from childhood immunization card"
    }
  },
  {
    resourceType: "Immunization",
    id: "demo-immunization-5",
    status: "completed",
    vaccineCode: {
      coding: [
        {
          system: "http://hl7.org/fhir/sid/cvx",
          code: "113",
          display: "Tetanus and diphtheria toxoids (Td) vaccine"
        }
      ],
      text: "Tetanus-Diphtheria Vaccine"
    },
    patient: {
      reference: "Patient/demo-patient-2",
      display: "Emily Rose Johnson"
    },
    occurrenceDateTime: "2021-07-22T13:20:00Z",
    primarySource: true,
    location: {
      reference: "Location/demo-location-2",
      display: "Cambridge Health Alliance - Primary Care"
    },
    manufacturer: {
      display: "GlaxoSmithKline"
    },
    site: {
      coding: [
        {
          system: "http://terminology.hl7.org/CodeSystem/v3-ActSite",
          code: "RA",
          display: "Right arm"
        }
      ]
    },
    note: [
      {
        text: "Administered due to minor cut injury. Patient up to date with tetanus."
      }
    ]
  }
];

const sampleCoverages = [
  {
    resourceType: "Coverage",
    id: "demo-coverage-1",
    status: "active",
    type: {
      coding: [
        {
          system: "http://terminology.hl7.org/CodeSystem/v3-ActCode",
          code: "EHCPOL",
          display: "extended healthcare"
        }
      ],
      text: "Health Insurance"
    },
    subscriberId: "12345678",
    beneficiary: {
      reference: "Patient/demo-patient-1",
      display: "John William Smith"
    },
    payor: [
      {
        reference: "Organization/demo-org-1",
        display: "National Health Insurance"
      }
    ],
    class: [
      {
        type: {
          coding: [
            {
              system: "http://terminology.hl7.org/CodeSystem/coverage-class",
              code: "group",
              display: "Group"
            }
          ],
          text: "Group"
        },
        value: "PREMIUM-PLAN-2023",
        name: "Premium Health Plan 2023"
      },
      {
        type: {
          coding: [
            {
              system: "http://terminology.hl7.org/CodeSystem/coverage-class",
              code: "plan",
              display: "Plan"
            }
          ],
          text: "Plan"
        },
        value: "PREMIUM-PLUS",
        name: "Premium Plus"
      }
    ],
    period: {
      start: "2023-01-01",
      end: "2023-12-31"
    }
  }
];

const sampleClaims = [
  {
    resourceType: "Claim",
    id: "demo-claim-1",
    status: "active",
    type: {
      coding: [
        {
          system: "http://terminology.hl7.org/CodeSystem/claim-type",
          code: "professional",
          display: "Professional"
        }
      ]
    },
    use: "claim",
    patient: {
      reference: "Patient/demo-patient-1",
      display: "John William Smith"
    },
    created: "2023-04-15",
    provider: {
      reference: "Practitioner/demo-practitioner-1",
      display: "Dr. Jane Williams"
    },
    priority: {
      coding: [
        {
          system: "http://terminology.hl7.org/CodeSystem/processpriority",
          code: "normal"
        }
      ]
    },
    insurance: [
      {
        sequence: 1,
        focal: true,
        coverage: {
          reference: "Coverage/demo-coverage-1",
          display: "National Health Insurance"
        }
      }
    ],
    item: [
      {
        sequence: 1,
        productOrService: {
          coding: [
            {
              system: "http://snomed.info/sct",
              code: "185345009",
              display: "Encounter for check up"
            }
          ],
          text: "Annual Physical Examination"
        },
        servicedDate: "2023-04-15"
      }
    ],
    total: {
      value: 250.00,
      currency: "USD"
    }
  },
  {
    resourceType: "Claim",
    id: "demo-claim-2",
    status: "active",
    type: {
      coding: [
        {
          system: "http://terminology.hl7.org/CodeSystem/claim-type",
          code: "pharmacy",
          display: "Pharmacy"
        }
      ]
    },
    use: "claim",
    patient: {
      reference: "Patient/demo-patient-1",
      display: "John William Smith"
    },
    created: "2023-05-02",
    provider: {
      reference: "Organization/demo-org-2",
      display: "City Pharmacy"
    },
    priority: {
      coding: [
        {
          system: "http://terminology.hl7.org/CodeSystem/processpriority",
          code: "normal"
        }
      ]
    },
    insurance: [
      {
        sequence: 1,
        focal: true,
        coverage: {
          reference: "Coverage/demo-coverage-1",
          display: "National Health Insurance"
        }
      }
    ],
    item: [
      {
        sequence: 1,
        productOrService: {
          coding: [
            {
              system: "http://www.nlm.nih.gov/research/umls/rxnorm",
              code: "897122",
              display: "Metformin 500 MG Oral Tablet"
            }
          ],
          text: "Metformin 500 mg (90-day supply)"
        },
        servicedDate: "2023-05-02"
      }
    ],
    total: {
      value: 45.00,
      currency: "USD"
    }
  }
];

// Sample Practitioners
const samplePractitioners = [
  {
    resourceType: "Practitioner",
    id: "demo-practitioner-1",
    active: true,
    name: [
      {
        use: "official",
        family: "Williams",
        given: ["Jane"],
        prefix: ["Dr."],
        text: "Dr. Jane Williams"
      }
    ],
    telecom: [
      {
        system: "phone",
        value: "555-123-4567",
        use: "work"
      },
      {
        system: "email",
        value: "jane.williams@example.org",
        use: "work"
      }
    ],
    address: [
      {
        use: "work",
        type: "both",
        line: ["123 Medical Blvd"],
        city: "Boston",
        state: "MA",
        postalCode: "02215",
        country: "USA"
      }
    ],
    gender: "female",
    qualification: [
      {
        code: {
          coding: [
            {
              system: "http://terminology.hl7.org/CodeSystem/v2-0360",
              code: "MD",
              display: "Doctor of Medicine"
            }
          ],
          text: "Doctor of Medicine"
        },
        issuer: {
          display: "Harvard Medical School"
        }
      },
      {
        code: {
          coding: [
            {
              system: "http://terminology.hl7.org/CodeSystem/v2-0360",
              code: "FPEND",
              display: "Family Practice Endocrinology"
            }
          ],
          text: "Family Practice Endocrinology"
        }
      }
    ]
  },
  {
    resourceType: "Practitioner",
    id: "demo-practitioner-2",
    active: true,
    name: [
      {
        use: "official",
        family: "Johnson",
        given: ["Robert"],
        prefix: ["Dr."],
        text: "Dr. Robert Johnson"
      }
    ],
    telecom: [
      {
        system: "phone",
        value: "555-987-6543",
        use: "work"
      },
      {
        system: "email",
        value: "robert.johnson@example.org",
        use: "work"
      }
    ],
    address: [
      {
        use: "work",
        type: "both",
        line: ["456 Cardiology Way"],
        city: "Boston",
        state: "MA",
        postalCode: "02114",
        country: "USA"
      }
    ],
    gender: "male",
    qualification: [
      {
        code: {
          coding: [
            {
              system: "http://terminology.hl7.org/CodeSystem/v2-0360",
              code: "MD",
              display: "Doctor of Medicine"
            }
          ],
          text: "Doctor of Medicine"
        }
      },
      {
        code: {
          coding: [
            {
              system: "http://terminology.hl7.org/CodeSystem/v2-0360",
              code: "CARD",
              display: "Cardiology"
            }
          ],
          text: "Cardiology"
        }
      }
    ]
  },
  {
    resourceType: "Practitioner",
    id: "demo-practitioner-3",
    active: true,
    name: [
      {
        use: "official",
        family: "Smith",
        given: ["Sarah"],
        prefix: ["Dr."],
        text: "Dr. Sarah Smith"
      }
    ],
    telecom: [
      {
        system: "phone",
        value: "555-456-7890",
        use: "work"
      },
      {
        system: "email",
        value: "sarah.smith@example.org",
        use: "work"
      }
    ],
    address: [
      {
        use: "work",
        type: "both",
        line: ["789 Neurology Center"],
        city: "Cambridge",
        state: "MA",
        postalCode: "02139",
        country: "USA"
      }
    ],
    gender: "female",
    qualification: [
      {
        code: {
          coding: [
            {
              system: "http://terminology.hl7.org/CodeSystem/v2-0360",
              code: "MD",
              display: "Doctor of Medicine"
            }
          ],
          text: "Doctor of Medicine"
        }
      },
      {
        code: {
          coding: [
            {
              system: "http://terminology.hl7.org/CodeSystem/v2-0360",
              code: "NEUR",
              display: "Neurology"
            }
          ],
          text: "Neurology"
        }
      }
    ]
  }
];

// Sample Organizations
const sampleOrganizations = [
  {
    resourceType: "Organization",
    id: "demo-organization-1",
    active: true,
    type: [
      {
        coding: [
          {
            system: "http://terminology.hl7.org/CodeSystem/organization-type",
            code: "prov",
            display: "Healthcare Provider"
          }
        ],
        text: "Healthcare Provider"
      }
    ],
    name: "Boston Medical Center",
    telecom: [
      {
        system: "phone",
        value: "617-555-1000",
        use: "work"
      },
      {
        system: "email",
        value: "info@bostonmedical.example.org",
        use: "work"
      }
    ],
    address: [
      {
        use: "work",
        type: "both",
        line: ["1 Medical Center Dr"],
        city: "Boston",
        state: "MA",
        postalCode: "02118",
        country: "USA"
      }
    ]
  },
  {
    resourceType: "Organization",
    id: "demo-organization-2",
    active: true,
    type: [
      {
        coding: [
          {
            system: "http://terminology.hl7.org/CodeSystem/organization-type",
            code: "prov",
            display: "Healthcare Provider"
          }
        ],
        text: "Healthcare Provider"
      }
    ],
    name: "Cambridge Health Alliance",
    telecom: [
      {
        system: "phone",
        value: "617-555-2000",
        use: "work"
      },
      {
        system: "email",
        value: "info@cambridgehealth.example.org",
        use: "work"
      }
    ],
    address: [
      {
        use: "work",
        type: "both",
        line: ["1493 Cambridge St"],
        city: "Cambridge",
        state: "MA",
        postalCode: "02139",
        country: "USA"
      }
    ]
  }
];

// Sample Locations
const sampleLocations = [
  {
    resourceType: "Location",
    id: "demo-location-1",
    status: "active",
    name: "Boston Medical Center - Main Campus",
    description: "Main campus of Boston Medical Center",
    mode: "instance",
    type: [
      {
        coding: [
          {
            system: "http://terminology.hl7.org/CodeSystem/v3-RoleCode",
            code: "HOSP",
            display: "Hospital"
          }
        ],
        text: "Hospital"
      }
    ],
    telecom: [
      {
        system: "phone",
        value: "617-555-1000",
        use: "work"
      }
    ],
    address: {
      use: "work",
      type: "both",
      line: ["1 Medical Center Dr"],
      city: "Boston",
      state: "MA",
      postalCode: "02118",
      country: "USA"
    },
    position: {
      longitude: -71.0695,
      latitude: 42.3355
    },
    managingOrganization: {
      reference: "Organization/demo-organization-1",
      display: "Boston Medical Center"
    }
  },
  {
    resourceType: "Location",
    id: "demo-location-2",
    status: "active",
    name: "Cambridge Health Alliance - Primary Care",
    description: "Primary Care facility of Cambridge Health Alliance",
    mode: "instance",
    type: [
      {
        coding: [
          {
            system: "http://terminology.hl7.org/CodeSystem/v3-RoleCode",
            code: "OUTPHARM",
            display: "outpatient pharmacy"
          }
        ],
        text: "Outpatient Clinic"
      }
    ],
    telecom: [
      {
        system: "phone",
        value: "617-555-2100",
        use: "work"
      }
    ],
    address: {
      use: "work",
      type: "both",
      line: ["1493 Cambridge St", "Suite 200"],
      city: "Cambridge",
      state: "MA",
      postalCode: "02139",
      country: "USA"
    },
    position: {
      longitude: -71.1060,
      latitude: 42.3730
    },
    managingOrganization: {
      reference: "Organization/demo-organization-2",
      display: "Cambridge Health Alliance"
    }
  }
];

// Sample Appointments
const sampleAppointments = [
  {
    resourceType: "Appointment",
    id: "demo-appointment-1",
    status: "booked",
    serviceCategory: [
      {
        coding: [
          {
            system: "http://terminology.hl7.org/CodeSystem/service-category",
            code: "17",
            display: "General Practice"
          }
        ]
      }
    ],
    appointmentType: {
      coding: [
        {
          system: "http://terminology.hl7.org/CodeSystem/v2-0276",
          code: "FOLLOWUP",
          display: "A follow up visit from a previous appointment"
        }
      ]
    },
    reasonCode: [
      {
        coding: [
          {
            system: "http://snomed.info/sct",
            code: "413076004",
            display: "Diabetes follow-up"
          }
        ],
        text: "Diabetes follow-up appointment"
      }
    ],
    start: "2023-04-15T09:00:00Z",
    end: "2023-04-15T09:30:00Z",
    minutesDuration: 30,
    participant: [
      {
        actor: {
          reference: "Patient/demo-patient-1",
          display: "John William Smith"
        },
        required: "required",
        status: "accepted"
      },
      {
        actor: {
          reference: "Practitioner/demo-practitioner-1",
          display: "Dr. Jane Williams"
        },
        required: "required",
        status: "accepted"
      },
      {
        actor: {
          reference: "Location/demo-location-1",
          display: "Boston Medical Center - Main Campus"
        },
        required: "required",
        status: "accepted"
      }
    ],
    description: "Diabetes follow-up appointment",
    location: [
      {
        location: {
          reference: "Location/demo-location-1",
          display: "Boston Medical Center - Main Campus"
        },
        status: "active"
      }
    ]
  },
  {
    resourceType: "Appointment",
    id: "demo-appointment-2",
    status: "booked",
    serviceCategory: [
      {
        coding: [
          {
            system: "http://terminology.hl7.org/CodeSystem/service-category",
            code: "17",
            display: "Cardiology"
          }
        ]
      }
    ],
    appointmentType: {
      coding: [
        {
          system: "http://terminology.hl7.org/CodeSystem/v2-0276",
          code: "ROUTINE",
          display: "Routine appointment"
        }
      ]
    },
    reasonCode: [
      {
        coding: [
          {
            system: "http://snomed.info/sct",
            code: "38341003",
            display: "Hypertension"
          }
        ],
        text: "Blood pressure check"
      }
    ],
    start: "2023-05-20T14:00:00Z",
    end: "2023-05-20T14:45:00Z",
    minutesDuration: 45,
    participant: [
      {
        actor: {
          reference: "Patient/demo-patient-1",
          display: "John William Smith"
        },
        required: "required",
        status: "accepted"
      },
      {
        actor: {
          reference: "Practitioner/demo-practitioner-2",
          display: "Dr. Robert Johnson"
        },
        required: "required",
        status: "accepted"
      },
      {
        actor: {
          reference: "Location/demo-location-2",
          display: "Cambridge Health Alliance - Primary Care"
        },
        required: "required",
        status: "accepted"
      }
    ],
    description: "Cardiology check-up",
    location: [
      {
        location: {
          reference: "Location/demo-location-2",
          display: "Cambridge Health Alliance - Primary Care"
        },
        status: "active"
      }
    ]
  },
  {
    resourceType: "Appointment",
    id: "demo-appointment-3",
    status: "booked",
    serviceCategory: [
      {
        coding: [
          {
            system: "http://terminology.hl7.org/CodeSystem/service-category",
            code: "3",
            display: "General practice"
          }
        ]
      }
    ],
    appointmentType: {
      coding: [
        {
          system: "http://terminology.hl7.org/CodeSystem/v2-0276",
          code: "WALKIN",
          display: "A walk-in appointment"
        }
      ]
    },
    reasonCode: [
      {
        coding: [
          {
            system: "http://snomed.info/sct",
            code: "413076004",
            display: "Diabetes follow-up"
          }
        ],
        text: "Follow-up for medication review and blood sugar check"
      }
    ],
    start: "2023-06-01T11:00:00Z",
    end: "2023-06-01T11:30:00Z",
    minutesDuration: 30,
    participant: [
      {
        actor: {
          reference: "Patient/demo-patient-2",
          display: "Emily Rose Johnson"
        },
        required: "required",
        status: "accepted"
      },
      {
        actor: {
          reference: "Practitioner/demo-practitioner-1",
          display: "Dr. Jane Williams"
        },
        required: "required",
        status: "accepted"
      },
      {
        actor: {
          reference: "Location/demo-location-1",
          display: "Boston Medical Center - Main Campus"
        },
        required: "required",
        status: "accepted"
      }
    ],
    description: "Diabetes medication review",
    location: [
      {
        location: {
          reference: "Location/demo-location-1",
          display: "Boston Medical Center - Main Campus"
        },
        status: "active"
      }
    ]
  }
];

// Sample PractitionerRoles
const samplePractitionerRoles = [
  {
    resourceType: "PractitionerRole",
    id: "demo-practitionerrole-1",
    active: true,
    period: {
      start: "2020-01-01"
    },
    practitioner: {
      reference: "Practitioner/demo-practitioner-1",
      display: "Dr. Jane Williams"
    },
    organization: {
      reference: "Organization/demo-organization-1",
      display: "Boston Medical Center"
    },
    code: [
      {
        coding: [
          {
            system: "http://terminology.hl7.org/CodeSystem/v2-0286",
            code: "EP",
            display: "Endocrinology"
          }
        ],
        text: "Endocrinologist"
      }
    ],
    specialty: [
      {
        coding: [
          {
            system: "http://snomed.info/sct",
            code: "408475000",
            display: "Diabetic medicine"
          }
        ],
        text: "Diabetes Care"
      }
    ],
    location: [
      {
        reference: "Location/demo-location-1",
        display: "Boston Medical Center - Main Campus"
      }
    ],
    telecom: [
      {
        system: "phone",
        value: "617-555-1234",
        use: "work"
      },
      {
        system: "email",
        value: "jane.williams@bostonmedical.example.org",
        use: "work"
      }
    ],
    availableTime: [
      {
        daysOfWeek: ["mon", "tue", "wed", "thu", "fri"],
        availableStartTime: "08:00:00",
        availableEndTime: "17:00:00"
      }
    ]
  },
  {
    resourceType: "PractitionerRole",
    id: "demo-practitionerrole-2",
    active: true,
    period: {
      start: "2019-05-01"
    },
    practitioner: {
      reference: "Practitioner/demo-practitioner-2",
      display: "Dr. Robert Johnson"
    },
    organization: {
      reference: "Organization/demo-organization-2",
      display: "Cambridge Health Alliance"
    },
    code: [
      {
        coding: [
          {
            system: "http://terminology.hl7.org/CodeSystem/v2-0286",
            code: "CD",
            display: "Cardiology"
          }
        ],
        text: "Cardiologist"
      }
    ],
    specialty: [
      {
        coding: [
          {
            system: "http://snomed.info/sct",
            code: "7610008",
            display: "Hypertension"
          }
        ],
        text: "Hypertension Management"
      }
    ],
    location: [
      {
        reference: "Location/demo-location-2",
        display: "Cambridge Health Alliance - Primary Care"
      }
    ],
    telecom: [
      {
        system: "phone",
        value: "617-555-2345",
        use: "work"
      },
      {
        system: "email",
        value: "robert.johnson@cambridgehealth.example.org",
        use: "work"
      }
    ],
    availableTime: [
      {
        daysOfWeek: ["mon", "wed", "fri"],
        availableStartTime: "09:00:00",
        availableEndTime: "18:00:00"
      }
    ]
  }
];

const sampleExplanationOfBenefits = [
  {
    resourceType: "ExplanationOfBenefit",
    id: "demo-eob-1",
    status: "active",
    type: {
      coding: [
        {
          system: "http://terminology.hl7.org/CodeSystem/claim-type",
          code: "professional",
          display: "Professional"
        }
      ]
    },
    use: "claim",
    patient: {
      reference: "Patient/demo-patient-1",
      display: "John William Smith"
    },
    created: "2023-04-16",
    insurer: {
      reference: "Organization/demo-org-1",
      display: "National Health Insurance"
    },
    provider: {
      reference: "Practitioner/demo-practitioner-1",
      display: "Dr. Jane Williams"
    },
    outcome: "complete",
    insurance: [
      {
        focal: true,
        coverage: {
          reference: "Coverage/demo-coverage-1",
          display: "National Health Insurance"
        }
      }
    ],
    item: [
      {
        sequence: 1,
        productOrService: {
          coding: [
            {
              system: "http://snomed.info/sct",
              code: "185345009",
              display: "Encounter for check up"
            }
          ],
          text: "Annual Physical Examination"
        },
        servicedDate: "2023-04-15",
        adjudication: [
          {
            category: {
              coding: [
                {
                  system: "http://terminology.hl7.org/CodeSystem/adjudication",
                  code: "submitted",
                  display: "Submitted Amount"
                }
              ]
            },
            amount: {
              value: 250.00,
              currency: "USD"
            }
          },
          {
            category: {
              coding: [
                {
                  system: "http://terminology.hl7.org/CodeSystem/adjudication",
                  code: "deductible",
                  display: "Deductible"
                }
              ]
            },
            amount: {
              value: 20.00,
              currency: "USD"
            }
          },
          {
            category: {
              coding: [
                {
                  system: "http://terminology.hl7.org/CodeSystem/adjudication",
                  code: "eligible",
                  display: "Eligible Amount"
                }
              ]
            },
            amount: {
              value: 230.00,
              currency: "USD"
            }
          },
          {
            category: {
              coding: [
                {
                  system: "http://terminology.hl7.org/CodeSystem/adjudication",
                  code: "benefit",
                  display: "Benefit Amount"
                }
              ]
            },
            amount: {
              value: 207.00,
              currency: "USD"
            }
          }
        ]
      }
    ],
    total: [
      {
        category: {
          coding: [
            {
              system: "http://terminology.hl7.org/CodeSystem/adjudication",
              code: "submitted",
              display: "Submitted Amount"
            }
          ]
        },
        amount: {
          value: 250.00,
          currency: "USD"
        }
      },
      {
        category: {
          coding: [
            {
              system: "http://terminology.hl7.org/CodeSystem/adjudication",
              code: "eligible",
              display: "Eligible Amount"
            }
          ]
        },
        amount: {
          value: 230.00,
          currency: "USD"
        }
      },
      {
        category: {
          coding: [
            {
              system: "http://terminology.hl7.org/CodeSystem/adjudication",
              code: "benefit",
              display: "Benefit Amount"
            }
          ]
        },
        amount: {
          value: 207.00,
          currency: "USD"
        }
      }
    ],
    payment: {
      amount: {
        value: 207.00,
        currency: "USD"
      }
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
      // Return the specific patient requested, or the first one if ID doesn't match
      const id = resourceUrl.split('/')[1];
      return samplePatients.find(p => p.id === id) || samplePatient;
    } else if (resourceUrl.startsWith('Condition?patient=')) {
      const patientId = resourceUrl.split('=')[1];
      const conditionsForPatient = sampleConditions.filter(c => c.subject.reference.includes(patientId));
      return {
        resourceType: "Bundle",
        type: "searchset",
        entry: conditionsForPatient.map(resource => ({ resource }))
      };
    } else if (resourceUrl.startsWith('Observation?patient=')) {
      const patientId = resourceUrl.split('=')[1];
      let observationsForPatient = sampleObservations.filter(o => o.subject.reference.includes(patientId));

      // SYNTHETIC DATA GENERATOR FOR DEMO TRENDS
      const generateTrend = (baseObs: any, count: number, variance: number) => {
        const trends = [];
        const baseDate = new Date(baseObs.effectiveDateTime || new Date());
        for (let i = 1; i <= count; i++) {
          const newDate = new Date(baseDate);
          newDate.setMonth(baseDate.getMonth() - i);

          const factor = 1 + (Math.random() * variance * 2 - variance);
          if (baseObs.valueQuantity && baseObs.valueQuantity.value) {
            const val = baseObs.valueQuantity.value * factor;
            // Create a deep copy
            const newObs = JSON.parse(JSON.stringify(baseObs));
            newObs.id = `${baseObs.id}-hist-${i}`;
            newObs.effectiveDateTime = newDate.toISOString();
            newObs.issued = newDate.toISOString();
            newObs.valueQuantity.value = parseFloat(val.toFixed(1));
            trends.push(newObs);
          }
        }
        return trends;
      };

      // Add history for Weight (Code 29463-7)
      const weightObs = observationsForPatient.find(o =>
        o.code?.coding?.some((c: any) => c.code === '29463-7')
      );
      if (weightObs) {
        observationsForPatient = [...observationsForPatient, ...generateTrend(weightObs, 6, 0.05)];
      }

      // Add history for BMI (Code 39156-5)
      const bmiObs = observationsForPatient.find(o =>
        o.code?.coding?.some((c: any) => c.code === '39156-5')
      );
      if (bmiObs) {
        observationsForPatient = [...observationsForPatient, ...generateTrend(bmiObs, 6, 0.02)];
      }

      // Handle sorting by date if requested
      if (resourceUrl.includes('_sort=-date')) {
        observationsForPatient.sort((a, b) => new Date(b.effectiveDateTime!).getTime() - new Date(a.effectiveDateTime!).getTime());
      }
      return {
        resourceType: "Bundle",
        type: "searchset",
        entry: observationsForPatient.map(resource => ({ resource }))
      };
    } else if (resourceUrl.startsWith('MedicationRequest?patient=')) {
      const patientId = resourceUrl.split('=')[1];
      const medicationsForPatient = sampleMedications.filter(m => m.subject.reference.includes(patientId));
      // Handle sorting by date if requested
      if (resourceUrl.includes('_sort=-date')) {
        medicationsForPatient.sort((a, b) => new Date(b.authoredOn!).getTime() - new Date(a.authoredOn!).getTime());
      }
      return {
        resourceType: "Bundle",
        type: "searchset",
        entry: medicationsForPatient.map(resource => ({ resource }))
      };
    } else if (resourceUrl.startsWith('AllergyIntolerance?patient=')) {
      const patientId = resourceUrl.split('=')[1];
      const allergiesForPatient = sampleAllergies.filter(a => a.patient.reference.includes(patientId));
      return {
        resourceType: "Bundle",
        type: "searchset",
        entry: allergiesForPatient.map(resource => ({ resource }))
      };
    } else if (resourceUrl.startsWith('Immunization?patient=')) {
      const patientId = resourceUrl.split('=')[1];
      const immunizationsForPatient = sampleImmunizations.filter(i => i.patient.reference.includes(patientId));
      // Handle sorting by date if requested
      if (resourceUrl.includes('_sort=-date')) {
        immunizationsForPatient.sort((a, b) => new Date(b.occurrenceDateTime!).getTime() - new Date(a.occurrenceDateTime!).getTime());
      }
      return {
        resourceType: "Bundle",
        type: "searchset",
        entry: immunizationsForPatient.map(resource => ({ resource }))
      };
    } else if (resourceUrl.startsWith('Coverage?patient=') || resourceUrl.startsWith('Coverage?beneficiary=')) {
      // For simplicity, return all coverages as the demo patient has only one
      return {
        resourceType: "Bundle",
        type: "searchset",
        entry: sampleCoverages.map(resource => ({ resource }))
      };
    } else if (resourceUrl.startsWith('Claim?patient=')) {
      const patientId = resourceUrl.split('=')[1];
      const claimsForPatient = sampleClaims.filter(c => c.patient.reference.includes(patientId));
      // Handle sorting by date if requested
      if (resourceUrl.includes('_sort=-created')) {
        claimsForPatient.sort((a, b) => new Date(b.created!).getTime() - new Date(a.created!).getTime());
      }
      return {
        resourceType: "Bundle",
        type: "searchset",
        entry: claimsForPatient.map(resource => ({ resource }))
      };
    } else if (resourceUrl.startsWith('ExplanationOfBenefit?patient=')) {
      const patientId = resourceUrl.split('=')[1];
      const eobsForPatient = sampleExplanationOfBenefits.filter(eob => eob.patient.reference.includes(patientId));
      // Handle sorting by date if requested
      if (resourceUrl.includes('_sort=-created')) {
        eobsForPatient.sort((a, b) => new Date(b.created!).getTime() - new Date(a.created!).getTime());
      }
      return {
        resourceType: "Bundle",
        type: "searchset",
        entry: eobsForPatient.map(resource => ({ resource }))
      };
    } else if (resourceUrl === 'Practitioner' || resourceUrl.startsWith('Practitioner?')) {
      // Query for all practitioners or search by name
      if (resourceUrl.includes('name=')) {
        const nameQuery = resourceUrl.split('name=')[1].split('&')[0].toLowerCase();
        const matchingPractitioners = samplePractitioners.filter(p =>
          p.name?.[0]?.text?.toLowerCase().includes(nameQuery) ||
          p.name?.[0]?.given.some(g => g.toLowerCase().includes(nameQuery)) ||
          p.name?.[0]?.family?.toLowerCase().includes(nameQuery)
        );
        return {
          resourceType: "Bundle",
          type: "searchset",
          entry: matchingPractitioners.map(resource => ({ resource }))
        };
      }
      return {
        resourceType: "Bundle",
        type: "searchset",
        entry: samplePractitioners.map(resource => ({ resource }))
      };
    } else if (resourceUrl.startsWith('Practitioner/')) {
      // Individual practitioner by ID
      const id = resourceUrl.split('/')[1];
      const practitioner = samplePractitioners.find(p => p.id === id) || samplePractitioners[0];
      return practitioner;
    } else if (resourceUrl === 'Organization' || resourceUrl.startsWith('Organization?')) {
      // Query for all organizations or search by name
      if (resourceUrl.includes('name=')) {
        const nameQuery = resourceUrl.split('name=')[1].split('&')[0].toLowerCase();
        const matchingOrganizations = sampleOrganizations.filter(org =>
          org.name?.toLowerCase().includes(nameQuery)
        );
        return {
          resourceType: "Bundle",
          type: "searchset",
          entry: matchingOrganizations.map(resource => ({ resource }))
        };
      }
      return {
        resourceType: "Bundle",
        type: "searchset",
        entry: sampleOrganizations.map(resource => ({ resource }))
      };
    } else if (resourceUrl.startsWith('Organization/')) {
      // Individual organization by ID
      const id = resourceUrl.split('/')[1];
      const organization = sampleOrganizations.find(o => o.id === id) || sampleOrganizations[0];
      return organization;
    } else if (resourceUrl === 'Location' || resourceUrl.startsWith('Location?')) {
      // Query for all locations or search by name
      if (resourceUrl.includes('name=')) {
        const nameQuery = resourceUrl.split('name=')[1].split('&')[0].toLowerCase();
        const matchingLocations = sampleLocations.filter(loc =>
          loc.name?.toLowerCase().includes(nameQuery)
        );
        return {
          resourceType: "Bundle",
          type: "searchset",
          entry: matchingLocations.map(resource => ({ resource }))
        };
      }
      return {
        resourceType: "Bundle",
        type: "searchset",
        entry: sampleLocations.map(resource => ({ resource }))
      };
    } else if (resourceUrl.startsWith('Location/')) {
      // Individual location by ID
      const id = resourceUrl.split('/')[1];
      const location = sampleLocations.find(l => l.id === id) || sampleLocations[0];
      return location;
    } else if (resourceUrl.startsWith('Appointment?patient=')) {
      const patientId = resourceUrl.split('=')[1];
      const appointmentsForPatient = sampleAppointments.filter(appt => appt.participant.some(p => p.actor.reference.includes(patientId)));
      return {
        resourceType: "Bundle",
        type: "searchset",
        entry: appointmentsForPatient.map(resource => ({ resource }))
      };
    } else if (resourceUrl === 'PractitionerRole' || resourceUrl.startsWith('PractitionerRole?')) {
      // Query for all practitioner roles or by practitioner
      if (resourceUrl.includes('practitioner=')) {
        const practitionerId = resourceUrl.split('practitioner=')[1].split('&')[0];
        const rolesForPractitioner = samplePractitionerRoles.filter(role => role.practitioner.reference.includes(practitionerId));
        return {
          resourceType: "Bundle",
          type: "searchset",
          entry: rolesForPractitioner.map(resource => ({ resource }))
        };
      }
      return {
        resourceType: "Bundle",
        type: "searchset",
        entry: samplePractitionerRoles.map(resource => ({ resource }))
      };
    } else {
      return { entry: [] };
    }
  }

  // Added method to return all patients
  patients() {
    return Promise.resolve(samplePatients);
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // Register user profile and settings routes
  await registerUserRoutes(app);

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
        state: uuidv4(),
        current: true // Set this as the current active session
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

  // HAPI FHIR Test Server connection endpoint
  app.post('/api/fhir/hapi/connect', async (req: Request, res: Response) => {
    try {
      // Get patient ID from request or use a test patient
      const patientId = req.body.patientId || '1905285'; // Default to a test patient if none provided

      // Create a HAPI FHIR test server session
      const sessionData = {
        provider: 'hapi',
        accessToken: 'hapi_access_token_' + uuidv4(), // Not needed for public server but kept for consistency
        refreshToken: 'hapi_refresh_token_' + uuidv4(),
        tokenExpiry: new Date(Date.now() + 86400 * 1000), // 24 hours from now
        fhirServer: 'https://hapi.fhir.org/baseR4',
        patientId: patientId,
        scope: 'patient/*.read',
        state: uuidv4(),
        current: true // Set this as the current active session
      };

      // Save to storage
      const session = await storage.createFhirSession(sessionData);

      res.status(200).json({
        success: true,
        message: 'HAPI FHIR test server connection created successfully',
        patientId: patientId
      });
    } catch (error) {
      console.error('Error creating HAPI FHIR test session:', error);
      res.status(500).json({ message: 'Failed to connect to HAPI FHIR test server' });
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
        createdAt: session.createdAt,
        current: session.current
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
      // Ensure the current flag is set
      const sessionData = {
        ...req.body,
        current: true // Set this as the current active session
      };

      const session = await storage.createFhirSession(sessionData);

      // Don't expose sensitive data like tokens
      const sanitizedSession = {
        id: session.id,
        provider: session.provider,
        fhirServer: session.fhirServer,
        patientId: session.patientId,
        scope: session.scope,
        createdAt: session.createdAt,
        current: session.current
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

  // Get insurance coverage
  app.get('/api/fhir/coverage', async (req: Request, res: Response) => {
    try {
      const session = await storage.getCurrentFhirSession();

      if (!session) {
        return res.status(401).json({ message: 'No active FHIR session' });
      }

      // Create an authenticated FHIR client
      const client = await createFhirClient(session);

      // Get coverage for the patient
      const coverage = await client.request(
        `Coverage?beneficiary=${session.patientId}`
      );

      res.json(coverage.entry ? coverage.entry.map((entry: any) => entry.resource) : []);
    } catch (error) {
      console.error('Error fetching coverage:', error);
      res.status(500).json({ message: 'Failed to fetch coverage' });
    }
  });

  // Get claims
  app.get('/api/fhir/claim', async (req: Request, res: Response) => {
    try {
      const session = await storage.getCurrentFhirSession();

      if (!session) {
        return res.status(401).json({ message: 'No active FHIR session' });
      }

      // Create an authenticated FHIR client
      const client = await createFhirClient(session);

      // Get claims for the patient
      const claims = await client.request(
        `Claim?patient=${session.patientId}&_sort=-created`
      );

      res.json(claims.entry ? claims.entry.map((entry: any) => entry.resource) : []);
    } catch (error) {
      console.error('Error fetching claims:', error);
      res.status(500).json({ message: 'Failed to fetch claims' });
    }
  });

  // Get explanations of benefits
  app.get('/api/fhir/explanation-of-benefit', async (req: Request, res: Response) => {
    try {
      const session = await storage.getCurrentFhirSession();

      if (!session) {
        return res.status(401).json({ message: 'No active FHIR session' });
      }

      // Create an authenticated FHIR client
      const client = await createFhirClient(session);

      // Get EOBs for the patient
      const explanationOfBenefits = await client.request(
        `ExplanationOfBenefit?patient=${session.patientId}&_sort=-created`
      );

      res.json(explanationOfBenefits.entry ? explanationOfBenefits.entry.map((entry: any) => entry.resource) : []);
    } catch (error) {
      console.error('Error fetching explanation of benefits:', error);
      res.status(500).json({ message: 'Failed to fetch explanation of benefits' });
    }
  });

  // Care Gaps endpoint - HEDIS CQL implementation
  app.get('/api/fhir/care-gaps', async (req: Request, res: Response) => {
    try {
      const session = await storage.getCurrentFhirSession();

      if (!session) {
        return res.status(401).json({ message: 'No active FHIR session' });
      }

      // Create an authenticated FHIR client
      const client = await createFhirClient(session);

      // Gather all required data for care gap evaluation
      const patientRequest = client.request(`Patient/${session.patientId}`);
      const conditionsRequest = client.request(`Condition?patient=${session.patientId}`);
      const observationsRequest = client.request(`Observation?patient=${session.patientId}`);
      const medicationsRequest = client.request(`MedicationRequest?patient=${session.patientId}`);
      const immunizationsRequest = client.request(`Immunization?patient=${session.patientId}`);

      // Fetch all resources in parallel
      const [patient, conditions, observations, medications, immunizations] =
        await Promise.all([
          patientRequest,
          conditionsRequest,
          observationsRequest,
          medicationsRequest,
          immunizationsRequest
        ]);

      // Normalize data structure
      const patientResource = patient;
      const conditionResources = conditions.entry ?
        conditions.entry.map((entry: any) => entry.resource) : [];
      const observationResources = observations.entry ?
        observations.entry.map((entry: any) => entry.resource) : [];
      const medicationResources = medications.entry ?
        medications.entry.map((entry: any) => entry.resource) : [];
      const immunizationResources = immunizations.entry ?
        immunizations.entry.map((entry: any) => entry.resource) : [];

      // Prepare health context for care gap evaluation
      const healthContext: PatientHealthContext = {
        patient: patientResource,
        conditions: conditionResources,
        observations: observationResources,
        medications: medicationResources,
        immunizations: immunizationResources
      };

      // Evaluate care gaps
      const careGaps = careGapsService.evaluateAllCareGaps(healthContext);

      res.json(careGaps);
    } catch (error) {
      console.error('Error evaluating care gaps:', error);
      res.status(500).json({ message: 'Failed to evaluate care gaps' });
    }
  });

  // Provider Directory Endpoints

  // Get practitioners
  app.get('/api/fhir/practitioner', async (req: Request, res: Response) => {
    try {
      const session = await storage.getCurrentFhirSession();

      if (!session) {
        return res.status(401).json({ message: 'No active FHIR session' });
      }

      // Create an authenticated FHIR client
      const client = await createFhirClient(session);

      // Handle single practitioner request
      if (req.query.id) {
        const practitioner = await client.request(`Practitioner/${req.query.id}`);
        return res.json(practitioner);
      }

      // Handle search by name
      if (req.query.name) {
        const practitioners = await client.request(`Practitioner?name=${req.query.name}`);
        return res.json(practitioners.entry ? practitioners.entry.map((entry: any) => entry.resource) : []);
      }

      // Get all practitioners
      const practitioners = await client.request('Practitioner');
      res.json(practitioners.entry ? practitioners.entry.map((entry: any) => entry.resource) : []);
    } catch (error) {
      console.error('Error fetching practitioners:', error);
      res.status(500).json({ message: 'Failed to fetch practitioners' });
    }
  });

  // Get organizations
  app.get('/api/fhir/organization', async (req: Request, res: Response) => {
    try {
      const session = await storage.getCurrentFhirSession();

      if (!session) {
        return res.status(401).json({ message: 'No active FHIR session' });
      }

      // Create an authenticated FHIR client
      const client = await createFhirClient(session);

      // Handle single organization request
      if (req.query.id) {
        const organization = await client.request(`Organization/${req.query.id}`);
        return res.json(organization);
      }

      // Handle search by name
      if (req.query.name) {
        const organizations = await client.request(`Organization?name=${req.query.name}`);
        return res.json(organizations.entry ? organizations.entry.map((entry: any) => entry.resource) : []);
      }

      // Get all organizations
      const organizations = await client.request('Organization');
      res.json(organizations.entry ? organizations.entry.map((entry: any) => entry.resource) : []);
    } catch (error) {
      console.error('Error fetching organizations:', error);
      res.status(500).json({ message: 'Failed to fetch organizations' });
    }
  });

  // Get locations
  app.get('/api/fhir/location', async (req: Request, res: Response) => {
    try {
      const session = await storage.getCurrentFhirSession();

      if (!session) {
        return res.status(401).json({ message: 'No active FHIR session' });
      }

      // Create an authenticated FHIR client
      const client = await createFhirClient(session);

      // Handle single location request
      if (req.query.id) {
        const location = await client.request(`Location/${req.query.id}`);
        return res.json(location);
      }

      // Handle search by name
      if (req.query.name) {
        const locations = await client.request(`Location?name=${req.query.name}`);
        return res.json(locations.entry ? locations.entry.map((entry: any) => entry.resource) : []);
      }

      // Get all locations
      const locations = await client.request('Location');
      res.json(locations.entry ? locations.entry.map((entry: any) => entry.resource) : []);
    } catch (error) {
      console.error('Error fetching locations:', error);
      res.status(500).json({ message: 'Failed to fetch locations' });
    }
  });

  // Get appointments
  app.get('/api/fhir/appointment', async (req: Request, res: Response) => {
    try {
      const session = await storage.getCurrentFhirSession();

      if (!session) {
        return res.status(401).json({ message: 'No active FHIR session' });
      }

      // Create an authenticated FHIR client
      const client = await createFhirClient(session);

      // Get appointments for the patient
      const appointments = await client.request(`Appointment?patient=${session.patientId}`);
      res.json(appointments.entry ? appointments.entry.map((entry: any) => entry.resource) : []);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      res.status(500).json({ message: 'Failed to fetch appointments' });
    }
  });

  // Get practitioner roles
  app.get('/api/fhir/practitionerrole', async (req: Request, res: Response) => {
    try {
      const session = await storage.getCurrentFhirSession();

      if (!session) {
        return res.status(401).json({ message: 'No active FHIR session' });
      }

      // Create an authenticated FHIR client
      const client = await createFhirClient(session);

      // Filter by practitioner if requested
      if (req.query.practitioner) {
        const roles = await client.request(`PractitionerRole?practitioner=${req.query.practitioner}`);
        return res.json(roles.entry ? roles.entry.map((entry: any) => entry.resource) : []);
      }

      // Get all practitioner roles
      const roles = await client.request('PractitionerRole');
      res.json(roles.entry ? roles.entry.map((entry: any) => entry.resource) : []);
    } catch (error) {
      console.error('Error fetching practitioner roles:', error);
      res.status(500).json({ message: 'Failed to fetch practitioner roles' });
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

  // Register Phase 1-3 routes
  app.use('/api/family', familyRoutes);
  app.use('/api/scheduling', schedulingService);
  app.use('/api/notifications', notificationService);

  return httpServer;
}

// Helper function to create an authenticated FHIR client
async function createFhirClient(session: any) {
  if (!session) {
    throw new Error('Session is required to create FHIR client');
  }

  // Special handling for demo provider
  if (session.provider === 'demo') {
    return new DemoFhirClient(session.patientId);
  }

  // Special handling for HAPI FHIR test server (public server doesn't require auth)
  if (session.provider === 'hapi') {
    return {
      request: async (resourceUrl: string) => {
        try {
          const url = `https://hapi.fhir.org/baseR4/${resourceUrl}`;
          const response = await fetch(url, {
            signal: AbortSignal.timeout(10000) // 10 second timeout
          });
          if (!response.ok) {
            throw new Error(`HAPI FHIR server error: ${response.status} - ${response.statusText}`);
          }
          return response.json();
        } catch (error) {
          console.error('Error querying HAPI FHIR server:', error);
          // Return empty bundle structure for graceful degradation
          return { entry: [] };
        }
      }
    };
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