import { test, expect } from '@playwright/test';

// All skill tests require demo mode
test.beforeEach(async ({ request }) => {
  await request.post('/api/fhir/demo/connect', {
    data: { password: 'SmartHealth2025' },
  });
});

test.describe('Skill 1: Medication Refills', () => {
  test('GET /api/refills/:id/status returns medication refill status', async ({ request }) => {
    const response = await request.get('/api/refills/1/status');
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.medications).toBeDefined();
    expect(Array.isArray(data.medications)).toBe(true);
    expect(data.medications.length).toBeGreaterThan(0);
    // Each medication should have refill info
    for (const med of data.medications) {
      expect(med.medicationName).toBeDefined();
      expect(med.refillStatus).toBeDefined();
    }
  });

  test('POST /api/refills/:id/request creates a refill request', async ({ request }) => {
    const response = await request.post('/api/refills/1/request', {
      data: { medicationName: 'Metformin 500 MG', pharmacyName: 'CVS Pharmacy' },
    });
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.medicationName).toBe('Metformin 500 MG');
    expect(data.status).toBe('pending');
  });

  test('GET /api/refills/:id/timeline returns refill timeline', async ({ request }) => {
    const response = await request.get('/api/refills/1/timeline?days=90');
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.timeline).toBeDefined();
    expect(Array.isArray(data.timeline)).toBe(true);
  });
});

test.describe('Skill 2: Care Completion', () => {
  test('GET /api/care-completion/:id/summary returns completion summary', async ({ request }) => {
    const response = await request.get('/api/care-completion/1/summary');
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.completionRate).toBeDefined();
    expect(typeof data.completionRate).toBe('number');
    expect(data.completionRate).toBeGreaterThanOrEqual(0);
    expect(data.completionRate).toBeLessThanOrEqual(100);
  });

  test('POST /api/care-completion/:id/referral creates a referral', async ({ request }) => {
    const response = await request.post('/api/care-completion/1/referral', {
      data: {
        referralType: 'specialist',
        reason: 'Diabetes management follow-up',
        providerName: 'Dr. Smith',
      },
    });
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.referralType || data.category).toBeDefined();
  });

  test('GET /api/care-completion/:id/overdue returns overdue items', async ({ request }) => {
    const response = await request.get('/api/care-completion/1/overdue');
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.overdueItems || data.items).toBeDefined();
  });
});

test.describe('Skill 3: Diet & Exercise', () => {
  test('POST /api/activity/:id/log logs an activity', async ({ request }) => {
    const response = await request.post('/api/activity/1/log', {
      data: {
        activityType: 'walking',
        durationMinutes: 30,
        intensity: 'moderate',
        notes: 'Morning walk',
      },
    });
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.activityType || data.entryType).toBeDefined();
  });

  test('GET /api/activity/:id/correlations returns correlation data', async ({ request }) => {
    const response = await request.get('/api/activity/1/correlations?days=30');
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data).toBeDefined();
    // Should have some correlation structure
    expect(typeof data).toBe('object');
  });

  test('GET /api/activity/:id/summary returns activity summary', async ({ request }) => {
    const response = await request.get('/api/activity/1/summary?period=week');
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.period).toBeDefined();
  });
});

test.describe('Skill 4: Kids/Family Health', () => {
  test('GET /api/pediatric/:id/immunization-schedule returns CDC schedule', async ({ request }) => {
    const response = await request.get('/api/pediatric/1/immunization-schedule');
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.vaccines).toBeDefined();
    expect(Array.isArray(data.vaccines)).toBe(true);
    expect(data.vaccines.length).toBeGreaterThan(0);
    // Each vaccine should have schedule info
    for (const vaccine of data.vaccines) {
      expect(vaccine.name || vaccine.vaccine).toBeDefined();
      expect(vaccine.status).toBeDefined();
    }
  });

  test('GET /api/pediatric/:id/wellchild-visits returns visit schedule', async ({ request }) => {
    const response = await request.get('/api/pediatric/1/wellchild-visits');
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data).toBeDefined();
  });

  test('GET /api/pediatric/:id/school-compliance returns compliance check', async ({ request }) => {
    const response = await request.get('/api/pediatric/1/school-compliance');
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(typeof data.compliant).toBe('boolean');
  });
});

test.describe('Skill 5: Healthy Habits', () => {
  test('GET /api/habits/:id/operating-picture returns health dashboard', async ({ request }) => {
    const response = await request.get('/api/habits/1/operating-picture?days=30');
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.overallWellnessScore).toBeDefined();
    expect(typeof data.overallWellnessScore).toBe('number');
    expect(data.overallWellnessScore).toBeGreaterThanOrEqual(0);
    expect(data.overallWellnessScore).toBeLessThanOrEqual(100);
  });

  test('POST /api/habits/:id/log logs a habit', async ({ request }) => {
    const response = await request.post('/api/habits/1/log', {
      data: {
        habitType: 'water',
        value: 8,
        unit: 'glasses',
        notes: 'Good hydration day',
      },
    });
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data).toBeDefined();
  });

  test('GET /api/habits/:id/streaks returns habit streaks', async ({ request }) => {
    const response = await request.get('/api/habits/1/streaks');
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.streaks).toBeDefined();
    expect(Array.isArray(data.streaks)).toBe(true);
  });
});

test.describe('Skill 6: Research Monitoring', () => {
  test('POST /api/research-monitor/:id/monitor creates a research monitor', async ({ request }) => {
    const response = await request.post('/api/research-monitor/1/monitor', {
      data: {
        conditionName: 'diabetes',
        sources: ['biorxiv', 'clinicaltrials'],
      },
    });
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.conditionName).toBe('diabetes');
  });

  test('GET /api/research-monitor/:id/digest returns research digest', async ({ request }) => {
    const response = await request.get('/api/research-monitor/1/digest');
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.monitors).toBeDefined();
    expect(Array.isArray(data.monitors)).toBe(true);
  });

  test('GET /api/research-monitor/:id/trial-eligibility checks eligibility', async ({ request }) => {
    const response = await request.get('/api/research-monitor/1/trial-eligibility?condition=diabetes');
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data).toBeDefined();
  });
});
