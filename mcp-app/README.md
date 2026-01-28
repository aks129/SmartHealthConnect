# SmartHealthConnect MCP App

A Model Context Protocol (MCP) App that brings healthcare data directly into Claude conversations with interactive visual interfaces.

## Features

SmartHealthConnect provides 6 health-focused tools with embedded UI views:

| Tool | Description |
|------|-------------|
| **Health Summary** | View comprehensive patient health data including conditions, vitals, medications, and allergies |
| **Care Gaps** | See preventive care recommendations based on HEDIS quality measures |
| **Drug Interactions** | Check medication interactions using OpenFDA data |
| **Find Specialists** | Search for healthcare providers by specialty and location |
| **Clinical Trials** | Discover relevant clinical trials from ClinicalTrials.gov |
| **Research Insights** | Explore recent medical research from bioRxiv/medRxiv |

## Installation

### Prerequisites

- Node.js 18+
- SmartHealthConnect backend running (see main README)

### Setup

```bash
cd mcp-app
npm install
npm run build
```

### Configure Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "smarthealthconnect-app": {
      "command": "npx",
      "args": ["tsx", "/path/to/SmartHealthConnect/mcp-app/main.ts", "--stdio"],
      "env": {
        "SMARTHEALTHCONNECT_API_URL": "http://localhost:5000"
      }
    }
  }
}
```

### Start the Backend

```bash
# In the main SmartHealthConnect directory
npm run dev
```

## Usage Examples

### Example 1: Get a Health Summary

Ask Claude to view your health summary:

```
"Show me my health summary"
```

Claude will use the `health_summary` tool to display:
- Patient demographics (name, age, gender)
- Active conditions and diagnoses
- Current medications with dosages
- Known allergies and reactions
- Recent vital signs (blood pressure, heart rate, weight)

**Sample Response:**
```
Patient: Sarah Chen
Age: 45 | Gender: Female

Active Conditions:
- Type 2 Diabetes Mellitus (diagnosed 2019)
- Essential Hypertension (diagnosed 2018)

Current Medications:
- Metformin 500mg twice daily
- Lisinopril 10mg daily

Allergies:
- Penicillin (causes rash)

Recent Vitals:
- Blood Pressure: 128/82 mmHg
- Heart Rate: 72 bpm
- Weight: 165 lbs
```

### Example 2: Check Drug Interactions

Ask Claude to check for drug interactions:

```
"Check if there are any interactions between metformin and other diabetes medications"
```

Claude will use the `drug_interactions` tool to query OpenFDA and display:
- Potential drug-drug interactions
- Severity levels
- Recommended precautions
- Alternative medications if needed

**Sample Response:**
```
Drug Interaction Report: Metformin

Potential Interactions Found:
- Metformin + Alcohol: Increased risk of lactic acidosis (Serious)
- Metformin + Contrast Dye: Temporary discontinuation recommended before imaging
- Metformin + Certain Diuretics: May affect kidney function

Recommendations:
- Avoid excessive alcohol consumption
- Inform radiologist before CT scans with contrast
- Monitor kidney function regularly
```

### Example 3: Find a Specialist

Ask Claude to help find a specialist:

```
"Find a cardiologist near New York City"
```

Claude will use the `find_specialists` tool to search the NPI Registry and display:
- Provider names and credentials
- Practice locations
- Contact information
- Specializations

**Sample Response:**
```
Cardiologists in New York, NY:

1. Dr. Michael Rivera, MD, FACC
   Specialty: Interventional Cardiology
   Address: 525 E 68th St, New York, NY 10065
   Phone: (212) 555-0123
   NPI: 1234567890

2. Dr. Jennifer Park, MD
   Specialty: Cardiovascular Disease
   Address: 1190 5th Ave, New York, NY 10029
   Phone: (212) 555-0456
   NPI: 0987654321

3. Dr. Robert Kim, MD, PhD
   Specialty: Electrophysiology
   Address: 161 Fort Washington Ave, New York, NY 10032
   Phone: (212) 555-0789
   NPI: 5678901234
```

### Example 4: Search Clinical Trials

Ask Claude to find clinical trials:

```
"Find recruiting clinical trials for type 2 diabetes"
```

Claude will use the `clinical_trials` tool to search ClinicalTrials.gov:

**Sample Response:**
```
Clinical Trials for Type 2 Diabetes (Recruiting)

1. Novel GLP-1 Agonist for Glycemic Control
   Status: Recruiting
   Phase: Phase 3
   Location: Multiple sites, USA
   Enrollment: 500 participants
   NCT ID: NCT05123456

2. Lifestyle Intervention Study for Diabetes Prevention
   Status: Recruiting
   Phase: N/A (Behavioral)
   Location: New York, NY
   Enrollment: 200 participants
   NCT ID: NCT05789012

3. Continuous Glucose Monitor Efficacy Study
   Status: Recruiting
   Phase: Phase 4
   Location: Boston, MA
   Enrollment: 150 participants
   NCT ID: NCT05345678
```

### Example 5: Explore Medical Research

Ask Claude to find recent research:

```
"What's the latest research on diabetes and cardiovascular health?"
```

Claude will use the `research_insights` tool to search medRxiv/bioRxiv:

**Sample Response:**
```
Recent Research: Diabetes & Cardiovascular Health

1. "SGLT2 Inhibitors and Cardiovascular Outcomes in T2DM: A Meta-Analysis"
   Authors: Johnson et al.
   Published: January 2026
   Key Finding: 25% reduction in major cardiovascular events
   DOI: 10.1101/2026.01.15.12345678

2. "Novel Biomarkers for Early Detection of Diabetic Cardiomyopathy"
   Authors: Chen et al.
   Published: January 2026
   Key Finding: Three new biomarkers identified with 89% sensitivity
   DOI: 10.1101/2026.01.10.87654321

3. "Impact of Time-Restricted Eating on Metabolic Health in T2DM"
   Authors: Williams et al.
   Published: December 2025
   Key Finding: Improved HbA1c and reduced inflammation markers
   DOI: 10.1101/2025.12.20.11223344
```

### Example 6: Review Care Gaps

Ask Claude to check preventive care:

```
"What preventive care am I missing?"
```

Claude will use the `care_gaps` tool to analyze based on HEDIS measures:

**Sample Response:**
```
Care Gap Analysis

Overdue Screenings:
- Annual Eye Exam (Last: March 2024, Due: March 2025)
  Recommendation: Schedule diabetic retinopathy screening

- HbA1c Test (Last: September 2025, Due: December 2025)
  Recommendation: Blood test to monitor diabetes control

Up to Date:
- Blood Pressure Check (December 2025)
- Cholesterol Panel (October 2025)
- Flu Vaccination (November 2025)

Action Items:
1. Schedule eye exam with ophthalmologist
2. Book lab appointment for HbA1c test
```

## Architecture

```
mcp-app/
├── main.ts              # Entry point (stdio + HTTP transports)
├── server.ts            # MCP server with tools and resources
├── manifest.json        # App metadata for submission
├── src/
│   └── views/           # HTML views with embedded TypeScript
│       ├── health-summary.html
│       ├── care-gaps.html
│       ├── drug-interactions.html
│       ├── find-specialists.html
│       ├── clinical-trials.html
│       └── research-insights.html
└── dist/                # Built output
```

## API Reference

The app connects to the SmartHealthConnect backend API:

| Endpoint | Description |
|----------|-------------|
| `/api/fhir/patient` | Patient demographics |
| `/api/fhir/condition` | Health conditions |
| `/api/fhir/observation` | Vital signs |
| `/api/fhir/medicationrequest` | Medications |
| `/api/fhir/allergyintolerance` | Allergies |
| `/api/fhir/care-gaps` | HEDIS-based recommendations |
| `/api/external/drugs/interactions` | OpenFDA drug data |
| `/api/external/providers/specialists` | NPI Registry search |
| `/api/external/trials/search` | ClinicalTrials.gov |
| `/api/external/research/condition/:condition` | bioRxiv/medRxiv |

## Privacy

See [PRIVACY.md](../PRIVACY.md) for our complete privacy policy regarding health data handling.

## License

MIT
