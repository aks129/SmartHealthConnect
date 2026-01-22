# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

### Development
- `npm run dev` - Start development server with hot reloading (uses tsx for backend)
- `npm run check` - TypeScript type checking (must pass with zero errors)
- `npm run db:push` - Push database schema changes using Drizzle Kit

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

| Environment | Server | API Handler | When Used |
|-------------|--------|-------------|-----------|
| Development | Express (`server/routes.ts`) | Full Express routing | `npm run dev` |
| Production (Vercel) | Serverless | `api/index.ts` only | Deployed to Vercel |

**When adding new API routes**, you MUST add them to BOTH:
1. `server/routes.ts` or `server/external-api-routes.ts` (for Express/dev)
2. `api/index.ts` (for Vercel serverless/production)

Failure to update both will cause features to work in dev but fail in production.

### Project Structure

```
root/
├── api/
│   └── index.ts              # Vercel serverless function (PRODUCTION)
├── client/                    # React frontend
│   ├── src/
│   │   ├── App.tsx           # Root with Router, Providers
│   │   ├── pages/            # Route components
│   │   ├── components/
│   │   │   ├── ui/           # shadcn/ui components
│   │   │   ├── health/       # Health data display (4 pillars)
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
│   ├── integrations/         # External API clients
│   │   ├── clinicaltrials.ts # ClinicalTrials.gov API
│   │   ├── openfda.ts        # OpenFDA drug API
│   │   ├── npi.ts            # NPI Registry API
│   │   └── biorxiv.ts        # bioRxiv/medRxiv API
│   ├── fhir-client.ts        # HapiFhirClient class
│   ├── ai-service.ts         # OpenAI integration
│   └── care-gaps-service.ts  # Preventive care (HEDIS)
├── shared/
│   └── schema.ts             # DB tables + Zod FHIR schemas
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
- `PORT` - Server port (defaults to 5000)

### Key Patterns

**FHIR Resources**: All FHIR types defined as Zod schemas in `shared/schema.ts` with TypeScript types exported.

**Demo Mode**: `server/routes.ts` and `api/index.ts` contain sample FHIR data for demo purposes. Access via `POST /api/fhir/demo/connect`.

**External API Hooks**: `client/src/hooks/use-external-apis.ts` provides React Query hooks for all external healthcare APIs (NPI, OpenFDA, ClinicalTrials.gov, bioRxiv).

**Storage Layer**: Abstract IStorage interface with MemStorage (in-memory fallback) and DatabaseStorage (PostgreSQL) implementations.

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
