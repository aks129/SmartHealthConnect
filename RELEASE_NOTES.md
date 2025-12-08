# SmartHealthConnect Beta Release Notes (v0.9.0)

**Release Date:** 2025-12-07
**Status:** Beta Candidate

## 🚀 Key Features

### SMART on FHIR Integration
- **Real Patient Data**: Now connects securely to the Smart Health IT Sandbox (and compatible EHRs).
- **Secure Authentication**: Implements standard OAuth2 launch flow.
- **Privacy First**: Health data is proxied securely; tokens are handled via backend sessions.

### Enhanced Health Insights
- **Trend Visualization**: New sparkline charts for vital signs (Blood Pressure, Weight) to track changes over time.
- **Care Gaps**: Automated identification of missing screenings or immunizations.
- **AI Assistant**: Context-aware chat for asking questions about your specific medical record.

## 🛡️ Trust & Safety Improvements
- **Clinical Disclaimers**: Added prominent safety warnings for AI-generated content.
- **Visual Feedback**: Distinct "Empty" states vs "Error" states to clarify data availability.
- **Resiliency**: improved error handling prevents "silent failures" when external APIs are down.

## 🐛 Bug Fixes
- Fixed type safety issues in Chat Interface.
- Resolved sorting order for health records (newest first).
- Removed verbose developer logging for cleaner production hygiene.

## ⚠️ Known Issues
- "Demo Mode" fallback is currently static.
- Pagination is limited to the first 50 items per resource type.
