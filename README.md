# Liara AI Health

A SMART on FHIR patient health records platform with AI-powered insights.

**Status: MVP** - Production-ready for beta deployment.

## Overview

Liara AI Health enables patients to connect their healthcare providers and view their complete health records in one secure platform. The application uses SMART on FHIR standards for interoperability and includes AI-powered health insights.

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
