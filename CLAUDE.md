# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Wearable signals (v1.2.0)

When the engine has `OPEN_WEARABLES_URL` set, wearable data (Garmin, Oura, Polar, Suunto, Whoop, Fitbit, Strava, Ultrahuman) arrives in HealthClaw as FHIR Observations. `healthy-habits`, `diet-exercise`, and `medication-refills` read them through existing `fhir_search` calls — no new SmartHealthConnect tools. The MCP tool `wearables_sync_status` (in HealthClaw) + its MCP App surface connection management. See each skill's SKILL.md for the relevant LOINC codes.

## Engine / surface contract (v1.1.0)

SmartHealthConnect is the **patient-facing surface** of the HealthClaw platform. It does NOT own data, policy, or the canonical record. Those belong to the engine.

- **Engine**: [HealthClaw Guardrails](https://github.com/aks129/HealthClawGuardrails) — FHIR store, PHI redaction, audit trail, step-up auth, tenant isolation, Compiled Truth primitive.
- **Surface** (this repo): 6 patient skills, React client, conversational patterns, MCP server that proxies into the engine.

**Rule**: patient skills never read FHIR directly. Resource-specific claims must go through `get_compiled_truth` (proxies to HealthClaw's `fhir_compiled_truth`) which returns current redacted state + `curation_state` + `quality_score` + Provenance timeline. See each skill's `SKILL.md` for the requirement.

Configure with `HEALTHCLAW_MCP_URL=http://localhost:3001/mcp/rpc` (or your deployed URL) and optionally `HEALTHCLAW_TENANT_ID=<tenant>`.

`.health-context.yaml` at repo root declares `role: surface` with `engine: healthclaw-guardrails`. The engine has the mirror file declaring `role: engine`.

## Release ritual

Every version bump in `package.json` must be accompanied by a populated retrospective in `retrospectives/v<X.Y.Z>.md`, scaffolded from [`retrospectives/TEMPLATE.md`](retrospectives/TEMPLATE.md). Depth scales with SemVer scope (patch may be skipped unless an incident occurred; minor should be terse but complete; major or contract-breaking changes get the full treatment).

The retrospective is part of the release — do not merge a version bump without one. Section 2 (engine/surface contract check) is non-optional and must confirm that any new FHIR reads route through `get_compiled_truth` and any PHI-bearing schemas have redaction coverage.

When starting a session that modifies `package.json`'s `version` field, assume a retro is the tail of the work unless the user explicitly says otherwise.

## Common Commands

### Development

- `npm run dev` - Start development server with hot reloading (uses tsx for backend)
- `npm run check` - TypeScript type checking (must pass with zero errors)
- `npm run db:push` - Push database schema changes using Drizzle Kit

### Testing

- `npm test` - Run all tests once (Vitest)
- `npm run test:watch` - Run tests in watch mode during development
- `npm run test:coverage` - Generate coverage report (v8 provider)
- `npx vitest run tests/some-file.test.ts` - Run a single test file
- `npx playwright test` - Run Playwright E2E tests (no npm script; see `playwright.config.ts`)
- Unit tests live in `tests/*.test.ts`; E2E specs in `tests/e2e/*.spec.ts`
- E2E tests auto-start the server on port **5050** (not 5000) via `playwright.config.ts` `webServer`
- Coverage is reported and uploaded to Codecov but not gated by thresholds (see note in `vitest.config.ts`)
- Coverage only measures `server/**/*.ts` (excludes `server/index.ts`); client code is not covered

### Production

- `npm run build` - Build frontend (Vite) and backend (ESBuild) for production
- `npm start` - Run production server from dist/ directory

## Architecture Overview

This is a full-stack healthcare application (Liara AI Health) using SMART on FHIR protocols for electronic health records integration.

### Technology Stack

- **Frontend**: React 18 + TypeScript with Vite bundling
- **Backend**: Express.js + TypeScript (tsx for dev, ESBuild for prod)
- **Database**: PostgreSQL with Drizzle ORM (Neon serverless compatible)
- **Routing**: wouter (client-side), Express routes (server-side)
- **State Management**: TanStack Query for server state
- **UI Components**: shadcn/ui with Radix UI primitives + Tailwind CSS
- **Charts**: Recharts for visualizations, D3 for advanced charts
- **Forms**: react-hook-form with Zod validation

### Dual Environment Architecture

**CRITICAL**: This app runs differently in development vs production:

| Environment          | Server     | API Handler            | When Used           |
| -------------------- | ---------- | ---------------------- | ------------------- |
| Development          | Express    | `server/routes.ts`     | `npm run dev`       |
| Production (Vercel)  | Serverless | `api/index.ts` only    | Deployed to Vercel  |

**When adding new API routes**, you MUST add them to BOTH:

1. `server/routes.ts` or `server/external-api-routes.ts` (for Express/dev)
2. `api/index.ts` (for Vercel serverless/production)

Failure to update both will cause features to work in dev but fail in production.

### Vite-Express Integration

In development, Vite runs in middleware mode inside the Express server (see `server/vite.ts`):

1. Express listens on port 5000
2. All `/api/*` routes handled by Express first
3. Vite middleware handles module transformations and HMR
4. Catch-all route renders `client/index.html` for SPA routing

No separate proxy config is needed — Vite middleware is embedded directly into Express.

### Project Structure

```text
root/
├── api/
│   └── index.ts              # Vercel serverless function (PRODUCTION)
├── client/                    # React frontend
│   ├── src/
│   │   ├── App.tsx           # Root with Router, Providers
│   │   ├── pages/            # Route components
│   │   ├── components/
│   │   │   ├── ui/           # shadcn/ui components
│   │   │   ├── health/       # Health data, CarePlanGenerator, AppointmentPrep
│   │   │   ├── journal/      # HealthJournal (symptom/mood/activity tracking)
│   │   │   ├── medications/  # DrugInteractionChecker
│   │   │   ├── provider/     # ProviderFinder (NPI search)
│   │   │   ├── insurance/    # PriorAuthWorkflow
│   │   │   └── research/     # ResearchInsights (bioRxiv)
│   │   ├── hooks/            # Custom hooks including use-external-apis.ts
│   │   └── lib/              # Utilities (fhir-client, queryClient)
├── server/                    # Express backend (DEVELOPMENT)
│   ├── index.ts              # Server entry point
│   ├── routes.ts             # Main API routes (~3900 lines)
│   ├── external-api-routes.ts # External healthcare APIs
│   ├── family-routes.ts      # Family member CRUD + journal/care plans
│   ├── {vitals,refill,care-completion,activity,pediatric,habits,research-monitor}-routes.ts
│   │                          # One file per HealthClaw patient skill, mounted at /api/<skill>
│   ├── cdc-schedule.ts       # CDC immunization schedule data (used by pediatric)
│   ├── integrations/         # External API clients (NPI, OpenFDA, ClinicalTrials, bioRxiv, Flexpa, Health Skillz)
│   ├── fhir-client.ts        # HapiFhirClient class
│   ├── ai-service.ts         # OpenAI integration
│   ├── narrative-service.ts  # AI health narrative generation
│   └── care-gaps-service.ts  # Preventive care (HEDIS)
├── shared/
│   └── schema.ts             # DB tables + Zod FHIR schemas
├── tests/                     # Vitest unit tests (tests/*.test.ts)
│   ├── auth.test.ts
│   ├── data-connections-routes.test.ts
│   ├── flexpa-client.test.ts
│   ├── health-skillz-client.test.ts
│   ├── mcp-guardrails.test.ts
│   └── e2e/                  # Playwright specs (port 5050 via webServer)
├── mcp-server/                # MCP server for Claude Desktop integration (legacy direct-FHIR tools + get_compiled_truth proxy)
├── mcp-app/                   # MCP v0.3 manifest-based app (7 tools + HTML views)
│   ├── manifest.json          # Tool definitions and UI resource mappings
│   ├── server.ts              # MCP app server (calls backend FHIR API endpoints)
│   └── src/views/             # HTML UI views for each tool
├── skills/                    # 6 HealthClaw patient skills (tracked) — care-completion,
│   └── <skill>/SKILL.md       # diet-exercise, healthy-habits, kids-health, medication-refills,
│                              # research-monitor. Each SKILL.md is consumed by Claude.
├── skill/                     # LOCAL-ONLY Claude skill CLI scripts — singular, untracked,
│   ├── SKILL.md               # distinct from the plural tracked `skills/` dir above.
│   └── scripts/               # connect-portal.ts, connect-insurance.ts, fetch-data.ts
├── .claude-plugin/
│   └── plugin.json            # Claude Code plugin manifest
├── .health-context.yaml       # Engine/surface declaration (sister file to HealthClawGuardrails)
├── playwright.config.ts       # Playwright config (webServer on :5050)
└── vercel.json               # Vercel deployment config
```

### API Routes

**FHIR endpoints** (`/api/fhir/*`):

- `/api/fhir/patient`, `/api/fhir/condition`, `/api/fhir/observation`
- `/api/fhir/medicationrequest`, `/api/fhir/allergyintolerance`
- `/api/fhir/care-gaps` - HEDIS-based care gap analysis
- `/api/fhir/demo/connect` - Demo mode connection (POST)
- `/api/fhir/sessions/current` - Current FHIR session (GET/DELETE)

**External Healthcare APIs** (`/api/external/*`):

- `/api/external/providers/specialists` - NPI Registry provider search
- `/api/external/providers/specialties` - Available specialties list
- `/api/external/research/condition/:condition` - bioRxiv/medRxiv preprints
- `/api/external/trials/*` - ClinicalTrials.gov search
- `/api/external/drugs/*` - OpenFDA drug interactions

**Family Health** (`/api/family/*`):

- `/api/family/members` - Family member CRUD
- `/api/family/{id}/journal-entries` - Health journal entries
- `/api/family/{id}/care-plans` - Care plans with goals/interventions
- `/api/family/{id}/appointment-preps` - Appointment preparation summaries

**Data Connections** (`/api/connections/*`):

- `/api/connections/available` - List available connection methods and config status
- `/api/connections/flexpa/authorize` - Start Flexpa OAuth PKCE flow (POST)
- `/api/connections/flexpa/callback` - Flexpa OAuth callback (GET)
- `/api/connections/flexpa/exchange` - Exchange Flexpa auth code for token (POST)
- `/api/connections/flexpa/fhir` - Fetch FHIR data from active Flexpa connection (POST)
- `/api/connections/health-skillz/session` - Create Health Skillz import session (POST)
- `/api/connections/health-skillz/session/:id/status` - Poll session status (GET)
- `/api/connections/health-skillz/session/:id/download` - Download imported data (POST)
- `/api/connections/audit-log` - MCP guardrails audit log (GET)

**Patient Skills** (`/api/<skill>/*`) — one mount per HealthClaw skill, implemented in the corresponding `server/<skill>-routes.ts`:

- `/api/vitals/*` - BP/glucose readings, classifications, trends, education
- `/api/refills/*` - medication refill timeline + adherence projections
- `/api/care-completion/*` - preventive screenings, referrals, follow-ups vs HEDIS/USPSTF
- `/api/activity/*` - workouts, meals, correlations with vitals
- `/api/pediatric/*` - CDC immunization schedule, well-child visits, school forms
- `/api/habits/*` - unified sleep/activity/adherence/vitals dashboard
- `/api/research-monitor/*` - bioRxiv/medRxiv/ClinicalTrials/OpenFDA filtered to patient conditions

### Client Routes

- `/` - Landing page
- `/dashboard` - Main patient health dashboard (11 tabs incl. VitalsTracker)
- `/callback` - SMART on FHIR OAuth callback

### Environment Variables

Required:

- `DATABASE_URL` - PostgreSQL connection string (falls back to in-memory if not set)

Optional:

- `OPENAI_API_KEY` - For AI health insights (gracefully disabled if not set)
- `FHIR_SERVER_URL` - External FHIR server (defaults to localhost:8000/fhir)
- `FLEXPA_PUBLISHABLE_KEY` - Flexpa OAuth publishable key (for payer data import)
- `FLEXPA_SECRET_KEY` - Flexpa OAuth secret key (server-side only)
- `HEALTH_SKILLZ_URL` - Health Skillz server URL (defaults to `https://health-skillz.joshuamandel.com`)
- `HEALTHCLAW_MCP_URL` - HealthClaw Guardrails MCP endpoint (e.g. `http://localhost:3001/mcp/rpc`). Required for the `get_compiled_truth` proxy tool
- `HEALTHCLAW_TENANT_ID` - Tenant identifier forwarded with HealthClaw calls
- `DEMO_PASSWORD` - Demo session password used by `mcp-app/server.ts` (default `SmartHealth2025`)
- `JWT_SECRET` - Secret for signing JWT tokens (required in CI test environment)
- `PORT` - Server port (defaults to 5000; E2E tests override to 5050)

### Key Patterns

**FHIR Resources**: All FHIR types defined as Zod schemas in `shared/schema.ts` with TypeScript types exported.

**Demo Mode**: `server/routes.ts` and `api/index.ts` contain hardcoded sample FHIR data (two demo patients with conditions, observations, medications, allergies, immunizations). Access via `POST /api/fhir/demo/connect`. Demo data must be kept in sync between both files.

**External API Hooks**: `client/src/hooks/use-external-apis.ts` provides React Query hooks for all external healthcare APIs (NPI, OpenFDA, ClinicalTrials.gov, bioRxiv).

**External API Caching**: In-memory caches with TTLs — ClinicalTrials.gov (15min), OpenFDA (1hr), NPI Registry (30min). Cache resets on server restart.

**Storage Layer**: Abstract `IStorage` interface with `MemStorage` (in-memory fallback) and `DatabaseStorage` (PostgreSQL) implementations. Without `DATABASE_URL`, all data is lost on restart.

**SMART on FHIR Auth**: Client-side OAuth via `fhirclient` library (`client/src/lib/smart-auth.ts`). Configured with `VITE_FHIR_CLIENT_ID`, `VITE_FHIR_SCOPE`, and `VITE_FHIR_ISS`. Sessions stored in `fhirSessions` table with access/refresh tokens.

**Local Auth**: bcrypt password hashing (cost 12), JWT tokens (15min access, 7day refresh). Schemas in `server/auth/index.ts`.

**Data Connections**: Three import methods in `server/data-connections-routes.ts`: Flexpa (insurance/payer FHIR via OAuth PKCE), Health Skillz (patient portal import via E2E encrypted sessions), and SMART on FHIR (direct). Flexpa client in `server/integrations/flexpa-client.ts`, Health Skillz client in `server/integrations/health-skillz-client.ts`. React hooks in `client/src/hooks/use-data-connections.ts`.

**MCP Guardrails**: All MCP tool responses pass through `mcp-server/src/guardrails.ts` which applies: (1) PHI redaction — names truncated to initials, identifiers masked, addresses stripped, telecom redacted, birth dates to year only; (2) Medical disclaimers on clinical data; (3) Audit logging of all tool executions; (4) Human-in-the-loop notices on write tools (`generate_care_plan`, `add_journal_entry`, `generate_appointment_prep`). Server-side guardrails module also in `server/mcp-guardrails.ts` with additional HIPAA Safe Harbor de-identification support.

**React Query Config**: `staleTime: Infinity` and `refetchOnWindowFocus: false` — data never auto-refetches; manual invalidation required after mutations.

**Path Aliases**:

- `@/*` maps to `client/src/`
- `@shared/*` maps to `shared/`

### Build Output

- Frontend builds to `dist/public/` (Vite)
- Backend builds to `dist/index.js` (ESBuild)
- Vercel uses `api/index.ts` directly as serverless function

### Important Notes

1. **TypeScript Strict Mode**: All code must pass `npm run check` with zero errors
2. **No OpenAI Required**: App starts and demo works without OPENAI_API_KEY
3. **No Database Required**: Falls back to MemStorage for demo/development
4. **Windows Compatible**: Server uses standard listen() without reusePort option
5. **Express Route Order**: Specific routes (e.g., `/providers/specialists`) must be defined BEFORE parameterized routes (e.g., `/providers/:npi`) to avoid incorrect matching
6. **Database Migrations**: `npm run db:push` compares schema against DB and applies changes. No rollback capability — test on staging first
7. **CI/CD**: GitHub Actions runs type check, tests, coverage upload (Codecov), build verification, and security audit on push/PR to main. Uses **Node 22 + npm 10** — see next item
8. **Lockfile must be npm 10–compatible**: CI's Node 22 ships bundled npm 10. Regenerating `package-lock.json` on Node 23+ (npm 11) silently produces a lockfile that `npm ci` on npm 10 rejects with "Missing: expo@… from lock file" (npm 11 handles transitive peer deps differently). When you touch the lockfile, use `npx -y npm@10 install` to keep it npm-10 compatible
9. **HIPAA Audit Logging**: PHI endpoints are logged via `auditMiddleware` capturing user, action, resource, IP, and success/failure. Falls back to console if database unavailable

### MCP Server (Claude Integration)

The `mcp-server/` directory contains an MCP (Model Context Protocol) server that exposes SmartHealthConnect functionality to Claude Desktop and other MCP clients.

**Setup:**

```bash
cd mcp-server
npm install
npm run build
```

**Available Tools:**

Per the engine/surface contract, **new skill code should call `get_compiled_truth`** (proxies HealthClaw's `fhir_compiled_truth`) rather than the per-resource read tools below. The direct-FHIR tools remain for backwards compatibility and demo mode, but must not be used for new resource-level claims.

- Compiled Truth (canonical): `get_compiled_truth`
- Health (legacy direct FHIR): `get_health_summary`, `get_conditions`, `get_medications`, `get_vitals`, `get_allergies`
- Family: `get_family_members`, `get_family_health_overview`
- Care: `get_care_gaps`, `get_care_plans`, `generate_care_plan`, `get_care_completion_summary`, `get_overdue_items`
- Providers: `find_specialists`
- Research: `find_clinical_trials`, `get_research_insights`
- Journal: `get_health_journal`, `add_journal_entry`
- Appointments: `get_appointment_preps`, `generate_appointment_prep`
- Skill endpoints: `get_vitals_log`, `get_vitals_education`, `get_refill_timeline`, `get_activity_correlations`
- Connections: `get_available_connections`, `get_mcp_audit_log`

**Claude Desktop Config** (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "smarthealthconnect": {
      "command": "node",
      "args": ["/path/to/mcp-server/dist/index.js"],
      "env": {
        "SMARTHEALTHCONNECT_API_URL": "http://localhost:5000"
      }
    }
  }
}
```
