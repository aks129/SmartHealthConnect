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
    careGaps.push(...this.evaluateGeneralPreventiveCare(context));
    careGaps.push(...this.evaluateChronicConditionMonitoring(context));
    
    return careGaps;
  }

  /**
   * Evaluate general preventive care needs
   */
  private evaluateGeneralPreventiveCare(context: PatientHealthContext): CareGap[] {
    const { patient } = context;
    const careGaps: CareGap[] = [];
    const today = new Date();
    const birthDate = patient.birthDate ? parseISO(patient.birthDate) : null;
    
    if (!birthDate) return careGaps;
    
    const age = differenceInYears(today, birthDate);
    
    // Blood pressure monitoring
    careGaps.push(...this.evaluateBloodPressureMonitoring(context, age));
    
    // Cholesterol screening
    careGaps.push(...this.evaluateCholesterolScreening(context, age));
    
    // Immunizations
    careGaps.push(...this.evaluateImmunizations(context, age));
    
    return careGaps;
  }

  /**
   * Evaluate blood pressure monitoring
   */
  private evaluateBloodPressureMonitoring(context: PatientHealthContext, age: number): CareGap[] {
    const { patient, observations } = context;
    const today = new Date();
    
    // Check for recent blood pressure reading (within 2 years for adults)
    const hasRecentBP = observations.some(obs => {
      if (!obs.code?.coding?.some(coding => 
        coding.system?.includes('loinc') && 
        ['85354-9', '8480-6', '8462-4'].includes(coding.code || '')
      )) return false;
      
      const obsDate = obs.effectiveDateTime ? parseISO(obs.effectiveDateTime) : null;
      return obsDate ? isAfter(obsDate, sub(today, { years: 2 })) : false;
    });
    
    if (!hasRecentBP && age >= 18) {
      const lastBPDate = this.getLastScreeningDate(observations, ['85354-9', '8480-6', '8462-4']);
      const timeMessage = lastBPDate ? 
        this.getTimeSinceMessage(lastBPDate) + ' for a blood pressure check' : 
        "We don't see any recent blood pressure readings";

      return [{
        id: 'bp-1',
        patientId: patient.id || '',
        title: 'Blood Pressure Check',
        status: 'due',
        description: `${timeMessage}. Regular blood pressure monitoring helps detect hypertension early.`,
        recommendedAction: 'Schedule a blood pressure check with your healthcare provider. This can often be done during routine visits or at many pharmacies.',
        measureId: 'BP-Monitor',
        category: 'preventive',
        priority: 'medium',
        dueDate: format(today, 'yyyy-MM-dd')
      }];
    }
    
    return [];
  }

  /**
   * Evaluate cholesterol screening
   */
  private evaluateCholesterolScreening(context: PatientHealthContext, age: number): CareGap[] {
    const { patient, observations } = context;
    const today = new Date();
    
    // Cholesterol screening recommendations vary by age and risk factors
    const shouldScreen = (age >= 40) || (age >= 20 && this.hasCardiovascularRiskFactors(context));
    
    if (!shouldScreen) return [];
    
    const hasRecentCholesterol = observations.some(obs => {
      if (!obs.code?.coding?.some(coding => 
        coding.system?.includes('loinc') && 
        ['2093-3', '18262-6', '2085-9', '2089-1'].includes(coding.code || '')
      )) return false;
      
      const obsDate = obs.effectiveDateTime ? parseISO(obs.effectiveDateTime) : null;
      return obsDate ? isAfter(obsDate, sub(today, { years: 5 })) : false;
    });
    
    if (!hasRecentCholesterol) {
      const lastCholesterolDate = this.getLastScreeningDate(observations, ['2093-3', '18262-6', '2085-9', '2089-1']);
      const timeMessage = lastCholesterolDate ? 
        this.getTimeSinceMessage(lastCholesterolDate) + ' for cholesterol screening' : 
        "We don't see any recent cholesterol test results";

      return [{
        id: 'chol-1',
        patientId: patient.id || '',
        title: 'Cholesterol Screening',
        status: 'due',
        description: `${timeMessage}. Regular cholesterol testing helps assess your heart disease risk.`,
        recommendedAction: 'Schedule a cholesterol panel (lipid test) with your healthcare provider. This simple blood test should be done every 4-6 years.',
        measureId: 'Cholesterol-Screen',
        category: 'preventive',
        priority: 'medium',
        dueDate: format(today, 'yyyy-MM-dd')
      }];
    }
    
    return [];
  }

  /**
   * Evaluate chronic condition monitoring beyond diabetes
   */
  private evaluateChronicConditionMonitoring(context: PatientHealthContext): CareGap[] {
    const { conditions } = context;
    const careGaps: CareGap[] = [];
    
    // Check for hypertension monitoring
    const hasHypertension = conditions.some(condition => 
      condition.code?.coding?.some(coding => 
        (coding.system?.includes('snomed') && 
         ['38341003', '59621000'].includes(coding.code || '')) ||
        (coding.system?.includes('icd10') && 
         coding.code?.startsWith('I10'))
      )
    );
    
    if (hasHypertension) {
      careGaps.push(...this.evaluateHypertensionCare(context));
    }
    
    return careGaps;
  }

  /**
   * Check for cardiovascular risk factors
   */
  private hasCardiovascularRiskFactors(context: PatientHealthContext): boolean {
    const { conditions } = context;
    
    return conditions.some(condition => 
      condition.code?.coding?.some(coding => 
        (coding.system?.includes('snomed') && 
         ['44054006', '73211009', '38341003', '22298006'].includes(coding.code || '')) ||
        (coding.system?.includes('icd10') && 
         (coding.code?.startsWith('E11') || coding.code?.startsWith('I10') || coding.code?.startsWith('Z87')))
      )
    );
  }

  /**
   * Evaluate hypertension care
   */
  private evaluateHypertensionCare(context: PatientHealthContext): CareGap[] {
    const { patient, observations } = context;
    const today = new Date();
    
    // Check for recent blood pressure monitoring (every 6 months for hypertension)
    const hasRecentBP = observations.some(obs => {
      if (!obs.code?.coding?.some(coding => 
        coding.system?.includes('loinc') && 
        ['85354-9', '8480-6', '8462-4'].includes(coding.code || '')
      )) return false;
      
      const obsDate = obs.effectiveDateTime ? parseISO(obs.effectiveDateTime) : null;
      return obsDate ? isAfter(obsDate, sub(today, { months: 6 })) : false;
    });
    
    if (!hasRecentBP) {
      const lastBPDate = this.getLastScreeningDate(observations, ['85354-9', '8480-6', '8462-4']);
      const timeMessage = lastBPDate ? 
        this.getTimeSinceMessage(lastBPDate) + ' for blood pressure monitoring' : 
        "We don't see recent blood pressure readings";

      return [{
        id: 'htn-1',
        patientId: patient.id || '',
        title: 'Blood Pressure Monitoring',
        status: 'due',
        description: `${timeMessage}. With hypertension, regular monitoring helps ensure your treatment is working effectively.`,
        recommendedAction: 'Schedule a blood pressure check with your healthcare provider. Consider monitoring at home between visits.',
        measureId: 'HTN-Monitor',
        category: 'chronic',
        priority: 'high',
        dueDate: format(today, 'yyyy-MM-dd')
      }];
    }
    
    return [];
  }

  /**
   * Evaluate immunization needs
   */
  private evaluateImmunizations(context: PatientHealthContext, age: number): CareGap[] {
    const { patient, immunizations } = context;
    const careGaps: CareGap[] = [];
    
    // Flu vaccine (annual for all adults)
    const currentYear = new Date().getFullYear();
    const hasCurrentFluVaccine = immunizations.some(imm => {
      const immDate = imm.occurrenceDateTime ? parseISO(imm.occurrenceDateTime) : null;
      const immYear = immDate ? immDate.getFullYear() : 0;
      
      return immYear >= currentYear && 
        imm.vaccineCode?.coding?.some(coding => 
          coding.system?.includes('cvx') && 
          ['88', '141', '150', '155', '158', '161', '166', '171', '185', '186', '197'].includes(coding.code || '')
        );
    });
    
    if (!hasCurrentFluVaccine && age >= 6) {
      careGaps.push({
        id: 'flu-1',
        patientId: patient.id || '',
        title: 'Annual Flu Vaccine',
        status: 'due',
        description: 'Annual influenza vaccination is recommended for everyone 6 months and older.',
        recommendedAction: 'Schedule your annual flu vaccine. It\'s especially important during flu season (fall/winter).',
        measureId: 'Flu-Vaccine',
        category: 'preventive',
        priority: 'medium',
        dueDate: format(new Date(), 'yyyy-MM-dd')
      });
    }
    
    return careGaps;
  }
  
  /**
   * Evaluate colorectal cancer screening
   * Based on updated guidelines (age 45+) and HEDIS COL measure
   */
  private evaluateColorectalCancerScreening(context: PatientHealthContext): CareGap[] {
    const { patient, observations, conditions } = context;
    const today = new Date();
    const birthDate = patient.birthDate ? parseISO(patient.birthDate) : null;
    
    // Only applicable for patients 45-75 years old (updated from 50+)
    if (!birthDate) return [];
    
    const age = differenceInYears(today, birthDate);
    if (age < 45 || age > 75) {
      return [{
        id: 'col-1',
        patientId: patient.id || '',
        title: 'Colorectal Cancer Screening',
        status: 'not_applicable',
        description: age < 45 ? 
          'Colorectal cancer screening typically begins at age 45.' :
          'Screening may not be recommended after age 75, discuss with your provider.',
        recommendedAction: age < 45 ? 
          'No action needed at this time based on your age.' :
          'Discuss continued screening benefits with your healthcare provider.',
        measureId: 'HEDIS-COL',
        category: 'preventive',
        reason: `Patient age (${age}) is outside the recommended screening range of 45-75 years.`
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
    
    // Determine how long it's been since potential last screening
    const lastScreeningDate = this.getLastScreeningDate(observations, ['2335-8', '27401-3', '12503-9', '14563-1', '14564-9', '14565-6', '18500-9', '18501-7']);
    const timeMessage = lastScreeningDate ? 
      this.getTimeSinceMessage(lastScreeningDate) : 
      "We don't see any record of previous colorectal screening";

    // Patient needs screening
    return [{
      id: 'col-1',
      patientId: patient.id || '',
      title: 'Colorectal Cancer Screening',
      status: 'due',
      description: `${timeMessage}. Regular screening helps detect problems early when they're most treatable.`,
      recommendedAction: age >= 50 ? 
        'Consider scheduling a colonoscopy (every 10 years) or completing an annual stool test (FIT/FOBT).' :
        'As you\'re now 45+, it\'s time to start colorectal cancer screening. Discuss options with your provider.',
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
      const lastHbA1cDate = this.getLastScreeningDate(observations, ['4548-4', '4549-2', '17856-6']);
      const timeMessage = lastHbA1cDate ? 
        this.getTimeSinceMessage(lastHbA1cDate) : 
        "We don't see any recent HbA1c results";

      careGaps.push({
        id: 'cdc-1',
        patientId: patient.id || '',
        title: 'HbA1c Test Due',
        status: 'due',
        description: `${timeMessage}. Regular HbA1c testing helps monitor your diabetes management over time.`,
        recommendedAction: 'Schedule an HbA1c lab test with your healthcare provider. This simple blood test shows your average blood sugar over the past 2-3 months.',
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
      const lastEyeExamDate = this.getLastScreeningDate(observations, ['32451-7', '29246-0']);
      const timeMessage = lastEyeExamDate ? 
        this.getTimeSinceMessage(lastEyeExamDate) + ' for a diabetic eye exam' : 
        "We don't see any record of a recent diabetic eye exam";

      careGaps.push({
        id: 'cdc-3',
        patientId: patient.id || '',
        title: 'Diabetic Eye Exam',
        status: 'due',
        description: `${timeMessage}. Annual eye exams help detect diabetic eye disease early, when treatment is most effective.`,
        recommendedAction: 'Schedule an appointment with an eye care professional for a comprehensive dilated eye exam. This is important even if your vision seems fine.',
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

  /**
   * Helper to generate friendly time-since messages
   */
  private getTimeSinceMessage(dateString: string): string {
    const testDate = parseISO(dateString);
    const today = new Date();
    const monthsAgo = differenceInYears(today, testDate) * 12 + (today.getMonth() - testDate.getMonth());
    const yearsAgo = differenceInYears(today, testDate);

    if (yearsAgo >= 2) {
      return `It's been over ${yearsAgo} years since your last screening`;
    } else if (yearsAgo >= 1) {
      return `It's been about ${yearsAgo} year${yearsAgo > 1 ? 's' : ''} since your last screening`;
    } else if (monthsAgo >= 6) {
      return `It's been ${monthsAgo} months since your last screening`;
    } else if (monthsAgo >= 1) {
      return `Your last screening was ${monthsAgo} month${monthsAgo > 1 ? 's' : ''} ago`;
    } else {
      return `Your screening is recent`;
    }
  }

  /**
   * Helper to check if patient has diabetes
   */
  private hasDiabetesCondition(conditions: Condition[]): boolean {
    return conditions.some(condition => 
      condition.code?.coding?.some(coding => 
        (coding.system?.includes('snomed') && 
         ['44054006', '73211009', '46635009', '237627000'].includes(coding.code || '')) ||
        (coding.system?.includes('icd10') && 
         (coding.code?.startsWith('E11') || coding.code?.startsWith('E10')))
      )
    );
  }
}

export const careGapsService = new CareGapsService();