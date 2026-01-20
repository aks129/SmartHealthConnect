/**
 * bioRxiv/medRxiv Research API Integration
 *
 * Provides access to preprint research papers from:
 * - bioRxiv (biology preprints)
 * - medRxiv (medical preprints)
 *
 * API Documentation: https://api.biorxiv.org/
 */

import axios from 'axios';

const BIORXIV_API_BASE = 'https://api.biorxiv.org';

// Cache with TTL
const cache = new Map<string, { data: unknown; expiresAt: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour (preprints don't change frequently)

export interface PreprintArticle {
  doi: string;
  title: string;
  authors: string;
  authorList: string[];
  abstract: string;
  category: string;
  date: string;
  server: 'biorxiv' | 'medrxiv';
  version: string;
  type: string;
  license: string;
  published: string;
  url: string;
}

interface BioRxivAPIResponse {
  messages: { status: string; count: number }[];
  collection: {
    doi: string;
    title: string;
    authors: string;
    author_corresponding: string;
    author_corresponding_institution: string;
    date: string;
    version: string;
    type: string;
    license: string;
    category: string;
    jatsxml: string;
    abstract: string;
    published: string;
    server: string;
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
 * Transform API response to our format
 */
function transformArticle(article: BioRxivAPIResponse['collection'][0]): PreprintArticle {
  return {
    doi: article.doi,
    title: article.title,
    authors: article.authors,
    authorList: article.authors.split(';').map(a => a.trim()).filter(Boolean),
    abstract: article.abstract,
    category: article.category,
    date: article.date,
    server: article.server as 'biorxiv' | 'medrxiv',
    version: article.version,
    type: article.type,
    license: article.license,
    published: article.published,
    url: `https://doi.org/${article.doi}`,
  };
}

/**
 * Search for recent preprints by subject/category
 */
export async function searchPreprints(params: {
  server?: 'biorxiv' | 'medrxiv';
  interval?: string; // e.g., '2024-01-01/2024-01-15'
  cursor?: number;
  pageSize?: number;
}): Promise<{ articles: PreprintArticle[]; totalCount: number }> {
  const { server = 'medrxiv', interval, cursor = 0, pageSize = 30 } = params;

  // Default to last 30 days if no interval
  const defaultInterval = (() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    return `${start.toISOString().split('T')[0]}/${end.toISOString().split('T')[0]}`;
  })();

  const searchInterval = interval || defaultInterval;
  const cacheKey = `preprints:${server}:${searchInterval}:${cursor}`;
  const cached = getFromCache<{ articles: PreprintArticle[]; totalCount: number }>(cacheKey);

  if (cached) {
    console.log('[bioRxiv] Returning cached results');
    return cached;
  }

  try {
    // API format: /details/[server]/[interval]/[cursor]/[format]
    const response = await axios.get<BioRxivAPIResponse>(
      `${BIORXIV_API_BASE}/details/${server}/${searchInterval}/${cursor}/json`,
      { timeout: 15000 }
    );

    const articles = response.data.collection?.map(transformArticle) || [];
    const totalCount = response.data.messages?.[0]?.count || articles.length;

    const result = { articles: articles.slice(0, pageSize), totalCount };
    setCache(cacheKey, result);

    console.log(`[bioRxiv] Found ${articles.length} preprints from ${server}`);
    return result;
  } catch (error) {
    console.error('[bioRxiv] API Error:', error);
    return { articles: [], totalCount: 0 };
  }
}

/**
 * Search preprints by keyword in title/abstract
 * Note: bioRxiv API doesn't have native search, so we fetch recent and filter
 */
export async function searchPreprintsByKeyword(params: {
  keywords: string[];
  server?: 'biorxiv' | 'medrxiv';
  limit?: number;
}): Promise<PreprintArticle[]> {
  const { keywords, server = 'medrxiv', limit = 20 } = params;

  const cacheKey = `preprints:search:${server}:${keywords.join(',')}`;
  const cached = getFromCache<PreprintArticle[]>(cacheKey);

  if (cached) {
    return cached;
  }

  try {
    // Fetch recent preprints
    const { articles } = await searchPreprints({ server, pageSize: 100 });

    // Filter by keywords (case-insensitive search in title and abstract)
    const lowerKeywords = keywords.map(k => k.toLowerCase());
    const filtered = articles.filter(article => {
      const searchText = `${article.title} ${article.abstract}`.toLowerCase();
      return lowerKeywords.some(keyword => searchText.includes(keyword));
    }).slice(0, limit);

    setCache(cacheKey, filtered);
    return filtered;
  } catch (error) {
    console.error('[bioRxiv] Search error:', error);
    return [];
  }
}

/**
 * Get preprint details by DOI
 */
export async function getPreprintByDOI(doi: string): Promise<PreprintArticle | null> {
  const cacheKey = `preprint:doi:${doi}`;
  const cached = getFromCache<PreprintArticle>(cacheKey);

  if (cached) {
    return cached;
  }

  try {
    // DOI format: 10.1101/2024.01.01.12345
    const response = await axios.get<BioRxivAPIResponse>(
      `${BIORXIV_API_BASE}/details/biorxiv/${doi}/na/json`,
      { timeout: 10000 }
    );

    if (response.data.collection && response.data.collection.length > 0) {
      const article = transformArticle(response.data.collection[0]);
      setCache(cacheKey, article);
      return article;
    }

    // Try medRxiv if not found in bioRxiv
    const medrxivResponse = await axios.get<BioRxivAPIResponse>(
      `${BIORXIV_API_BASE}/details/medrxiv/${doi}/na/json`,
      { timeout: 10000 }
    );

    if (medrxivResponse.data.collection && medrxivResponse.data.collection.length > 0) {
      const article = transformArticle(medrxivResponse.data.collection[0]);
      setCache(cacheKey, article);
      return article;
    }

    return null;
  } catch (error) {
    console.error(`[bioRxiv] Error fetching DOI ${doi}:`, error);
    return null;
  }
}

/**
 * Get publisher info for a DOI (if published to journal)
 */
export async function getPublisherInfo(doi: string): Promise<{
  published: boolean;
  journal?: string;
  publishedDoi?: string;
} | null> {
  try {
    const response = await axios.get<BioRxivAPIResponse>(
      `${BIORXIV_API_BASE}/publisher/biorxiv/${doi}/na/json`,
      { timeout: 10000 }
    );

    const pub = response.data.collection?.[0];
    if (pub && pub.published !== 'NA') {
      return {
        published: true,
        journal: pub.published,
        publishedDoi: pub.doi,
      };
    }

    return { published: false };
  } catch (error) {
    return null;
  }
}

/**
 * Map health conditions to research keywords
 */
export const CONDITION_RESEARCH_KEYWORDS: Record<string, string[]> = {
  'diabetes': ['diabetes', 'glycemic', 'insulin', 'HbA1c', 'glucose', 'metformin'],
  'hypertension': ['hypertension', 'blood pressure', 'antihypertensive', 'cardiovascular'],
  'heart disease': ['cardiovascular', 'cardiac', 'heart failure', 'coronary', 'myocardial'],
  'asthma': ['asthma', 'bronchial', 'respiratory', 'inhaler', 'bronchodilator'],
  'copd': ['COPD', 'pulmonary', 'emphysema', 'chronic obstructive'],
  'chronic kidney disease': ['kidney', 'renal', 'nephropathy', 'CKD', 'dialysis'],
  'obesity': ['obesity', 'weight loss', 'BMI', 'metabolic', 'bariatric'],
  'depression': ['depression', 'antidepressant', 'mental health', 'psychiatric'],
  'anxiety': ['anxiety', 'anxiolytic', 'mental health', 'psychiatric'],
  'cancer': ['cancer', 'oncology', 'tumor', 'chemotherapy', 'immunotherapy'],
};

/**
 * Clear the cache
 */
export function clearCache(): void {
  cache.clear();
}
