/**
 * Data Connections Routes
 *
 * API endpoints for connecting to external health data sources:
 * - Flexpa (insurance/payer FHIR data via CMS-9115)
 * - Health Skillz (patient portal import via Josh Mandel's tool)
 * - MCP guardrails audit log access
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import {
  buildAuthorizationUrl,
  exchangeCodeForToken,
  fetchPatientEverything,
  searchFlexpaResources,
  extractResourcesFromBundle,
} from './integrations/flexpa-client';
import {
  createSession as createHealthSkillzSession,
  pollSession,
  downloadSessionData,
  extractFhirFromProviderData,
  getSessionStatus,
  getActiveSessions,
} from './integrations/health-skillz-client';
import { getAuditLog } from './mcp-guardrails';

const router = Router();

// ============================================
// Flexpa Connection Routes
// ============================================

/**
 * Start Flexpa authorization flow
 * POST /api/connections/flexpa/authorize
 *
 * Returns the Flexpa authorization URL for the user to visit.
 * Requires FLEXPA_PUBLISHABLE_KEY and FLEXPA_SECRET_KEY env vars.
 */
router.post('/flexpa/authorize', (req: Request, res: Response) => {
  try {
    const publishableKey = process.env.FLEXPA_PUBLISHABLE_KEY;
    const secretKey = process.env.FLEXPA_SECRET_KEY;

    if (!publishableKey || !secretKey) {
      return res.status(503).json({
        error: 'Flexpa integration not configured',
        detail: 'Set FLEXPA_PUBLISHABLE_KEY and FLEXPA_SECRET_KEY environment variables',
      });
    }

    const redirectUri = req.body.redirectUri ||
      `${req.protocol}://${req.get('host')}/api/connections/flexpa/callback`;

    const { url, state } = buildAuthorizationUrl({
      publishableKey,
      secretKey,
      redirectUri,
    });

    res.json({ authorizationUrl: url, state });
  } catch (error) {
    console.error('[Flexpa] Authorization URL error:', error);
    res.status(500).json({ error: 'Failed to start Flexpa authorization' });
  }
});

/**
 * Handle Flexpa OAuth callback
 * GET /api/connections/flexpa/callback
 *
 * Exchanges authorization code for access token and fetches patient data.
 */
router.get('/flexpa/callback', async (req: Request, res: Response) => {
  try {
    const { code, state } = req.query;

    if (!code || !state) {
      return res.status(400).json({ error: 'Missing code or state parameter' });
    }

    const publishableKey = process.env.FLEXPA_PUBLISHABLE_KEY;
    const secretKey = process.env.FLEXPA_SECRET_KEY;

    if (!publishableKey || !secretKey) {
      return res.status(503).json({ error: 'Flexpa not configured' });
    }

    const redirectUri = `${req.protocol}://${req.get('host')}/api/connections/flexpa/callback`;

    const session = await exchangeCodeForToken(
      code as string,
      state as string,
      { publishableKey, secretKey, redirectUri }
    );

    // Fetch all patient data
    const bundle = await fetchPatientEverything(session.accessToken);
    const resources = extractResourcesFromBundle(bundle);

    res.json({
      connected: true,
      source: 'flexpa',
      expiresAt: session.expiresAt,
      resourceCounts: Object.fromEntries(
        Object.entries(resources).map(([type, items]) => [type, items.length])
      ),
      data: resources,
    });
  } catch (error) {
    console.error('[Flexpa] Callback error:', error);
    res.status(500).json({
      error: 'Flexpa connection failed',
      detail: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Exchange Flexpa code (for SPA callback flow)
 * POST /api/connections/flexpa/exchange
 *
 * Body: { code, state, redirectUri }
 */
router.post('/flexpa/exchange', async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      code: z.string(),
      state: z.string(),
      redirectUri: z.string().url(),
    });
    const { code, state, redirectUri } = schema.parse(req.body);

    const publishableKey = process.env.FLEXPA_PUBLISHABLE_KEY;
    const secretKey = process.env.FLEXPA_SECRET_KEY;

    if (!publishableKey || !secretKey) {
      return res.status(503).json({ error: 'Flexpa not configured' });
    }

    const session = await exchangeCodeForToken(code, state, {
      publishableKey,
      secretKey,
      redirectUri,
    });

    res.json({
      connected: true,
      source: 'flexpa',
      accessToken: session.accessToken,
      expiresAt: session.expiresAt,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('[Flexpa] Exchange error:', error);
    res.status(500).json({
      error: 'Token exchange failed',
      detail: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Fetch FHIR resources from an active Flexpa connection
 * POST /api/connections/flexpa/fhir
 *
 * Body: { accessToken, resourceType?, searchParams? }
 */
router.post('/flexpa/fhir', async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      accessToken: z.string(),
      resourceType: z.string().optional(),
      searchParams: z.record(z.string()).optional(),
    });
    const { accessToken, resourceType, searchParams } = schema.parse(req.body);

    if (resourceType) {
      const resources = await searchFlexpaResources(accessToken, resourceType, searchParams);
      res.json({ resourceType, resources, count: resources.length });
    } else {
      const bundle = await fetchPatientEverything(accessToken);
      const resources = extractResourcesFromBundle(bundle);
      res.json({
        resourceCounts: Object.fromEntries(
          Object.entries(resources).map(([type, items]) => [type, items.length])
        ),
        data: resources,
      });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('[Flexpa] FHIR fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch FHIR data from Flexpa' });
  }
});

// ============================================
// Health Skillz Connection Routes
// ============================================

/**
 * Create a new Health Skillz import session
 * POST /api/connections/health-skillz/session
 *
 * Returns a connect URL for the user to authenticate with their patient portal.
 */
router.post('/health-skillz/session', async (req: Request, res: Response) => {
  try {
    const result = await createHealthSkillzSession();
    res.json({
      sessionId: result.sessionId,
      connectUrl: result.connectUrl,
      instructions: 'Open the connect URL in your browser to link your patient portal. ' +
        'After authentication, your health records will be securely encrypted and imported.',
    });
  } catch (error) {
    console.error('[Health Skillz] Session creation error:', error);
    res.status(500).json({
      error: 'Failed to create import session',
      detail: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Poll for Health Skillz session status
 * GET /api/connections/health-skillz/session/:sessionId/status
 */
router.get('/health-skillz/session/:sessionId/status', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const session = getSessionStatus(sessionId);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const pollResult = await pollSession(sessionId);
    res.json(pollResult);
  } catch (error) {
    console.error('[Health Skillz] Poll error:', error);
    res.status(500).json({ error: 'Failed to poll session status' });
  }
});

/**
 * Download imported health data from a completed session
 * POST /api/connections/health-skillz/session/:sessionId/download
 */
router.post('/health-skillz/session/:sessionId/download', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const providers = await downloadSessionData(sessionId);
    const resources = extractFhirFromProviderData(providers);

    res.json({
      source: 'health-skillz',
      providerCount: providers.length,
      providers: providers.map(p => ({
        name: p.name,
        fhirServer: p.fhirBaseUrl,
        connectedAt: p.connectedAt,
      })),
      resourceCounts: Object.fromEntries(
        Object.entries(resources).map(([type, items]) => [type, items.length])
      ),
      data: resources,
    });
  } catch (error) {
    console.error('[Health Skillz] Download error:', error);
    res.status(500).json({
      error: 'Failed to download session data',
      detail: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * List active Health Skillz sessions
 * GET /api/connections/health-skillz/sessions
 */
router.get('/health-skillz/sessions', (_req: Request, res: Response) => {
  const sessions = getActiveSessions().map(id => {
    const session = getSessionStatus(id);
    return {
      sessionId: id,
      status: session?.status,
      createdAt: session?.createdAt,
      connectUrl: session?.userUrl,
    };
  });
  res.json(sessions);
});

// ============================================
// Connection Status & Audit Routes
// ============================================

/**
 * Get available data connection methods
 * GET /api/connections/available
 */
router.get('/available', (_req: Request, res: Response) => {
  res.json({
    connections: [
      {
        id: 'flexpa',
        name: 'Flexpa (Insurance/Payer)',
        description: 'Connect to your health insurance to import claims, medications, and care data',
        configured: !!(process.env.FLEXPA_PUBLISHABLE_KEY && process.env.FLEXPA_SECRET_KEY),
        type: 'oauth',
      },
      {
        id: 'health-skillz',
        name: 'Patient Portal (Health Skillz)',
        description: 'Import records directly from your patient portal (Epic, etc.) via end-to-end encrypted transfer',
        configured: true, // Always available — uses external service
        type: 'session',
      },
      {
        id: 'smart-on-fhir',
        name: 'SMART on FHIR (Direct)',
        description: 'Connect directly to a FHIR-enabled health system',
        configured: true,
        type: 'oauth',
      },
    ],
  });
});

/**
 * Get MCP audit log
 * GET /api/connections/audit-log
 *
 * Query params:
 * - limit: max entries (default 100)
 */
router.get('/audit-log', (req: Request, res: Response) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
  const log = getAuditLog(limit);
  res.json({ entries: log, count: log.length });
});

export default router;
