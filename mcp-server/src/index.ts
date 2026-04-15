#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { applyGuardrails, logAuditError, getAuditLog } from "./guardrails.js";

// Configuration
const API_BASE_URL = process.env.SMARTHEALTHCONNECT_API_URL || "http://localhost:5050";
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || "SmartHealth2025";

// Session state
let sessionActive = false;

// Helper function to make API calls
async function apiCall(method: string, endpoint: string, body?: any): Promise<any> {
  const url = `${API_BASE_URL}${endpoint}`;
  const options: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(15000),
  };
  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  if (!response.ok) {
    const error = await response.text().catch(() => "");
    throw new Error(`API Error ${response.status}: ${error || response.statusText}`);
  }
  return response.json();
}

// Ensure demo session is active
async function ensureSession(): Promise<void> {
  if (!sessionActive) {
    try {
      await apiCall("POST", "/api/fhir/demo/connect", { password: DEMO_PASSWORD });
      sessionActive = true;
    } catch (error) {
      // Check if a session already exists
      try {
        await apiCall("GET", "/api/fhir/sessions/current");
        sessionActive = true;
      } catch {
        throw new Error(
          `Cannot connect to SmartHealthConnect backend at ${API_BASE_URL}. ` +
          `Start it with: cd SmartHealthConnect && PORT=5050 npm run dev`
        );
      }
    }
  }
}

// Create the MCP server
const server = new Server(
  {
    name: "smarthealthconnect",
    version: "1.1.0",
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

// Define available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      // Health Summary Tools
      {
        name: "get_health_summary",
        description: "Get a comprehensive health summary including conditions, medications, allergies, and recent vitals for the patient or a family member",
        inputSchema: {
          type: "object",
          properties: {
            familyMemberId: {
              type: "number",
              description: "Optional: ID of family member. Omit for primary patient.",
            },
          },
        },
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
          openWorldHint: true,
        },
      },
      {
        name: "get_conditions",
        description: "Get list of active health conditions (diagnoses) for the patient",
        inputSchema: {
          type: "object",
          properties: {},
        },
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
          openWorldHint: true,
        },
      },
      {
        name: "get_medications",
        description: "Get current medication list with dosage instructions",
        inputSchema: {
          type: "object",
          properties: {},
        },
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
          openWorldHint: true,
        },
      },
      {
        name: "get_vitals",
        description: "Get recent vital signs (blood pressure, heart rate, weight, etc.)",
        inputSchema: {
          type: "object",
          properties: {
            limit: {
              type: "number",
              description: "Maximum number of observations to return (default: 20)",
            },
          },
        },
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
          openWorldHint: true,
        },
      },
      {
        name: "get_allergies",
        description: "Get list of known allergies and intolerances",
        inputSchema: {
          type: "object",
          properties: {},
        },
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
          openWorldHint: true,
        },
      },
      // Family Management Tools
      {
        name: "get_family_members",
        description: "Get list of family members being tracked in the health system",
        inputSchema: {
          type: "object",
          properties: {},
        },
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
          openWorldHint: true,
        },
      },
      {
        name: "get_family_health_overview",
        description: "Get health overview for all family members including pending care actions",
        inputSchema: {
          type: "object",
          properties: {},
        },
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
          openWorldHint: true,
        },
      },
      // Care Gap Tools
      {
        name: "get_care_gaps",
        description: "Get preventive care recommendations based on HEDIS quality measures (screenings, vaccinations due, etc.)",
        inputSchema: {
          type: "object",
          properties: {},
        },
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
          openWorldHint: true,
        },
      },
      // Provider Search Tools
      {
        name: "find_specialists",
        description: "Search for healthcare specialists by specialty and location using the NPI Registry",
        inputSchema: {
          type: "object",
          properties: {
            specialty: {
              type: "string",
              description: "Medical specialty (e.g., cardiology, dermatology, endocrinology)",
            },
            city: {
              type: "string",
              description: "City name",
            },
            state: {
              type: "string",
              description: "2-letter state code (e.g., NY, CA)",
            },
          },
          required: ["specialty"],
        },
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
          openWorldHint: true,
        },
      },
      // Drug Interaction Tools
      {
        name: "check_drug_interactions",
        description: "Check for potential drug interactions using OpenFDA data",
        inputSchema: {
          type: "object",
          properties: {
            drugNames: {
              type: "array",
              items: { type: "string" },
              description: "List of drug names to check for interactions",
            },
          },
          required: ["drugNames"],
        },
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
          openWorldHint: true,
        },
      },
      // Clinical Trials Tools
      {
        name: "find_clinical_trials",
        description: "Search for relevant clinical trials from ClinicalTrials.gov",
        inputSchema: {
          type: "object",
          properties: {
            condition: {
              type: "string",
              description: "Health condition to search trials for",
            },
            location: {
              type: "string",
              description: "Location (city or state) for trial recruitment",
            },
            status: {
              type: "string",
              enum: ["recruiting", "not_yet_recruiting", "completed"],
              description: "Trial status filter",
            },
          },
          required: ["condition"],
        },
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
          openWorldHint: true,
        },
      },
      // Research Tools
      {
        name: "get_research_insights",
        description: "Get recent medical research preprints from bioRxiv/medRxiv related to a condition",
        inputSchema: {
          type: "object",
          properties: {
            condition: {
              type: "string",
              description: "Health condition to search research for",
            },
            server: {
              type: "string",
              enum: ["medrxiv", "biorxiv"],
              description: "Preprint server to search (default: medrxiv)",
            },
          },
          required: ["condition"],
        },
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
          openWorldHint: true,
        },
      },
      // Care Plan Tools
      {
        name: "get_care_plans",
        description: "Get AI-generated care plans for managing health conditions",
        inputSchema: {
          type: "object",
          properties: {
            familyMemberId: {
              type: "number",
              description: "Family member ID (default: 1 for primary)",
            },
          },
        },
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
          openWorldHint: true,
        },
      },
      {
        name: "generate_care_plan",
        description: "Generate a new AI care plan for a specific condition",
        inputSchema: {
          type: "object",
          properties: {
            conditionName: {
              type: "string",
              description: "Name of the condition to create a care plan for",
            },
            familyMemberId: {
              type: "number",
              description: "Family member ID (default: 1 for primary)",
            },
          },
          required: ["conditionName"],
        },
        annotations: {
          readOnlyHint: false,
          destructiveHint: false,
          idempotentHint: false,
          openWorldHint: true,
        },
      },
      // Journal Tools
      {
        name: "get_health_journal",
        description: "Get health journal entries (mood, symptoms, activities) for a family member",
        inputSchema: {
          type: "object",
          properties: {
            familyMemberId: {
              type: "number",
              description: "Family member ID (default: 1 for primary)",
            },
            entryType: {
              type: "string",
              enum: ["mood", "symptom", "activity", "medication", "sleep", "meal", "note"],
              description: "Filter by entry type",
            },
          },
        },
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
          openWorldHint: true,
        },
      },
      {
        name: "add_journal_entry",
        description: "Add a new health journal entry (mood, symptom, activity, etc.)",
        inputSchema: {
          type: "object",
          properties: {
            familyMemberId: {
              type: "number",
              description: "Family member ID (default: 1)",
            },
            entryType: {
              type: "string",
              enum: ["mood", "symptom", "activity", "medication", "sleep", "meal", "note"],
              description: "Type of journal entry",
            },
            title: {
              type: "string",
              description: "Title for the entry",
            },
            content: {
              type: "string",
              description: "Text content/notes",
            },
            mood: {
              type: "number",
              description: "Mood rating 1-10 (for mood entries)",
            },
            symptoms: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  severity: { type: "number" },
                },
              },
              description: "Symptoms with severity (for symptom entries)",
            },
          },
          required: ["entryType"],
        },
        annotations: {
          readOnlyHint: false,
          destructiveHint: false,
          idempotentHint: false,
          openWorldHint: true,
        },
      },
      // Data Connection Tools
      {
        name: "connect_flexpa",
        description: "Start a Flexpa connection to import health data from your insurance/payer. Returns an authorization URL for the user to visit.",
        inputSchema: {
          type: "object",
          properties: {
            redirectUri: {
              type: "string",
              description: "OAuth redirect URI (optional, defaults to server callback)",
            },
          },
        },
        annotations: {
          readOnlyHint: false,
          destructiveHint: false,
          openWorldHint: true,
        },
      },
      {
        name: "connect_health_portal",
        description: "Start a Health Skillz session to import records from a patient portal (Epic, etc.) via end-to-end encrypted transfer. Returns a connect URL for the user.",
        inputSchema: {
          type: "object",
          properties: {},
        },
        annotations: {
          readOnlyHint: false,
          destructiveHint: false,
          openWorldHint: true,
        },
      },
      {
        name: "check_portal_status",
        description: "Check the status of a Health Skillz patient portal import session",
        inputSchema: {
          type: "object",
          properties: {
            sessionId: {
              type: "string",
              description: "The session ID from connect_health_portal",
            },
          },
          required: ["sessionId"],
        },
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
          openWorldHint: true,
        },
      },
      {
        name: "get_available_connections",
        description: "List available data connection methods (Flexpa, Health Skillz, SMART on FHIR) and their configuration status",
        inputSchema: {
          type: "object",
          properties: {},
        },
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
          openWorldHint: false,
        },
      },
      {
        name: "get_mcp_audit_log",
        description: "Get the MCP guardrails audit log showing all tool executions, PHI access, and redaction events",
        inputSchema: {
          type: "object",
          properties: {
            limit: {
              type: "number",
              description: "Maximum number of entries to return (default: 50)",
            },
          },
        },
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
          openWorldHint: false,
        },
      },
      // Appointment Prep Tools
      {
        name: "get_appointment_preps",
        description: "Get appointment preparation summaries for upcoming doctor visits",
        inputSchema: {
          type: "object",
          properties: {
            familyMemberId: {
              type: "number",
              description: "Family member ID (default: 1)",
            },
          },
        },
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
          openWorldHint: true,
        },
      },
      {
        name: "generate_appointment_prep",
        description: "Generate a preparation summary for an upcoming appointment",
        inputSchema: {
          type: "object",
          properties: {
            familyMemberId: {
              type: "number",
              description: "Family member ID (default: 1)",
            },
            appointmentDate: {
              type: "string",
              description: "Date of appointment (YYYY-MM-DD format)",
            },
            visitType: {
              type: "string",
              description: "Type of visit (e.g., 'Annual Physical', 'Follow-up')",
            },
            providerName: {
              type: "string",
              description: "Name of the healthcare provider",
            },
            concerns: {
              type: "string",
              description: "Questions or concerns to discuss (one per line)",
            },
          },
          required: ["appointmentDate", "visitType"],
        },
        annotations: {
          readOnlyHint: false,
          destructiveHint: false,
          idempotentHint: false,
          openWorldHint: true,
        },
      },
      // Vitals Tracking Tools
      {
        name: "log_vitals_reading",
        description: "Log a blood pressure or blood glucose reading for a family member. Returns the saved reading with personalized health education.",
        inputSchema: {
          type: "object",
          properties: {
            familyMemberId: {
              type: "number",
              description: "Family member ID (default: 1)",
            },
            readingType: {
              type: "string",
              enum: ["blood_pressure", "blood_glucose"],
              description: "Type of vital sign reading",
            },
            systolic: {
              type: "number",
              description: "Systolic blood pressure in mmHg (required for blood_pressure)",
            },
            diastolic: {
              type: "number",
              description: "Diastolic blood pressure in mmHg (required for blood_pressure)",
            },
            heartRate: {
              type: "number",
              description: "Heart rate in bpm (optional, for blood_pressure)",
            },
            glucoseValue: {
              type: "number",
              description: "Blood glucose in mg/dL (required for blood_glucose)",
            },
            glucoseContext: {
              type: "string",
              enum: ["fasting", "before_meal", "after_meal", "bedtime", "random"],
              description: "Context of glucose reading (optional)",
            },
            notes: {
              type: "string",
              description: "Optional notes about the reading",
            },
          },
          required: ["readingType"],
        },
        annotations: {
          readOnlyHint: false,
          destructiveHint: false,
          idempotentHint: false,
          openWorldHint: false,
        },
      },
      {
        name: "get_vitals_log",
        description: "Get logged blood pressure and blood glucose readings with trend analysis and personalized education",
        inputSchema: {
          type: "object",
          properties: {
            familyMemberId: {
              type: "number",
              description: "Family member ID (default: 1)",
            },
            type: {
              type: "string",
              enum: ["blood_pressure", "blood_glucose"],
              description: "Filter by reading type (optional)",
            },
          },
        },
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
          openWorldHint: false,
        },
      },
      {
        name: "get_vitals_education",
        description: "Get personalized health education content based on recent vitals readings, including tips, risk assessment, and recommended resources",
        inputSchema: {
          type: "object",
          properties: {
            familyMemberId: {
              type: "number",
              description: "Family member ID (default: 1)",
            },
          },
        },
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
          openWorldHint: true,
        },
      },
      // ===== OpenClaw Health CLAW Skills =====
      // Skill 1: Medication Refill Management
      {
        name: "check_refill_status",
        description: "Check medication refill status including days remaining, refill eligibility, and pending requests",
        inputSchema: {
          type: "object",
          properties: {
            familyMemberId: { type: "number", description: "Family member ID (default: 1)" },
          },
        },
        annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
      },
      {
        name: "request_medication_refill",
        description: "Request a medication refill. Creates a tracked refill request for a specific medication.",
        inputSchema: {
          type: "object",
          properties: {
            familyMemberId: { type: "number", description: "Family member ID (default: 1)" },
            medicationName: { type: "string", description: "Name of the medication to refill" },
            pharmacyName: { type: "string", description: "Pharmacy name (optional)" },
          },
          required: ["medicationName"],
        },
        annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
      },
      {
        name: "get_refill_timeline",
        description: "Get a timeline of upcoming medication refill dates for the next 90 days",
        inputSchema: {
          type: "object",
          properties: {
            familyMemberId: { type: "number", description: "Family member ID (default: 1)" },
            daysAhead: { type: "number", description: "How many days ahead to project (default: 90)" },
          },
        },
        annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
      },
      // Skill 2: Care Completion Tracking
      {
        name: "get_care_completion_summary",
        description: "Get a comprehensive care completion dashboard showing care gaps, pending referrals, follow-ups, and overall completion percentage",
        inputSchema: {
          type: "object",
          properties: {
            familyMemberId: { type: "number", description: "Family member ID (default: 1)" },
          },
        },
        annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
      },
      {
        name: "track_referral",
        description: "Create a tracked referral item (e.g., specialist referral, follow-up appointment, lab order)",
        inputSchema: {
          type: "object",
          properties: {
            familyMemberId: { type: "number", description: "Family member ID (default: 1)" },
            referralType: { type: "string", description: "Type of referral (e.g., specialist, lab, imaging)" },
            reason: { type: "string", description: "Reason for the referral" },
            providerName: { type: "string", description: "Referring or target provider name" },
            dueDate: { type: "string", description: "Due date (YYYY-MM-DD)" },
          },
          required: ["referralType", "reason"],
        },
        annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
      },
      {
        name: "get_overdue_items",
        description: "Get overdue care items including missed screenings, expired referrals, and past-due follow-ups",
        inputSchema: {
          type: "object",
          properties: {
            familyMemberId: { type: "number", description: "Family member ID (default: 1)" },
          },
        },
        annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
      },
      // Skill 3: Diet & Exercise Routines
      {
        name: "log_activity",
        description: "Log a physical activity or exercise session with type, duration, and intensity",
        inputSchema: {
          type: "object",
          properties: {
            familyMemberId: { type: "number", description: "Family member ID (default: 1)" },
            activityType: { type: "string", description: "Type of activity (e.g., walking, running, swimming, yoga)" },
            durationMinutes: { type: "number", description: "Duration in minutes" },
            intensity: { type: "string", enum: ["light", "moderate", "vigorous"], description: "Exercise intensity" },
            notes: { type: "string", description: "Optional notes" },
          },
          required: ["activityType", "durationMinutes", "intensity"],
        },
        annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
      },
      {
        name: "get_activity_correlations",
        description: "Analyze correlations between exercise/diet and health outcomes (BP, glucose). Shows how activity impacts vitals.",
        inputSchema: {
          type: "object",
          properties: {
            familyMemberId: { type: "number", description: "Family member ID (default: 1)" },
            days: { type: "number", description: "Number of days to analyze (default: 30)" },
          },
        },
        annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
      },
      {
        name: "get_diet_exercise_summary",
        description: "Get a weekly or monthly summary of diet and exercise patterns including total activity, sleep quality, and top activities",
        inputSchema: {
          type: "object",
          properties: {
            familyMemberId: { type: "number", description: "Family member ID (default: 1)" },
            period: { type: "string", enum: ["week", "month"], description: "Summary period (default: week)" },
          },
        },
        annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
      },
      // Skill 4: Kids/Family Health Management
      {
        name: "get_immunization_schedule",
        description: "Get CDC-recommended immunization schedule for a family member compared against their actual vaccination records",
        inputSchema: {
          type: "object",
          properties: {
            familyMemberId: { type: "number", description: "Family member ID" },
          },
        },
        annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
      },
      {
        name: "get_wellchild_visits",
        description: "Get AAP-recommended well-child visit schedule showing completed and upcoming visits based on age",
        inputSchema: {
          type: "object",
          properties: {
            familyMemberId: { type: "number", description: "Family member ID" },
          },
        },
        annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
      },
      {
        name: "check_school_health_compliance",
        description: "Check if a child meets school immunization requirements and identify any missing vaccinations",
        inputSchema: {
          type: "object",
          properties: {
            familyMemberId: { type: "number", description: "Family member ID" },
            state: { type: "string", description: "US state code for state-specific requirements (default: general)" },
          },
        },
        annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
      },
      // Skill 5: Healthy Habits Operating Picture
      {
        name: "get_health_operating_picture",
        description: "Get a comprehensive 'health operating picture' — an integrated dashboard of sleep, exercise, medication adherence, vitals trends, and goal progress over the last 30 days",
        inputSchema: {
          type: "object",
          properties: {
            familyMemberId: { type: "number", description: "Family member ID (default: 1)" },
            days: { type: "number", description: "Number of days to include (default: 30)" },
          },
        },
        annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
      },
      {
        name: "log_habit",
        description: "Log a daily habit (water intake, steps, meditation, stretching, etc.)",
        inputSchema: {
          type: "object",
          properties: {
            familyMemberId: { type: "number", description: "Family member ID (default: 1)" },
            habitType: { type: "string", enum: ["water", "steps", "meditation", "stretch", "other"], description: "Type of habit" },
            value: { type: "number", description: "Numeric value (e.g., glasses of water, step count)" },
            unit: { type: "string", description: "Unit of measurement (e.g., glasses, steps, minutes)" },
            notes: { type: "string", description: "Optional notes" },
          },
          required: ["habitType"],
        },
        annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
      },
      {
        name: "get_habit_streaks",
        description: "Get current and longest streaks for tracked habits (consecutive days of logging)",
        inputSchema: {
          type: "object",
          properties: {
            familyMemberId: { type: "number", description: "Family member ID (default: 1)" },
          },
        },
        annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
      },
      // Skill 6: Research Monitoring
      {
        name: "monitor_research_for_conditions",
        description: "Set up automatic research monitoring for a health condition. Searches bioRxiv, medRxiv, and ClinicalTrials.gov for relevant new research.",
        inputSchema: {
          type: "object",
          properties: {
            familyMemberId: { type: "number", description: "Family member ID (default: 1)" },
            conditionName: { type: "string", description: "Health condition to monitor (e.g., diabetes, hypertension)" },
            sources: {
              type: "array",
              items: { type: "string" },
              description: "Sources to monitor (default: all). Options: biorxiv, medrxiv, clinicaltrials, openfda",
            },
          },
          required: ["conditionName"],
        },
        annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
      },
      {
        name: "get_research_digest",
        description: "Get a research digest with new articles and clinical trials matching your monitored conditions since last check",
        inputSchema: {
          type: "object",
          properties: {
            familyMemberId: { type: "number", description: "Family member ID (default: 1)" },
          },
        },
        annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
      },
      {
        name: "check_trial_eligibility",
        description: "Check if a patient might be eligible for a clinical trial based on their age, gender, and conditions",
        inputSchema: {
          type: "object",
          properties: {
            familyMemberId: { type: "number", description: "Family member ID (default: 1)" },
            nctId: { type: "string", description: "Specific ClinicalTrials.gov NCT ID to check" },
            condition: { type: "string", description: "Condition to find matching trials for" },
          },
        },
        annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
      },
      // --- Compiled Truth (proxy to HealthClaw Guardrails engine) ---
      {
        name: "get_compiled_truth",
        description: "Get the current best-known state of a FHIR resource plus the append-only evidence timeline of corrections. Proxies to HealthClaw Guardrails' fhir_compiled_truth tool — the engine this surface depends on. Call this before making resource-specific claims so you can say not just WHAT the record says but WHY it says it. Requires HEALTHCLAW_MCP_URL env var to be set (e.g. http://localhost:3001/mcp/rpc).",
        inputSchema: {
          type: "object",
          properties: {
            resource_type: {
              type: "string",
              description: "FHIR resource type (e.g. 'Condition', 'AllergyIntolerance', 'MedicationRequest')",
            },
            resource_id: {
              type: "string",
              description: "ID of the resource",
            },
            tenant_id: {
              type: "string",
              description: "HealthClaw tenant identifier. Defaults to the HEALTHCLAW_TENANT_ID env var or 'desktop-demo'.",
            },
          },
          required: ["resource_type", "resource_id"],
        },
        annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
      },
    ],
  };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    await ensureSession();

    switch (name) {
      // Health Summary Tools
      case "get_health_summary": {
        const [patient, conditions, medications, allergies, observations] = await Promise.all([
          apiCall("GET", "/api/fhir/patient"),
          apiCall("GET", "/api/fhir/condition"),
          apiCall("GET", "/api/fhir/medicationrequest"),
          apiCall("GET", "/api/fhir/allergyintolerance"),
          apiCall("GET", "/api/fhir/observation"),
        ]);

        const summary = {
          patient: {
            name: patient.name?.[0]?.given?.join(" ") + " " + patient.name?.[0]?.family,
            birthDate: patient.birthDate,
            gender: patient.gender,
          },
          conditions: conditions.map((c: any) => ({
            name: c.code?.coding?.[0]?.display || c.code?.text,
            status: c.clinicalStatus?.coding?.[0]?.code,
            onset: c.onsetDateTime,
          })),
          medications: medications.map((m: any) => ({
            name: m.medicationCodeableConcept?.coding?.[0]?.display,
            status: m.status,
            dosage: m.dosageInstruction?.[0]?.text,
          })),
          allergies: allergies.map((a: any) => ({
            substance: a.code?.coding?.[0]?.display,
            reaction: a.reaction?.[0]?.manifestation?.[0]?.coding?.[0]?.display,
            severity: a.reaction?.[0]?.severity,
          })),
          recentVitals: observations.slice(0, 5).map((o: any) => ({
            type: o.code?.coding?.[0]?.display,
            value: o.valueQuantity?.value,
            unit: o.valueQuantity?.unit,
            date: o.effectiveDateTime,
          })),
        };

        return {
          content: applyGuardrails("get_health_summary", summary),
        };
      }

      case "get_conditions": {
        const conditions = await apiCall("GET", "/api/fhir/condition");
        return {
          content: applyGuardrails("get_conditions", conditions),
        };
      }

      case "get_medications": {
        const medications = await apiCall("GET", "/api/fhir/medicationrequest");
        return {
          content: applyGuardrails("get_medications", medications),
        };
      }

      case "get_vitals": {
        const observations = await apiCall("GET", "/api/fhir/observation");
        const limit = (args as any)?.limit || 20;
        return {
          content: applyGuardrails("get_vitals", observations.slice(0, limit)),
        };
      }

      case "get_allergies": {
        const allergies = await apiCall("GET", "/api/fhir/allergyintolerance");
        return {
          content: applyGuardrails("get_allergies", allergies),
        };
      }

      // Family Management
      case "get_family_members": {
        try {
          const members = await apiCall("GET", "/api/family/members");
          return { content: applyGuardrails("get_family_members", members) };
        } catch {
          const fallback = [{ id: 1, name: "Self", relationship: "self", isPrimary: true }];
          return { content: applyGuardrails("get_family_members", fallback) };
        }
      }

      case "get_family_health_overview": {
        try {
          const summary = await apiCall("GET", "/api/family/summary");
          return { content: applyGuardrails("get_family_health_overview", summary) };
        } catch {
          const fallback = {
            members: [{ id: 1, name: "Self", relationship: "self", pendingActions: 0 }],
            totalPendingActions: 0,
          };
          return { content: applyGuardrails("get_family_health_overview", fallback) };
        }
      }

      // Care Gaps
      case "get_care_gaps": {
        const careGaps = await apiCall("GET", "/api/fhir/care-gaps");
        return { content: applyGuardrails("get_care_gaps", careGaps) };
      }

      // Provider Search
      case "find_specialists": {
        const { specialty, city, state } = args as { specialty: string; city?: string; state?: string };
        const params = new URLSearchParams({ specialty });
        if (city) params.append("city", city);
        if (state) params.append("state", state);

        const providers = await apiCall("GET", `/api/external/providers/specialists?${params}`);
        return { content: applyGuardrails("find_specialists", providers) };
      }

      // Drug Interactions
      case "check_drug_interactions": {
        const { drugNames } = args as { drugNames: string[] };
        const interactions = await apiCall("POST", "/api/external/drugs/interactions", { drugs: drugNames });
        return { content: applyGuardrails("check_drug_interactions", interactions) };
      }

      // Clinical Trials
      case "find_clinical_trials": {
        const { condition, location, status } = args as { condition: string; location?: string; status?: string };
        const params = new URLSearchParams({ condition });
        if (location) params.append("location", location);
        if (status) params.append("status", status);

        const trials = await apiCall("GET", `/api/external/trials/search?${params}`);
        return { content: applyGuardrails("find_clinical_trials", trials) };
      }

      // Research
      case "get_research_insights": {
        const { condition, server } = args as { condition: string; server?: string };
        const params = server ? `?server=${server}` : "";
        const research = await apiCall("GET", `/api/external/research/condition/${encodeURIComponent(condition)}${params}`);
        return { content: applyGuardrails("get_research_insights", research) };
      }

      // Care Plans
      case "get_care_plans": {
        const familyMemberId = (args as any)?.familyMemberId || 1;
        try {
          const plans = await apiCall("GET", `/api/family/${familyMemberId}/care-plans`);
          return { content: applyGuardrails("get_care_plans", plans) };
        } catch {
          const fallback = [{
            id: 1, conditionName: "Type 2 Diabetes", title: "Diabetes Management Plan",
            status: "active",
            goals: [
              { goal: "Reduce A1C to below 7%", status: "in_progress" },
              { goal: "Check blood glucose twice daily", status: "achieved" },
            ],
          }];
          return { content: applyGuardrails("get_care_plans", fallback) };
        }
      }

      case "generate_care_plan": {
        const { conditionName, familyMemberId = 1 } = args as { conditionName: string; familyMemberId?: number };
        try {
          const plan = await apiCall("POST", `/api/family/${familyMemberId}/care-plans/generate`, {
            conditionName, memberName: "Patient",
          });
          return { content: applyGuardrails("generate_care_plan", plan) };
        } catch {
          return {
            content: applyGuardrails("generate_care_plan", {
              message: `Care plan template for ${conditionName}. Full AI generation requires database connection.`,
            }),
          };
        }
      }

      // Journal
      case "get_health_journal": {
        const { familyMemberId = 1, entryType } = args as { familyMemberId?: number; entryType?: string };
        const params = entryType ? `?type=${entryType}` : "";
        try {
          const entries = await apiCall("GET", `/api/family/${familyMemberId}/journal${params}`);
          return { content: applyGuardrails("get_health_journal", entries) };
        } catch {
          const fallback = [{
            id: 1, entryType: "mood", title: "Morning Check-in",
            mood: 8, content: "Feeling well-rested",
            entryDate: new Date().toISOString().split("T")[0],
          }];
          return { content: applyGuardrails("get_health_journal", fallback) };
        }
      }

      case "add_journal_entry": {
        const { familyMemberId = 1, ...entryData } = args as any;
        try {
          const entry = await apiCall("POST", `/api/family/${familyMemberId}/journal`, {
            ...entryData,
            entryDate: new Date().toISOString().split("T")[0],
            entryTime: new Date().toTimeString().split(" ")[0].slice(0, 5),
          });
          return { content: applyGuardrails("add_journal_entry", entry) };
        } catch {
          return {
            content: applyGuardrails("add_journal_entry", {
              message: `Journal entry recorded: ${entryData.entryType} - ${entryData.title || "Entry"}. Persistence requires database connection.`,
            }),
          };
        }
      }

      // Appointment Prep
      case "get_appointment_preps": {
        const familyMemberId = (args as any)?.familyMemberId || 1;
        try {
          const preps = await apiCall("GET", `/api/family/${familyMemberId}/appointment-prep`);
          return { content: applyGuardrails("get_appointment_preps", preps) };
        } catch {
          const fallback = [{
            id: 1,
            appointmentDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
            visitType: "Annual Physical", providerName: "Dr. Smith",
            questionsToAsk: ["Review current medications", "Discuss preventive screenings"],
          }];
          return { content: applyGuardrails("get_appointment_preps", fallback) };
        }
      }

      case "generate_appointment_prep": {
        const { familyMemberId = 1, appointmentDate, visitType, providerName, concerns } = args as any;
        try {
          const prep = await apiCall("POST", `/api/family/${familyMemberId}/appointment-prep/generate`, {
            appointmentDate, visitType, providerName, concerns,
          });
          return { content: applyGuardrails("generate_appointment_prep", prep) };
        } catch {
          return {
            content: applyGuardrails("generate_appointment_prep", {
              message: `Appointment prep created for ${visitType} on ${appointmentDate} with ${providerName || "provider"}. Persistence requires database connection.`,
            }),
          };
        }
      }

      // Data Connection Tools
      case "connect_flexpa": {
        const result = await apiCall("POST", "/api/connections/flexpa/authorize", {
          redirectUri: (args as any)?.redirectUri,
        });
        return {
          content: applyGuardrails("connect_flexpa", result),
        };
      }

      case "connect_health_portal": {
        const result = await apiCall("POST", "/api/connections/health-skillz/session");
        return {
          content: applyGuardrails("connect_health_portal", result),
        };
      }

      case "check_portal_status": {
        const { sessionId } = args as { sessionId: string };
        const result = await apiCall("GET", `/api/connections/health-skillz/session/${sessionId}/status`);
        return {
          content: applyGuardrails("check_portal_status", result),
        };
      }

      case "get_available_connections": {
        const result = await apiCall("GET", "/api/connections/available");
        return {
          content: applyGuardrails("get_available_connections", result),
        };
      }

      case "get_mcp_audit_log": {
        const limit = (args as any)?.limit || 50;
        const log = getAuditLog(limit);
        return {
          content: [{ type: "text", text: JSON.stringify({ entries: log, count: log.length }, null, 2) }],
        };
      }

      // Vitals Tracking Tools
      case "log_vitals_reading": {
        const memberId = (args as any)?.familyMemberId || 1;
        const today = new Date().toISOString().split('T')[0];
        const now = new Date().toTimeString().slice(0, 5);

        const readingData: Record<string, unknown> = {
          readingDate: today,
          readingTime: now,
          readingType: (args as any).readingType,
          source: 'mcp',
          notes: (args as any)?.notes,
        };

        if ((args as any).readingType === 'blood_pressure') {
          readingData.systolic = (args as any).systolic;
          readingData.diastolic = (args as any).diastolic;
          readingData.heartRate = (args as any)?.heartRate;
        } else {
          readingData.glucoseValue = (args as any).glucoseValue;
          readingData.glucoseContext = (args as any)?.glucoseContext || 'random';
        }

        const saved = await apiCall("POST", `/api/vitals/${memberId}`, readingData);
        return {
          content: applyGuardrails("log_vitals_reading", {
            reading: saved,
            education: saved.aiEducation,
            _humanInTheLoop: "This vitals reading has been logged. The health education provided is for informational purposes only — please verify with your healthcare provider.",
          }),
        };
      }

      case "get_vitals_log": {
        const memberId = (args as any)?.familyMemberId || 1;
        const typeFilter = (args as any)?.type ? `?type=${(args as any).type}` : '';
        const [readings, trends] = await Promise.all([
          apiCall("GET", `/api/vitals/${memberId}${typeFilter}`),
          apiCall("GET", `/api/vitals/${memberId}/trends`),
        ]);

        return {
          content: applyGuardrails("get_vitals_log", {
            readings: readings.slice(0, 20),
            trends: {
              bloodPressure: trends.bloodPressure?.stats,
              bloodGlucose: trends.bloodGlucose?.stats,
            },
            totalReadings: trends.totalReadings,
          }),
        };
      }

      case "get_vitals_education": {
        const memberId = (args as any)?.familyMemberId || 1;
        const trends = await apiCall("GET", `/api/vitals/${memberId}/trends`);

        return {
          content: applyGuardrails("get_vitals_education", {
            education: trends.education,
            bloodPressureClassification: trends.bloodPressure?.stats?.classification,
            bloodGlucoseClassification: trends.bloodGlucose?.stats?.classification,
            _medicalDisclaimer: "This education content is generated based on standard clinical guidelines (AHA, ADA) and is for informational purposes only. It does not constitute medical advice.",
          }),
        };
      }

      // ===== OpenClaw Health CLAW Skills =====

      // Skill 1: Medication Refills
      case "check_refill_status": {
        const memberId = (args as any)?.familyMemberId || 1;
        const result = await apiCall("GET", `/api/refills/${memberId}/status`);
        return { content: applyGuardrails("check_refill_status", result) };
      }

      case "request_medication_refill": {
        const memberId = (args as any)?.familyMemberId || 1;
        const { medicationName, pharmacyName } = args as { medicationName: string; pharmacyName?: string };
        const result = await apiCall("POST", `/api/refills/${memberId}/request`, {
          medicationName, pharmacyName,
        });
        return { content: applyGuardrails("request_medication_refill", result) };
      }

      case "get_refill_timeline": {
        const memberId = (args as any)?.familyMemberId || 1;
        const days = (args as any)?.daysAhead || 90;
        const result = await apiCall("GET", `/api/refills/${memberId}/timeline?days=${days}`);
        return { content: applyGuardrails("get_refill_timeline", result) };
      }

      // Skill 2: Care Completion
      case "get_care_completion_summary": {
        const memberId = (args as any)?.familyMemberId || 1;
        const result = await apiCall("GET", `/api/care-completion/${memberId}/summary`);
        return { content: applyGuardrails("get_care_completion_summary", result) };
      }

      case "track_referral": {
        const memberId = (args as any)?.familyMemberId || 1;
        const { referralType, reason, providerName, dueDate } = args as any;
        const result = await apiCall("POST", `/api/care-completion/${memberId}/referral`, {
          referralType, reason, providerName, dueDate,
        });
        return { content: applyGuardrails("track_referral", result) };
      }

      case "get_overdue_items": {
        const memberId = (args as any)?.familyMemberId || 1;
        const result = await apiCall("GET", `/api/care-completion/${memberId}/overdue`);
        return { content: applyGuardrails("get_overdue_items", result) };
      }

      // Skill 3: Diet & Exercise
      case "log_activity": {
        const memberId = (args as any)?.familyMemberId || 1;
        const { activityType, durationMinutes, intensity, notes } = args as any;
        const result = await apiCall("POST", `/api/activity/${memberId}/log`, {
          activityType, durationMinutes, intensity, notes,
        });
        return { content: applyGuardrails("log_activity", result) };
      }

      case "get_activity_correlations": {
        const memberId = (args as any)?.familyMemberId || 1;
        const days = (args as any)?.days || 30;
        const result = await apiCall("GET", `/api/activity/${memberId}/correlations?days=${days}`);
        return { content: applyGuardrails("get_activity_correlations", result) };
      }

      case "get_diet_exercise_summary": {
        const memberId = (args as any)?.familyMemberId || 1;
        const period = (args as any)?.period || "week";
        const result = await apiCall("GET", `/api/activity/${memberId}/summary?period=${period}`);
        return { content: applyGuardrails("get_diet_exercise_summary", result) };
      }

      // Skill 4: Kids/Family Health
      case "get_immunization_schedule": {
        const memberId = (args as any)?.familyMemberId || 1;
        const result = await apiCall("GET", `/api/pediatric/${memberId}/immunization-schedule`);
        return { content: applyGuardrails("get_immunization_schedule", result) };
      }

      case "get_wellchild_visits": {
        const memberId = (args as any)?.familyMemberId || 1;
        const result = await apiCall("GET", `/api/pediatric/${memberId}/wellchild-visits`);
        return { content: applyGuardrails("get_wellchild_visits", result) };
      }

      case "check_school_health_compliance": {
        const memberId = (args as any)?.familyMemberId || 1;
        const state = (args as any)?.state || "default";
        const result = await apiCall("GET", `/api/pediatric/${memberId}/school-compliance?state=${state}`);
        return { content: applyGuardrails("check_school_health_compliance", result) };
      }

      // Skill 5: Healthy Habits
      case "get_health_operating_picture": {
        const memberId = (args as any)?.familyMemberId || 1;
        const days = (args as any)?.days || 30;
        const result = await apiCall("GET", `/api/habits/${memberId}/operating-picture?days=${days}`);
        return { content: applyGuardrails("get_health_operating_picture", result) };
      }

      case "log_habit": {
        const memberId = (args as any)?.familyMemberId || 1;
        const { habitType, value, unit, notes } = args as any;
        const result = await apiCall("POST", `/api/habits/${memberId}/log`, {
          habitType, value, unit, notes,
        });
        return { content: applyGuardrails("log_habit", result) };
      }

      case "get_habit_streaks": {
        const memberId = (args as any)?.familyMemberId || 1;
        const result = await apiCall("GET", `/api/habits/${memberId}/streaks`);
        return { content: applyGuardrails("get_habit_streaks", result) };
      }

      // Skill 6: Research Monitoring
      case "monitor_research_for_conditions": {
        const memberId = (args as any)?.familyMemberId || 1;
        const { conditionName, sources } = args as { conditionName: string; sources?: string[] };
        const result = await apiCall("POST", `/api/research-monitor/${memberId}/monitor`, {
          conditionName, sources,
        });
        return { content: applyGuardrails("monitor_research_for_conditions", result) };
      }

      case "get_research_digest": {
        const memberId = (args as any)?.familyMemberId || 1;
        const result = await apiCall("GET", `/api/research-monitor/${memberId}/digest`);
        return { content: applyGuardrails("get_research_digest", result) };
      }

      case "check_trial_eligibility": {
        const memberId = (args as any)?.familyMemberId || 1;
        const nctId = (args as any)?.nctId;
        const condition = (args as any)?.condition;
        const params = new URLSearchParams();
        if (nctId) params.append("nctId", nctId);
        if (condition) params.append("condition", condition);
        const result = await apiCall("GET", `/api/research-monitor/${memberId}/trial-eligibility?${params}`);
        return { content: applyGuardrails("check_trial_eligibility", result) };
      }

      // Compiled Truth — proxy to HealthClaw Guardrails' fhir_compiled_truth
      // MCP tool. This is the engine/surface boundary: SmartHealthConnect
      // never reads FHIR directly, and this is the canonical way patient
      // skills learn the current state + evidence trail of any resource.
      case "get_compiled_truth": {
        const mcpUrl = process.env.HEALTHCLAW_MCP_URL;
        if (!mcpUrl) {
          return {
            content: [{
              type: "text",
              text: (
                "get_compiled_truth requires HEALTHCLAW_MCP_URL to be set. " +
                "Example: HEALTHCLAW_MCP_URL=http://localhost:3001/mcp/rpc. " +
                "See .health-context.yaml for the engine/surface contract."
              ),
            }],
            isError: true,
          };
        }
        const a = args as {
          resource_type: string;
          resource_id: string;
          tenant_id?: string;
        };
        const tenant = a.tenant_id || process.env.HEALTHCLAW_TENANT_ID || "desktop-demo";
        const rpcBody = {
          jsonrpc: "2.0",
          id: Date.now(),
          method: "tools/call",
          params: {
            name: "fhir_compiled_truth",
            arguments: {
              resource_type: a.resource_type,
              resource_id: a.resource_id,
            },
          },
        };
        const resp = await fetch(mcpUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Tenant-Id": tenant,
          },
          body: JSON.stringify(rpcBody),
          signal: AbortSignal.timeout(15000),
        });
        if (!resp.ok) {
          const errText = await resp.text().catch(() => "");
          return {
            content: [{
              type: "text",
              text: `HealthClaw compiled-truth call failed: ${resp.status} ${errText.slice(0, 200)}`,
            }],
            isError: true,
          };
        }
        const result = await resp.json();
        return { content: applyGuardrails("get_compiled_truth", result) };
      }

      default:
        return {
          content: [{ type: "text", text: `Unknown tool: ${name}` }],
          isError: true,
        };
    }
  } catch (error) {
    logAuditError(name, error instanceof Error ? error.message : "Unknown error");
    return {
      content: [{
        type: "text",
        text: `Error executing ${name}: ${error instanceof Error ? error.message : "Unknown error"}`,
      }],
      isError: true,
    };
  }
});

// Define available resources
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: "health://patient/summary",
        name: "Patient Health Summary",
        description: "Current health status overview including conditions, medications, and vitals",
        mimeType: "application/json",
      },
      {
        uri: "health://family/overview",
        name: "Family Health Overview",
        description: "Health summary for all family members",
        mimeType: "application/json",
      },
      {
        uri: "health://care-gaps",
        name: "Care Gap Recommendations",
        description: "Preventive care recommendations based on HEDIS measures",
        mimeType: "application/json",
      },
    ],
  };
});

// Handle resource reads
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  try {
    await ensureSession();

    switch (uri) {
      case "health://patient/summary": {
        const [patient, conditions, medications] = await Promise.all([
          apiCall("GET", "/api/fhir/patient"),
          apiCall("GET", "/api/fhir/condition"),
          apiCall("GET", "/api/fhir/medicationrequest"),
        ]);
        return {
          contents: [{
            uri,
            mimeType: "application/json",
            text: JSON.stringify({ patient, conditions, medications }, null, 2),
          }],
        };
      }

      case "health://family/overview": {
        try {
          const summary = await apiCall("GET", "/api/family/summary");
          return {
            contents: [{
              uri,
              mimeType: "application/json",
              text: JSON.stringify(summary, null, 2),
            }],
          };
        } catch {
          return {
            contents: [{
              uri,
              mimeType: "application/json",
              text: JSON.stringify({ members: [], totalPendingActions: 0 }, null, 2),
            }],
          };
        }
      }

      case "health://care-gaps": {
        const careGaps = await apiCall("GET", "/api/fhir/care-gaps");
        return {
          contents: [{
            uri,
            mimeType: "application/json",
            text: JSON.stringify(careGaps, null, 2),
          }],
        };
      }

      default:
        throw new Error(`Unknown resource: ${uri}`);
    }
  } catch (error) {
    throw new Error(`Failed to read resource ${uri}: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("SmartHealthConnect MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
