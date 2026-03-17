/**
 * Flexpa Integration Client
 *
 * Implements Flexpa's OAuth 2.0 PKCE flow for patient health data access
 * from insurance payers via CMS-9115 interoperability rules.
 *
 * Flow:
 * 1. Server generates PKCE code_verifier + code_challenge
 * 2. User redirected to Flexpa authorization (selects health plan, authenticates)
 * 3. Flexpa redirects back with authorization code
 * 4. Server exchanges code + verifier for access token
 * 5. Server queries Flexpa FHIR API with bearer token
 */

import crypto from 'crypto';
import axios from 'axios';

const FLEXPA_API_BASE = 'https://api.flexpa.com';
const FLEXPA_AUTH_BASE = 'https://auth.flexpa.com';

export interface FlexpaConfig {
  publishableKey: string;
  secretKey: string;
  redirectUri: string;
}

export interface FlexpaSession {
  accessToken: string;
  expiresAt: string;
  patientId?: string;
  codeVerifier?: string;
}

// In-memory session store (keyed by state parameter)
const pendingSessions = new Map<string, { codeVerifier: string; createdAt: number }>();

// Clean up expired pending sessions (older than 10 minutes)
function cleanupPendingSessions(): void {
  const expiry = Date.now() - 10 * 60 * 1000;
  pendingSessions.forEach((val, key) => {
    if (val.createdAt < expiry) pendingSessions.delete(key);
  });
}

/**
 * Generate PKCE code verifier (RFC 7636).
 */
function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString('base64url');
}

/**
 * Generate PKCE code challenge from verifier (S256 method).
 */
function generateCodeChallenge(verifier: string): string {
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}

/**
 * Build the Flexpa authorization URL for the PKCE flow.
 * Returns the URL to redirect the user to and the state parameter to track the session.
 */
export function buildAuthorizationUrl(config: FlexpaConfig): {
  url: string;
  state: string;
} {
  cleanupPendingSessions();

  const state = crypto.randomUUID();
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);

  // Store verifier for code exchange
  pendingSessions.set(state, { codeVerifier, createdAt: Date.now() });

  const params = new URLSearchParams({
    client_id: config.publishableKey,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state,
  });

  return {
    url: `${FLEXPA_AUTH_BASE}/authorize?${params.toString()}`,
    state,
  };
}

/**
 * Exchange authorization code for access token.
 * Called after user completes Flexpa authorization and is redirected back.
 */
export async function exchangeCodeForToken(
  code: string,
  state: string,
  config: FlexpaConfig
): Promise<FlexpaSession> {
  const pending = pendingSessions.get(state);
  if (!pending) {
    throw new Error('Invalid or expired authorization state');
  }

  try {
    const response = await axios.post(`${FLEXPA_API_BASE}/link/exchange`, {
      code,
      code_verifier: pending.codeVerifier,
      redirect_uri: config.redirectUri,
      client_id: config.publishableKey,
      secret_key: config.secretKey,
    });

    pendingSessions.delete(state);

    return {
      accessToken: response.data.access_token,
      expiresAt: new Date(Date.now() + (response.data.expires_in || 3600) * 1000).toISOString(),
    };
  } catch (error) {
    pendingSessions.delete(state);
    if (axios.isAxiosError(error)) {
      throw new Error(`Flexpa token exchange failed: ${error.response?.data?.message || error.message}`);
    }
    throw error;
  }
}

/**
 * Fetch all patient data from Flexpa using $everything operation.
 */
export async function fetchPatientEverything(accessToken: string): Promise<any> {
  try {
    const response = await axios.get(`${FLEXPA_API_BASE}/fhir/Patient/$everything`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      timeout: 60000, // Initial sync can take up to 60s
    });

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 429) {
      // Rate limited during initial sync — retry after delay
      const retryAfter = parseInt(error.response.headers['retry-after'] || '5');
      await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
      return fetchPatientEverything(accessToken);
    }
    if (axios.isAxiosError(error)) {
      throw new Error(`Flexpa FHIR fetch failed: ${error.response?.data?.message || error.message}`);
    }
    throw error;
  }
}

/**
 * Search for specific FHIR resources from Flexpa.
 */
export async function searchFlexpaResources(
  accessToken: string,
  resourceType: string,
  params?: Record<string, string>
): Promise<any[]> {
  try {
    const searchParams = params ? `?${new URLSearchParams(params).toString()}` : '';
    const response = await axios.get(
      `${FLEXPA_API_BASE}/fhir/${resourceType}${searchParams}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    // FHIR Bundle → extract entries
    if (response.data?.resourceType === 'Bundle' && response.data.entry) {
      return response.data.entry.map((e: any) => e.resource).filter(Boolean);
    }

    return Array.isArray(response.data) ? response.data : [response.data];
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.warn(`[Flexpa] Search ${resourceType} failed:`, error.response?.status);
      return [];
    }
    throw error;
  }
}

/**
 * Extract and normalize FHIR resources from a $everything Bundle.
 */
export function extractResourcesFromBundle(bundle: any): Record<string, any[]> {
  const resources: Record<string, any[]> = {};

  if (bundle?.resourceType !== 'Bundle' || !bundle.entry) {
    return resources;
  }

  for (const entry of bundle.entry) {
    const resource = entry.resource;
    if (!resource?.resourceType) continue;

    const type = resource.resourceType;
    if (!resources[type]) resources[type] = [];
    resources[type].push(resource);
  }

  return resources;
}
