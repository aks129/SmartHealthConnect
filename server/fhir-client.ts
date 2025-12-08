/**
 * Client for interacting with our HAPI FHIR server
 */
import axios, { AxiosResponse } from 'axios';
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
  Practitioner,
  Organization,
  Location,
  Appointment,
  PractitionerRole
} from '@shared/schema';

// FHIR server base URL
const FHIR_SERVER_URL = process.env.FHIR_SERVER_URL || 'http://localhost:8000/fhir';

/**
 * Generic FHIR resource types
 */
export type FhirResourceType =
  | 'Patient'
  | 'Condition'
  | 'Observation'
  | 'MedicationRequest'
  | 'AllergyIntolerance'
  | 'Immunization'
  | 'Coverage'
  | 'Claim'
  | 'ExplanationOfBenefit'
  | 'Practitioner'
  | 'Organization'
  | 'Location'
  | 'Appointment'
  | 'PractitionerRole';

/**
 * Client for interacting with our local HAPI FHIR server
 */
export class HapiFhirClient {
  private baseUrl: string;

  constructor(baseUrl: string = FHIR_SERVER_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Create a new resource
   */
  async createResource<T>(resourceType: FhirResourceType, resource: any): Promise<T> {
    try {
      const response = await axios.post(`${this.baseUrl}/${resourceType}`, resource);
      return response.data as T;
    } catch (error) {
      console.error(`Error creating ${resourceType}:`, error);
      throw error;
    }
  }

  /**
   * Get a resource by ID
   */
  async getResource<T>(resourceType: FhirResourceType, id: string): Promise<T> {
    try {
      const response = await axios.get(`${this.baseUrl}/${resourceType}/${id}`);
      return response.data as T;
    } catch (error) {
      console.error(`Error getting ${resourceType}/${id}:`, error);
      throw error;
    }
  }

  /**
   * Search for resources
   */
  async searchResources<T>(resourceType: FhirResourceType, params: Record<string, string>, accessToken?: string): Promise<T[]> {
    try {
      const queryString = new URLSearchParams(params).toString();
      const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};

      const response = await axios.get(`${this.baseUrl}/${resourceType}?${queryString}`, { headers });

      // FHIR search returns a Bundle
      if (response.data && response.data.resourceType === 'Bundle' && response.data.entry) {
        return response.data.entry.map((entry: any) => entry.resource) as T[];
      }

      // Handle array response (if server returns array directly)
      if (Array.isArray(response.data)) {
        return response.data as T[];
      }

      // Handle single resource return wrapped in array
      if (response.data && response.data.resourceType) {
        return [response.data] as T[];
      }

      return [];
    } catch (error) {
      console.warn(`Error searching ${resourceType} with params ${JSON.stringify(params)}:`, error);
      throw error;
    }
  }

  /**
   * Update a resource
   */
  async updateResource<T>(resourceType: FhirResourceType, id: string, resource: any): Promise<T> {
    try {
      const response = await axios.put(`${this.baseUrl}/${resourceType}/${id}`, resource);
      return response.data as T;
    } catch (error) {
      console.error(`Error updating ${resourceType}/${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete a resource
   */
  async deleteResource(resourceType: FhirResourceType, id: string): Promise<boolean> {
    try {
      await axios.delete(`${this.baseUrl}/${resourceType}/${id}`);
      return true;
    } catch (error) {
      console.error(`Error deleting ${resourceType}/${id}:`, error);
      throw error;
    }
  }

  /**
   * Get a patient by ID
   */
  async getPatient(id: string): Promise<Patient> {
    return this.getResource<Patient>('Patient', id);
  }

  /**
   * Get all patients
   */
  async getAllPatients(): Promise<Patient[]> {
    return this.searchResources<Patient>('Patient', {});
  }

  /**
   * Get conditions for a patient
   */
  async getPatientConditions(patientId: string): Promise<Condition[]> {
    return this.searchResources<Condition>('Condition', { patient: patientId });
  }

  /**
   * Get observations for a patient
   */
  async getPatientObservations(patientId: string): Promise<Observation[]> {
    return this.searchResources<Observation>('Observation', { patient: patientId });
  }

  /**
   * Get medication requests for a patient
   */
  async getPatientMedications(patientId: string): Promise<MedicationRequest[]> {
    return this.searchResources<MedicationRequest>('MedicationRequest', { patient: patientId });
  }

  /**
   * Get allergies for a patient
   */
  async getPatientAllergies(patientId: string): Promise<AllergyIntolerance[]> {
    return this.searchResources<AllergyIntolerance>('AllergyIntolerance', { patient: patientId });
  }

  /**
   * Get immunizations for a patient
   */
  async getPatientImmunizations(patientId: string): Promise<Immunization[]> {
    return this.searchResources<Immunization>('Immunization', { patient: patientId });
  }

  /**
   * Get coverage for a patient
   */
  async getPatientCoverage(patientId: string): Promise<Coverage[]> {
    return this.searchResources<Coverage>('Coverage', { beneficiary: patientId });
  }

  /**
   * Get claims for a patient
   */
  async getPatientClaims(patientId: string): Promise<Claim[]> {
    return this.searchResources<Claim>('Claim', { patient: patientId });
  }

  /**
   * Get explanations of benefit for a patient
   */
  async getPatientExplanationOfBenefits(patientId: string): Promise<ExplanationOfBenefit[]> {
    return this.searchResources<ExplanationOfBenefit>('ExplanationOfBenefit', { patient: patientId });
  }

  /**
   * Get practitioners
   */
  async getPractitioners(): Promise<Practitioner[]> {
    return this.searchResources<Practitioner>('Practitioner', {});
  }

  /**
   * Get a practitioner by ID
   */
  async getPractitioner(id: string): Promise<Practitioner> {
    return this.getResource<Practitioner>('Practitioner', id);
  }

  /**
   * Get organizations
   */
  async getOrganizations(): Promise<Organization[]> {
    return this.searchResources<Organization>('Organization', {});
  }

  /**
   * Get an organization by ID
   */
  async getOrganization(id: string): Promise<Organization> {
    return this.getResource<Organization>('Organization', id);
  }

  /**
   * Get locations
   */
  async getLocations(): Promise<Location[]> {
    return this.searchResources<Location>('Location', {});
  }

  /**
   * Get a location by ID
   */
  async getLocation(id: string): Promise<Location> {
    return this.getResource<Location>('Location', id);
  }

  /**
   * Get appointments for a patient
   */
  async getPatientAppointments(patientId: string): Promise<Appointment[]> {
    return this.searchResources<Appointment>('Appointment', { patient: patientId });
  }

  /**
   * Get practitioner roles
   */
  async getPractitionerRoles(practitionerId?: string): Promise<PractitionerRole[]> {
    if (practitionerId) {
      return this.searchResources<PractitionerRole>('PractitionerRole', { practitioner: practitionerId });
    }
    return this.searchResources<PractitionerRole>('PractitionerRole', {});
  }

  /**
   * Search for practitioners by name, specialty, or location
   */
  async searchPractitioners(query: string): Promise<Practitioner[]> {
    return this.searchResources<Practitioner>('Practitioner', { name: query });
  }

  /**
   * Search for organizations by name or type
   */
  async searchOrganizations(query: string): Promise<Organization[]> {
    return this.searchResources<Organization>('Organization', { name: query });
  }

  /**
   * Search for locations by name, address, or type
   */
  async searchLocations(query: string): Promise<Location[]> {
    return this.searchResources<Location>('Location', { name: query });
  }
}

// Export a default client instance
export const hapiFhirClient = new HapiFhirClient();