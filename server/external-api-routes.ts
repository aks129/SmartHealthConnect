/**
 * External API Routes
 *
 * Provides REST endpoints for real external healthcare APIs:
 * - ClinicalTrials.gov - Clinical trial search
 * - OpenFDA - Drug information and interactions
 * - NPI Registry - Provider search
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { searchClinicalTrials, getTrialByNctId, mapConditionToSearchTerms } from './integrations/clinicaltrials';
import { searchDrug, checkDrugInteractions, getAdverseEvents } from './integrations/openfda';
import { searchProviders, getProviderByNPI, findSpecialists, normalizeSpecialty, SPECIALTY_MAP } from './integrations/npi';

const router = Router();

// ============================================
// Clinical Trials API
// ============================================

/**
 * Search clinical trials
 * GET /api/external/clinical-trials
 *
 * Query params:
 * - conditions: comma-separated condition names
 * - status: comma-separated statuses (RECRUITING, ACTIVE_NOT_RECRUITING, etc.)
 * - phase: comma-separated phases
 * - pageSize: number of results (default 20)
 * - pageToken: pagination token
 */
router.get('/clinical-trials', async (req: Request, res: Response) => {
  try {
    const conditionsParam = req.query.conditions as string;
    if (!conditionsParam) {
      return res.status(400).json({ error: 'conditions parameter is required' });
    }

    const conditions = conditionsParam.split(',').map(c => c.trim());
    const expandedConditions = conditions.flatMap(c => mapConditionToSearchTerms(c));

    const statusParam = req.query.status as string;
    const validStatuses = ['RECRUITING', 'ACTIVE_NOT_RECRUITING', 'ENROLLING_BY_INVITATION'] as const;
    type StatusType = typeof validStatuses[number];
    const status: StatusType[] = statusParam
      ? statusParam.split(',').filter((s): s is StatusType => validStatuses.includes(s as StatusType))
      : ['RECRUITING'];

    const phaseParam = req.query.phase as string;
    const phase = phaseParam ? phaseParam.split(',') : undefined;

    const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string) : 20;
    const pageToken = req.query.pageToken as string | undefined;

    const results = await searchClinicalTrials({
      conditions: expandedConditions,
      status,
      phase,
      pageSize,
      pageToken,
    });

    res.json(results);
  } catch (error) {
    console.error('[External API] Clinical trials search error:', error);
    res.status(500).json({ error: 'Failed to search clinical trials' });
  }
});

/**
 * Get specific clinical trial by NCT ID
 * GET /api/external/clinical-trials/:nctId
 */
router.get('/clinical-trials/:nctId', async (req: Request, res: Response) => {
  try {
    const { nctId } = req.params;

    if (!nctId.startsWith('NCT')) {
      return res.status(400).json({ error: 'Invalid NCT ID format' });
    }

    const trial = await getTrialByNctId(nctId);

    if (!trial) {
      return res.status(404).json({ error: 'Trial not found' });
    }

    res.json(trial);
  } catch (error) {
    console.error('[External API] Get trial error:', error);
    res.status(500).json({ error: 'Failed to get clinical trial' });
  }
});

// ============================================
// OpenFDA Drug API
// ============================================

/**
 * Search for drug information
 * GET /api/external/drugs/search
 *
 * Query params:
 * - name: drug name (brand or generic)
 */
router.get('/drugs/search', async (req: Request, res: Response) => {
  try {
    const drugName = req.query.name as string;

    if (!drugName) {
      return res.status(400).json({ error: 'name parameter is required' });
    }

    const drug = await searchDrug(drugName);

    if (!drug) {
      return res.status(404).json({ error: 'Drug not found' });
    }

    res.json(drug);
  } catch (error) {
    console.error('[External API] Drug search error:', error);
    res.status(500).json({ error: 'Failed to search drug' });
  }
});

/**
 * Check drug interactions
 * POST /api/external/drugs/interactions
 *
 * Body:
 * - drugs: array of drug names
 */
router.post('/drugs/interactions', async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      drugs: z.array(z.string()).min(2, 'At least 2 drugs required to check interactions')
    });

    const { drugs } = schema.parse(req.body);

    const interactions = await checkDrugInteractions(drugs);

    res.json({
      drugs,
      interactions,
      interactionCount: interactions.length,
      checkedAt: new Date().toISOString()
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('[External API] Drug interaction check error:', error);
    res.status(500).json({ error: 'Failed to check drug interactions' });
  }
});

/**
 * Get adverse events for a drug
 * GET /api/external/drugs/:name/adverse-events
 */
router.get('/drugs/:name/adverse-events', async (req: Request, res: Response) => {
  try {
    const { name } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

    const events = await getAdverseEvents(name, limit);

    res.json(events);
  } catch (error) {
    console.error('[External API] Adverse events error:', error);
    res.status(500).json({ error: 'Failed to get adverse events' });
  }
});

// ============================================
// NPI Provider Registry API
// ============================================

/**
 * Search for healthcare providers
 * GET /api/external/providers/search
 *
 * Query params:
 * - firstName: provider first name
 * - lastName: provider last name
 * - organizationName: organization name
 * - specialty: specialty/taxonomy description
 * - city: city
 * - state: state (2-letter code)
 * - postalCode: ZIP code
 * - limit: max results (default 20)
 */
router.get('/providers/search', async (req: Request, res: Response) => {
  try {
    const params: Parameters<typeof searchProviders>[0] = {};

    if (req.query.firstName) params.firstName = req.query.firstName as string;
    if (req.query.lastName) params.lastName = req.query.lastName as string;
    if (req.query.organizationName) params.organizationName = req.query.organizationName as string;
    if (req.query.specialty) params.taxonomyDescription = normalizeSpecialty(req.query.specialty as string);
    if (req.query.city) params.city = req.query.city as string;
    if (req.query.state) params.state = req.query.state as string;
    if (req.query.postalCode) params.postalCode = req.query.postalCode as string;
    if (req.query.limit) params.limit = parseInt(req.query.limit as string);

    // Require at least one search parameter
    if (Object.keys(params).length === 0 || (Object.keys(params).length === 1 && params.limit)) {
      return res.status(400).json({
        error: 'At least one search parameter is required',
        availableParams: ['firstName', 'lastName', 'organizationName', 'specialty', 'city', 'state', 'postalCode']
      });
    }

    const results = await searchProviders(params);

    res.json(results);
  } catch (error) {
    console.error('[External API] Provider search error:', error);
    res.status(500).json({ error: 'Failed to search providers' });
  }
});

/**
 * Get provider by NPI number
 * GET /api/external/providers/:npi
 */
router.get('/providers/:npi', async (req: Request, res: Response) => {
  try {
    const { npi } = req.params;

    // Validate NPI format (10 digits)
    if (!/^\d{10}$/.test(npi)) {
      return res.status(400).json({ error: 'Invalid NPI format. Must be 10 digits.' });
    }

    const provider = await getProviderByNPI(npi);

    if (!provider) {
      return res.status(404).json({ error: 'Provider not found' });
    }

    res.json(provider);
  } catch (error) {
    console.error('[External API] Get provider error:', error);
    res.status(500).json({ error: 'Failed to get provider' });
  }
});

/**
 * Find specialists by specialty and location
 * GET /api/external/providers/specialists
 *
 * Query params:
 * - specialty: specialty name (will be normalized)
 * - city: city (optional)
 * - state: state (optional)
 * - postalCode: ZIP code (optional)
 * - limit: max results (default 10)
 */
router.get('/providers/specialists', async (req: Request, res: Response) => {
  try {
    const specialty = req.query.specialty as string;

    if (!specialty) {
      return res.status(400).json({
        error: 'specialty parameter is required',
        availableSpecialties: Object.keys(SPECIALTY_MAP)
      });
    }

    const location: { city?: string; state?: string; postalCode?: string } = {};
    if (req.query.city) location.city = req.query.city as string;
    if (req.query.state) location.state = req.query.state as string;
    if (req.query.postalCode) location.postalCode = req.query.postalCode as string;

    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

    const specialists = await findSpecialists(specialty, location, limit);

    res.json({
      specialty: normalizeSpecialty(specialty),
      location,
      providers: specialists,
      totalCount: specialists.length
    });
  } catch (error) {
    console.error('[External API] Find specialists error:', error);
    res.status(500).json({ error: 'Failed to find specialists' });
  }
});

/**
 * Get available specialty mappings
 * GET /api/external/providers/specialties
 */
router.get('/providers/specialties', (_req: Request, res: Response) => {
  res.json({
    specialties: SPECIALTY_MAP,
    description: 'Common specialty terms mapped to NPI taxonomy descriptions'
  });
});

export default router;
