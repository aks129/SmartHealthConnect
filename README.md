# SmartHealthConnect (Liara AI Health)

The patient-facing surface of the HealthClaw platform.

**v1.1.0** — now routes through [HealthClaw Guardrails](https://github.com/aks129/HealthClawGuardrails) v1.2.0's Compiled Truth engine.

## Engine / surface contract

SmartHealthConnect **does not** own data, policy, or the canonical record.

- **Engine** — [HealthClaw Guardrails](https://github.com/aks129/HealthClawGuardrails) owns the FHIR store, PHI redaction, audit trail, step-up auth, tenant isolation, and the **Compiled Truth** primitive (current state + Provenance timeline for every resource).
- **Surface** — this repo owns the 6 patient skills (`healthy-habits`, `care-completion`, `medication-refills`, `diet-exercise`, `kids-health`, `research-monitor`), the React client, and the conversational patterns.

Every skill that makes a resource-specific claim to the patient must call the `get_compiled_truth` MCP tool first — it proxies to HealthClaw's `fhir_compiled_truth` and returns the current redacted resource + an append-only evidence timeline. See each skill's `SKILL.md` for the rule. Configure with `HEALTHCLAW_MCP_URL=http://localhost:3001/mcp/rpc` (or your deployed URL).

`.health-context.yaml` at the repo root declares `role: surface` and names HealthClaw as the engine. Mirrored in the engine repo.

## Overview

SmartHealthConnect enables patients to connect their healthcare providers and view their complete health records in one secure platform. The application uses SMART on FHIR standards for interoperability and delegates guardrail enforcement to HealthClaw.

## Features

- **SMART on FHIR Integration** - Connect to Epic, Cerner, and other FHIR-enabled healthcare systems
- **Unified Health Dashboard** - View conditions, medications, lab results, and vital signs in one place
- **AI Health Insights** - Get personalized health recommendations and care gap identification
- **Trend Visualization** - Track vital signs over time with interactive charts
- **White-Label Ready** - Enterprise solution with customizable branding

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui
- **Backend**: Express.js, TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Passport.js with session management
- **FHIR**: SMART on FHIR R4 protocol

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your DATABASE_URL and other config

# Push database schema
npm run db:push

# Start development server
npm run dev
```

### Environment Variables

- `DATABASE_URL` - PostgreSQL connection string
- `OPENAI_API_KEY` - OpenAI API key for AI features (optional)

## Development

```bash
# Run development server
npm run dev

# Type check
npm run check

# Build for production
npm run build

# Start production server
npm start
```

## Production Deployment

The application can be deployed to any Node.js hosting platform:

```bash
# Build production assets
npm run build

# Set environment variables
export DATABASE_URL="postgresql://..."
export OPENAI_API_KEY="sk-..."  # Optional
export NODE_ENV="production"

# Start server
npm start
```

The server runs on port 5000 by default and serves both the API and static frontend assets.

## Project Structure

```
├── client/           # React frontend
│   └── src/
│       ├── components/   # UI components by feature
│       ├── pages/        # Route components
│       ├── hooks/        # Custom React hooks
│       └── lib/          # Utilities and config
├── server/           # Express backend
│   ├── routes.ts         # API routes
│   ├── fhir-client.ts    # SMART on FHIR integration
│   └── ai-service.ts     # OpenAI integration
├── shared/           # Shared types and schemas
└── migrations/       # Database migrations
```

## Contributing

We're actively looking for:

- **Beta Testers** - Help us refine the user experience
- **Collaborators** - Developers, designers, and healthcare professionals
- **Health System Partners** - Enterprise deployments and integrations

## License

Proprietary - All rights reserved.

## Contact

For partnership inquiries or to join the beta program, please reach out through the platform.
