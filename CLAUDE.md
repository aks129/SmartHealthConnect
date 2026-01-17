# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

### Development
- `npm run dev` - Start development server with hot reloading (uses tsx for backend)
- `npm run check` - TypeScript type checking
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

### Project Structure

```
root/
├── client/                    # React frontend
│   ├── src/
│   │   ├── App.tsx           # Root with Router, Providers
│   │   ├── pages/            # Route components
│   │   ├── components/
│   │   │   ├── ui/           # shadcn/ui components (50+)
│   │   │   ├── health/       # Health data display
│   │   │   ├── analytics/    # Analytics & readiness score
│   │   │   ├── medications/  # Medication management
│   │   │   ├── scheduling/   # Appointments
│   │   │   ├── chat/         # AI chat interface
│   │   │   ├── branding/     # White-label branding
│   │   │   ├── tour/         # Guided tour (driver.js)
│   │   │   └── visualizations/ # Charts & graphs
│   │   ├── hooks/            # Custom React hooks
│   │   └── lib/              # Utilities (fhir-client, providers, queryClient)
├── server/                    # Express backend
│   ├── index.ts              # Server entry point
│   ├── routes.ts             # All API routes (~3000 lines)
│   ├── fhir-client.ts        # HapiFhirClient class
│   ├── ai-service.ts         # OpenAI integration
│   ├── care-gaps-service.ts  # Preventive care analysis
│   ├── storage.ts            # IStorage interface + MemStorage
│   └── database-storage.ts   # PostgreSQL implementation
├── shared/
│   └── schema.ts             # DB tables + Zod FHIR schemas
└── migrations/               # Drizzle migrations
```

### Key Files

**Server**:
- `server/routes.ts` - Main API routes (FHIR endpoints, chat, care gaps, demo data)
- `server/fhir-client.ts` - HapiFhirClient class for FHIR server communication
- `server/ai-service.ts` - OpenAI integration for health insights (optional, graceful fallback)
- `server/care-gaps-service.ts` - Preventive care gap analysis (HEDIS-based)
- `server/user-routes.ts` - Authentication routes (Passport.js)
- `server/storage.ts` - Database queries and session storage

**Shared**:
- `shared/schema.ts` - Database tables (users, fhirSessions, chatMessages) and FHIR resource Zod schemas

**Client**:
- `client/src/App.tsx` - Root component with providers (Theme, Brand, Query)
- `client/src/pages/dashboard.tsx` - Main patient health dashboard
- `client/src/components/health/` - Health data display components
- `client/src/components/branding/BrandProvider.tsx` - White-label branding context

### API Routes Pattern

All FHIR endpoints follow `/api/fhir/{resource}` pattern:
- `/api/fhir/patient`, `/api/fhir/condition`, `/api/fhir/observation`
- `/api/fhir/medicationrequest`, `/api/fhir/allergyintolerance`, `/api/fhir/immunization`
- `/api/fhir/coverage`, `/api/fhir/claim`, `/api/fhir/explanation-of-benefit`
- `/api/fhir/practitioner`, `/api/fhir/organization`, `/api/fhir/appointment`
- `/api/fhir/care-gaps` - Care gap analysis endpoint
- `/api/fhir/demo/connect` - Demo mode connection (POST)
- `/api/fhir/hapi/connect` - HAPI FHIR server connection (POST)
- `/api/fhir/sessions/current` - Current FHIR session (GET/DELETE)

Chat endpoints: `/api/chat/messages` (GET/POST/DELETE)

User endpoints: `/api/user/profile`, `/api/user/theme`, `/api/user/notifications`

### Client Routes

- `/` - Landing page (home)
- `/dashboard` - Main patient health dashboard
- `/about` - About page
- `/tutorial` - Onboarding tutorial
- `/callback` - SMART on FHIR OAuth callback

### Environment Variables

Required:
- `DATABASE_URL` - PostgreSQL connection string (falls back to in-memory if not set)

Optional:
- `OPENAI_API_KEY` - For AI health insights (gracefully disabled if not set)
- `FHIR_SERVER_URL` - External FHIR server (defaults to localhost:8000/fhir)
- `PORT` - Server port (defaults to 5000)
- `NODE_ENV` - Set to "production" for prod builds

### Key Patterns

**FHIR Resources**: All FHIR types defined as Zod schemas in `shared/schema.ts` with TypeScript types exported. Supports Patient, Condition, Observation, MedicationRequest, AllergyIntolerance, Immunization, Coverage, Claim, ExplanationOfBenefit, Practitioner, Organization, Location, Appointment, PractitionerRole.

**Demo Mode**: `server/routes.ts` contains sample FHIR data for demo purposes, allowing the app to function without a real FHIR connection. Access via `POST /api/fhir/demo/connect`.

**Theming**: Dark mode support via ThemeProvider with system/light/dark options. Semantic color tokens in Tailwind for consistent theming.

**White-Label**: BrandProvider supports enterprise customization of branding elements.

**Storage Layer**: Abstract IStorage interface with MemStorage (in-memory fallback) and DatabaseStorage (PostgreSQL) implementations.

**Path Aliases**:
- `@/*` maps to `client/src/`
- `@shared/*` maps to `shared/`

### Build Output

- Frontend builds to `dist/public/` (Vite)
- Backend builds to `dist/index.js` (ESBuild)
- Both served from same Express instance on port 5000

### Important Notes

1. **TypeScript Strict Mode**: All code must pass `npm run check` with zero errors
2. **No OpenAI Required**: App starts and demo works without OPENAI_API_KEY
3. **No Database Required**: Falls back to MemStorage for demo/development
4. **Windows Compatible**: Server uses standard listen() without reusePort option
