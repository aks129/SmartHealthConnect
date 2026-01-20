/**
 * Hooks for external healthcare APIs
 *
 * Provides React Query hooks for:
 * - ClinicalTrials.gov API
 * - OpenFDA Drug API
 * - NPI Provider Registry
 */

import { useQuery, useMutation } from '@tanstack/react-query';

// ============================================
// Types
// ============================================

export interface ClinicalTrial {
  nctId: string;
  title: string;
  briefTitle: string;
  officialTitle: string;
  status: string;
  phase: string;
  studyType: string;
  conditions: string[];
  interventions: { type: string; name: string; description?: string }[];
  sponsor: string;
  collaborators: string[];
  enrollmentCount: number;
  startDate: string;
  completionDate: string;
  eligibility: {
    criteria: string;
    minAge: string;
    maxAge: string;
    sex: string;
    healthyVolunteers: boolean;
  };
  locations: {
    facility: string;
    city: string;
    state: string;
    country: string;
    status: string;
  }[];
  contacts: {
    name: string;
    phone?: string;
    email?: string;
  }[];
  description: string;
  lastUpdated: string;
}

export interface DrugInfo {
  brandName: string;
  genericName: string;
  manufacturer: string;
  activeIngredients: string[];
  dosageForm: string;
  route: string;
  warnings: string[];
  interactions: string[];
  adverseReactions: string[];
  contraindications: string[];
  boxedWarning?: string;
}

export interface DrugInteraction {
  drug1: string;
  drug2: string;
  severity: 'major' | 'moderate' | 'minor';
  description: string;
  mechanism?: string;
  management?: string;
}

export interface Provider {
  npi: string;
  type: 'individual' | 'organization';
  name: {
    first?: string;
    last?: string;
    middle?: string;
    credential?: string;
    organizationName?: string;
  };
  specialties: {
    code: string;
    description: string;
    isPrimary: boolean;
    state?: string;
    licenseNumber?: string;
  }[];
  addresses: {
    type: 'mailing' | 'practice';
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phone?: string;
    fax?: string;
  }[];
  identifiers: {
    type: string;
    identifier: string;
    state?: string;
    issuer?: string;
  }[];
  enumerationDate: string;
  lastUpdated: string;
  status: 'active' | 'deactivated';
}

// ============================================
// Clinical Trials Hooks
// ============================================

interface ClinicalTrialsSearchParams {
  conditions: string[];
  status?: string[];
  phase?: string[];
  pageSize?: number;
  enabled?: boolean;
}

export function useClinicalTrials({
  conditions,
  status = ['RECRUITING'],
  phase,
  pageSize = 20,
  enabled = true,
}: ClinicalTrialsSearchParams) {
  return useQuery({
    queryKey: ['clinical-trials', conditions, status, phase, pageSize],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('conditions', conditions.join(','));
      if (status.length > 0) params.set('status', status.join(','));
      if (phase && phase.length > 0) params.set('phase', phase.join(','));
      params.set('pageSize', pageSize.toString());

      const response = await fetch(`/api/external/clinical-trials?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch clinical trials');
      }
      return response.json() as Promise<{
        trials: ClinicalTrial[];
        totalCount: number;
        nextPageToken?: string;
      }>;
    },
    enabled: enabled && conditions.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes (formerly cacheTime)
  });
}

export function useClinicalTrial(nctId: string, enabled = true) {
  return useQuery({
    queryKey: ['clinical-trial', nctId],
    queryFn: async () => {
      const response = await fetch(`/api/external/clinical-trials/${nctId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch clinical trial');
      }
      return response.json() as Promise<ClinicalTrial>;
    },
    enabled: enabled && !!nctId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

// ============================================
// Drug API Hooks
// ============================================

export function useDrugSearch(drugName: string, enabled = true) {
  return useQuery({
    queryKey: ['drug', drugName],
    queryFn: async () => {
      const response = await fetch(`/api/external/drugs/search?name=${encodeURIComponent(drugName)}`);
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error('Failed to fetch drug information');
      }
      return response.json() as Promise<DrugInfo>;
    },
    enabled: enabled && !!drugName,
    staleTime: 60 * 60 * 1000, // 1 hour (drug data is stable)
  });
}

export function useDrugInteractions() {
  return useMutation({
    mutationFn: async (drugs: string[]) => {
      const response = await fetch('/api/external/drugs/interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ drugs }),
      });
      if (!response.ok) {
        throw new Error('Failed to check drug interactions');
      }
      return response.json() as Promise<{
        drugs: string[];
        interactions: DrugInteraction[];
        interactionCount: number;
        checkedAt: string;
      }>;
    },
  });
}

export function useAdverseEvents(drugName: string, limit = 10, enabled = true) {
  return useQuery({
    queryKey: ['adverse-events', drugName, limit],
    queryFn: async () => {
      const response = await fetch(`/api/external/drugs/${encodeURIComponent(drugName)}/adverse-events?limit=${limit}`);
      if (!response.ok) {
        throw new Error('Failed to fetch adverse events');
      }
      return response.json() as Promise<{
        reactions: { term: string; count: number }[];
        totalReports: number;
      }>;
    },
    enabled: enabled && !!drugName,
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}

// ============================================
// Provider Registry Hooks
// ============================================

interface ProviderSearchParams {
  firstName?: string;
  lastName?: string;
  organizationName?: string;
  specialty?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  limit?: number;
  enabled?: boolean;
}

export function useProviderSearch({
  firstName,
  lastName,
  organizationName,
  specialty,
  city,
  state,
  postalCode,
  limit = 20,
  enabled = true,
}: ProviderSearchParams) {
  const hasParams = firstName || lastName || organizationName || specialty || city || state || postalCode;

  return useQuery({
    queryKey: ['providers', { firstName, lastName, organizationName, specialty, city, state, postalCode, limit }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (firstName) params.set('firstName', firstName);
      if (lastName) params.set('lastName', lastName);
      if (organizationName) params.set('organizationName', organizationName);
      if (specialty) params.set('specialty', specialty);
      if (city) params.set('city', city);
      if (state) params.set('state', state);
      if (postalCode) params.set('postalCode', postalCode);
      params.set('limit', limit.toString());

      const response = await fetch(`/api/external/providers/search?${params}`);
      if (!response.ok) {
        throw new Error('Failed to search providers');
      }
      return response.json() as Promise<{
        providers: Provider[];
        totalCount: number;
      }>;
    },
    enabled: enabled && !!hasParams,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

export function useProvider(npi: string, enabled = true) {
  return useQuery({
    queryKey: ['provider', npi],
    queryFn: async () => {
      const response = await fetch(`/api/external/providers/${npi}`);
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error('Failed to fetch provider');
      }
      return response.json() as Promise<Provider>;
    },
    enabled: enabled && !!npi,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

interface FindSpecialistsParams {
  specialty: string;
  city?: string;
  state?: string;
  postalCode?: string;
  limit?: number;
  enabled?: boolean;
}

export function useFindSpecialists({
  specialty,
  city,
  state,
  postalCode,
  limit = 10,
  enabled = true,
}: FindSpecialistsParams) {
  return useQuery({
    queryKey: ['specialists', { specialty, city, state, postalCode, limit }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('specialty', specialty);
      if (city) params.set('city', city);
      if (state) params.set('state', state);
      if (postalCode) params.set('postalCode', postalCode);
      params.set('limit', limit.toString());

      const response = await fetch(`/api/external/providers/specialists?${params}`);
      if (!response.ok) {
        throw new Error('Failed to find specialists');
      }
      return response.json() as Promise<{
        specialty: string;
        location: { city?: string; state?: string; postalCode?: string };
        providers: Provider[];
        totalCount: number;
      }>;
    },
    enabled: enabled && !!specialty,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

export function useSpecialties() {
  return useQuery({
    queryKey: ['specialties'],
    queryFn: async () => {
      const response = await fetch('/api/external/providers/specialties');
      if (!response.ok) {
        throw new Error('Failed to fetch specialties');
      }
      return response.json() as Promise<{
        specialties: Record<string, string>;
        description: string;
      }>;
    },
    staleTime: Infinity, // Never expires (static data)
  });
}
