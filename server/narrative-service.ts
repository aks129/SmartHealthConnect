import OpenAI from 'openai';
import { eq } from 'drizzle-orm';
import { db } from './db';
import { familyMembers, fhirSessions } from '@shared/schema';
import type {
  Patient,
  Condition,
  Observation,
  MedicationRequest,
  AllergyIntolerance,
  Immunization,
  CareGap,
} from '@shared/schema';
import { getPatientName, formatFhirDate, getDisplayFromCodeableConcept } from '../client/src/lib/fhir-client';

// Initialize OpenAI client (only if API key is present)
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

export type NarrativeType = 'overview' | 'condition_focus' | 'preventive' | 'growth' | 'medication';

interface GeneratedNarrative {
  title: string;
  content: string;
  sourceData: {
    conditionCount: number;
    observationCount: number;
    medicationCount: number;
    careGapCount: number;
    generatedAt: string;
  };
}

interface HealthDataContext {
  patient?: Patient;
  conditions: Condition[];
  observations: Observation[];
  medications: MedicationRequest[];
  allergies: AllergyIntolerance[];
  immunizations: Immunization[];
  careGaps: CareGap[];
}

// Calculate age from birthdate
function calculateAge(birthDate: string | undefined): number | null {
  if (!birthDate) return null;
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

// Get most recent observations by type
function getRecentObservations(observations: Observation[], limit = 10): Observation[] {
  return [...observations]
    .filter(obs => obs.effectiveDateTime)
    .sort((a, b) => {
      const dateA = new Date(a.effectiveDateTime!).getTime();
      const dateB = new Date(b.effectiveDateTime!).getTime();
      return dateB - dateA;
    })
    .slice(0, limit);
}

// Generate the prompt based on narrative type
function generatePrompt(
  context: HealthDataContext,
  narrativeType: NarrativeType,
  memberName: string,
  age: number | null
): string {
  const patientInfo = context.patient
    ? `${getPatientName(context.patient) || memberName}, ${age !== null ? `${age} years old` : 'age unknown'}, ${context.patient.gender || 'gender not specified'}`
    : `${memberName}, ${age !== null ? `${age} years old` : 'age unknown'}`;

  const baseContext = `
Patient: ${patientInfo}

HEALTH DATA SUMMARY:
- Active Conditions: ${context.conditions.length}
- Recent Observations: ${context.observations.length}
- Current Medications: ${context.medications.length}
- Known Allergies: ${context.allergies.length}
- Immunizations: ${context.immunizations.length}
- Care Gaps Identified: ${context.careGaps.filter(g => g.status === 'due').length}
`;

  const conditionsList = context.conditions
    .map(c => getDisplayFromCodeableConcept(c.code) || 'Unknown condition')
    .join(', ');

  const medicationsList = context.medications
    .map(m => {
      if (m.medicationCodeableConcept) {
        return m.medicationCodeableConcept.text ||
          m.medicationCodeableConcept.coding?.[0]?.display ||
          'Unknown medication';
      }
      return m.medicationReference?.display || 'Unknown medication';
    })
    .join(', ');

  const allergiesList = context.allergies
    .map(a => getDisplayFromCodeableConcept(a.code) || 'Unknown allergy')
    .join(', ');

  const recentObs = getRecentObservations(context.observations);
  const observationsList = recentObs
    .map(obs => {
      const name = getDisplayFromCodeableConcept(obs.code) || 'Unknown';
      let value = '';
      if (obs.valueQuantity?.value !== undefined) {
        value = `${obs.valueQuantity.value} ${obs.valueQuantity.unit || ''}`;
      } else if (obs.valueString) {
        value = obs.valueString;
      }
      return `${name}: ${value}`;
    })
    .join('\n');

  const careGapsList = context.careGaps
    .filter(g => g.status === 'due')
    .map(g => `${g.title} (Due: ${g.dueDate || 'Soon'})`)
    .join('\n');

  let specificInstructions = '';

  switch (narrativeType) {
    case 'overview':
      specificInstructions = `
Generate a comprehensive health summary narrative that:
1. Opens with a brief overview of the patient's current health status
2. Highlights any concerning patterns or trends
3. Lists the top 3-5 priority action items
4. Provides context and meaning for any abnormal values
5. Ends with encouraging notes on what's going well

Write in a warm, professional tone suitable for a family member managing health.
DO NOT use medical jargon without explanation.
`;
      break;

    case 'condition_focus':
      specificInstructions = `
Generate a condition-focused narrative that:
1. Summarizes each active medical condition
2. Explains what each condition means in plain language
3. Describes how the conditions may interact with each other
4. Connects conditions to current medications
5. Identifies any monitoring or follow-up needed

Write for someone who wants to understand their diagnoses better.
`;
      break;

    case 'preventive':
      specificInstructions = `
Generate a preventive care narrative that:
1. Lists all care gaps (missing screenings, vaccines, etc.)
2. Explains why each preventive measure is important
3. Prioritizes items by urgency and health impact
4. Suggests a timeline for addressing each gap
5. Notes any preventive care that has been completed recently

Focus on actionable next steps the patient can take.
`;
      break;

    case 'growth':
      specificInstructions = `
Generate a growth and development narrative that:
1. Reviews recent vital signs and measurements
2. Identifies trends over time (improving, stable, concerning)
3. Puts measurements in context (percentiles for children, normal ranges for adults)
4. Highlights any values that need attention
5. Celebrates positive health milestones

Suitable for tracking health progress over time.
`;
      break;

    case 'medication':
      specificInstructions = `
Generate a medication management narrative that:
1. Lists all current medications with their purposes
2. Notes any potential interactions to watch for
3. Identifies medications that may need refills soon
4. Connects medications to conditions they treat
5. Highlights any allergies that affect medication choices

Focus on helping the patient understand and manage their medications.
`;
      break;
  }

  return `You are a health analyst creating a consumable health narrative for a family health management app.

${baseContext}

DETAILED DATA:

Conditions: ${conditionsList || 'None recorded'}

Medications: ${medicationsList || 'None recorded'}

Allergies: ${allergiesList || 'None recorded'}

Recent Observations:
${observationsList || 'None recorded'}

Care Gaps (Overdue/Due):
${careGapsList || 'None identified'}

${specificInstructions}

IMPORTANT GUIDELINES:
- Write 3-4 paragraphs maximum
- Use plain language, not medical jargon
- Always explain what numbers/values mean
- Be empathetic but not alarmist
- Focus on actionable insights
- Never make up information not in the provided data
- If data is limited, acknowledge that gracefully
`;
}

// Demo narrative content when OpenAI is not available
function generateDemoNarrative(
  memberName: string,
  narrativeType: NarrativeType,
  context: HealthDataContext
): GeneratedNarrative {
  const titles: Record<NarrativeType, string> = {
    overview: `Health Overview for ${memberName}`,
    condition_focus: `Condition Summary for ${memberName}`,
    preventive: `Preventive Care Status for ${memberName}`,
    growth: `Health Trends for ${memberName}`,
    medication: `Medication Review for ${memberName}`,
  };

  const demoContent: Record<NarrativeType, string> = {
    overview: `**Overall Health Status**

${memberName} is currently managing ${context.conditions.length} health condition${context.conditions.length !== 1 ? 's' : ''} with ${context.medications.length} active medication${context.medications.length !== 1 ? 's' : ''}. Based on the available health records, the overall health picture shows active engagement with healthcare providers.

**Key Areas of Focus**

${context.careGaps.filter(g => g.status === 'due').length > 0
  ? `There ${context.careGaps.filter(g => g.status === 'due').length === 1 ? 'is' : 'are'} ${context.careGaps.filter(g => g.status === 'due').length} preventive care item${context.careGaps.filter(g => g.status === 'due').length !== 1 ? 's' : ''} that need attention. Scheduling these appointments should be a priority.`
  : 'All preventive care items appear to be up to date. Great job staying on top of health screenings!'}

**Recommended Actions**

1. Review any upcoming medication refills
2. Schedule any overdue preventive screenings
3. Continue monitoring ongoing health conditions

*This is a demo summary. Connect your health records for personalized AI-generated insights.*`,

    condition_focus: `**Active Conditions**

${context.conditions.length > 0
  ? context.conditions.map(c => `- ${getDisplayFromCodeableConcept(c.code) || 'Unspecified condition'}`).join('\n')
  : 'No active conditions are currently recorded.'}

**Understanding Your Conditions**

Each condition listed above represents a health matter that your healthcare team is monitoring. Regular follow-ups and medication adherence (when prescribed) are key to managing these effectively.

*Connect your health records for detailed AI-powered condition analysis.*`,

    preventive: `**Preventive Care Status**

${context.careGaps.filter(g => g.status === 'due').length > 0
  ? 'The following preventive care items need attention:\n\n' + context.careGaps.filter(g => g.status === 'due').map(g => `- **${g.title}**: ${g.recommendedAction}`).join('\n')
  : 'All preventive care screenings and vaccinations appear to be current.'}

**Why Preventive Care Matters**

Staying up to date with screenings and vaccinations helps catch potential health issues early when they're most treatable. It's one of the most important investments you can make in your health.

*Connect your health records for personalized preventive care recommendations.*`,

    growth: `**Health Trends**

Based on ${context.observations.length} recorded observation${context.observations.length !== 1 ? 's' : ''}, here's a snapshot of recent health metrics.

${getRecentObservations(context.observations, 5).map(obs => {
  const name = getDisplayFromCodeableConcept(obs.code) || 'Measurement';
  let value = 'No value';
  if (obs.valueQuantity?.value !== undefined) {
    value = `${obs.valueQuantity.value} ${obs.valueQuantity.unit || ''}`;
  }
  return `- **${name}**: ${value}`;
}).join('\n') || 'No recent observations recorded.'}

**Tracking Progress**

Regular monitoring helps identify trends and catch changes early. Continue working with your healthcare providers to track these important metrics.

*Connect your health records for detailed trend analysis and AI-powered insights.*`,

    medication: `**Current Medications**

${context.medications.length > 0
  ? context.medications.map(m => {
      const name = m.medicationCodeableConcept?.text ||
        m.medicationCodeableConcept?.coding?.[0]?.display ||
        m.medicationReference?.display || 'Unknown medication';
      const status = m.status || 'active';
      return `- **${name}** (${status})`;
    }).join('\n')
  : 'No medications currently recorded.'}

**Medication Safety**

${context.allergies.length > 0
  ? `You have ${context.allergies.length} recorded allerg${context.allergies.length === 1 ? 'y' : 'ies'} that your healthcare team considers when prescribing medications.`
  : 'No allergies are currently recorded. Make sure to inform your healthcare providers of any known allergies.'}

*Connect your health records for AI-powered medication interaction analysis.*`,
  };

  return {
    title: titles[narrativeType],
    content: demoContent[narrativeType],
    sourceData: {
      conditionCount: context.conditions.length,
      observationCount: context.observations.length,
      medicationCount: context.medications.length,
      careGapCount: context.careGaps.filter(g => g.status === 'due').length,
      generatedAt: new Date().toISOString(),
    },
  };
}

// Main function to generate health narrative
export async function generateHealthNarrative(
  familyMemberId: number,
  narrativeType: NarrativeType
): Promise<GeneratedNarrative> {
  // Get family member info
  const [member] = await db
    .select()
    .from(familyMembers)
    .where(eq(familyMembers.id, familyMemberId))
    .limit(1);

  if (!member) {
    throw new Error('Family member not found');
  }

  // Build health context (in production, this would fetch from FHIR)
  // For now, we'll use demo data or fetch if FHIR session is linked
  const context: HealthDataContext = {
    conditions: [],
    observations: [],
    medications: [],
    allergies: [],
    immunizations: [],
    careGaps: [],
  };

  const age = member.dateOfBirth ? calculateAge(member.dateOfBirth) : null;

  // If OpenAI is not available, return demo narrative
  if (!openai) {
    return generateDemoNarrative(member.name, narrativeType, context);
  }

  try {
    const prompt = generatePrompt(context, narrativeType, member.name, age);

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a health analyst who creates clear, compassionate health narratives for families.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const content = response.choices[0]?.message?.content || 'Unable to generate narrative.';

    // Generate title based on narrative type
    const titles: Record<NarrativeType, string> = {
      overview: `Health Overview for ${member.name}`,
      condition_focus: `Condition Summary for ${member.name}`,
      preventive: `Preventive Care Status for ${member.name}`,
      growth: `Health Trends for ${member.name}`,
      medication: `Medication Review for ${member.name}`,
    };

    return {
      title: titles[narrativeType],
      content,
      sourceData: {
        conditionCount: context.conditions.length,
        observationCount: context.observations.length,
        medicationCount: context.medications.length,
        careGapCount: context.careGaps.filter(g => g.status === 'due').length,
        generatedAt: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error('Error generating narrative with OpenAI:', error);
    // Fall back to demo narrative
    return generateDemoNarrative(member.name, narrativeType, context);
  }
}
