/**
 * OpenFDA Drug API Integration
 *
 * Provides real-time access to FDA drug data including:
 * - Drug label information
 * - Drug interactions
 * - Adverse events
 *
 * API Documentation: https://open.fda.gov/apis/drug/
 */

import axios from 'axios';

const OPENFDA_BASE = 'https://api.fda.gov/drug';

// Cache with TTL
const cache = new Map<string, { data: unknown; expiresAt: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour (drug data changes infrequently)

interface DrugInfo {
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

interface DrugInteraction {
  drug1: string;
  drug2: string;
  severity: 'major' | 'moderate' | 'minor';
  description: string;
  mechanism?: string;
  management?: string;
}

interface OpenFDALabelResponse {
  results: {
    openfda?: {
      brand_name?: string[];
      generic_name?: string[];
      manufacturer_name?: string[];
      substance_name?: string[];
      route?: string[];
      dosage_form?: string[];
    };
    warnings?: string[];
    drug_interactions?: string[];
    adverse_reactions?: string[];
    contraindications?: string[];
    boxed_warning?: string[];
    warnings_and_cautions?: string[];
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
 * Search for drug information by name
 */
export async function searchDrug(drugName: string): Promise<DrugInfo | null> {
  const cacheKey = `drug:${drugName.toLowerCase()}`;
  const cached = getFromCache<DrugInfo>(cacheKey);

  if (cached) {
    return cached;
  }

  try {
    const response = await axios.get<OpenFDALabelResponse>(`${OPENFDA_BASE}/label.json`, {
      params: {
        search: `openfda.brand_name:"${drugName}" OR openfda.generic_name:"${drugName}"`,
        limit: 1,
      },
      timeout: 10000,
    });

    if (!response.data.results || response.data.results.length === 0) {
      return null;
    }

    const result = response.data.results[0];
    const openfda = result.openfda || {};

    const drugInfo: DrugInfo = {
      brandName: openfda.brand_name?.[0] || drugName,
      genericName: openfda.generic_name?.[0] || '',
      manufacturer: openfda.manufacturer_name?.[0] || 'Unknown',
      activeIngredients: openfda.substance_name || [],
      dosageForm: openfda.dosage_form?.[0] || 'Unknown',
      route: openfda.route?.[0] || 'Unknown',
      warnings: result.warnings || result.warnings_and_cautions || [],
      interactions: result.drug_interactions || [],
      adverseReactions: result.adverse_reactions || [],
      contraindications: result.contraindications || [],
      boxedWarning: result.boxed_warning?.[0],
    };

    setCache(cacheKey, drugInfo);
    return drugInfo;
  } catch (error) {
    console.error(`[OpenFDA] Error searching for drug ${drugName}:`, error);
    return null;
  }
}

/**
 * Check for interactions between multiple drugs
 * Note: OpenFDA doesn't have a direct interaction API, so we extract from labels
 */
export async function checkDrugInteractions(drugNames: string[]): Promise<DrugInteraction[]> {
  const interactions: DrugInteraction[] = [];

  // Get drug info for all drugs
  const drugInfos = await Promise.all(
    drugNames.map(name => searchDrug(name))
  );

  // Check each drug's interaction warnings against other drugs
  for (let i = 0; i < drugNames.length; i++) {
    const drug1Info = drugInfos[i];
    if (!drug1Info) continue;

    const interactionText = drug1Info.interactions.join(' ').toLowerCase();
    const warningText = drug1Info.warnings.join(' ').toLowerCase();

    for (let j = i + 1; j < drugNames.length; j++) {
      const drug2Name = drugNames[j].toLowerCase();
      const drug2Info = drugInfos[j];

      // Check if drug2 is mentioned in drug1's interactions
      if (interactionText.includes(drug2Name) || (drug2Info?.genericName && interactionText.includes(drug2Info.genericName.toLowerCase()))) {
        interactions.push({
          drug1: drug1Info.brandName,
          drug2: drugNames[j],
          severity: determineSeverity(interactionText, drug2Name),
          description: extractInteractionDescription(drug1Info.interactions, drug2Name),
          mechanism: extractMechanism(drug1Info.interactions, drug2Name),
          management: extractManagement(drug1Info.interactions, drug2Name),
        });
      }

      // Check boxed warnings (usually major interactions)
      if (drug1Info.boxedWarning && drug1Info.boxedWarning.toLowerCase().includes(drug2Name)) {
        if (!interactions.find(i => i.drug1 === drug1Info.brandName && i.drug2 === drugNames[j])) {
          interactions.push({
            drug1: drug1Info.brandName,
            drug2: drugNames[j],
            severity: 'major',
            description: `Boxed warning interaction: ${drug1Info.boxedWarning.substring(0, 200)}...`,
          });
        }
      }
    }
  }

  return interactions;
}

/**
 * Determine interaction severity from text
 */
function determineSeverity(text: string, drugName: string): 'major' | 'moderate' | 'minor' {
  const lowerText = text.toLowerCase();

  // Look for severity indicators near the drug name
  const drugIndex = lowerText.indexOf(drugName);
  if (drugIndex === -1) return 'moderate';

  const contextStart = Math.max(0, drugIndex - 100);
  const contextEnd = Math.min(lowerText.length, drugIndex + 100);
  const context = lowerText.substring(contextStart, contextEnd);

  if (context.includes('contraindicated') ||
      context.includes('do not use') ||
      context.includes('avoid') ||
      context.includes('serious') ||
      context.includes('fatal') ||
      context.includes('life-threatening')) {
    return 'major';
  }

  if (context.includes('caution') ||
      context.includes('monitor') ||
      context.includes('may increase') ||
      context.includes('may decrease')) {
    return 'moderate';
  }

  return 'minor';
}

/**
 * Extract interaction description from text
 */
function extractInteractionDescription(interactions: string[], drugName: string): string {
  for (const interaction of interactions) {
    if (interaction.toLowerCase().includes(drugName.toLowerCase())) {
      // Return first 300 characters of relevant section
      const sentences = interaction.split(/[.!?]+/);
      for (const sentence of sentences) {
        if (sentence.toLowerCase().includes(drugName.toLowerCase())) {
          return sentence.trim().substring(0, 300);
        }
      }
    }
  }
  return `Potential interaction with ${drugName} - consult healthcare provider`;
}

/**
 * Extract mechanism if mentioned
 */
function extractMechanism(interactions: string[], drugName: string): string | undefined {
  for (const interaction of interactions) {
    const lower = interaction.toLowerCase();
    if (lower.includes(drugName.toLowerCase()) &&
        (lower.includes('mechanism') || lower.includes('cyp') || lower.includes('enzyme'))) {
      const sentences = interaction.split(/[.!?]+/);
      for (const sentence of sentences) {
        if (sentence.toLowerCase().includes('cyp') || sentence.toLowerCase().includes('mechanism')) {
          return sentence.trim().substring(0, 200);
        }
      }
    }
  }
  return undefined;
}

/**
 * Extract management recommendation if mentioned
 */
function extractManagement(interactions: string[], drugName: string): string | undefined {
  for (const interaction of interactions) {
    const lower = interaction.toLowerCase();
    if (lower.includes(drugName.toLowerCase()) &&
        (lower.includes('monitor') || lower.includes('adjust') || lower.includes('avoid'))) {
      const sentences = interaction.split(/[.!?]+/);
      for (const sentence of sentences) {
        const sentenceLower = sentence.toLowerCase();
        if (sentenceLower.includes('monitor') || sentenceLower.includes('adjust') || sentenceLower.includes('recommend')) {
          return sentence.trim().substring(0, 200);
        }
      }
    }
  }
  return undefined;
}

/**
 * Get adverse event reports for a drug
 */
export async function getAdverseEvents(drugName: string, limit: number = 10): Promise<{
  reactions: { term: string; count: number }[];
  totalReports: number;
}> {
  const cacheKey = `adverse:${drugName.toLowerCase()}:${limit}`;
  const cached = getFromCache<{ reactions: { term: string; count: number }[]; totalReports: number }>(cacheKey);

  if (cached) {
    return cached;
  }

  try {
    const response = await axios.get(`${OPENFDA_BASE}/event.json`, {
      params: {
        search: `patient.drug.medicinalproduct:"${drugName}"`,
        count: 'patient.reaction.reactionmeddrapt.exact',
        limit: limit,
      },
      timeout: 10000,
    });

    const result = {
      reactions: response.data.results?.map((r: { term: string; count: number }) => ({
        term: r.term,
        count: r.count,
      })) || [],
      totalReports: response.data.meta?.results?.total || 0,
    };

    setCache(cacheKey, result);
    return result;
  } catch (error) {
    console.error(`[OpenFDA] Error getting adverse events for ${drugName}:`, error);
    return { reactions: [], totalReports: 0 };
  }
}

/**
 * Clear the cache (useful for testing)
 */
export function clearCache(): void {
  cache.clear();
}
