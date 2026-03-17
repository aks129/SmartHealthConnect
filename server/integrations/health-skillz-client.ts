/**
 * Health Skillz Integration Client
 *
 * Implements Josh Mandel's health-skillz pattern for importing FHIR data
 * from patient portals via encrypted session-based transfer.
 *
 * Flow:
 * 1. Server creates an encrypted session (ECDH P-256 keypair)
 * 2. User visits Health Skillz connect URL in browser
 * 3. User authenticates with their patient portal (SMART on FHIR OAuth)
 * 4. Browser fetches FHIR data, encrypts with session public key, uploads
 * 5. Server polls for completion, decrypts data with private key
 *
 * Reference: https://github.com/jmandel/health-skillz
 */

import crypto from 'crypto';

const HEALTH_SKILLZ_BASE_URL = process.env.HEALTH_SKILLZ_URL || 'https://health-skillz.joshuamandel.com';

export interface HealthSkillzSession {
  sessionId: string;
  publicKey: string;
  privateKey: string;
  userUrl: string;
  status: 'pending' | 'uploading' | 'ready' | 'error';
  createdAt: string;
}

export interface ProviderData {
  name: string;
  fhirBaseUrl: string;
  connectedAt: string;
  fhir: Record<string, any[]>;
  attachments?: Array<{
    contentType: string;
    bestEffortPlaintext?: string;
  }>;
}

// Active sessions stored in-memory
const activeSessions = new Map<string, HealthSkillzSession>();

/**
 * Create a new encrypted session for Health Skillz data import.
 * Generates ECDH P-256 keypair and registers with Health Skillz server.
 */
export async function createSession(): Promise<{
  sessionId: string;
  connectUrl: string;
}> {
  // Generate ECDH keypair
  const keyPair = crypto.generateKeyPairSync('ec', {
    namedCurve: 'P-256',
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  // Export public key as JWK for the API
  const publicKeyObj = crypto.createPublicKey(keyPair.publicKey);
  const publicKeyJwk = publicKeyObj.export({ format: 'jwk' });

  try {
    const response = await fetch(`${HEALTH_SKILLZ_BASE_URL}/api/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ publicKey: publicKeyJwk }),
    });

    if (!response.ok) {
      throw new Error(`Health Skillz session creation failed: ${response.status}`);
    }

    const data = await response.json() as { sessionId: string; userUrl: string };

    const session: HealthSkillzSession = {
      sessionId: data.sessionId,
      publicKey: keyPair.publicKey,
      privateKey: keyPair.privateKey,
      userUrl: data.userUrl || `${HEALTH_SKILLZ_BASE_URL}/connect/${data.sessionId}`,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    activeSessions.set(data.sessionId, session);

    return {
      sessionId: data.sessionId,
      connectUrl: session.userUrl,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to create Health Skillz session: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Poll for session completion.
 * Returns the session status and whether data is ready for download.
 */
export async function pollSession(sessionId: string): Promise<{
  status: string;
  ready: boolean;
  providerCount?: number;
}> {
  const session = activeSessions.get(sessionId);
  if (!session) {
    throw new Error('Session not found');
  }

  try {
    const response = await fetch(
      `${HEALTH_SKILLZ_BASE_URL}/api/poll/${sessionId}?timeout=5`,
      { signal: AbortSignal.timeout(10000) }
    );

    if (!response.ok) {
      return { status: 'pending', ready: false };
    }

    const data = await response.json() as { status: string; providerCount?: number };
    const ready = data.status === 'ready';

    if (ready) {
      session.status = 'ready';
    }

    return {
      status: data.status,
      ready,
      providerCount: data.providerCount,
    };
  } catch {
    return { status: 'pending', ready: false };
  }
}

/**
 * Download and decrypt provider data from a completed session.
 * Each provider's data is encrypted separately with per-chunk ephemeral keys.
 */
export async function downloadSessionData(sessionId: string): Promise<ProviderData[]> {
  const session = activeSessions.get(sessionId);
  if (!session) {
    throw new Error('Session not found');
  }

  try {
    // Get session metadata to know how many providers/chunks
    const metaResponse = await fetch(`${HEALTH_SKILLZ_BASE_URL}/api/session/${sessionId}`);
    if (!metaResponse.ok) {
      throw new Error('Failed to get session metadata');
    }

    const meta = await metaResponse.json() as {
      providerCount: number;
      chunks: Array<{ providerIndex: number; chunkIndex: number }>;
    };
    const providers: ProviderData[] = [];

    // Download and decrypt each provider's data
    for (let pi = 0; pi < (meta.providerCount || 0); pi++) {
      const chunks: Buffer[] = [];
      let chunkIndex = 0;

      while (true) {
        try {
          const chunkResponse = await fetch(
            `${HEALTH_SKILLZ_BASE_URL}/api/chunks/${sessionId}/${pi}/${chunkIndex}`
          );
          if (!chunkResponse.ok) break;

          const encrypted = Buffer.from(await chunkResponse.arrayBuffer());
          const decrypted = decryptChunk(encrypted, session.privateKey);
          chunks.push(decrypted);
          chunkIndex++;
        } catch {
          break;
        }
      }

      if (chunks.length > 0) {
        const combined = Buffer.concat(chunks);
        try {
          const providerData = JSON.parse(combined.toString('utf-8')) as ProviderData;
          providers.push(providerData);
        } catch {
          console.warn(`[Health Skillz] Failed to parse provider ${pi} data`);
        }
      }
    }

    // Clean up session
    activeSessions.delete(sessionId);

    return providers;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to download session data: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Decrypt a single chunk using the session's private key.
 * Chunks are encrypted with AES-256-GCM using an ephemeral ECDH shared secret.
 */
function decryptChunk(encrypted: Buffer, privateKeyPem: string): Buffer {
  // The encrypted chunk format:
  // [65 bytes ephemeral public key] [12 bytes IV] [16 bytes auth tag] [ciphertext]
  const ephemeralPubKey = encrypted.subarray(0, 65);
  const iv = encrypted.subarray(65, 77);
  const authTag = encrypted.subarray(77, 93);
  const ciphertext = encrypted.subarray(93);

  // Derive shared secret via ECDH
  const privateKey = crypto.createPrivateKey(privateKeyPem);
  const ephemeralKey = crypto.createPublicKey({
    key: Buffer.concat([Buffer.from([0x04]), ephemeralPubKey.subarray(0, 64)]),
    format: 'der',
    type: 'spki',
  });

  const sharedSecret = crypto.diffieHellman({
    privateKey,
    publicKey: ephemeralKey,
  });

  // Derive AES key from shared secret
  const aesKey = crypto.createHash('sha256').update(sharedSecret).digest();

  // Decrypt with AES-256-GCM
  const decipher = crypto.createDecipheriv('aes-256-gcm', aesKey, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

/**
 * Extract FHIR resources from imported Health Skillz provider data.
 * Normalizes the data into the same format used by the rest of the app.
 */
export function extractFhirFromProviderData(providers: ProviderData[]): Record<string, any[]> {
  const resources: Record<string, any[]> = {};

  for (const provider of providers) {
    if (!provider.fhir) continue;

    for (const [resourceType, entries] of Object.entries(provider.fhir)) {
      if (!resources[resourceType]) resources[resourceType] = [];

      // Tag each resource with its source provider
      const tagged = entries.map((entry: any) => ({
        ...entry,
        _source: {
          provider: provider.name,
          fhirServer: provider.fhirBaseUrl,
          importedAt: new Date().toISOString(),
        },
      }));

      resources[resourceType].push(...tagged);
    }
  }

  return resources;
}

/**
 * Get the status of an active session.
 */
export function getSessionStatus(sessionId: string): HealthSkillzSession | null {
  return activeSessions.get(sessionId) || null;
}

/**
 * Get all active session IDs (for status display).
 */
export function getActiveSessions(): string[] {
  return Array.from(activeSessions.keys());
}
