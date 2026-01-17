# Liara AI Health: Family Health Manager Implementation Plan

## Vision Statement

**Liara = Your Family's AI Health Manager**

Transform from a PHR data viewer into an **actionable health command center** that:
1. Synthesizes health data into consumable narratives (not charts)
2. Manages health for the entire family (not just individuals)
3. Removes administrative friction from healthcare (scheduling, forms, authorizations)
4. Proactively identifies what needs to happen and **executes** it

---

## User Perspective Critique & Evaluation

### What Users DON'T Need (Current Market Failures)

| Problem | Why It Fails | User Reality |
|---------|--------------|--------------|
| Another vital signs dashboard | Patients don't interpret BP trends | "My doctor reads this, not me" |
| Lab result charts | No context, no action | "Is 142 good or bad?" |
| Medication lists | Just a list, no intelligence | "I know what I take" |
| Appointment history | Looking backward, not forward | "What do I need to DO?" |
| Generic health tips | Not personalized | "This isn't about MY health" |

### What Users ACTUALLY Need

| Need | Example | Value |
|------|---------|-------|
| **Synthesis, not data** | "Max has been tracking with low BMI (3-12%) for 3 years. Combined with his ADHD diagnosis, consider nutrition consult." | Understanding their story |
| **Family context** | Side-by-side view of both kids' ADHD management | Managing household health |
| **One-click action** | "Schedule colonoscopy" → Done | Removing friction |
| **Proactive alerts** | "Henry's Tdap is due in 2 months" before they have to remember | Peace of mind |
| **Pre-filled everything** | Intake forms auto-completed from records | Time savings |

### Critical User Journey Questions

Before implementing, we must answer:

1. **"When would I open this app?"**
   - Currently: When I need to look something up (reactive)
   - Goal: When the app tells me something needs attention (proactive)

2. **"What would make me pay for this?"**
   - Not: More charts and data
   - Yes: "Schedule all 3 overdue screenings with one click"
   - Yes: "Pre-fill the 50-question form I'd otherwise spend 20 minutes on"

3. **"How is this different from MyChart?"**
   - MyChart: One health system's portal
   - Liara: All my family's providers in one place, with AI synthesis

4. **"How is this different from ChatGPT Health?"**
   - ChatGPT Health: Q&A about my data (reactive)
   - Liara: Proactive management + action execution (scheduling, forms)

---

## Implementation Phases

### Phase 1: Family Health Journal (4-6 weeks)
**Goal**: Replicate the children's health journal experience natively

#### 1.1 Database Schema Extensions
```sql
-- Family member relationships
CREATE TABLE family_members (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  relationship VARCHAR(50) NOT NULL, -- 'self', 'child', 'spouse', 'parent'
  date_of_birth DATE,
  fhir_session_id INTEGER REFERENCES fhir_sessions(id),
  avatar_url TEXT,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Health narratives (AI-generated summaries)
CREATE TABLE health_narratives (
  id SERIAL PRIMARY KEY,
  family_member_id INTEGER REFERENCES family_members(id),
  narrative_type VARCHAR(50) NOT NULL, -- 'summary', 'condition', 'growth', 'preventive'
  title VARCHAR(255),
  content TEXT NOT NULL,
  source_data JSONB, -- References to FHIR resources used
  generated_at TIMESTAMP DEFAULT NOW(),
  valid_until TIMESTAMP, -- When narrative should be regenerated
  ai_model VARCHAR(50)
);

-- Health goals for tracking
CREATE TABLE health_goals (
  id SERIAL PRIMARY KEY,
  family_member_id INTEGER REFERENCES family_members(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  target_value DECIMAL,
  current_value DECIMAL,
  unit VARCHAR(50),
  category VARCHAR(50), -- 'weight', 'a1c', 'bp', 'activity', 'custom'
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'achieved', 'paused'
  target_date DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Action items (care gaps + custom tasks)
CREATE TABLE action_items (
  id SERIAL PRIMARY KEY,
  family_member_id INTEGER REFERENCES family_members(id),
  care_gap_id VARCHAR(255), -- Reference to FHIR care gap if applicable
  title VARCHAR(255) NOT NULL,
  description TEXT,
  priority VARCHAR(20) DEFAULT 'medium',
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'scheduled', 'completed'
  due_date DATE,
  scheduled_date DATE,
  scheduled_provider VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);
```

#### 1.2 New Components to Build

| Component | Purpose | Complexity |
|-----------|---------|------------|
| `FamilyDashboard.tsx` | Toggle between family members | Medium |
| `FamilyMemberCard.tsx` | Summary card for each person | Low |
| `HealthNarrativeSummary.tsx` | AI-generated prose summary | Medium |
| `WellnessRadar.tsx` | Health domain scoring chart | Medium |
| `ActionItemsList.tsx` | Prioritized next steps | Low |
| `ComparativeChart.tsx` | Side-by-side family metrics | Medium |

#### 1.3 API Endpoints

```typescript
// Family management
GET    /api/family/members           // List family members
POST   /api/family/members           // Add family member
PUT    /api/family/members/:id       // Update family member
DELETE /api/family/members/:id       // Remove family member

// Health narratives
GET    /api/narratives/:memberId     // Get narratives for member
POST   /api/narratives/generate      // Generate AI narrative
PUT    /api/narratives/:id           // Update/edit narrative

// Health goals
GET    /api/goals/:memberId          // Get goals for member
POST   /api/goals                    // Create goal
PUT    /api/goals/:id                // Update goal progress

// Action items
GET    /api/actions/:memberId        // Get action items
POST   /api/actions/:id/schedule     // Schedule an action
PUT    /api/actions/:id/complete     // Mark action complete
```

#### 1.4 AI Narrative Generation

Use OpenAI to generate health narratives from FHIR data:

```typescript
interface NarrativePrompt {
  patient: Patient;
  conditions: Condition[];
  observations: Observation[];
  medications: MedicationRequest[];
  allergies: AllergyIntolerance[];
  immunizations: Immunization[];
  careGaps: CareGap[];
  narrativeType: 'overview' | 'condition_focus' | 'preventive' | 'growth';
}

// Example prompt structure
const generateNarrativePrompt = (data: NarrativePrompt) => `
You are a health analyst creating a consumable health summary.

Patient: ${data.patient.name}, ${calculateAge(data.patient.birthDate)} years old

FHIR Data Provided:
- ${data.conditions.length} active conditions
- ${data.observations.length} observations
- ${data.medications.length} medications
- ${data.careGaps.filter(g => g.status === 'due').length} care gaps due

Generate a 2-3 paragraph narrative that:
1. Summarizes the overall health picture in plain language
2. Highlights key concerns or patterns
3. Lists 3-5 specific action items with priority

Do NOT include raw values without context. Always explain what numbers mean.
`;
```

---

### Phase 2: Frictionless Scheduling (4-6 weeks)
**Goal**: One-click scheduling from care gap to booked appointment

#### 2.1 Architecture

```
[Care Gap Card] → [Schedule Button] → [Provider Matching] → [Availability Check] → [Booking Confirmation]
                                              ↓
                                    [Insurance Verification]
                                              ↓
                                    [Form Pre-fill Ready]
```

#### 2.2 Integration Options

| Integration | Purpose | Complexity | API |
|-------------|---------|------------|-----|
| ZocDoc API | Appointment booking | Medium | Requires partnership |
| Solv Health | Urgent care booking | Medium | Public API available |
| Direct FHIR Scheduling | For Epic/Cerner direct | High | SMART on FHIR |
| OpenTable for Healthcare | Future standard | Low | Emerging |

#### 2.3 Form Pre-fill Engine

```typescript
interface IntakeFormField {
  fieldId: string;
  fieldType: 'text' | 'date' | 'select' | 'multiselect' | 'checkbox';
  label: string;
  fhirPath: string; // XPath-like path to FHIR data
}

const standardIntakeMapping: IntakeFormField[] = [
  { fieldId: 'patient_name', fieldType: 'text', label: 'Full Name', fhirPath: 'Patient.name[0].given + Patient.name[0].family' },
  { fieldId: 'dob', fieldType: 'date', label: 'Date of Birth', fhirPath: 'Patient.birthDate' },
  { fieldId: 'allergies', fieldType: 'multiselect', label: 'Allergies', fhirPath: 'AllergyIntolerance[*].code.text' },
  { fieldId: 'medications', fieldType: 'multiselect', label: 'Current Medications', fhirPath: 'MedicationRequest[*].medicationCodeableConcept.text' },
  { fieldId: 'conditions', fieldType: 'multiselect', label: 'Medical Conditions', fhirPath: 'Condition[*].code.text' },
  { fieldId: 'surgeries', fieldType: 'text', label: 'Past Surgeries', fhirPath: 'Procedure[*].code.text' },
  // ... 40+ more fields
];

// Generate pre-filled form
const prefillForm = (fhirData: FHIRBundle, formTemplate: IntakeFormField[]): PrefilledForm => {
  return formTemplate.map(field => ({
    ...field,
    value: extractFromFHIR(fhirData, field.fhirPath)
  }));
};
```

#### 2.4 UI Components

| Component | Purpose |
|-----------|---------|
| `ScheduleButton.tsx` | One-click CTA on care gaps |
| `ProviderSearch.tsx` | Find in-network providers |
| `AvailabilityPicker.tsx` | Select appointment time |
| `InsuranceVerifier.tsx` | Check coverage |
| `FormPrefillPreview.tsx` | Review pre-filled form before appointment |

---

### Phase 3: Proactive Health Coaching (4-6 weeks)
**Goal**: Transform from reactive Q&A to proactive health management

#### 3.1 Notification Engine

```typescript
interface HealthAlert {
  id: string;
  memberId: string;
  type: 'care_gap_due' | 'trend_concern' | 'medication_refill' | 'appointment_reminder' | 'milestone';
  priority: 'high' | 'medium' | 'low';
  title: string;
  message: string;
  actionUrl?: string;
  scheduledFor: Date;
  sentAt?: Date;
}

// Alert generation rules
const alertRules = [
  {
    condition: (member) => member.careGaps.some(g => g.dueDate && isWithin(g.dueDate, 30, 'days')),
    generate: (member, gap) => ({
      type: 'care_gap_due',
      priority: gap.priority,
      title: `${gap.title} due soon`,
      message: `${member.name}'s ${gap.title} is due in ${daysUntil(gap.dueDate)} days.`,
      actionUrl: `/schedule/${gap.id}`
    })
  },
  {
    condition: (member) => hasTrendConcern(member.observations, 'blood_pressure'),
    generate: (member, trend) => ({
      type: 'trend_concern',
      priority: 'medium',
      title: `Blood Pressure Trending Up`,
      message: `${member.name}'s blood pressure has increased 8% over 3 months. Consider discussing with your doctor.`
    })
  }
];
```

#### 3.2 Weekly Health Digest

```typescript
// Generate weekly email/notification digest
const generateWeeklyDigest = async (userId: string): Promise<Digest> => {
  const family = await getFamilyMembers(userId);

  return {
    greeting: `Here's your family health update for the week of ${formatDate(new Date())}`,
    sections: family.map(member => ({
      name: member.name,
      highlights: [
        ...getUpcomingCareGaps(member, 30),
        ...getMedicationRefillsNeeded(member),
        ...getMilestones(member)
      ],
      actionItems: getTopActionItems(member, 3)
    })),
    quickActions: [
      { label: 'Schedule All Overdue', url: '/schedule/batch' },
      { label: 'View Full Dashboard', url: '/dashboard' }
    ]
  };
};
```

---

### Phase 4: Admin Cost Removal - B2B Features (6-8 weeks)
**Goal**: Value proposition for health systems and employers

#### 4.1 Features

| Feature | Patient Benefit | Provider Benefit |
|---------|-----------------|------------------|
| Form Pre-fill | Save 20 min per appointment | Reduce intake errors, save staff time |
| Prior Auth Automation | No phone calls | Faster approval, less staff overhead |
| Insurance Verification | Know costs upfront | Reduce claim denials |
| Referral Management | Seamless transitions | Complete data transfer |

#### 4.2 Enterprise API

```typescript
// White-label deployment API
POST /api/enterprise/deploy
{
  "organizationId": "hospital-xyz",
  "branding": {
    "name": "MyHealth Portal",
    "logo": "https://...",
    "primaryColor": "#0066CC"
  },
  "features": ["family_management", "scheduling", "forms"],
  "fhirEndpoint": "https://fhir.hospital-xyz.com/r4",
  "ssoConfig": { ... }
}

// Population health analytics (de-identified)
GET /api/enterprise/analytics
{
  "careGapCompliance": 78.5,
  "topMissedScreenings": ["colonoscopy", "mammogram"],
  "averageSchedulingTime": "12 seconds",
  "formCompletionRate": 94.2
}
```

---

## Success Metrics

### User Engagement
- **Weekly Active Users**: Target 60% of registered users
- **Family Members Added**: Target 2.5 per account
- **Narrative Views**: Target 3 views per session

### Action Completion
- **Care Gap → Scheduled**: Target 40% conversion within 7 days
- **Form Pre-fill Usage**: Target 80% of scheduled appointments
- **One-Click Scheduling Success**: Target 90% completion rate

### User Value
- **Time Saved per Appointment**: Target 15 minutes (form pre-fill)
- **Phone Calls Eliminated**: Target 3 per scheduling action
- **NPS Score**: Target 50+

---

## Technical Architecture

### Current Stack (Keep)
- Frontend: React 18 + TypeScript + Vite
- Backend: Express.js + TypeScript
- Database: PostgreSQL + Drizzle ORM
- State: TanStack Query
- UI: shadcn/ui + Tailwind CSS

### Additions Needed
- **AI Service**: Extend `server/ai-service.ts` for narrative generation
- **Scheduling Service**: New `server/scheduling-service.ts`
- **Notification Service**: New `server/notification-service.ts`
- **Form Service**: New `server/form-prefill-service.ts`

### Database Migrations
```bash
# Phase 1
npm run db:generate -- --name add_family_members
npm run db:generate -- --name add_health_narratives
npm run db:generate -- --name add_health_goals
npm run db:generate -- --name add_action_items

# Phase 2
npm run db:generate -- --name add_scheduled_appointments
npm run db:generate -- --name add_form_templates
npm run db:generate -- --name add_prefilled_forms
```

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| FHIR data quality varies | High | Medium | Graceful degradation, manual data entry fallback |
| Scheduling API partnerships slow | Medium | High | Start with form pre-fill only, add booking later |
| AI narrative hallucination | Medium | High | Human review option, citations to source data |
| Family permission complexity | Medium | Medium | Start with simple "all or nothing" sharing |
| HIPAA compliance for family | Medium | High | Legal review, clear consent flows |

---

## Phase 1 Sprint Plan (First 2 Weeks)

### Week 1: Foundation
- [ ] Add `family_members` table and Drizzle schema
- [ ] Create `FamilyDashboard.tsx` component
- [ ] Add family member CRUD API endpoints
- [ ] Build `FamilyMemberCard.tsx` component
- [ ] Implement family member switching in dashboard

### Week 2: Narratives
- [ ] Add `health_narratives` table
- [ ] Extend AI service for narrative generation
- [ ] Create `HealthNarrativeSummary.tsx` component
- [ ] Build `WellnessRadar.tsx` visualization
- [ ] Add "Generate Summary" button to dashboard

---

## Approval Checklist

Before implementation, confirm:

- [ ] User research validates family management as top need
- [ ] Legal review of family data sharing permissions
- [ ] HIPAA compliance strategy for family accounts
- [ ] AI narrative accuracy testing plan
- [ ] Scheduling partner API access confirmed
- [ ] Resource allocation for 4-6 week Phase 1

---

*Document Version: 1.0*
*Created: January 15, 2026*
*Author: Development Team*
