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

### Key Files

**Server**:
- `server/routes.ts` - Main API routes (FHIR endpoints, chat, care gaps)
- `server/fhir-client.ts` - HapiFhirClient class for FHIR server communication
- `server/ai-service.ts` - OpenAI integration for health insights
- `server/care-gaps-service.ts` - Preventive care gap analysis
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
- `/api/fhir/demo/connect` - Demo mode connection
- `/api/fhir/sessions/current` - Current FHIR session

Chat endpoints: `/api/chat/messages` (GET/POST)

### Client Routes

- `/` - Landing page (home)
- `/dashboard` - Main patient health dashboard
- `/about` - About page
- `/tutorial` - Onboarding tutorial
- `/callback` - SMART on FHIR OAuth callback

### Environment Variables

Required:
- `DATABASE_URL` - PostgreSQL connection string

Optional:
- `OPENAI_API_KEY` - For AI health insights
- `FHIR_SERVER_URL` - External FHIR server (defaults to localhost:8000/fhir)

### Key Patterns

**FHIR Resources**: All FHIR types defined as Zod schemas in `shared/schema.ts` with TypeScript types exported. Supports Patient, Condition, Observation, MedicationRequest, AllergyIntolerance, Immunization, Coverage, Claim, ExplanationOfBenefit, Practitioner, Organization, Location, Appointment, PractitionerRole.

**Demo Mode**: `server/routes.ts` contains sample FHIR data for demo purposes, allowing the app to function without a real FHIR connection.

**Theming**: Dark mode support via ThemeProvider with system/light/dark options. Semantic color tokens in Tailwind for consistent theming.

**White-Label**: BrandProvider supports enterprise customization of branding elements.