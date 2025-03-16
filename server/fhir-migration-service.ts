/**
 * Service to migrate FHIR data between external providers and our local HAPI FHIR server
 */
import { hapiFhirClient } from './fhir-client';
import { storage } from './storage';
import {
  Patient,
  Condition,
  Observation,
  MedicationRequest,
  AllergyIntolerance,
  Immunization,
  Coverage,
  Claim,
  ExplanationOfBenefit,
  FhirSession
} from '@shared/schema';

/**
 * Service for migrating FHIR data from external providers to our local HAPI FHIR server
 */
export class FhirMigrationService {
  /**
   * Migrate FHIR resources from an external provider to our local HAPI FHIR server
   * @param session The FHIR session containing information about the connected provider
   * @param patient The patient data to migrate
   * @param resources Object containing arrays of different resource types to migrate
   * @returns Object with counts of migrated resources
   */
  async migrateProviderData(
    session: FhirSession,
    patient: Patient,
    resources: {
      conditions?: Condition[];
      observations?: Observation[];
      medications?: MedicationRequest[];
      allergies?: AllergyIntolerance[];
      immunizations?: Immunization[];
      coverages?: Coverage[];
      claims?: Claim[];
      explanationOfBenefits?: ExplanationOfBenefit[];
    }
  ): Promise<Record<string, number>> {
    const migrationCounts: Record<string, number> = {};
    
    try {
      // Migrate patient data
      const migratedPatient = await hapiFhirClient.createResource('Patient', patient);
      const patientId = migratedPatient.id;
      migrationCounts.patients = 1;
      
      // Migrate conditions
      if (resources.conditions && resources.conditions.length > 0) {
        for (const condition of resources.conditions) {
          await hapiFhirClient.createResource('Condition', condition);
        }
        migrationCounts.conditions = resources.conditions.length;
      }
      
      // Migrate observations
      if (resources.observations && resources.observations.length > 0) {
        for (const observation of resources.observations) {
          await hapiFhirClient.createResource('Observation', observation);
        }
        migrationCounts.observations = resources.observations.length;
      }
      
      // Migrate medications
      if (resources.medications && resources.medications.length > 0) {
        for (const medication of resources.medications) {
          await hapiFhirClient.createResource('MedicationRequest', medication);
        }
        migrationCounts.medications = resources.medications.length;
      }
      
      // Migrate allergies
      if (resources.allergies && resources.allergies.length > 0) {
        for (const allergy of resources.allergies) {
          await hapiFhirClient.createResource('AllergyIntolerance', allergy);
        }
        migrationCounts.allergies = resources.allergies.length;
      }
      
      // Migrate immunizations
      if (resources.immunizations && resources.immunizations.length > 0) {
        for (const immunization of resources.immunizations) {
          await hapiFhirClient.createResource('Immunization', immunization);
        }
        migrationCounts.immunizations = resources.immunizations.length;
      }
      
      // Migrate coverages
      if (resources.coverages && resources.coverages.length > 0) {
        for (const coverage of resources.coverages) {
          await hapiFhirClient.createResource('Coverage', coverage);
        }
        migrationCounts.coverages = resources.coverages.length;
      }
      
      // Migrate claims
      if (resources.claims && resources.claims.length > 0) {
        for (const claim of resources.claims) {
          await hapiFhirClient.createResource('Claim', claim);
        }
        migrationCounts.claims = resources.claims.length;
      }
      
      // Migrate explanation of benefits
      if (resources.explanationOfBenefits && resources.explanationOfBenefits.length > 0) {
        for (const eob of resources.explanationOfBenefits) {
          await hapiFhirClient.createResource('ExplanationOfBenefit', eob);
        }
        migrationCounts.explanationOfBenefits = resources.explanationOfBenefits.length;
      }
      
      // Update the session with migration status
      const updatedSession = {
        ...session,
        migrated: true,
        migrationDate: new Date().toISOString(),
        migrationCounts
      };
      
      // Save migration information to database
      // (This is a placeholder - we'd need to add this field to the database schema)
      
      return migrationCounts;
    } catch (error) {
      console.error('Error migrating provider data to FHIR server:', error);
      throw error;
    }
  }
  
  /**
   * Get a patient's data from the HAPI FHIR server
   * @param patientId The ID of the patient
   * @returns Object containing the patient and their associated resources
   */
  async getPatientData(patientId: string): Promise<{
    patient: Patient | null;
    conditions: Condition[];
    observations: Observation[];
    medications: MedicationRequest[];
    allergies: AllergyIntolerance[];
    immunizations: Immunization[];
    coverages: Coverage[];
    claims: Claim[];
    explanationOfBenefits: ExplanationOfBenefit[];
  }> {
    try {
      const [
        patient,
        conditions,
        observations,
        medications,
        allergies,
        immunizations,
        coverages,
        claims,
        explanationOfBenefits
      ] = await Promise.all([
        hapiFhirClient.getPatient(patientId).catch(() => null),
        hapiFhirClient.getPatientConditions(patientId).catch(() => []),
        hapiFhirClient.getPatientObservations(patientId).catch(() => []),
        hapiFhirClient.getPatientMedications(patientId).catch(() => []),
        hapiFhirClient.getPatientAllergies(patientId).catch(() => []),
        hapiFhirClient.getPatientImmunizations(patientId).catch(() => []),
        hapiFhirClient.getPatientCoverage(patientId).catch(() => []),
        hapiFhirClient.getPatientClaims(patientId).catch(() => []),
        hapiFhirClient.getPatientExplanationOfBenefits(patientId).catch(() => [])
      ]);
      
      return {
        patient,
        conditions,
        observations,
        medications,
        allergies,
        immunizations,
        coverages,
        claims,
        explanationOfBenefits
      };
    } catch (error) {
      console.error(`Error getting patient data for patient ${patientId}:`, error);
      throw error;
    }
  }
}

// Export a default service instance
export const fhirMigrationService = new FhirMigrationService();