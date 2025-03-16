import { Patient, Condition, Observation, MedicationRequest, Immunization, CareGap } from '@shared/schema';
import { format, sub, differenceInYears, parse, isAfter, isBefore, parseISO } from 'date-fns';

// Interface for patient health context
export type PatientHealthContext = {
  patient: Patient;
  conditions: Condition[];
  observations: Observation[];
  medications: MedicationRequest[];
  immunizations: Immunization[];
};

/**
 * Care gap service to evaluate HEDIS measurements
 * Implementing examples based on HEDIS CQL Implementation Guide
 */
export class CareGapsService {
  /**
   * Evaluate all care gaps for a patient
   * @param context Patient health context
   * @returns Array of care gaps
   */
  evaluateAllCareGaps(context: PatientHealthContext): CareGap[] {
    const careGaps: CareGap[] = [];
    
    // Add care gap evaluations
    careGaps.push(...this.evaluateColorectalCancerScreening(context));
    careGaps.push(...this.evaluateDiabetesCare(context));
    careGaps.push(...this.evaluateBreastCancerScreening(context));
    
    return careGaps;
  }
  
  /**
   * Evaluate colorectal cancer screening
   * Based on HEDIS COL measure
   */
  private evaluateColorectalCancerScreening(context: PatientHealthContext): CareGap[] {
    const { patient, observations, conditions } = context;
    const today = new Date();
    const birthDate = patient.birthDate ? parseISO(patient.birthDate) : null;
    
    // Only applicable for patients 50-75 years old
    if (!birthDate) return [];
    
    const age = differenceInYears(today, birthDate);
    if (age < 50 || age > 75) {
      return [{
        id: 'col-1',
        patientId: patient.id || '',
        title: 'Colorectal Cancer Screening',
        status: 'not_applicable',
        description: 'Colorectal cancer screening is recommended for adults aged 50-75.',
        recommendedAction: 'No action needed at this time based on patient age.',
        measureId: 'HEDIS-COL',
        category: 'preventive',
        reason: `Patient age (${age}) is outside the recommended screening range of 50-75 years.`
      }];
    }
    
    // Check for colorectal cancer or total colectomy (exclusions)
    const hasColorectalCancer = conditions.some(condition => 
      condition.code?.coding?.some(coding => 
        coding.system?.includes('snomed') && 
        ['93761005', '109355002', '363406005', '109355002'].includes(coding.code || '')
      )
    );
    
    if (hasColorectalCancer) {
      return [{
        id: 'col-1',
        patientId: patient.id || '',
        title: 'Colorectal Cancer Screening',
        status: 'not_applicable',
        description: 'Colorectal cancer screening is not applicable due to patient history.',
        recommendedAction: 'No screening needed due to prior colorectal cancer diagnosis.',
        measureId: 'HEDIS-COL',
        category: 'preventive',
        reason: 'Patient has history of colorectal cancer.'
      }];
    }
    
    // Check for FOBT in past year
    const hasFOBT = observations.some(obs => {
      if (!obs.code?.coding?.some(coding => 
        coding.system?.includes('loinc') && 
        ['2335-8', '27401-3', '12503-9', '14563-1', '14564-9', '14565-6'].includes(coding.code || '')
      )) return false;
      
      const obsDate = obs.effectiveDateTime ? parseISO(obs.effectiveDateTime) : null;
      return obsDate ? isAfter(obsDate, sub(today, { years: 1 })) : false;
    });
    
    // Check for colonoscopy in past 10 years
    const hasColonoscopy = observations.some(obs => {
      if (!obs.code?.coding?.some(coding => 
        coding.system?.includes('loinc') && 
        ['18500-9'].includes(coding.code || '')
      )) return false;
      
      const obsDate = obs.effectiveDateTime ? parseISO(obs.effectiveDateTime) : null;
      return obsDate ? isAfter(obsDate, sub(today, { years: 10 })) : false;
    });
    
    // Check for sigmoidoscopy in past 5 years
    const hasSigmoidoscopy = observations.some(obs => {
      if (!obs.code?.coding?.some(coding => 
        coding.system?.includes('loinc') && 
        ['18501-7'].includes(coding.code || '')
      )) return false;
      
      const obsDate = obs.effectiveDateTime ? parseISO(obs.effectiveDateTime) : null;
      return obsDate ? isAfter(obsDate, sub(today, { years: 5 })) : false;
    });
    
    // Patient has had appropriate screening
    if (hasFOBT || hasColonoscopy || hasSigmoidoscopy) {
      return [{
        id: 'col-1',
        patientId: patient.id || '',
        title: 'Colorectal Cancer Screening',
        status: 'satisfied',
        description: 'Colorectal cancer screening is up to date.',
        recommendedAction: 'Continue routine screening per guidelines.',
        measureId: 'HEDIS-COL',
        category: 'preventive',
        lastPerformedDate: this.getLastScreeningDate(observations, ['2335-8', '27401-3', '12503-9', '14563-1', '14564-9', '14565-6', '18500-9', '18501-7'])
      }];
    }
    
    // Patient needs screening
    return [{
      id: 'col-1',
      patientId: patient.id || '',
      title: 'Colorectal Cancer Screening',
      status: 'due',
      description: 'Colorectal cancer screening is recommended.',
      recommendedAction: 'Schedule colonoscopy, or complete annual FOBT/FIT test.',
      measureId: 'HEDIS-COL',
      category: 'preventive',
      priority: 'high',
      dueDate: format(today, 'yyyy-MM-dd')
    }];
  }
  
  /**
   * Evaluate diabetes care
   * Based on HEDIS CDC measure
   */
  private evaluateDiabetesCare(context: PatientHealthContext): CareGap[] {
    const { patient, conditions, observations } = context;
    const today = new Date();
    const careGaps: CareGap[] = [];
    
    // Check if patient has diabetes
    const hasDiabetes = conditions.some(condition => 
      condition.code?.coding?.some(coding => 
        (coding.system?.includes('snomed') && 
         ['44054006', '73211009', '46635009'].includes(coding.code || '')) ||
        (coding.system?.includes('icd10') && 
         coding.code?.startsWith('E11'))
      )
    );
    
    if (!hasDiabetes) {
      return [{
        id: 'cdc-1',
        patientId: patient.id || '',
        title: 'Diabetes Care',
        status: 'not_applicable',
        description: 'Diabetes management measures are not applicable.',
        recommendedAction: 'No action needed as patient does not have diabetes diagnosis.',
        measureId: 'HEDIS-CDC',
        category: 'chronic',
        reason: 'Patient does not have diabetes.'
      }];
    }
    
    // Check for HbA1c test in past year
    const hasRecentHbA1c = observations.some(obs => {
      if (!obs.code?.coding?.some(coding => 
        coding.system?.includes('loinc') && 
        ['4548-4', '4549-2', '17856-6'].includes(coding.code || '')
      )) return false;
      
      const obsDate = obs.effectiveDateTime ? parseISO(obs.effectiveDateTime) : null;
      return obsDate ? isAfter(obsDate, sub(today, { months: 12 })) : false;
    });
    
    if (!hasRecentHbA1c) {
      careGaps.push({
        id: 'cdc-1',
        patientId: patient.id || '',
        title: 'HbA1c Test',
        status: 'due',
        description: 'Annual HbA1c testing is due for diabetes management.',
        recommendedAction: 'Schedule HbA1c lab test.',
        measureId: 'HEDIS-CDC-HbA1c',
        category: 'chronic',
        priority: 'high',
        dueDate: format(today, 'yyyy-MM-dd')
      });
    } else {
      // Get the most recent HbA1c value and check if it's controlled
      const recentHbA1c = observations
        .filter(obs => 
          obs.code?.coding?.some(coding => 
            coding.system?.includes('loinc') && 
            ['4548-4', '4549-2', '17856-6'].includes(coding.code || '')
          )
        )
        .sort((a, b) => {
          const dateA = a.effectiveDateTime ? parseISO(a.effectiveDateTime) : new Date(0);
          const dateB = b.effectiveDateTime ? parseISO(b.effectiveDateTime) : new Date(0);
          return dateB.getTime() - dateA.getTime();
        })[0];
      
      if (recentHbA1c) {
        const hbA1cValue = this.getNumericValue(recentHbA1c);
        
        if (hbA1cValue && hbA1cValue > 9) {
          careGaps.push({
            id: 'cdc-2',
            patientId: patient.id || '',
            title: 'Poor Glycemic Control',
            status: 'due',
            description: `HbA1c value of ${hbA1cValue}% indicates poor glycemic control.`,
            recommendedAction: 'Review medication regimen and consider adjustments.',
            measureId: 'HEDIS-CDC-HbA1c-Control',
            category: 'chronic',
            priority: 'high',
            lastPerformedDate: recentHbA1c.effectiveDateTime
          });
        }
      }
    }
    
    // Check for eye exam in past year
    const hasEyeExam = observations.some(obs => {
      if (!obs.code?.coding?.some(coding => 
        coding.system?.includes('loinc') && 
        ['32451-7', '29246-0'].includes(coding.code || '')
      )) return false;
      
      const obsDate = obs.effectiveDateTime ? parseISO(obs.effectiveDateTime) : null;
      return obsDate ? isAfter(obsDate, sub(today, { months: 12 })) : false;
    });
    
    if (!hasEyeExam) {
      careGaps.push({
        id: 'cdc-3',
        patientId: patient.id || '',
        title: 'Diabetic Eye Exam',
        status: 'due',
        description: 'Annual eye exam is recommended for diabetic patients.',
        recommendedAction: 'Schedule appointment with ophthalmologist for dilated eye exam.',
        measureId: 'HEDIS-CDC-EyeExam',
        category: 'chronic',
        priority: 'medium',
        dueDate: format(today, 'yyyy-MM-dd')
      });
    }
    
    // Check for nephropathy monitoring in past year
    const hasNephropathy = observations.some(obs => {
      if (!obs.code?.coding?.some(coding => 
        coding.system?.includes('loinc') && 
        ['13705-9', '32294-1', '31208-2'].includes(coding.code || '')
      )) return false;
      
      const obsDate = obs.effectiveDateTime ? parseISO(obs.effectiveDateTime) : null;
      return obsDate ? isAfter(obsDate, sub(today, { months: 12 })) : false;
    });
    
    if (!hasNephropathy) {
      careGaps.push({
        id: 'cdc-4',
        patientId: patient.id || '',
        title: 'Nephropathy Monitoring',
        status: 'due',
        description: 'Annual nephropathy monitoring is recommended for diabetic patients.',
        recommendedAction: 'Schedule urine microalbumin test.',
        measureId: 'HEDIS-CDC-Nephropathy',
        category: 'chronic',
        priority: 'medium',
        dueDate: format(today, 'yyyy-MM-dd')
      });
    }
    
    return careGaps;
  }
  
  /**
   * Evaluate breast cancer screening
   * Based on HEDIS BCS measure
   */
  private evaluateBreastCancerScreening(context: PatientHealthContext): CareGap[] {
    const { patient, observations, conditions } = context;
    const today = new Date();
    const birthDate = patient.birthDate ? parseISO(patient.birthDate) : null;
    
    // Only applicable for women 50-74 years old
    if (!birthDate || patient.gender !== 'female') {
      return [{
        id: 'bcs-1',
        patientId: patient.id || '',
        title: 'Breast Cancer Screening',
        status: 'not_applicable',
        description: 'Breast cancer screening is recommended for women aged 50-74.',
        recommendedAction: 'No action needed at this time.',
        measureId: 'HEDIS-BCS',
        category: 'preventive',
        reason: patient.gender !== 'female' ? 
          'Patient gender does not match screening criteria.' : 
          'Patient age is outside recommended screening range.'
      }];
    }
    
    const age = differenceInYears(today, birthDate);
    if (age < 50 || age > 74) {
      return [{
        id: 'bcs-1',
        patientId: patient.id || '',
        title: 'Breast Cancer Screening',
        status: 'not_applicable',
        description: 'Breast cancer screening is recommended for women aged 50-74.',
        recommendedAction: 'No action needed at this time based on patient age.',
        measureId: 'HEDIS-BCS',
        category: 'preventive',
        reason: `Patient age (${age}) is outside the recommended screening range of 50-74 years.`
      }];
    }
    
    // Check for bilateral mastectomy (exclusion)
    const hasBilateralMastectomy = conditions.some(condition => 
      condition.code?.coding?.some(coding => 
        coding.system?.includes('snomed') && 
        ['429400009', '137739009'].includes(coding.code || '')
      )
    );
    
    if (hasBilateralMastectomy) {
      return [{
        id: 'bcs-1',
        patientId: patient.id || '',
        title: 'Breast Cancer Screening',
        status: 'not_applicable',
        description: 'Breast cancer screening is not applicable due to patient history.',
        recommendedAction: 'No mammogram needed due to history of bilateral mastectomy.',
        measureId: 'HEDIS-BCS',
        category: 'preventive',
        reason: 'Patient has history of bilateral mastectomy.'
      }];
    }
    
    // Check for mammogram in past 2 years
    const hasMammogram = observations.some(obs => {
      if (!obs.code?.coding?.some(coding => 
        coding.system?.includes('loinc') && 
        ['24606-6', '24605-8', '26346-7', '26347-5', '26348-3', '26349-1'].includes(coding.code || '')
      )) return false;
      
      const obsDate = obs.effectiveDateTime ? parseISO(obs.effectiveDateTime) : null;
      return obsDate ? isAfter(obsDate, sub(today, { months: 27 })) : false;
    });
    
    if (hasMammogram) {
      return [{
        id: 'bcs-1',
        patientId: patient.id || '',
        title: 'Breast Cancer Screening',
        status: 'satisfied',
        description: 'Breast cancer screening is up to date.',
        recommendedAction: 'Continue routine mammography screening every 2 years.',
        measureId: 'HEDIS-BCS',
        category: 'preventive',
        lastPerformedDate: this.getLastScreeningDate(observations, ['24606-6', '24605-8', '26346-7', '26347-5', '26348-3', '26349-1'])
      }];
    }
    
    // Patient needs mammogram
    return [{
      id: 'bcs-1',
      patientId: patient.id || '',
      title: 'Breast Cancer Screening',
      status: 'due',
      description: 'Breast cancer screening mammogram is recommended.',
      recommendedAction: 'Schedule mammogram.',
      measureId: 'HEDIS-BCS',
      category: 'preventive',
      priority: 'high',
      dueDate: format(today, 'yyyy-MM-dd')
    }];
  }
  
  /**
   * Helper to get numeric value from observation
   */
  private getNumericValue(observation: Observation): number | null {
    if (observation.valueQuantity?.value) {
      return observation.valueQuantity.value;
    }
    
    if (typeof observation.valueQuantity === 'number') {
      return observation.valueQuantity;
    }
    
    if (observation.valueString && !isNaN(parseFloat(observation.valueString))) {
      return parseFloat(observation.valueString);
    }
    
    return null;
  }
  
  /**
   * Helper to get last screening date
   */
  private getLastScreeningDate(observations: Observation[], loincCodes: string[]): string | undefined {
    const screeningObs = observations
      .filter(obs => 
        obs.code?.coding?.some(coding => 
          coding.system?.includes('loinc') && 
          loincCodes.includes(coding.code || '')
        )
      )
      .sort((a, b) => {
        const dateA = a.effectiveDateTime ? parseISO(a.effectiveDateTime) : new Date(0);
        const dateB = b.effectiveDateTime ? parseISO(b.effectiveDateTime) : new Date(0);
        return dateB.getTime() - dateA.getTime();
      })[0];
    
    return screeningObs?.effectiveDateTime;
  }
}

export const careGapsService = new CareGapsService();