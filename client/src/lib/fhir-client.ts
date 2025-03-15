import FHIR from 'fhirclient';
import { v4 as uuidv4 } from 'uuid';
import { apiRequest } from './queryClient';
import { queryClient } from './queryClient';
import { toast } from '@/hooks/use-toast';

// FHIR Resource Types we need to fetch
export type FhirResourceType = 
  | 'Patient'
  | 'Condition'
  | 'Observation' 
  | 'MedicationRequest'
  | 'AllergyIntolerance'
  | 'Immunization';

// Export smart on fhir client for direct use
export const client = FHIR.client;

// Client state
let currentPatientId: string | null = null;
let currentFhirSession: any = null;

/**
 * Initialize SMART on FHIR authentication
 * @returns The authorization URL to redirect to
 */
export async function initializeSmartAuth(fhirServerUrl: string, redirectUri?: string): Promise<string> {
  try {
    // Generate a state parameter to protect against CSRF
    const state = uuidv4();
    
    // Store the state in localStorage to verify when the auth redirects back
    localStorage.setItem('fhir_auth_state', state);
    
    // Store the selected provider to restore after redirect
    if (localStorage.getItem('selected_provider')) {
      localStorage.setItem('last_provider', localStorage.getItem('selected_provider') || '');
    }
    
    // Create the OAuth2 authorization URL
    const authorizationUri = await FHIR.oauth2.authorize({
      clientId: 'health_records_connect',
      scope: 'launch/patient patient/*.read',
      redirectUri: redirectUri || window.location.origin + '/dashboard',
      iss: fhirServerUrl,
      state: state,
    });
    
    // Save the auth URL to session to complete after redirect
    localStorage.setItem('fhir_auth_url', authorizationUri);
    
    // Return the authorization URL
    return authorizationUri;
  } catch (error) {
    console.error('Error initializing SMART auth:', error);
    throw new Error('Failed to initialize SMART authentication');
  }
}

/**
 * Complete the SMART on FHIR authorization after redirect
 */
export async function completeSmartAuth() {
  try {
    // Complete the OAuth2 flow
    const smartClient = await FHIR.oauth2.ready();
    
    // Get state from the redirect and check if it matches what we set
    const urlParams = new URLSearchParams(window.location.search);
    const returnedState = urlParams.get('state');
    const savedState = localStorage.getItem('fhir_auth_state');
    
    if (returnedState !== savedState) {
      throw new Error('OAuth2 state mismatch. Possible security issue.');
    }
    
    // Get the patient ID and FHIR server info
    const patientId = smartClient.patient.id;
    const fhirServer = smartClient.state.serverUrl;
    
    // Store the client information for future requests
    currentPatientId = patientId;
    currentFhirSession = smartClient;
    
    // Get the last provider that was selected before the auth redirect
    const provider = localStorage.getItem('last_provider') || 'unknown';
    
    // Save the FHIR session data to the server
    await apiRequest('POST', '/api/fhir/sessions', {
      provider,
      accessToken: smartClient.state.tokenResponse.access_token,
      refreshToken: smartClient.state.tokenResponse.refresh_token,
      tokenExpiry: new Date(Date.now() + smartClient.state.tokenResponse.expires_in * 1000).toISOString(),
      fhirServer,
      patientId,
      scope: smartClient.state.tokenResponse.scope,
      state: savedState
    });
    
    // Clear auth state from localStorage
    localStorage.removeItem('fhir_auth_state');
    localStorage.removeItem('fhir_auth_url');
    
    // Return the client for immediate use
    return {
      patient: patientId,
      server: fhirServer,
      client: smartClient
    };
  } catch (error) {
    console.error('Error completing SMART auth:', error);
    throw new Error('Failed to complete SMART authentication');
  }
}

/**
 * Check if the user is already authenticated with a FHIR server
 */
export async function checkAuth() {
  try {
    const response = await apiRequest('GET', '/api/fhir/sessions/current', undefined);
    const session = await response.json();
    
    if (session.patientId) {
      currentPatientId = session.patientId;
      return true;
    }
    
    return false;
  } catch (error) {
    return false;
  }
}

/**
 * Get the current FHIR session
 */
export async function getCurrentSession() {
  try {
    const response = await apiRequest('GET', '/api/fhir/sessions/current', undefined);
    return await response.json();
  } catch (error) {
    console.error('Error getting current session:', error);
    throw new Error('Failed to get current FHIR session');
  }
}

/**
 * End the current FHIR session
 */
export async function endSession() {
  try {
    await apiRequest('DELETE', '/api/fhir/sessions/current', undefined);
    
    // Clear client state
    currentPatientId = null;
    currentFhirSession = null;
    
    // Clear tanstack query cache
    queryClient.clear();
    
    return true;
  } catch (error) {
    console.error('Error ending session:', error);
    throw new Error('Failed to end FHIR session');
  }
}

/**
 * Fetch a FHIR resource
 */
export async function fetchResource<T>(resourceType: FhirResourceType, id?: string): Promise<T> {
  try {
    let endpoint = `/api/fhir/${resourceType.toLowerCase()}`;
    if (id) {
      endpoint += `/${id}`;
    }
    
    const response = await apiRequest('GET', endpoint, undefined);
    return await response.json();
  } catch (error) {
    console.error(`Error fetching ${resourceType}:`, error);
    throw new Error(`Failed to fetch ${resourceType}`);
  }
}

/**
 * Fetch FHIR resources by type
 */
export async function fetchResources<T>(resourceType: FhirResourceType): Promise<T[]> {
  try {
    const endpoint = `/api/fhir/${resourceType.toLowerCase()}`;
    const response = await apiRequest('GET', endpoint, undefined);
    return await response.json();
  } catch (error) {
    console.error(`Error fetching ${resourceType} resources:`, error);
    throw new Error(`Failed to fetch ${resourceType} resources`);
  }
}

/**
 * Get formatted name from a FHIR Patient resource
 */
export function getPatientName(patient: any): string {
  if (!patient || !patient.name || !patient.name.length) {
    return 'Unknown Patient';
  }
  
  const nameObj = patient.name[0];
  if (nameObj.text) return nameObj.text;
  
  const given = nameObj.given || [];
  const family = nameObj.family || '';
  
  return [...given, family].filter(Boolean).join(' ');
}

/**
 * Format a FHIR date
 */
export function formatFhirDate(date: string | undefined): string {
  if (!date) return 'Unknown';
  
  try {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (e) {
    return date;
  }
}

/**
 * Format a FHIR datetime
 */
export function formatFhirDateTime(datetime: string | undefined): string {
  if (!datetime) return 'Unknown';
  
  try {
    return new Date(datetime).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch (e) {
    return datetime;
  }
}

/**
 * Get a value from a FHIR Observation
 */
export function getObservationValue(observation: any): string {
  if (!observation) return 'No value';
  
  if (observation.valueQuantity) {
    const value = observation.valueQuantity.value;
    const unit = observation.valueQuantity.unit || '';
    return `${value} ${unit}`.trim();
  }
  
  if (observation.valueString) {
    return observation.valueString;
  }
  
  if (observation.valueCodeableConcept && observation.valueCodeableConcept.text) {
    return observation.valueCodeableConcept.text;
  }
  
  if (observation.valueCodeableConcept && observation.valueCodeableConcept.coding && observation.valueCodeableConcept.coding.length > 0) {
    return observation.valueCodeableConcept.coding[0].display || observation.valueCodeableConcept.coding[0].code || 'Coded value';
  }
  
  return 'No value';
}

/**
 * Get reference range from FHIR Observation
 */
export function getObservationReferenceRange(observation: any): string {
  if (!observation || !observation.referenceRange || !observation.referenceRange.length) {
    return 'N/A';
  }
  
  const range = observation.referenceRange[0];
  
  if (range.text) {
    return range.text;
  }
  
  const low = range.low ? `${range.low.value} ${range.low.unit || ''}`.trim() : null;
  const high = range.high ? `${range.high.value} ${range.high.unit || ''}`.trim() : null;
  
  if (low && high) {
    return `${low} - ${high}`;
  } else if (low) {
    return `> ${low}`;
  } else if (high) {
    return `< ${high}`;
  }
  
  return 'N/A';
}

/**
 * Get display text from a FHIR CodeableConcept
 */
export function getDisplayFromCodeableConcept(codeableConcept: any): string {
  if (!codeableConcept) return 'Unknown';
  
  if (codeableConcept.text) {
    return codeableConcept.text;
  }
  
  if (codeableConcept.coding && codeableConcept.coding.length > 0) {
    return codeableConcept.coding[0].display || codeableConcept.coding[0].code || 'Unknown';
  }
  
  return 'Unknown';
}

/**
 * Determine observation status for display
 */
export function getObservationStatusClass(observation: any): { color: string, label: string } {
  if (!observation) {
    return { color: 'gray', label: 'Unknown' };
  }
  
  // Check if the observation has a reference range
  if (observation.referenceRange && observation.referenceRange.length > 0 && observation.valueQuantity) {
    const range = observation.referenceRange[0];
    const value = observation.valueQuantity.value;
    
    if (range.high && value > range.high.value) {
      return { color: 'yellow', label: 'High' };
    }
    
    if (range.low && value < range.low.value) {
      return { color: 'yellow', label: 'Low' };
    }
  }
  
  // Check interpretation if available
  if (observation.interpretation && observation.interpretation.length > 0) {
    const interpretation = observation.interpretation[0];
    const code = interpretation.coding?.[0]?.code;
    
    if (code === 'H' || code === 'HH') {
      return { color: 'yellow', label: 'High' };
    }
    if (code === 'L' || code === 'LL') {
      return { color: 'yellow', label: 'Low' };
    }
    if (code === 'A') {
      return { color: 'red', label: 'Abnormal' };
    }
    if (code === 'N') {
      return { color: 'green', label: 'Normal' };
    }
  }
  
  return { color: 'green', label: 'Normal' };
}
