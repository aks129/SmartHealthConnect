# SmartHealthConnect MCP App

A Model Context Protocol (MCP) App that brings healthcare data directly into Claude conversations with interactive visual interfaces. Connect patient portals and insurance payers to retrieve both clinical and claims data, then view it through rich embedded UI tools.

## Quick Start

### 1. Start the Backend

```bash
# From the SmartHealthConnect root directory
npm run dev
```

The backend starts on `http://localhost:5000` and serves FHIR API endpoints for all health data.

### 2. Build the MCP App

```bash
cd mcp-app
npm install
npm run build
```

### 3. Configure Claude Desktop

Add to your Claude Desktop config (`claude_desktop_config.json`):

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "smarthealthconnect-app": {
      "command": "npx",
      "args": ["tsx", "/path/to/SmartHealthConnect/mcp-app/main.ts", "--stdio"],
      "env": {
        "SMARTHEALTHCONNECT_API_URL": "http://localhost:5000"
      }
    }
  }
}
```

Replace `/path/to/SmartHealthConnect` with the actual path to your cloned repo.

### 4. Restart Claude Desktop

Close and reopen Claude Desktop. You should see SmartHealthConnect in the MCP tools list.

---

## Connecting Health Data Sources

SmartHealthConnect supports three ways to import health records into Claude. Each connection retrieves FHIR-formatted data that flows through PHI redaction guardrails before reaching the AI.

### Option A: Patient Portal via Health Skillz (Clinical Data)

Import clinical records (conditions, medications, lab results, vitals, allergies, immunizations) from Epic MyChart and other SMART on FHIR patient portals. Data is transferred using end-to-end encryption (ECDH P-256 + AES-256-GCM).

**What you get**: Diagnoses, lab results, medication lists, vital signs, allergies, immunization records, clinical notes.

#### Step 1 — Create a Session

Ask Claude:

```text
Connect my patient portal to import my health records.
```

Or run the CLI directly:

```bash
npx tsx skill/scripts/connect-portal.ts
```

This returns a session ID and a connect URL:

```json
{
  "sessionId": "abc123...",
  "connectUrl": "https://health-skillz.joshuamandel.com/connect/abc123..."
}
```

#### Step 2 — User Authenticates

Open the `connectUrl` in a browser. You'll be guided to:

1. Search for your health system (e.g., "Kaiser", "UCSF", "Mayo Clinic")
2. Sign in to your patient portal with your existing credentials
3. Approve the data sharing request

Your credentials never touch SmartHealthConnect — authentication happens directly with your health system. Data is encrypted on the Health Skillz server before transfer.

#### Step 3 — Poll and Download

Once you've completed authentication, poll for status:

```bash
npx tsx skill/scripts/connect-portal.ts --poll <sessionId>
```

When status changes to `ready`, download the data:

```bash
npx tsx skill/scripts/connect-portal.ts --download <sessionId>
```

The downloaded FHIR resources are loaded into your SmartHealthConnect session and available through all MCP app tools.

#### Step 4 — View Clinical Data in Claude

Ask Claude to display your data:

```text
Show me my health summary.
```

Claude will call the `health_summary` tool and render an interactive card showing your conditions, medications, vitals, and allergies — all with PHI redacted (names truncated to initials, addresses stripped, birth dates showing year only).

---

### Option B: Insurance via Flexpa (Claims Data)

Import claims and coverage data from your health insurance payer. Flexpa connects to 200+ US health insurers via the CMS Interoperability Rule (CMS-9115) using OAuth 2.0 PKCE.

**What you get**: Claims history, explanation of benefits, prescribed medications (from pharmacy claims), procedures, coverage details, provider networks.

**Required environment variables** (set in `.env` or shell):

```bash
FLEXPA_PUBLISHABLE_KEY=pk_test_...   # From your Flexpa dashboard
FLEXPA_SECRET_KEY=sk_test_...         # Server-side only, never exposed
```

#### Step 1 — Start Authorization

Ask Claude:

```text
Connect my health insurance to import claims data.
```

Or run the CLI:

```bash
npx tsx skill/scripts/connect-insurance.ts
```

This returns an authorization URL and a state token:

```json
{
  "authorizationUrl": "https://auth.flexpa.com/authorize?client_id=...&state=...",
  "state": "abc123..."
}
```

#### Step 2 — User Authorizes

Open the `authorizationUrl` in a browser. You'll:

1. Select your insurance provider (e.g., "Aetna", "UnitedHealthcare", "Cigna")
2. Sign in with your insurance portal credentials
3. Approve data sharing

After approval, you're redirected back with an authorization code.

#### Step 3 — Exchange Code for Data

Exchange the authorization code for an access token:

```bash
npx tsx skill/scripts/connect-insurance.ts --exchange <code> <state>
```

Then fetch FHIR data using the token:

```bash
npx tsx skill/scripts/connect-insurance.ts --fetch <accessToken>
```

This calls the Flexpa FHIR API to retrieve your `Patient/$everything` bundle — all claims, medications, procedures, and coverage data.

#### Step 4 — View Insurance Data in Claude

Ask Claude to display your insurance data alongside clinical data:

```text
Show me my health summary including insurance claims.
```

The `health_summary` tool renders both clinical and claims data in a unified view. You can also:

```text
Check drug interactions for my current medications.
What preventive care am I missing based on my records?
```

---

### Option C: Demo Mode (No Setup Required)

For testing without real credentials:

```bash
npx tsx skill/scripts/fetch-data.ts --demo
```

This loads two sample patients (Sarah Chen and James Wilson) with realistic conditions, medications, allergies, and vitals. Demo mode is also activated automatically when the MCP app starts.

---

## Viewing Data with MCP App Tools

Once health data is imported (from any source), these 7 interactive tools are available in Claude:

### Health Summary

```text
Show me my health summary.
```

Displays a patient dashboard with:

- Patient demographics (name, age, gender, location)
- Active conditions and diagnoses with clinical status
- Current medications with dosages
- Recent vital signs (blood pressure, heart rate, weight, BMI)
- Known allergies with severity and reactions

### Care Gaps

```text
What preventive care am I missing?
```

Analyzes your records against HEDIS quality measures to identify:

- Overdue screenings (eye exams, cancer screenings, labs)
- Missing immunizations
- Recommended follow-up appointments
- Prioritized action items

### Drug Interaction Checker

```text
Check interactions for metformin.
Are there any interactions between my current medications?
```

Queries OpenFDA to display:

- Drug-drug interaction warnings with severity levels
- Contraindications and precautions
- Brand/generic name cross-references
- Recommended monitoring

### Find Specialists

```text
Find a cardiologist in New York.
Find an endocrinologist near me in California.
```

Searches the NPI Registry for:

- Provider names, credentials, and specializations
- Practice addresses and phone numbers
- NPI numbers for insurance verification

### Clinical Trials

```text
Find recruiting clinical trials for type 2 diabetes.
Are there any trials for hypertension in New York?
```

Searches ClinicalTrials.gov for:

- Active and recruiting studies
- Phase, enrollment size, and locations
- Eligibility criteria summaries
- NCT identifiers for reference

### Research Insights

```text
What's the latest research on diabetes and cardiovascular health?
Find recent studies on SGLT2 inhibitors.
```

Searches bioRxiv and medRxiv for:

- Recent preprints matching the condition
- Author information and publication dates
- Key findings and abstracts
- DOI links to full papers

### Data Connections

```text
Show me my data connections and audit log.
```

Displays a management dashboard with:

- Available connection methods (Health Skillz, Flexpa, SMART on FHIR) and their configuration status
- PHI access audit log showing every tool invocation, data access event, and redaction status
- Connection health and sync timestamps

---

## End-to-End Example: Complete Workflow

Here's a full conversation showing both clinical and insurance data retrieval:

**You**: I want to import my health records from my patient portal and insurance.

**Claude**: I'll help you connect both sources. Let me start the connections.

*Claude creates a Health Skillz session and a Flexpa authorization:*

> **Patient Portal**: [Click here to connect your portal](https://health-skillz.joshuamandel.com/connect/...)
> Your records are encrypted end-to-end between your portal and this session.
>
> **Insurance**: [Click here to connect your insurance](https://auth.flexpa.com/authorize?...)
> This uses the CMS interoperability rule to access your claims data.

**You**: Done, I've signed in to both.

**Claude**: *Downloads data from both sources, applies PHI redaction, loads into session.*

Your records have been imported. You have data from **2 sources**:

- **Epic MyChart** (portal): 5 conditions, 4 medications, 12 lab results, 3 allergies
- **Aetna** (insurance): 18 claims over the past year, prescription history, coverage details

Here are some things I can help with:

1. Review your complete health summary with conditions and medications
2. Check for drug interactions between your current prescriptions
3. Identify preventive care gaps based on your history
4. Find specialists for any of your conditions
5. Something else?

**You**: Show me my health summary and check for drug interactions.

*Claude calls `health_summary` and `drug_interactions` tools, rendering interactive UI cards showing the patient dashboard and interaction report.*

---

## PHI Safety and Guardrails

All health data passes through MCP guardrails before reaching Claude:

| Data Type                | Redaction Applied                                |
| ------------------------ | ------------------------------------------------ |
| Patient names            | Truncated to first initial (John Smith -> J. S.) |
| Identifiers (MRN, SSN)   | Masked to last 4 characters                     |
| Addresses                | Street lines removed, city/state kept            |
| Phone/email              | Replaced with [Redacted]                         |
| Birth dates              | Year only (1980-03-15 -> 1980)                   |
| Clinical data            | Medical disclaimer appended                      |
| Write operations         | Human-in-the-loop confirmation required          |

Every tool invocation is logged in the PHI access audit log, including:

- Which tool was called and by whom
- Whether PHI was accessed
- Whether redaction was applied
- Timestamp and outcome (success/error)

View the audit log anytime:

```text
Show me the PHI access audit log.
```

---

## Architecture

```text
+-----------------------------------------------------------+
|                    Claude Desktop                          |
|  +--------------+  +--------------+  +--------------+     |
|  |Health Summary|  |  Care Gaps   |  |Drug Interact.|     |
|  |   (UI View)  |  |  (UI View)   |  |  (UI View)   |     |
|  +--------------+  +--------------+  +--------------+     |
|  +--------------+  +--------------+  +--------------+     |
|  |  Specialists |  |Clinical Trial|  |   Research   |     |
|  |   (UI View)  |  |  (UI View)   |  |  (UI View)   |     |
|  +--------------+  +--------------+  +--------------+     |
|  +--------------+                                         |
|  |Data Connect. |                                         |
|  |   (UI View)  |                                         |
|  +------+-------+                                         |
+---------|-------------------------------------------------+
          | MCP Protocol (stdio)
+---------v-------------------------------------------------+
|              MCP App Server (main.ts)                      |
|  +---------------------------------------------------+    |
|  |  server.ts - 7 Tools + 7 UI Resources              |    |
|  |  PHI Guardrails: redaction, disclaimers, audit     |    |
|  +------------------------+---------------------------+    |
+---------------------------|-------------------------------+
                            | HTTP (localhost:5000)
+---------------------------v-------------------------------+
|           SmartHealthConnect Backend                        |
|  +----------+  +----------+  +---------------------+     |
|  | FHIR API |  |External  |  |  Data Connections    |     |
|  | /api/fhir|  |/api/ext. |  |  /api/connections    |     |
|  +----------+  +----------+  +------+--------------+     |
+--------------------------------------|---------+----------+
              +------------------------+---------+
              |                        |         |
   +----------v---------+  +----------v----+  +-v-----------+
   |   Health Skillz     |  |     Flexpa    |  |  SMART on   |
   |  (Patient Portals)  |  |  (Insurance)  |  |    FHIR     |
   |  E2E Encrypted      |  | OAuth 2.0 PKCE|  |  Direct EHR |
   +---------------------+  +---------------+  +-------------+
```

### File Structure

```text
mcp-app/
├── main.ts                          # Entry point (stdio + HTTP transports)
├── server.ts                        # MCP server with 7 tools + 7 resources
├── manifest.json                    # App metadata and tool listing
├── src/views/
│   ├── health-summary.html/.ts      # Patient dashboard view
│   ├── care-gaps.html/.ts           # Preventive care view
│   ├── drug-interactions.html/.ts   # Drug checker view
│   ├── find-specialists.html/.ts    # Provider search view
│   ├── clinical-trials.html/.ts     # Trials search view
│   ├── research-insights.html/.ts   # Research view
│   └── data-connections.html/.ts    # Connection management + audit view
├── dist/                            # Built single-file HTML outputs
└── skill/
    ├── SKILL.md                     # Claude Skill definition
    └── scripts/
        ├── connect-portal.ts        # Health Skillz CLI
        ├── connect-insurance.ts     # Flexpa CLI
        └── fetch-data.ts            # Fetch from existing session
```

## Tools Reference

| Tool                 | Input                          | Data Source         | Returns                                      |
| -------------------- | ------------------------------ | ------------------- | -------------------------------------------- |
| `health_summary`     | —                              | FHIR API            | Patient, conditions, vitals, meds, allergies |
| `care_gaps`          | —                              | FHIR API            | HEDIS preventive care recommendations        |
| `drug_interactions`  | `drug_name`                    | OpenFDA             | Interactions, warnings, severity             |
| `find_specialists`   | `specialty`, `state?`, `city?` | NPI Registry        | Provider listings                            |
| `clinical_trials`    | `condition`, `status?`         | ClinicalTrials.gov  | Trial listings                               |
| `research_insights`  | `condition`                    | bioRxiv/medRxiv     | Research preprints                           |
| `data_connections`   | —                              | Connections API     | Available sources + audit log                |

## API Endpoints

| Endpoint                                | Description                      |
| --------------------------------------- | -------------------------------- |
| `/api/fhir/patient`                     | Patient demographics             |
| `/api/fhir/condition`                   | Health conditions                |
| `/api/fhir/observation`                 | Vital signs and lab results      |
| `/api/fhir/medicationrequest`           | Medications                      |
| `/api/fhir/allergyintolerance`          | Allergies                        |
| `/api/fhir/care-gaps`                   | HEDIS-based care gap analysis    |
| `/api/external/drugs/interactions`      | OpenFDA drug data                |
| `/api/external/providers/specialists`   | NPI Registry provider search     |
| `/api/external/trials/search`           | ClinicalTrials.gov               |
| `/api/external/research/condition/:id`  | bioRxiv/medRxiv preprints        |
| `/api/connections/available`            | Available data connections       |
| `/api/connections/audit-log`            | PHI access audit log             |
| `/api/connections/flexpa/*`             | Flexpa OAuth flow                |
| `/api/connections/health-skillz/*`      | Health Skillz session management |

## Environment Variables

| Variable                     | Required   | Description                                     |
| ---------------------------- | ---------- | ----------------------------------------------- |
| `SMARTHEALTHCONNECT_API_URL` | No         | Backend URL (default `http://localhost:5000`)    |
| `FLEXPA_PUBLISHABLE_KEY`     | For Flexpa | Flexpa OAuth publishable key                    |
| `FLEXPA_SECRET_KEY`          | For Flexpa | Flexpa OAuth secret key                         |
| `HEALTH_SKILLZ_URL`          | No         | Health Skillz server URL                        |
| `DATABASE_URL`               | No         | PostgreSQL connection (falls back to in-memory) |
| `OPENAI_API_KEY`             | No         | Enables AI health insights                      |

## License

MIT
