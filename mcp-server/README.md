# SmartHealthConnect MCP Server

MCP (Model Context Protocol) server that exposes SmartHealthConnect functionality to Claude and other AI assistants.

## Features

### Health Data Tools
- `get_health_summary` - Comprehensive health overview
- `get_conditions` - Active health conditions
- `get_medications` - Current medication list
- `get_vitals` - Recent vital signs
- `get_allergies` - Known allergies

### Family Management Tools
- `get_family_members` - List family members
- `get_family_health_overview` - Family-wide health summary

### Preventive Care Tools
- `get_care_gaps` - HEDIS-based preventive care recommendations

### Provider Search Tools
- `find_specialists` - Search NPI Registry for healthcare providers

### Drug Safety Tools
- `check_drug_interactions` - OpenFDA drug interaction checker

### Research Tools
- `find_clinical_trials` - ClinicalTrials.gov search
- `get_research_insights` - bioRxiv/medRxiv medical preprints

### Care Plan Tools
- `get_care_plans` - View AI-generated care plans
- `generate_care_plan` - Create new care plan for a condition

### Journal Tools
- `get_health_journal` - View health journal entries
- `add_journal_entry` - Log mood, symptoms, activities

### Appointment Tools
- `get_appointment_preps` - View appointment preparations
- `generate_appointment_prep` - Create appointment summary

## Installation

### Prerequisites
1. Node.js 18+
2. SmartHealthConnect server running (or use demo mode)

### Setup

```bash
cd mcp-server
npm install
npm run build
```

## Configuration for Claude Desktop

Add to your Claude Desktop configuration file:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "smarthealthconnect": {
      "command": "node",
      "args": ["/path/to/SmartHealthConnect/mcp-server/dist/index.js"],
      "env": {
        "SMARTHEALTHCONNECT_API_URL": "http://localhost:5000",
        "DEMO_PASSWORD": "SmartHealth2025"
      }
    }
  }
}
```

### Using npx (after publishing)

```json
{
  "mcpServers": {
    "smarthealthconnect": {
      "command": "npx",
      "args": ["@smarthealthconnect/mcp-server"],
      "env": {
        "SMARTHEALTHCONNECT_API_URL": "http://localhost:5000"
      }
    }
  }
}
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SMARTHEALTHCONNECT_API_URL` | API server URL | `http://localhost:5000` |
| `DEMO_PASSWORD` | Demo mode password | `SmartHealth2025` |

## Usage Examples

Once configured, you can ask Claude:

### Health Information
- "What are my current medications?"
- "Show me my health summary"
- "What allergies do I have?"
- "What preventive care do I need?"

### Family Health
- "Show me my family's health overview"
- "What care actions are pending for my family?"

### Finding Providers
- "Find a cardiologist in New York, NY"
- "Search for dermatologists near me"

### Research
- "Find clinical trials for diabetes"
- "What's the latest research on hypertension?"

### Care Planning
- "Create a care plan for managing my diabetes"
- "What goals should I set for my hypertension?"

### Journaling
- "Log my mood as 8 with note: feeling great today"
- "Record that I had a headache with severity 6"
- "Show my recent journal entries"

### Appointment Prep
- "Prepare me for my annual physical next Tuesday"
- "What questions should I ask at my follow-up appointment?"

## Development

```bash
# Run in development mode
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Resources

The server also exposes MCP resources:

- `health://patient/summary` - Patient health summary
- `health://family/overview` - Family health overview
- `health://care-gaps` - Care gap recommendations

## License

MIT
