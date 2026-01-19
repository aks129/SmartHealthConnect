/**
 * ClinicalTrials.gov API Integration
 *
 * Provides real-time access to the NIH clinical trials database.
 * API Documentation: https://clinicaltrials.gov/api/v2/
 *
 * Features:
 * - Search trials by condition, location, and status
 * - Cache results to reduce API load
 * - Transform API responses to our internal format
 */

import axios from 'axios';

const CLINICALTRIALS_API_BASE = 'https://clinicaltrials.gov/api/v2';

// Simple in-memory cache with TTL
const cache = new Map<string, { data: unknown; expiresAt: number }>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

interface ClinicalTrialsSearchParams {
  conditions: string[];
  location?: {
    latitude?: number;
    longitude?: number;
    distance?: string; // e.g., "50mi"
  };
  status?: ('RECRUITING' | 'ACTIVE_NOT_RECRUITING' | 'ENROLLING_BY_INVITATION')[];
  phase?: string[];
  pageSize?: number;
  pageToken?: string;
}

interface ClinicalTrialResult {
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

interface APIResponse {
  studies: APIStudy[];
  nextPageToken?: string;
  totalCount: number;
}

interface APIStudy {
  protocolSection: {
    identificationModule: {
      nctId: string;
      briefTitle: string;
      officialTitle?: string;
    };
    statusModule: {
      overallStatus: string;
      startDateStruct?: { date: string };
      completionDateStruct?: { date: string };
      lastUpdateSubmitDate?: string;
    };
    descriptionModule?: {
      briefSummary?: string;
      detailedDescription?: string;
    };
    conditionsModule?: {
      conditions?: string[];
    };
    designModule?: {
      phases?: string[];
      studyType?: string;
      enrollmentInfo?: {
        count?: number;
      };
    };
    armsInterventionsModule?: {
      interventions?: {
        type: string;
        name: string;
        description?: string;
      }[];
    };
    eligibilityModule?: {
      eligibilityCriteria?: string;
      minimumAge?: string;
      maximumAge?: string;
      sex?: string;
      healthyVolunteers?: boolean;
    };
    contactsLocationsModule?: {
      locations?: {
        facility?: string;
        city?: string;
        state?: string;
        country?: string;
        status?: string;
      }[];
      centralContacts?: {
        name?: string;
        phone?: string;
        email?: string;
      }[];
    };
    sponsorCollaboratorsModule?: {
      leadSponsor?: {
        name?: string;
      };
      collaborators?: {
        name?: string;
      }[];
    };
  };
}

/**
 * Generate cache key from search params
 */
function getCacheKey(params: ClinicalTrialsSearchParams): string {
  return JSON.stringify(params);
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
 * Build search query for ClinicalTrials.gov API
 */
function buildSearchQuery(params: ClinicalTrialsSearchParams): string {
  const queryParts: string[] = [];

  // Add condition search terms
  if (params.conditions.length > 0) {
    const conditionQuery = params.conditions
      .map(c => `AREA[Condition]${c}`)
      .join(' OR ');
    queryParts.push(`(${conditionQuery})`);
  }

  // Add status filter
  if (params.status && params.status.length > 0) {
    const statusQuery = params.status
      .map(s => `AREA[OverallStatus]${s}`)
      .join(' OR ');
    queryParts.push(`(${statusQuery})`);
  }

  return queryParts.join(' AND ');
}

/**
 * Transform API response to our internal format
 */
function transformStudy(study: APIStudy): ClinicalTrialResult {
  const protocol = study.protocolSection;
  const identification = protocol.identificationModule;
  const status = protocol.statusModule;
  const description = protocol.descriptionModule;
  const conditions = protocol.conditionsModule;
  const design = protocol.designModule;
  const interventions = protocol.armsInterventionsModule;
  const eligibility = protocol.eligibilityModule;
  const contacts = protocol.contactsLocationsModule;
  const sponsor = protocol.sponsorCollaboratorsModule;

  return {
    nctId: identification.nctId,
    title: identification.officialTitle || identification.briefTitle,
    briefTitle: identification.briefTitle,
    officialTitle: identification.officialTitle || identification.briefTitle,
    status: status.overallStatus,
    phase: design?.phases?.join(', ') || 'Not Applicable',
    studyType: design?.studyType || 'Unknown',
    conditions: conditions?.conditions || [],
    interventions: interventions?.interventions?.map(i => ({
      type: i.type,
      name: i.name,
      description: i.description,
    })) || [],
    sponsor: sponsor?.leadSponsor?.name || 'Unknown',
    collaborators: sponsor?.collaborators?.map(c => c.name || '') || [],
    enrollmentCount: design?.enrollmentInfo?.count || 0,
    startDate: status.startDateStruct?.date || '',
    completionDate: status.completionDateStruct?.date || '',
    eligibility: {
      criteria: eligibility?.eligibilityCriteria || '',
      minAge: eligibility?.minimumAge || 'N/A',
      maxAge: eligibility?.maximumAge || 'N/A',
      sex: eligibility?.sex || 'All',
      healthyVolunteers: eligibility?.healthyVolunteers || false,
    },
    locations: contacts?.locations?.map(l => ({
      facility: l.facility || '',
      city: l.city || '',
      state: l.state || '',
      country: l.country || '',
      status: l.status || '',
    })) || [],
    contacts: contacts?.centralContacts?.map(c => ({
      name: c.name || '',
      phone: c.phone,
      email: c.email,
    })) || [],
    description: description?.briefSummary || description?.detailedDescription || '',
    lastUpdated: status.lastUpdateSubmitDate || '',
  };
}

/**
 * Search clinical trials from ClinicalTrials.gov
 */
export async function searchClinicalTrials(
  params: ClinicalTrialsSearchParams
): Promise<{ trials: ClinicalTrialResult[]; totalCount: number; nextPageToken?: string }> {
  const cacheKey = getCacheKey(params);
  const cached = getFromCache<{ trials: ClinicalTrialResult[]; totalCount: number; nextPageToken?: string }>(cacheKey);

  if (cached) {
    console.log('[ClinicalTrials] Returning cached results');
    return cached;
  }

  try {
    const query = buildSearchQuery(params);
    const pageSize = params.pageSize || 20;

    const response = await axios.get<APIResponse>(`${CLINICALTRIALS_API_BASE}/studies`, {
      params: {
        'query.cond': params.conditions.join(' OR '),
        'filter.overallStatus': params.status?.join(',') || 'RECRUITING',
        'pageSize': pageSize,
        'pageToken': params.pageToken,
        'fields': [
          'NCTId',
          'BriefTitle',
          'OfficialTitle',
          'OverallStatus',
          'Phase',
          'StudyType',
          'Condition',
          'InterventionName',
          'InterventionType',
          'InterventionDescription',
          'LeadSponsorName',
          'CollaboratorName',
          'EnrollmentCount',
          'StartDate',
          'CompletionDate',
          'EligibilityCriteria',
          'MinimumAge',
          'MaximumAge',
          'Sex',
          'HealthyVolunteers',
          'LocationFacility',
          'LocationCity',
          'LocationState',
          'LocationCountry',
          'LocationStatus',
          'CentralContactName',
          'CentralContactPhone',
          'CentralContactEmail',
          'BriefSummary',
          'DetailedDescription',
          'LastUpdateSubmitDate',
        ].join(','),
      },
      timeout: 10000,
    });

    const trials = response.data.studies?.map(transformStudy) || [];
    const result = {
      trials,
      totalCount: response.data.totalCount || trials.length,
      nextPageToken: response.data.nextPageToken,
    };

    setCache(cacheKey, result);
    console.log(`[ClinicalTrials] Found ${trials.length} trials for conditions: ${params.conditions.join(', ')}`);

    return result;
  } catch (error) {
    console.error('[ClinicalTrials] API Error:', error);

    // Return empty results on error rather than crashing
    return {
      trials: [],
      totalCount: 0,
    };
  }
}

/**
 * Get a specific trial by NCT ID
 */
export async function getTrialByNctId(nctId: string): Promise<ClinicalTrialResult | null> {
  const cacheKey = `trial:${nctId}`;
  const cached = getFromCache<ClinicalTrialResult>(cacheKey);

  if (cached) {
    return cached;
  }

  try {
    const response = await axios.get<APIStudy>(`${CLINICALTRIALS_API_BASE}/studies/${nctId}`, {
      timeout: 10000,
    });

    const trial = transformStudy(response.data);
    setCache(cacheKey, trial);
    return trial;
  } catch (error) {
    console.error(`[ClinicalTrials] Error fetching trial ${nctId}:`, error);
    return null;
  }
}

/**
 * Map condition names to searchable terms
 */
export function mapConditionToSearchTerms(conditionDisplay: string): string[] {
  const conditionMap: Record<string, string[]> = {
    'diabetes': ['type 2 diabetes', 'diabetes mellitus', 'diabetes'],
    'hypertension': ['hypertension', 'high blood pressure', 'hypertensive'],
    'asthma': ['asthma', 'bronchial asthma'],
    'copd': ['chronic obstructive pulmonary disease', 'copd'],
    'heart failure': ['heart failure', 'congestive heart failure', 'cardiac failure'],
    'chronic kidney disease': ['chronic kidney disease', 'ckd', 'renal insufficiency'],
    'depression': ['depression', 'major depressive disorder', 'depressive disorder'],
    'anxiety': ['anxiety', 'anxiety disorder', 'generalized anxiety'],
    'obesity': ['obesity', 'overweight'],
    'cancer': ['cancer', 'neoplasm', 'malignancy'],
  };

  const lowerCondition = conditionDisplay.toLowerCase();

  for (const [key, terms] of Object.entries(conditionMap)) {
    if (lowerCondition.includes(key)) {
      return terms;
    }
  }

  // Return the original condition if no mapping found
  return [conditionDisplay];
}

/**
 * Clear the cache (useful for testing)
 */
export function clearCache(): void {
  cache.clear();
}
