import {
  registerAppResource,
  registerAppTool,
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

const DIST_DIR = path.join(import.meta.dirname, "dist", "src", "views");
const API_BASE =
  process.env.SMARTHEALTHCONNECT_API_URL || "http://localhost:5000";

async function apiFetch(endpoint: string): Promise<unknown> {
  const res = await fetch(`${API_BASE}${endpoint}`);
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

async function apiPost(
  endpoint: string,
  body: Record<string, unknown>,
): Promise<unknown> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

async function loadView(filename: string): Promise<string> {
  return fs.readFile(path.join(DIST_DIR, filename), "utf-8");
}

export function createServer(): McpServer {
  const server = new McpServer({
    name: "SmartHealthConnect",
    version: "1.0.0",
  });

  // ─── Ensure demo session on startup ───
  async function ensureDemoSession(): Promise<void> {
    try {
      await apiPost("/api/fhir/demo/connect", {});
    } catch {
      // Server might not be running yet
    }
  }

  // ─── 1. Health Summary (Tool + UI) ───
  const healthSummaryUri = "ui://health-summary/health-summary.html";

  registerAppTool(
    server,
    "health_summary",
    {
      title: "Health Summary",
      description:
        "View comprehensive patient health summary including conditions, vitals, medications, and allergies.",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: true,
      },
      _meta: { ui: { resourceUri: healthSummaryUri } },
    },
    async () => {
      await ensureDemoSession();
      const [patient, conditions, observations, medications, allergies] =
        await Promise.all([
          apiFetch("/api/fhir/patient"),
          apiFetch("/api/fhir/condition"),
          apiFetch("/api/fhir/observation"),
          apiFetch("/api/fhir/medicationrequest"),
          apiFetch("/api/fhir/allergyintolerance"),
        ]);
      const summary = {
        patient,
        conditions,
        observations,
        medications,
        allergies,
      };
      return {
        content: [{ type: "text" as const, text: JSON.stringify(summary) }],
      };
    },
  );

  registerAppResource(
    server,
    "Health Summary View",
    healthSummaryUri,
    {},
    async () => ({
      contents: [
        {
          uri: healthSummaryUri,
          mimeType: RESOURCE_MIME_TYPE,
          text: await loadView("health-summary.html"),
        },
      ],
    }),
  );

  // ─── 2. Care Gaps (Tool + UI) ───
  const careGapsUri = "ui://care-gaps/care-gaps.html";

  registerAppTool(
    server,
    "care_gaps",
    {
      title: "Care Gaps",
      description:
        "View preventive care gap recommendations based on HEDIS quality measures.",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: true,
      },
      _meta: { ui: { resourceUri: careGapsUri } },
    },
    async () => {
      await ensureDemoSession();
      const careGaps = await apiFetch("/api/fhir/care-gaps");
      return {
        content: [{ type: "text" as const, text: JSON.stringify(careGaps) }],
      };
    },
  );

  registerAppResource(
    server,
    "Care Gaps View",
    careGapsUri,
    {},
    async () => ({
      contents: [
        {
          uri: careGapsUri,
          mimeType: RESOURCE_MIME_TYPE,
          text: await loadView("care-gaps.html"),
        },
      ],
    }),
  );

  // ─── 3. Drug Interactions (Tool + UI) ───
  const drugInteractionsUri =
    "ui://drug-interactions/drug-interactions.html";

  registerAppTool(
    server,
    "drug_interactions",
    {
      title: "Drug Interaction Checker",
      description:
        "Check drug interactions for a medication using OpenFDA data. Provide a drug name to search.",
      inputSchema: {
        drug_name: z
          .string()
          .describe(
            "Drug name to check interactions for (e.g., metformin, lisinopril)",
          ),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: true,
      },
      _meta: { ui: { resourceUri: drugInteractionsUri } },
    },
    async ({ drug_name }) => {
      const data = await apiFetch(
        `/api/external/drugs/interactions?drug=${encodeURIComponent(drug_name)}`,
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data) }],
      };
    },
  );

  registerAppResource(
    server,
    "Drug Interactions View",
    drugInteractionsUri,
    {},
    async () => ({
      contents: [
        {
          uri: drugInteractionsUri,
          mimeType: RESOURCE_MIME_TYPE,
          text: await loadView("drug-interactions.html"),
        },
      ],
    }),
  );

  // ─── 4. Find Specialists (Tool + UI) ───
  const findSpecialistsUri =
    "ui://find-specialists/find-specialists.html";

  registerAppTool(
    server,
    "find_specialists",
    {
      title: "Find Specialists",
      description:
        "Search for healthcare specialists by specialty and location using the NPI Registry.",
      inputSchema: {
        specialty: z
          .string()
          .describe(
            "Medical specialty (e.g., cardiology, endocrinology, dermatology)",
          ),
        state: z
          .string()
          .optional()
          .describe("US state code (e.g., NY, CA, TX)"),
        city: z.string().optional().describe("City name"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: true,
      },
      _meta: { ui: { resourceUri: findSpecialistsUri } },
    },
    async ({ specialty, state, city }) => {
      const params = new URLSearchParams({ specialty });
      if (state) params.set("state", state);
      if (city) params.set("city", city);
      const data = await apiFetch(
        `/api/external/providers/specialists?${params.toString()}`,
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data) }],
      };
    },
  );

  registerAppResource(
    server,
    "Find Specialists View",
    findSpecialistsUri,
    {},
    async () => ({
      contents: [
        {
          uri: findSpecialistsUri,
          mimeType: RESOURCE_MIME_TYPE,
          text: await loadView("find-specialists.html"),
        },
      ],
    }),
  );

  // ─── 5. Clinical Trials (Tool + UI) ───
  const clinicalTrialsUri =
    "ui://clinical-trials/clinical-trials.html";

  registerAppTool(
    server,
    "clinical_trials",
    {
      title: "Clinical Trials",
      description:
        "Search for clinical trials by condition using ClinicalTrials.gov.",
      inputSchema: {
        condition: z
          .string()
          .describe(
            "Medical condition to search trials for (e.g., diabetes, hypertension)",
          ),
        status: z
          .string()
          .optional()
          .describe("Trial status filter (e.g., recruiting, completed)"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: true,
      },
      _meta: { ui: { resourceUri: clinicalTrialsUri } },
    },
    async ({ condition, status }) => {
      const params = new URLSearchParams({ condition });
      if (status) params.set("status", status);
      const data = await apiFetch(
        `/api/external/trials/search?${params.toString()}`,
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data) }],
      };
    },
  );

  registerAppResource(
    server,
    "Clinical Trials View",
    clinicalTrialsUri,
    {},
    async () => ({
      contents: [
        {
          uri: clinicalTrialsUri,
          mimeType: RESOURCE_MIME_TYPE,
          text: await loadView("clinical-trials.html"),
        },
      ],
    }),
  );

  // ─── 6. Research Insights (Tool + UI) ───
  const researchUri = "ui://research/research-insights.html";

  registerAppTool(
    server,
    "research_insights",
    {
      title: "Research Insights",
      description:
        "Find recent research preprints from bioRxiv/medRxiv for a medical condition.",
      inputSchema: {
        condition: z
          .string()
          .describe("Medical condition to search research for"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: true,
      },
      _meta: { ui: { resourceUri: researchUri } },
    },
    async ({ condition }) => {
      const data = await apiFetch(
        `/api/external/research/condition/${encodeURIComponent(condition)}`,
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(data) }],
      };
    },
  );

  registerAppResource(
    server,
    "Research Insights View",
    researchUri,
    {},
    async () => ({
      contents: [
        {
          uri: researchUri,
          mimeType: RESOURCE_MIME_TYPE,
          text: await loadView("research-insights.html"),
        },
      ],
    }),
  );

  return server;
}
