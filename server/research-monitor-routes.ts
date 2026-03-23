import { Router, Request, Response } from 'express';
import { eq, and, desc } from 'drizzle-orm';
import { db } from './db';
import {
  researchMonitors,
  insertResearchMonitorSchema,
  familyMembers,
} from '@shared/schema';
import {
  CONDITION_RESEARCH_KEYWORDS,
  searchPreprintsByKeyword,
} from './integrations/biorxiv';
import {
  searchClinicalTrials,
} from './integrations/clinicaltrials';

const router = Router();

// In-memory fallback for demo / no-DB mode
let demoMonitors: any[] = [];

/**
 * Get research keywords for a condition name
 */
function getKeywordsForCondition(conditionName: string): string[] {
  const lower = conditionName.toLowerCase();
  for (const [key, keywords] of Object.entries(CONDITION_RESEARCH_KEYWORDS)) {
    if (lower.includes(key)) {
      return keywords;
    }
  }
  // Default: use condition name words as keywords
  return conditionName.split(/\s+/).filter((w) => w.length > 2);
}

/**
 * Parse age string like "18 Years" to a number
 */
function parseAge(ageStr: string): number | null {
  const match = ageStr.match(/(\d+)/);
  return match ? parseInt(match[1]) : null;
}

/**
 * Calculate age from date of birth string
 */
function calculateAge(dob: string): number {
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

// POST /:familyMemberId/monitor - Create research monitor
router.post('/:familyMemberId/monitor', async (req: Request, res: Response) => {
  try {
    const familyMemberId = parseInt(req.params.familyMemberId);
    const { conditionName, sources } = req.body;

    if (!conditionName) {
      return res.status(400).json({ error: 'conditionName is required' });
    }

    const keywords = getKeywordsForCondition(conditionName);
    const monitorSources = sources || ['biorxiv', 'medrxiv', 'clinicaltrials'];

    // Run initial search to populate lastResults
    let initialResults: any = { articles: [], trials: [] };
    try {
      const [articles, trialsResult] = await Promise.all([
        searchPreprintsByKeyword({ keywords, server: 'medrxiv', limit: 10 }),
        searchClinicalTrials({
          conditions: [conditionName],
          status: ['RECRUITING'],
          pageSize: 10,
        }),
      ]);
      initialResults = {
        articles: articles.map((a) => ({ doi: a.doi, title: a.title, date: a.date })),
        trials: trialsResult.trials.map((t) => ({
          nctId: t.nctId,
          title: t.briefTitle,
          status: t.status,
        })),
      };
    } catch {
      // Initial search failed, that's okay - we'll try again on digest
    }

    const monitorData = {
      familyMemberId,
      conditionName,
      keywords,
      sources: monitorSources,
      lastCheckedAt: new Date(),
      lastResults: initialResults,
      isActive: true,
    };

    if (db) {
      try {
        const validation = insertResearchMonitorSchema.safeParse(monitorData);
        if (!validation.success) {
          return res.status(400).json({ error: validation.error.errors });
        }

        const [newMonitor] = await db
          .insert(researchMonitors)
          .values(validation.data)
          .returning();

        return res.status(201).json(newMonitor);
      } catch {
        // Fall through to in-memory
      }
    }

    // In-memory fallback
    const demoMonitor = {
      id: demoMonitors.length + 1,
      ...monitorData,
      createdAt: new Date().toISOString(),
    };
    demoMonitors.push(demoMonitor);
    res.status(201).json(demoMonitor);
  } catch (error) {
    console.error('Error creating research monitor:', error);
    res.status(500).json({ error: 'Failed to create research monitor' });
  }
});

// GET /:familyMemberId/digest - Research digest
router.get('/:familyMemberId/digest', async (req: Request, res: Response) => {
  try {
    const familyMemberId = parseInt(req.params.familyMemberId);

    let monitors: any[] = [];

    if (db) {
      try {
        monitors = await db
          .select()
          .from(researchMonitors)
          .where(
            and(
              eq(researchMonitors.familyMemberId, familyMemberId),
              eq(researchMonitors.isActive, true)
            )
          );
      } catch {
        // Fall through to in-memory / demo
      }
    }

    // Include in-memory monitors
    const inMemory = demoMonitors.filter(
      (m) => m.familyMemberId === familyMemberId && m.isActive
    );
    monitors = [...monitors, ...inMemory];

    // If no monitors exist, create demo digest with common conditions
    if (monitors.length === 0) {
      const demoConditions = ['diabetes', 'hypertension'];
      const digestMonitors = [];

      for (const condition of demoConditions) {
        const keywords = getKeywordsForCondition(condition);

        let articles: any[] = [];
        let trials: any[] = [];

        try {
          const [articleResults, trialResults] = await Promise.all([
            searchPreprintsByKeyword({ keywords, server: 'medrxiv', limit: 5 }),
            searchClinicalTrials({
              conditions: [condition],
              status: ['RECRUITING'],
              pageSize: 5,
            }),
          ]);
          articles = articleResults;
          trials = trialResults.trials;
        } catch {
          // API calls failed, return empty results
        }

        digestMonitors.push({
          conditionName: condition,
          newArticles: articles.map((a) => ({
            doi: a.doi,
            title: a.title,
            authors: a.authors,
            date: a.date,
            url: a.url,
            abstract: a.abstract?.slice(0, 200) + '...',
          })),
          newTrials: trials.map((t) => ({
            nctId: t.nctId,
            title: t.briefTitle,
            status: t.status,
            phase: t.phase,
            sponsor: t.sponsor,
          })),
          lastChecked: new Date().toISOString(),
        });
      }

      return res.json({ monitors: digestMonitors });
    }

    // Process each active monitor
    const digestResults = await Promise.all(
      monitors.map(async (monitor) => {
        const keywords = (monitor.keywords as string[]) || getKeywordsForCondition(monitor.conditionName);
        const previousResults = (monitor.lastResults as any) || { articles: [], trials: [] };
        const previousDOIs = new Set(
          (previousResults.articles || []).map((a: any) => a.doi)
        );
        const previousNCTIds = new Set(
          (previousResults.trials || []).map((t: any) => t.nctId)
        );

        let articles: any[] = [];
        let trials: any[] = [];

        try {
          const [articleResults, trialResults] = await Promise.all([
            searchPreprintsByKeyword({ keywords, server: 'medrxiv', limit: 10 }),
            searchClinicalTrials({
              conditions: [monitor.conditionName],
              status: ['RECRUITING'],
              pageSize: 10,
            }),
          ]);
          articles = articleResults;
          trials = trialResults.trials;
        } catch {
          // API calls failed
        }

        // Flag new items (not in previous results)
        const newArticles = articles
          .filter((a) => !previousDOIs.has(a.doi))
          .map((a) => ({
            doi: a.doi,
            title: a.title,
            authors: a.authors,
            date: a.date,
            url: a.url,
            abstract: a.abstract?.slice(0, 200) + '...',
            isNew: true,
          }));

        const newTrials = trials
          .filter((t) => !previousNCTIds.has(t.nctId))
          .map((t) => ({
            nctId: t.nctId,
            title: t.briefTitle,
            status: t.status,
            phase: t.phase,
            sponsor: t.sponsor,
            isNew: true,
          }));

        // Update lastResults and lastCheckedAt
        const updatedResults = {
          articles: articles.map((a) => ({ doi: a.doi, title: a.title, date: a.date })),
          trials: trials.map((t) => ({ nctId: t.nctId, title: t.briefTitle, status: t.status })),
        };

        if (db && monitor.id && typeof monitor.id === 'number') {
          try {
            await db
              .update(researchMonitors)
              .set({
                lastCheckedAt: new Date(),
                lastResults: updatedResults,
              })
              .where(eq(researchMonitors.id, monitor.id));
          } catch {
            // DB update failed, not critical
          }
        }

        return {
          conditionName: monitor.conditionName,
          newArticles,
          newTrials,
          lastChecked: new Date().toISOString(),
        };
      })
    );

    res.json({ monitors: digestResults });
  } catch (error) {
    console.error('Error fetching research digest:', error);
    res.status(500).json({ error: 'Failed to fetch research digest' });
  }
});

// GET /:familyMemberId/trial-eligibility - Trial eligibility check
router.get('/:familyMemberId/trial-eligibility', async (req: Request, res: Response) => {
  try {
    const familyMemberId = parseInt(req.params.familyMemberId);
    const { nctId, condition } = req.query;

    if (!nctId && !condition) {
      return res.status(400).json({ error: 'Either nctId or condition query param is required' });
    }

    // Get family member info for eligibility matching
    let memberInfo: any = null;

    if (db) {
      try {
        const [member] = await db
          .select()
          .from(familyMembers)
          .where(eq(familyMembers.id, familyMemberId))
          .limit(1);
        memberInfo = member;
      } catch {
        // Fall through to demo
      }
    }

    // Demo patient info fallback
    if (!memberInfo) {
      memberInfo = {
        id: familyMemberId,
        name: 'Demo Patient',
        dateOfBirth: '1985-06-15',
        gender: 'male',
      };
    }

    const patientAge = memberInfo.dateOfBirth ? calculateAge(memberInfo.dateOfBirth) : 40;
    const patientGender = memberInfo.gender || 'unknown';

    /**
     * Check eligibility for a single trial
     */
    const checkEligibility = (trial: any) => {
      let matchScore = 0;
      let maxScore = 0;
      const matchDetails: any = {};

      // Age check
      maxScore += 30;
      const minAge = trial.eligibility?.minAge ? parseAge(trial.eligibility.minAge) : null;
      const maxAge = trial.eligibility?.maxAge ? parseAge(trial.eligibility.maxAge) : null;

      if (minAge === null && maxAge === null) {
        matchScore += 30;
        matchDetails.ageMatch = { eligible: true, note: 'No age restriction' };
      } else {
        const ageOk =
          (minAge === null || patientAge >= minAge) &&
          (maxAge === null || patientAge <= maxAge);
        if (ageOk) {
          matchScore += 30;
          matchDetails.ageMatch = {
            eligible: true,
            patientAge,
            range: `${minAge || 'any'} - ${maxAge || 'any'}`,
          };
        } else {
          matchDetails.ageMatch = {
            eligible: false,
            patientAge,
            range: `${minAge || 'any'} - ${maxAge || 'any'}`,
          };
        }
      }

      // Gender check
      maxScore += 30;
      const trialSex = trial.eligibility?.sex?.toLowerCase() || 'all';
      if (trialSex === 'all') {
        matchScore += 30;
        matchDetails.genderMatch = { eligible: true, note: 'All genders accepted' };
      } else if (trialSex === patientGender) {
        matchScore += 30;
        matchDetails.genderMatch = { eligible: true, patientGender, required: trialSex };
      } else {
        matchDetails.genderMatch = {
          eligible: false,
          patientGender,
          required: trialSex,
        };
      }

      // Condition match (if we searched by condition, it's likely a match)
      maxScore += 40;
      if (condition) {
        const condStr = (condition as string).toLowerCase();
        const trialConditions = (trial.conditions || []).map((c: string) => c.toLowerCase());
        const conditionMatch = trialConditions.some(
          (tc: string) => tc.includes(condStr) || condStr.includes(tc)
        );
        if (conditionMatch) {
          matchScore += 40;
          matchDetails.conditionMatch = { eligible: true, searchCondition: condition };
        } else {
          matchScore += 20; // Partial credit since we searched for it
          matchDetails.conditionMatch = {
            eligible: true,
            note: 'Condition search match (partial)',
            searchCondition: condition,
          };
        }
      } else {
        matchScore += 20; // Unknown condition match when searching by nctId
        matchDetails.conditionMatch = {
          eligible: true,
          note: 'Condition match not evaluated (searched by NCT ID)',
        };
      }

      const finalScore = maxScore > 0 ? Math.round((matchScore / maxScore) * 100) : 0;

      return {
        eligible: matchDetails.ageMatch?.eligible !== false && matchDetails.genderMatch?.eligible !== false,
        matchScore: finalScore,
        matchDetails,
        trial: {
          nctId: trial.nctId,
          title: trial.briefTitle || trial.title,
          status: trial.status,
          phase: trial.phase,
          conditions: trial.conditions,
          sponsor: trial.sponsor,
          locations: trial.locations?.slice(0, 3),
          eligibilityCriteria: trial.eligibility?.criteria?.slice(0, 500),
        },
      };
    }

    if (nctId) {
      // Fetch specific trial
      let trial: any = null;
      try {
        const { getTrialByNctId } = await import('./integrations/clinicaltrials');
        trial = await getTrialByNctId(nctId as string);
      } catch {
        // Import or fetch failed
      }

      if (!trial) {
        return res.status(404).json({ error: `Trial ${nctId} not found` });
      }

      const result = checkEligibility(trial);
      return res.json(result);
    }

    // Search by condition
    const conditionStr = condition as string;
    let trials: any[] = [];

    try {
      const searchResult = await searchClinicalTrials({
        conditions: [conditionStr],
        status: ['RECRUITING'],
        pageSize: 10,
      });
      trials = searchResult.trials;
    } catch {
      // Search failed
    }

    if (trials.length === 0) {
      return res.json({
        message: `No recruiting trials found for "${conditionStr}"`,
        results: [],
      });
    }

    const results = trials.map(checkEligibility);

    // Sort by match score descending
    results.sort((a, b) => b.matchScore - a.matchScore);

    res.json({
      patientInfo: {
        age: patientAge,
        gender: patientGender,
      },
      condition: conditionStr,
      results,
    });
  } catch (error) {
    console.error('Error checking trial eligibility:', error);
    res.status(500).json({ error: 'Failed to check trial eligibility' });
  }
});

export default router;
