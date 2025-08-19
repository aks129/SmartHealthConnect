# Healthcare FHIR Application

## Project Overview
A cutting-edge healthcare application that securely integrates electronic health records using SMART on FHIR protocols, enabling comprehensive medical data management and clinical research capabilities.

## Key Technologies
- **Frontend**: React.js with modern UI components (shadcn/ui, Tailwind CSS)
- **Backend**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Standards**: FHIR compliance for healthcare data integration
- **Security**: Advanced health data security measures
- **Features**: Clinical research integration, responsive medical informatics platform

## Architecture
- **Frontend**: React SPA with routing (wouter), state management (TanStack Query), and forms (react-hook-form)
- **Backend**: Express API server serving both static frontend files and API endpoints
- **Database**: PostgreSQL for persistent data storage
- **Build System**: Vite for frontend bundling, ESBuild for backend compilation

## Production Deployment Configuration

### Current Scripts (Production-Ready)
```json
{
  "build": "vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
  "start": "NODE_ENV=production node dist/index.js"
}
```

### Deployment Process
1. **Build Phase**: The `build` script compiles both frontend and backend for production
   - Frontend: Vite builds optimized React bundle
   - Backend: ESBuild bundles Node.js server with external dependencies
2. **Runtime Phase**: The `start` script runs the production server
   - Sets NODE_ENV=production for optimal performance
   - Serves from compiled `dist` directory

### Development vs Production
- **Development**: `npm run dev` - Uses tsx for hot reloading
- **Production**: `npm run start` - Runs compiled JavaScript from dist folder

## Recent Changes
- **2025-01-19**: Identified and resolved deployment configuration issues
  - Confirmed build and start scripts are properly configured in package.json
  - Documented production deployment process
  - **CRITICAL**: User must manually update `.replit` file deployment section for production deployment
  - Deployment failing due to development configuration in .replit file

### Required Manual Fix for Deployment
The deployment is failing because the `.replit` file contains development configuration. You need to:

1. **Open the `.replit` file** in your editor
2. **Replace these lines** (around lines 8-10):
   ```
   [deployment]
   deploymentTarget = "cloudrun"
   run = ["sh", "-c", "npm run dev"]
   ```
   
   **With this production configuration**:
   ```
   [deployment]
   deploymentTarget = "cloudrun"
   build = ["sh", "-c", "npm run build"]
   run = ["sh", "-c", "npm start"]
   ```

This change will:
- Add a proper build step that compiles both frontend and backend
- Use the production start command instead of development mode
- Fix all deployment security warnings about using 'dev' commands

## Project Structure
```
├── client/                 # React frontend source
├── server/                 # Express backend source
├── shared/                 # Shared TypeScript schemas
├── dist/                   # Production build output (generated)
├── package.json           # Dependencies and scripts
└── replit.md             # This documentation
```

## User Preferences
*(To be updated based on user feedback and preferences)*

## Development Guidelines
- Follow full-stack JavaScript best practices
- Use shared types from `shared/schema.ts`
- Prefer frontend-heavy architecture with minimal backend
- Use TanStack Query for data fetching
- Implement responsive design with Tailwind CSS
- Follow FHIR standards for healthcare data integration

## Database Operations
- Use Drizzle ORM for all database interactions
- Run `npm run db:push` for schema migrations
- PostgreSQL database available via DATABASE_URL environment variable