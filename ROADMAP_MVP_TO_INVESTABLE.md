# SmartHealthConnect: Prototype to Investable MVP Roadmap

## Current State Assessment
- **What we have**: Polished UI demo with hardcoded data
- **What we need**: Functional backend with real integrations that demonstrate technical capability

## Critical Path: 5 Phases to Minimum Investable Product

---

## PHASE 1: Security Foundation (Priority: CRITICAL)
**Goal**: Demonstrate we understand healthcare security requirements
**Effort**: 2-3 days Claude Code execution

### 1.1 Real Authentication System
- [ ] Implement bcrypt password hashing
- [ ] Add JWT token-based authentication
- [ ] Create proper session management with secure cookies
- [ ] Add rate limiting on auth endpoints
- [ ] Implement password reset flow

### 1.2 Audit Logging
- [ ] Create audit_logs table for PHI access tracking
- [ ] Log all FHIR data access with user, timestamp, action
- [ ] Add exportable audit trail endpoint

### 1.3 Environment Validation
- [ ] Add startup validation for required env vars
- [ ] Fail fast if security-critical config missing
- [ ] Remove hardcoded demo password

---

## PHASE 2: Testing Infrastructure (Priority: HIGH)
**Goal**: Prove code quality with measurable coverage
**Effort**: 1-2 days Claude Code execution

### 2.1 Testing Setup
- [ ] Add Vitest configuration
- [ ] Create test utilities and fixtures
- [ ] Add GitHub Actions CI workflow

### 2.2 Critical Path Tests
- [ ] Auth flow unit tests
- [ ] FHIR client integration tests
- [ ] Care gaps service tests
- [ ] API endpoint tests

### 2.3 Coverage Reporting
- [ ] Add coverage thresholds (target: 60%+)
- [ ] Add coverage badge to README

---

## PHASE 3: Real External Integrations (Priority: HIGH)
**Goal**: Replace hardcoded data with live API calls
**Effort**: 2-3 days Claude Code execution

### 3.1 ClinicalTrials.gov Integration
- [ ] Implement real API client for clinicaltrials.gov
- [ ] Search trials by condition, location, status
- [ ] Cache results to reduce API load
- [ ] Replace hardcoded SAMPLE_TRIALS

### 3.2 Drug Interaction API (OpenFDA)
- [ ] Integrate openFDA drug interactions endpoint
- [ ] Real-time interaction checking
- [ ] Replace hardcoded DRUG_INTERACTIONS

### 3.3 NPI Registry Integration
- [ ] Provider lookup via NPPES NPI Registry
- [ ] Find specialists by specialty and location
- [ ] Enable real provider search in Navigator

---

## PHASE 4: AI Differentiation (Priority: MEDIUM-HIGH)
**Goal**: Move beyond OpenAI wrapper to demonstrable AI capability
**Effort**: 2-3 days Claude Code execution

### 4.1 RAG Implementation
- [ ] Create embeddings for medical knowledge base
- [ ] Implement vector search for context retrieval
- [ ] Ground AI responses in retrieved medical content

### 4.2 Predictive Care Gap Model
- [ ] Train simple risk scoring model on demo data
- [ ] Predict care gap likelihood based on patient profile
- [ ] Show "predicted risk" alongside rule-based gaps

### 4.3 AI Explainability
- [ ] Add reasoning traces to AI responses
- [ ] Show confidence scores
- [ ] Citation of sources for recommendations

---

## PHASE 5: Production Hardening (Priority: MEDIUM)
**Goal**: Demonstrate production readiness
**Effort**: 2-3 days Claude Code execution

### 5.1 Code Quality
- [ ] Split routes.ts into domain modules (<500 lines each)
- [ ] Extract demo data to fixtures directory
- [ ] Add OpenAPI/Swagger documentation

### 5.2 Observability
- [ ] Add structured logging (pino/winston)
- [ ] Implement health check endpoint
- [ ] Add basic performance monitoring

### 5.3 Error Handling
- [ ] Centralized error handling middleware
- [ ] Proper HTTP status codes
- [ ] User-friendly error messages

---

## Execution Priority Matrix

| Phase | Impact on Investment | Effort | Do First? |
|-------|---------------------|--------|-----------|
| 1. Security | CRITICAL - Deal breaker | Medium | YES |
| 2. Testing | HIGH - Credibility | Low | YES |
| 3. Integrations | HIGH - Differentiation | Medium | YES |
| 4. AI | MEDIUM - Future value | High | After 1-3 |
| 5. Hardening | MEDIUM - Polish | Medium | After 1-3 |

---

## Claude Code Execution Plan

### Sprint 1 (Execute First): Foundation
```
Phase 1.1 + 1.2 + 2.1 + 2.2
```
- Real auth with bcrypt/JWT
- Audit logging
- Vitest setup with initial tests
- **Deliverable**: Secure, tested auth system

### Sprint 2: Real Data
```
Phase 3.1 + 3.2 + 3.3
```
- ClinicalTrials.gov live integration
- OpenFDA drug interactions
- NPI provider lookup
- **Deliverable**: No more hardcoded external data

### Sprint 3: AI & Polish
```
Phase 4.1 + 4.2 + 5.1
```
- RAG with medical knowledge
- Basic predictive scoring
- Code cleanup
- **Deliverable**: Demonstrable AI capability

---

## Success Metrics

After completing this roadmap:

| Metric | Current | Target |
|--------|---------|--------|
| Test Coverage | 0% | 60%+ |
| Security Controls | Placeholder | Real implementation |
| External API Integrations | 0 | 3+ (ClinicalTrials, OpenFDA, NPI) |
| Hardcoded Data Files | 70% of routes.ts | <10% |
| AI Differentiation | OpenAI wrapper | RAG + predictive scoring |
| Audit Logging | None | Complete PHI access trail |

---

## Investment Pitch Improvement

**Before**: "We have a demo"
**After**: "We have a secure, tested platform with live integrations to ClinicalTrials.gov, FDA drug databases, and provider registries, plus AI-powered risk prediction with explainable outputs"

---

## Files to Create/Modify

### New Files
- `server/auth/` - Authentication module
- `server/middleware/audit.ts` - Audit logging
- `server/integrations/clinicaltrials.ts` - CT.gov API
- `server/integrations/openfda.ts` - FDA drug API
- `server/integrations/npi.ts` - Provider registry
- `server/ai/rag.ts` - RAG implementation
- `server/ai/risk-scoring.ts` - Predictive model
- `tests/` - Test suite
- `vitest.config.ts` - Test configuration
- `.github/workflows/ci.yml` - CI pipeline

### Files to Modify
- `server/routes.ts` - Split into modules
- `server/user-routes.ts` - Real auth
- `shared/schema.ts` - Add audit_logs table
- `client/src/components/health/ClinicalTrialsMatcher.tsx` - Use live API
- `client/src/components/health/MedicationHub.tsx` - Use FDA API

---

## Estimated Total Effort

| Sprint | Days | Outcome |
|--------|------|---------|
| Sprint 1 | 2-3 | Secure + Tested |
| Sprint 2 | 2-3 | Real Integrations |
| Sprint 3 | 2-3 | AI Differentiation |
| **Total** | **6-9 days** | **Investable MVP** |

This is achievable with focused Claude Code execution.
