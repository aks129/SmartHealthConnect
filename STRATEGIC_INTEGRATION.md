# Strategic Healthcare API Integration Plan

## Overview

This document outlines the integration of real healthcare APIs into SmartHealthConnect, transforming it from a demo application into a platform with genuine healthcare data connectivity.

## Implemented Integrations

### 1. ClinicalTrials.gov API
**Component**: `ClinicalTrialsMatcher.tsx`
**API Routes**: `/api/external/clinical-trials`

**Features**:
- Real-time search of NIH clinical trials database
- Condition-based trial matching with patient profile
- Trial details including eligibility, locations, contacts
- Automatic fallback to sample data when API unavailable
- Visual indicator showing live vs demo data source

**Investment Gap Addressed**: Real data differentiation - showing live clinical trials data instead of hardcoded samples.

### 2. OpenFDA Drug API
**Component**: `DrugInteractionChecker.tsx`
**API Routes**: `/api/external/drugs/*`

**Features**:
- Drug information lookup (brand name, generic, manufacturer)
- Drug-drug interaction checking across patient's medication list
- Severity classification (major, moderate, minor)
- Adverse event data from FDA FAERS database
- Boxed warning display for high-risk medications

**Investment Gap Addressed**: Clinical utility - providing actionable safety information that improves patient outcomes.

### 3. NPI Provider Registry
**Component**: `ProviderFinder.tsx`
**API Routes**: `/api/external/providers/*`

**Features**:
- Specialist search by specialty and location
- Provider verification via NPI number
- Full provider details (address, phone, specialties, credentials)
- Integration with care coordination workflows

**Investment Gap Addressed**: Actionability pillar - enabling patients to find and connect with specialists recommended by their care plan.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (React)                        │
├─────────────────────────────────────────────────────────────┤
│  ClinicalTrialsMatcher  │  DrugInteractionChecker  │  ProviderFinder  │
│         ↓                        ↓                      ↓        │
│  useClinicalTrials()    │  useDrugInteractions()  │  useFindSpecialists() │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   API Layer (Express)                        │
│                /api/external/*                               │
├─────────────────────────────────────────────────────────────┤
│  external-api-routes.ts                                      │
│    - /clinical-trials (GET, GET/:nctId)                      │
│    - /drugs/search, /drugs/interactions, /drugs/:name/adverse-events │
│    - /providers/search, /providers/:npi, /providers/specialists │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                Integration Services                          │
├─────────────────────────────────────────────────────────────┤
│  clinicaltrials.ts  │  openfda.ts  │  npi.ts                 │
│  - 15min cache      │  - 1hr cache │  - 30min cache         │
│  - Error handling   │  - Interaction analysis  │  - Specialty mapping │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│              External APIs (Real Data)                       │
├─────────────────────────────────────────────────────────────┤
│  ClinicalTrials.gov  │  api.fda.gov  │  npiregistry.cms.hhs.gov │
│  (NIH)               │  (FDA)        │  (CMS)                   │
└─────────────────────────────────────────────────────────────┘
```

## Files Created/Modified

### New Files
- `server/external-api-routes.ts` - Express router for external APIs
- `server/integrations/clinicaltrials.ts` - ClinicalTrials.gov client
- `server/integrations/openfda.ts` - OpenFDA client
- `server/integrations/npi.ts` - NPI Registry client
- `client/src/hooks/use-external-apis.ts` - React Query hooks
- `client/src/components/medications/DrugInteractionChecker.tsx`
- `client/src/components/provider/ProviderFinder.tsx`

### Modified Files
- `server/routes.ts` - Added external API routes import/registration
- `client/src/components/health/ClinicalTrialsMatcher.tsx` - Added live API integration

## Marketplace Skills Mapping

| Skill | Integration | Status |
|-------|-------------|--------|
| FHIR Developer | Core FHIR patterns in `shared/schema.ts` | ✅ Active |
| Clinical Trials | ClinicalTrials.gov API | ✅ Implemented |
| Prior Auth Review | Prior auth workflow in HealthNavigator | 🔄 Template exists |
| bioRxiv/medRxiv | Research insights component | 📋 Planned |

## API Rate Limits & Caching

| API | Rate Limit | Cache TTL | Notes |
|-----|------------|-----------|-------|
| ClinicalTrials.gov | None published | 15 min | Responsible use recommended |
| OpenFDA | 240/min (no key), 120K/day (with key) | 1 hour | Drug data is stable |
| NPI Registry | None published | 30 min | Reference data |

## Security Considerations

1. **No API Keys Required**: All three APIs are public government APIs
2. **No PHI Transmitted**: Only public data queried (trial IDs, drug names, provider NPIs)
3. **Audit Logging**: All external API calls logged for compliance
4. **Error Handling**: Graceful fallback to sample data on API failure

## Next Steps

1. **Prior Authorization Workflow**: Enhance HealthNavigator with insurance API integration
2. **Research Insights**: Add bioRxiv/medRxiv connector for latest research
3. **Provider Scheduling**: Connect ProviderFinder with appointment booking
4. **FHIR Export**: Allow patients to export data in FHIR format
