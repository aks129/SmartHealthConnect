# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
- Tests live in `tests/` directory, matched by `tests/**/*.test.ts`
- Coverage thresholds: 60% statements, 50% branches, 60% functions, 60% lines
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
│   ├── routes.ts             # Main API routes (~3000 lines)
│   ├── external-api-routes.ts # External healthcare APIs
│   ├── family-routes.ts      # Family member CRUD + journal/care plans
│   ├── integrations/         # External API clients (NPI, OpenFDA, ClinicalTrials, bioRxiv)
│   ├── fhir-client.ts        # HapiFhirClient class
│   ├── ai-service.ts         # OpenAI integration
│   ├── narrative-service.ts  # AI health narrative generation
│   └── care-gaps-service.ts  # Preventive care (HEDIS)
├── shared/
│   └── schema.ts             # DB tables + Zod FHIR schemas
├── tests/                     # Vitest test files
│   ├── auth.test.ts
│   ├── data-connections-routes.test.ts
│   ├── flexpa-client.test.ts
│   ├── health-skillz-client.test.ts
│   └── mcp-guardrails.test.ts
├── mcp-server/                # MCP server for Claude Desktop integration
├── mcp-app/                   # MCP v0.3 manifest-based app (7 tools + HTML views)
│   ├── manifest.json          # Tool definitions and UI resource mappings
│   ├── server.ts              # MCP app server (calls backend FHIR API endpoints)
│   └── src/views/             # HTML UI views for each tool
├── skill/                     # Claude skill CLI scripts (untracked)
│   ├── SKILL.md               # Skill definition for health record imports
│   └── scripts/               # connect-portal.ts, connect-insurance.ts, fetch-data.ts
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

### Client Routes

- `/` - Landing page
- `/dashboard` - Main patient health dashboard (10 tabs)
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
- `JWT_SECRET` - Secret for signing JWT tokens (required in CI test environment)
- `PORT` - Server port (defaults to 5000)

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
7. **CI/CD**: GitHub Actions runs type check, tests, coverage upload (Codecov), build verification, and security audit on push/PR to main
8. **HIPAA Audit Logging**: PHI endpoints are logged via `auditMiddleware` capturing user, action, resource, IP, and success/failure. Falls back to console if database unavailable

### MCP Server (Claude Integration)

The `mcp-server/` directory contains an MCP (Model Context Protocol) server that exposes SmartHealthConnect functionality to Claude Desktop and other MCP clients.

**Setup:**

```bash
cd mcp-server
npm install
npm run build
```

**Available Tools:**

- Health: `get_health_summary`, `get_conditions`, `get_medications`, `get_vitals`, `get_allergies`
- Family: `get_family_members`, `get_family_health_overview`
- Care: `get_care_gaps`, `get_care_plans`, `generate_care_plan`
- Providers: `find_specialists`
- Research: `find_clinical_trials`, `get_research_insights`
- Journal: `get_health_journal`, `add_journal_entry`
- Appointments: `get_appointment_preps`, `generate_appointment_prep`

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
