/**
 * NPI (National Provider Identifier) Registry Integration
 *
 * Provides access to the NPPES NPI Registry for:
 * - Provider search by name, specialty, location
 * - Provider verification
 * - Finding specialists near patient
 *
 * API Documentation: https://npiregistry.cms.hhs.gov/api-page
 */

import axios from 'axios';

const NPI_REGISTRY_BASE = 'https://npiregistry.cms.hhs.gov/api';

// Cache with shorter TTL since this is reference data
const cache = new Map<string, { data: unknown; expiresAt: number }>();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

interface Provider {
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

interface NPISearchParams {
  firstName?: string;
  lastName?: string;
  organizationName?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  taxonomyDescription?: string; // Specialty
  limit?: number;
}

interface NPIAPIResponse {
  result_count: number;
  results: NPIAPIResult[];
}

interface NPIAPIResult {
  number: string;
  enumeration_type: string;
  basic: {
    first_name?: string;
    last_name?: string;
    middle_name?: string;
    credential?: string;
    organization_name?: string;
    enumeration_date?: string;
    last_updated?: string;
    status?: string;
  };
  taxonomies?: {
    code: string;
    desc: string;
    primary: boolean;
    state?: string;
    license?: string;
  }[];
  addresses?: {
    address_purpose: string;
    address_1: string;
    address_2?: string;
    city: string;
    state: string;
    postal_code: string;
    country_code: string;
    telephone_number?: string;
    fax_number?: string;
  }[];
  identifiers?: {
    identifier: string;
    code: string;
    desc: string;
    state?: string;
    issuer?: string;
  }[];
}

/**
 * Get cached data if valid
 */
function getFromCache<T>(key: string): T | null {
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data as T;
  }
  cache.delete(key);
  return null;
}

/**
 * Store data in cache
 */
function setCache(key: string, data: unknown): void {
  cache.set(key, {
    data,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

/**
 * Transform NPI API result to our Provider format
 */
function transformProvider(result: NPIAPIResult): Provider {
  const basic = result.basic || {};

  return {
    npi: result.number,
    type: result.enumeration_type === 'NPI-1' ? 'individual' : 'organization',
    name: {
      first: basic.first_name,
      last: basic.last_name,
      middle: basic.middle_name,
      credential: basic.credential,
      organizationName: basic.organization_name,
    },
    specialties: (result.taxonomies || []).map(t => ({
      code: t.code,
      description: t.desc,
      isPrimary: t.primary,
      state: t.state,
      licenseNumber: t.license,
    })),
    addresses: (result.addresses || []).map(a => ({
      type: a.address_purpose === 'MAILING' ? 'mailing' : 'practice',
      line1: a.address_1,
      line2: a.address_2,
      city: a.city,
      state: a.state,
      postalCode: a.postal_code,
      country: a.country_code,
      phone: a.telephone_number,
      fax: a.fax_number,
    })),
    identifiers: (result.identifiers || []).map(i => ({
      type: i.desc,
      identifier: i.identifier,
      state: i.state,
      issuer: i.issuer,
    })),
    enumerationDate: basic.enumeration_date || '',
    lastUpdated: basic.last_updated || '',
    status: basic.status === 'A' ? 'active' : 'deactivated',
  };
}

/**
 * Search for providers in the NPI Registry
 */
export async function searchProviders(params: NPISearchParams): Promise<{
  providers: Provider[];
  totalCount: number;
}> {
  const cacheKey = JSON.stringify(params);
  const cached = getFromCache<{ providers: Provider[]; totalCount: number }>(cacheKey);

  if (cached) {
    console.log('[NPI] Returning cached results');
    return cached;
  }

  try {
    const queryParams: Record<string, string | number> = {
      version: '2.1',
      limit: params.limit || 20,
    };

    if (params.firstName) queryParams.first_name = params.firstName;
    if (params.lastName) queryParams.last_name = params.lastName;
    if (params.organizationName) queryParams.organization_name = params.organizationName;
    if (params.city) queryParams.city = params.city;
    if (params.state) queryParams.state = params.state;
    if (params.postalCode) queryParams.postal_code = params.postalCode;
    if (params.taxonomyDescription) queryParams.taxonomy_description = params.taxonomyDescription;

    const response = await axios.get<NPIAPIResponse>(`${NPI_REGISTRY_BASE}/`, {
      params: queryParams,
      timeout: 10000,
    });

    const providers = (response.data.results || []).map(transformProvider);
    const result = {
      providers,
      totalCount: response.data.result_count || providers.length,
    };

    setCache(cacheKey, result);
    console.log(`[NPI] Found ${providers.length} providers`);

    return result;
  } catch (error) {
    console.error('[NPI] API Error:', error);
    return { providers: [], totalCount: 0 };
  }
}

/**
 * Look up a specific provider by NPI number
 */
export async function getProviderByNPI(npi: string): Promise<Provider | null> {
  const cacheKey = `npi:${npi}`;
  const cached = getFromCache<Provider>(cacheKey);

  if (cached) {
    return cached;
  }

  try {
    const response = await axios.get<NPIAPIResponse>(`${NPI_REGISTRY_BASE}/`, {
      params: {
        version: '2.1',
        number: npi,
      },
      timeout: 10000,
    });

    if (response.data.results && response.data.results.length > 0) {
      const provider = transformProvider(response.data.results[0]);
      setCache(cacheKey, provider);
      return provider;
    }

    return null;
  } catch (error) {
    console.error(`[NPI] Error looking up NPI ${npi}:`, error);
    return null;
  }
}

/**
 * Find specialists by specialty and location
 */
export async function findSpecialists(
  specialty: string,
  location: { city?: string; state?: string; postalCode?: string },
  limit: number = 10
): Promise<Provider[]> {
  const result = await searchProviders({
    taxonomyDescription: specialty,
    city: location.city,
    state: location.state,
    postalCode: location.postalCode,
    limit,
  });

  // Filter to only active providers with practice addresses
  return result.providers.filter(p =>
    p.status === 'active' &&
    p.addresses.some(a => a.type === 'practice')
  );
}

/**
 * Common specialty mappings for search
 */
export const SPECIALTY_MAP: Record<string, string> = {
  'primary care': 'Family Medicine',
  'pcp': 'Family Medicine',
  'family doctor': 'Family Medicine',
  'internist': 'Internal Medicine',
  'cardiologist': 'Cardiovascular Disease',
  'heart doctor': 'Cardiovascular Disease',
  'dermatologist': 'Dermatology',
  'skin doctor': 'Dermatology',
  'endocrinologist': 'Endocrinology, Diabetes & Metabolism',
  'diabetes doctor': 'Endocrinology, Diabetes & Metabolism',
  'gastroenterologist': 'Gastroenterology',
  'gi doctor': 'Gastroenterology',
  'neurologist': 'Neurology',
  'ophthalmologist': 'Ophthalmology',
  'eye doctor': 'Ophthalmology',
  'orthopedist': 'Orthopaedic Surgery',
  'bone doctor': 'Orthopaedic Surgery',
  'pediatrician': 'Pediatrics',
  'children doctor': 'Pediatrics',
  'psychiatrist': 'Psychiatry & Neurology',
  'mental health': 'Psychiatry & Neurology',
  'pulmonologist': 'Pulmonary Disease',
  'lung doctor': 'Pulmonary Disease',
  'rheumatologist': 'Rheumatology',
  'urologist': 'Urology',
  'oncologist': 'Hematology & Oncology',
  'cancer doctor': 'Hematology & Oncology',
  'nephrologist': 'Nephrology',
  'kidney doctor': 'Nephrology',
};

/**
 * Normalize specialty search term
 */
export function normalizeSpecialty(input: string): string {
  const lower = input.toLowerCase();
  return SPECIALTY_MAP[lower] || input;
}

/**
 * Clear the cache (useful for testing)
 */
export function clearCache(): void {
  cache.clear();
}
