import OpenAI from 'openai';
import { Patient, Condition, Observation, MedicationRequest, AllergyIntolerance, Immunization } from '@shared/schema';
import { getPatientName, formatFhirDate, getDisplayFromCodeableConcept } from '../client/src/lib/fhir-client';

// Initialize the OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Types for AI service
export type HealthContext = {
  patient?: Patient;
  conditions?: Condition[];
  observations?: Observation[];
  medications?: MedicationRequest[];
  allergies?: AllergyIntolerance[];
  immunizations?: Immunization[];
};

export type ChatHistoryItem = {
  role: 'user' | 'assistant';
  content: string;
};

/**
 * Generate a system prompt with patient health context
 */
function generateSystemPrompt(context: HealthContext): string {
  let prompt = `You are a helpful health assistant. You have access to the following information about the patient:`;
  
  // Add patient information
  if (context.patient) {
    const name = getPatientName(context.patient);
    const gender = context.patient.gender || 'Unknown';
    const birthDate = context.patient.birthDate ? formatFhirDate(context.patient.birthDate) : 'Unknown';
    
    prompt += `\n\nPATIENT INFORMATION:`;
    prompt += `\n- Name: ${name}`;
    prompt += `\n- Gender: ${gender}`;
    prompt += `\n- Date of Birth: ${birthDate}`;
  }
  
  // Add conditions
  if (context.conditions && context.conditions.length > 0) {
    prompt += `\n\nMEDICAL CONDITIONS:`;
    context.conditions.forEach(condition => {
      const display = condition.code?.text || 
        (condition.code?.coding && condition.code.coding.length > 0 
          ? condition.code.coding[0].display || condition.code.coding[0].code 
          : 'Unknown condition');
      prompt += `\n- ${display}`;
    });
  }
  
  // Add medications
  if (context.medications && context.medications.length > 0) {
    prompt += `\n\nMEDICATIONS:`;
    context.medications.forEach(med => {
      let display = 'Unknown medication';
      if (med.medicationCodeableConcept) {
        display = med.medicationCodeableConcept.text || 
          (med.medicationCodeableConcept.coding && med.medicationCodeableConcept.coding.length > 0 
            ? med.medicationCodeableConcept.coding[0].display || med.medicationCodeableConcept.coding[0].code 
            : 'Unknown medication');
      } else if (med.medicationReference) {
        display = med.medicationReference.display || med.medicationReference.reference || 'Unknown medication';
      }
      prompt += `\n- ${display}`;
    });
  }
  
  // Add important observations (limit to a reasonable number)
  if (context.observations && context.observations.length > 0) {
    prompt += `\n\nRECENT OBSERVATIONS:`;
    // Sort by date and take only the most recent 10
    const recentObs = [...context.observations]
      .sort((a, b) => {
        const dateA = a.effectiveDateTime ? new Date(a.effectiveDateTime).getTime() : 0;
        const dateB = b.effectiveDateTime ? new Date(b.effectiveDateTime).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, 10);
    
    recentObs.forEach(obs => {
      const code = getDisplayFromCodeableConcept(obs.code);
      let value = '';
      
      if (obs.valueQuantity) {
        value = `${obs.valueQuantity.value} ${obs.valueQuantity.unit || ''}`;
      } else if (obs.valueString) {
        value = obs.valueString;
      } else if (obs.valueCodeableConcept) {
        value = getDisplayFromCodeableConcept(obs.valueCodeableConcept);
      }
      
      prompt += `\n- ${code}: ${value}`;
    });
  }
  
  // Add allergy information
  if (context.allergies && context.allergies.length > 0) {
    prompt += `\n\nALLERGIES:`;
    context.allergies.forEach(allergy => {
      const display = getDisplayFromCodeableConcept(allergy.code);
      prompt += `\n- ${display}`;
    });
  }
  
  // Add guidelines for response
  prompt += `\n\nIMPORTANT GUIDELINES:
- Provide informative responses based on the health information above.
- Keep your responses concise and focused on the patient's question.
- Do not attempt to diagnose conditions or prescribe treatments.
- Always recommend consulting with a healthcare provider for medical concerns.
- Use simple, non-technical language when appropriate.
- Make it clear that you're providing information based on recorded health data.
- Acknowledge the limitations of your knowledge and do not make up information.`;

  return prompt;
}

/**
 * Generate a response to a user message based on health context
 */
export async function generateHealthResponse(
  userMessage: string,
  healthContext: HealthContext,
  chatHistory: ChatHistoryItem[] = []
): Promise<string> {
  try {
    // Generate system prompt with patient context
    const systemPrompt = generateSystemPrompt(healthContext);
    
    // Construct the messages array for OpenAI
    const messages = [
      { role: 'system', content: systemPrompt },
      // Add previous chat history (limited to last 10 messages)
      ...chatHistory.slice(-10).map(item => ({
        role: item.role as 'user' | 'assistant', 
        content: item.content
      })),
      { role: 'user', content: userMessage }
    ];
    
    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo', // Adjust the model as needed
      messages: messages as any,
      temperature: 0.5,
      max_tokens: 500
    });
    
    // Return the generated response
    return response.choices[0]?.message?.content || 
      "I apologize, but I couldn't generate a helpful response at the moment. Please try again or phrase your question differently.";
    
  } catch (error) {
    console.error('Error generating AI response:', error);
    return "I encountered an error while processing your request. Please try again later.";
  }
}