# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

### Development
- `npm run dev` - Start development server with hot reloading (frontend + backend)
- `npm run check` - TypeScript type checking
- `npm run db:push` - Push database schema changes using Drizzle Kit

### Production
- `npm run build` - Build frontend (Vite) and backend (ESBuild) for production
- `npm start` - Run production server from dist/ directory

## Architecture Overview

This is a full-stack healthcare application using SMART on FHIR protocols for electronic health records integration.

### Technology Stack
- **Frontend**: React 18 + TypeScript with Vite bundling
- **Backend**: Express.js + TypeScript with ESBuild compilation
- **Database**: PostgreSQL with Drizzle ORM
- **Routing**: wouter (client-side), Express routes (server-side)
- **State Management**: TanStack Query for server state, React hooks for local state
- **UI Components**: shadcn/ui with Radix UI primitives + Tailwind CSS
- **Forms**: react-hook-form with Zod validation

### Project Structure
```
├── client/                     # React frontend source code
│   ├── src/
│   │   ├── components/        # Organized by feature (auth, fhir, health, etc.)
│   │   ├── pages/            # Route components (dashboard, home, tutorial)
│   │   ├── hooks/            # Custom React hooks
│   │   └── lib/              # Utility functions and configurations
├── server/                     # Express backend source code
│   ├── index.ts              # Main server entry point
│   ├── routes.ts             # API route definitions (main routes file)
│   ├── user-routes.ts        # User authentication routes
│   ├── fhir-client.ts        # SMART on FHIR integration
│   ├── ai-service.ts         # OpenAI integration for health insights
│   └── care-gaps-service.ts  # Healthcare analytics and care gaps
├── shared/
│   └── schema.ts             # Shared TypeScript types and Zod schemas
├── migrations/                # Database migration files
└── dist/                     # Production build output (generated)
```

### Key Architectural Patterns

**Full-Stack TypeScript**: Shared types between client and server via `shared/schema.ts` using Zod for runtime validation.

**FHIR Integration**: Healthcare data follows FHIR R4 standards. Main FHIR client logic in `server/fhir-client.ts` handles SMART launch sequences and resource management.

**Database Layer**: Drizzle ORM with PostgreSQL. Schema definitions in `shared/schema.ts`, migration files in `migrations/`. Use `npm run db:push` for schema changes.

**API Architecture**: RESTful API with routes primarily in `server/routes.ts`. Authentication handled via Passport.js with session management.

**Frontend State**: TanStack Query for server state caching and synchronization. Custom hooks in `client/src/hooks/` for reusable logic.

**Component Organization**: Feature-based component structure under `client/src/components/` (auth, fhir, health, research, etc.).

### Development Notes

**Environment Setup**: Requires `DATABASE_URL` environment variable for PostgreSQL connection.

**FHIR Development**: The application supports SMART on FHIR launch sequences. FHIR resources are cached locally and synchronized with external EHR systems.

**AI Integration**: OpenAI service in `server/ai-service.ts` provides health insights and care recommendations based on FHIR data.

**Authentication**: Session-based authentication with Passport.js. User routes in `server/user-routes.ts`.

**Build Process**: Frontend builds to `client/dist/`, backend bundles to `dist/`. Production server serves static files and API from single process.

### Healthcare-Specific Features

**Care Gaps Analysis**: `server/care-gaps-service.ts` analyzes patient data for preventive care opportunities.

**FHIR Resource Management**: Handles Patient, Observation, Condition, MedicationRequest, and other FHIR R4 resources.

**Clinical Decision Support**: AI-powered insights based on clinical guidelines and patient data patterns.

**Research Integration**: Components for clinical research participation and data contribution.