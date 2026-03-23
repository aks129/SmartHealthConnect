/**
 * CDC ACIP Recommended Immunization Schedule and AAP Well-Child Visit Schedule
 * Source: https://www.cdc.gov/vaccines/schedules/hcp/imz/child-adolescent.html
 * Last updated: 2024-2025 CDC ACIP recommendations
 */

export const CDC_SCHEDULE_SOURCE = 'https://www.cdc.gov/vaccines/schedules/hcp/imz/child-adolescent.html';
export const lastUpdated = '2025-02-01';

// ============================================
// Immunization Schedule
// ============================================

export interface VaccineDose {
  doseNumber: number;
  ageMonthsMin: number;
  ageMonthsMax: number;
  cvxCodes: string[];
}

export interface VaccineSchedule {
  name: string;
  abbreviation: string;
  doses: VaccineDose[];
}

export const CDC_IMMUNIZATION_SCHEDULE: VaccineSchedule[] = [
  {
    name: 'Hepatitis B',
    abbreviation: 'HepB',
    doses: [
      { doseNumber: 1, ageMonthsMin: 0, ageMonthsMax: 1, cvxCodes: ['08'] },
      { doseNumber: 2, ageMonthsMin: 1, ageMonthsMax: 2, cvxCodes: ['08'] },
      { doseNumber: 3, ageMonthsMin: 6, ageMonthsMax: 18, cvxCodes: ['08'] },
    ],
  },
  {
    name: 'Rotavirus',
    abbreviation: 'RV',
    doses: [
      { doseNumber: 1, ageMonthsMin: 2, ageMonthsMax: 3, cvxCodes: ['116'] },
      { doseNumber: 2, ageMonthsMin: 4, ageMonthsMax: 5, cvxCodes: ['116'] },
      { doseNumber: 3, ageMonthsMin: 6, ageMonthsMax: 8, cvxCodes: ['116'] },
    ],
  },
  {
    name: 'Diphtheria, Tetanus, and Pertussis',
    abbreviation: 'DTaP',
    doses: [
      { doseNumber: 1, ageMonthsMin: 2, ageMonthsMax: 3, cvxCodes: ['20'] },
      { doseNumber: 2, ageMonthsMin: 4, ageMonthsMax: 5, cvxCodes: ['20'] },
      { doseNumber: 3, ageMonthsMin: 6, ageMonthsMax: 7, cvxCodes: ['20'] },
      { doseNumber: 4, ageMonthsMin: 15, ageMonthsMax: 18, cvxCodes: ['20'] },
      { doseNumber: 5, ageMonthsMin: 48, ageMonthsMax: 72, cvxCodes: ['20'] },
    ],
  },
  {
    name: 'Haemophilus influenzae type b',
    abbreviation: 'Hib',
    doses: [
      { doseNumber: 1, ageMonthsMin: 2, ageMonthsMax: 3, cvxCodes: ['49'] },
      { doseNumber: 2, ageMonthsMin: 4, ageMonthsMax: 5, cvxCodes: ['49'] },
      { doseNumber: 3, ageMonthsMin: 6, ageMonthsMax: 7, cvxCodes: ['49'] },
      { doseNumber: 4, ageMonthsMin: 12, ageMonthsMax: 15, cvxCodes: ['49'] },
    ],
  },
  {
    name: 'Pneumococcal conjugate',
    abbreviation: 'PCV13',
    doses: [
      { doseNumber: 1, ageMonthsMin: 2, ageMonthsMax: 3, cvxCodes: ['133'] },
      { doseNumber: 2, ageMonthsMin: 4, ageMonthsMax: 5, cvxCodes: ['133'] },
      { doseNumber: 3, ageMonthsMin: 6, ageMonthsMax: 7, cvxCodes: ['133'] },
      { doseNumber: 4, ageMonthsMin: 12, ageMonthsMax: 15, cvxCodes: ['133'] },
    ],
  },
  {
    name: 'Inactivated Poliovirus',
    abbreviation: 'IPV',
    doses: [
      { doseNumber: 1, ageMonthsMin: 2, ageMonthsMax: 3, cvxCodes: ['10'] },
      { doseNumber: 2, ageMonthsMin: 4, ageMonthsMax: 5, cvxCodes: ['10'] },
      { doseNumber: 3, ageMonthsMin: 6, ageMonthsMax: 18, cvxCodes: ['10'] },
      { doseNumber: 4, ageMonthsMin: 48, ageMonthsMax: 72, cvxCodes: ['10'] },
    ],
  },
  {
    name: 'Influenza (annual)',
    abbreviation: 'IIV',
    doses: [
      { doseNumber: 1, ageMonthsMin: 6, ageMonthsMax: 216, cvxCodes: ['141'] },
    ],
  },
  {
    name: 'Measles, Mumps, and Rubella',
    abbreviation: 'MMR',
    doses: [
      { doseNumber: 1, ageMonthsMin: 12, ageMonthsMax: 15, cvxCodes: ['03'] },
      { doseNumber: 2, ageMonthsMin: 48, ageMonthsMax: 72, cvxCodes: ['03'] },
    ],
  },
  {
    name: 'Varicella',
    abbreviation: 'VAR',
    doses: [
      { doseNumber: 1, ageMonthsMin: 12, ageMonthsMax: 15, cvxCodes: ['21'] },
      { doseNumber: 2, ageMonthsMin: 48, ageMonthsMax: 72, cvxCodes: ['21'] },
    ],
  },
  {
    name: 'Hepatitis A',
    abbreviation: 'HepA',
    doses: [
      { doseNumber: 1, ageMonthsMin: 12, ageMonthsMax: 23, cvxCodes: ['83'] },
      { doseNumber: 2, ageMonthsMin: 18, ageMonthsMax: 41, cvxCodes: ['83'] },
    ],
  },
  {
    name: 'Tetanus, Diphtheria, and Pertussis',
    abbreviation: 'Tdap',
    doses: [
      { doseNumber: 1, ageMonthsMin: 132, ageMonthsMax: 144, cvxCodes: ['115'] },
    ],
  },
];

// ============================================
// AAP Well-Child Visit Schedule
// ============================================

export interface WellChildVisit {
  ageDescription: string;
  ageMonths: number;
  screenings: string[];
}

export const AAP_WELLCHILD_SCHEDULE: WellChildVisit[] = [
  {
    ageDescription: 'Newborn (3-5 days)',
    ageMonths: 0,
    screenings: [
      'Newborn metabolic screening',
      'Hearing screening',
      'Critical congenital heart disease screening',
      'Bilirubin assessment',
      'Weight check',
    ],
  },
  {
    ageDescription: '1 month',
    ageMonths: 1,
    screenings: [
      'Growth and development assessment',
      'Feeding evaluation',
      'Jaundice follow-up if needed',
    ],
  },
  {
    ageDescription: '2 months',
    ageMonths: 2,
    screenings: [
      'Growth and development assessment',
      'Immunizations: HepB, RV, DTaP, Hib, PCV13, IPV',
      'Developmental surveillance',
    ],
  },
  {
    ageDescription: '4 months',
    ageMonths: 4,
    screenings: [
      'Growth and development assessment',
      'Immunizations: RV, DTaP, Hib, PCV13, IPV',
      'Developmental surveillance',
    ],
  },
  {
    ageDescription: '6 months',
    ageMonths: 6,
    screenings: [
      'Growth and development assessment',
      'Immunizations: HepB, RV, DTaP, Hib, PCV13, IPV, Influenza',
      'Developmental surveillance',
      'Oral health risk assessment',
      'Lead screening risk assessment',
    ],
  },
  {
    ageDescription: '9 months',
    ageMonths: 9,
    screenings: [
      'Growth and development assessment',
      'Developmental screening (ASQ)',
      'Developmental surveillance',
    ],
  },
  {
    ageDescription: '12 months',
    ageMonths: 12,
    screenings: [
      'Growth and development assessment',
      'Immunizations: MMR, Varicella, HepA, Hib, PCV13',
      'Lead screening',
      'Hemoglobin/hematocrit screening',
      'Tuberculosis risk assessment',
    ],
  },
  {
    ageDescription: '15 months',
    ageMonths: 15,
    screenings: [
      'Growth and development assessment',
      'Immunizations: DTaP (4th dose)',
      'Developmental surveillance',
    ],
  },
  {
    ageDescription: '18 months',
    ageMonths: 18,
    screenings: [
      'Growth and development assessment',
      'Immunizations: HepA (2nd dose), HepB (if catch-up needed)',
      'Autism screening (M-CHAT-R/F)',
      'Developmental screening (ASQ)',
    ],
  },
  {
    ageDescription: '24 months',
    ageMonths: 24,
    screenings: [
      'Growth and development assessment',
      'Autism screening (M-CHAT-R/F)',
      'Developmental screening (ASQ)',
      'Dental referral',
      'Lead screening',
    ],
  },
  {
    ageDescription: '30 months',
    ageMonths: 30,
    screenings: [
      'Growth and development assessment',
      'Developmental screening (ASQ)',
      'Developmental surveillance',
    ],
  },
  {
    ageDescription: '3 years',
    ageMonths: 36,
    screenings: [
      'Growth and development assessment',
      'Blood pressure screening',
      'Vision screening',
      'Developmental surveillance',
    ],
  },
  {
    ageDescription: '4 years',
    ageMonths: 48,
    screenings: [
      'Growth and development assessment',
      'Immunizations: DTaP (5th dose), IPV (4th dose), MMR (2nd dose), Varicella (2nd dose)',
      'Vision screening',
      'Blood pressure screening',
      'Developmental surveillance',
    ],
  },
  {
    ageDescription: '5 years',
    ageMonths: 60,
    screenings: [
      'Growth and development assessment',
      'Vision screening',
      'Blood pressure screening',
      'School readiness evaluation',
    ],
  },
  {
    ageDescription: '6 years',
    ageMonths: 72,
    screenings: [
      'Growth and development assessment',
      'Vision screening',
      'Blood pressure screening',
    ],
  },
  {
    ageDescription: '7 years',
    ageMonths: 84,
    screenings: [
      'Growth and development assessment',
      'Vision screening',
      'Blood pressure screening',
    ],
  },
  {
    ageDescription: '8 years',
    ageMonths: 96,
    screenings: [
      'Growth and development assessment',
      'Vision screening',
      'Blood pressure screening',
    ],
  },
  {
    ageDescription: '9 years',
    ageMonths: 108,
    screenings: [
      'Growth and development assessment',
      'Vision screening',
      'Blood pressure screening',
      'Dyslipidemia screening',
    ],
  },
  {
    ageDescription: '10 years',
    ageMonths: 120,
    screenings: [
      'Growth and development assessment',
      'Vision screening',
      'Blood pressure screening',
    ],
  },
  {
    ageDescription: '11 years',
    ageMonths: 132,
    screenings: [
      'Growth and development assessment',
      'Immunizations: Tdap, HPV, Meningococcal',
      'Vision screening',
      'Blood pressure screening',
      'Depression screening (PHQ-A)',
    ],
  },
  {
    ageDescription: '12 years',
    ageMonths: 144,
    screenings: [
      'Growth and development assessment',
      'Vision screening',
      'Blood pressure screening',
      'Depression screening (PHQ-A)',
    ],
  },
  {
    ageDescription: '13 years',
    ageMonths: 156,
    screenings: [
      'Growth and development assessment',
      'Vision screening',
      'Blood pressure screening',
      'Depression screening (PHQ-A)',
    ],
  },
  {
    ageDescription: '14 years',
    ageMonths: 168,
    screenings: [
      'Growth and development assessment',
      'Vision screening',
      'Blood pressure screening',
      'Depression screening (PHQ-A)',
    ],
  },
  {
    ageDescription: '15 years',
    ageMonths: 180,
    screenings: [
      'Growth and development assessment',
      'Vision screening',
      'Blood pressure screening',
      'Depression screening (PHQ-A)',
    ],
  },
  {
    ageDescription: '16 years',
    ageMonths: 192,
    screenings: [
      'Growth and development assessment',
      'Immunizations: Meningococcal booster',
      'Vision screening',
      'Blood pressure screening',
      'Depression screening (PHQ-A)',
    ],
  },
  {
    ageDescription: '17 years',
    ageMonths: 204,
    screenings: [
      'Growth and development assessment',
      'Vision screening',
      'Blood pressure screening',
      'Depression screening (PHQ-A)',
    ],
  },
  {
    ageDescription: '18 years',
    ageMonths: 216,
    screenings: [
      'Growth and development assessment',
      'Vision screening',
      'Blood pressure screening',
      'Depression screening (PHQ-A)',
      'Transition to adult care planning',
    ],
  },
];

// ============================================
// School-Required Vaccines
// ============================================

export const SCHOOL_REQUIRED_VACCINES: Record<string, string[]> = {
  default: ['DTaP', 'IPV', 'MMR', 'Varicella', 'HepB'],
  // State-specific requirements can be added here, e.g.:
  // california: ['DTaP', 'IPV', 'MMR', 'Varicella', 'HepB', 'HepA'],
  // new_york: ['DTaP', 'IPV', 'MMR', 'Varicella', 'HepB', 'HepA', 'PCV13'],
};
