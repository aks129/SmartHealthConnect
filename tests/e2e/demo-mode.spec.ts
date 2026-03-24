import { test, expect } from '@playwright/test';

test.describe('Demo Mode Connection', () => {
  test('POST /api/fhir/demo/connect succeeds with correct password', async ({ request }) => {
    const response = await request.post('/api/fhir/demo/connect', {
      data: { password: 'SmartHealth2025' },
    });
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.success).toBe(true);
  });

  test('POST /api/fhir/demo/connect rejects wrong password', async ({ request }) => {
    const response = await request.post('/api/fhir/demo/connect', {
      data: { password: 'wrong' },
    });
    expect(response.status()).toBe(401);
  });

  test('GET /api/fhir/patient returns demo patient after connect', async ({ request }) => {
    // Connect first
    await request.post('/api/fhir/demo/connect', {
      data: { password: 'SmartHealth2025' },
    });

    const response = await request.get('/api/fhir/patient');
    expect(response.ok()).toBeTruthy();
    const patient = await response.json();
    expect(patient.resourceType).toBe('Patient');
    expect(patient.name).toBeDefined();
    expect(patient.name[0].family).toBeDefined();
  });

  test('GET /api/fhir/condition returns conditions after connect', async ({ request }) => {
    await request.post('/api/fhir/demo/connect', {
      data: { password: 'SmartHealth2025' },
    });

    const response = await request.get('/api/fhir/condition');
    expect(response.ok()).toBeTruthy();
    const conditions = await response.json();
    expect(Array.isArray(conditions)).toBe(true);
    expect(conditions.length).toBeGreaterThan(0);
    expect(conditions[0].resourceType).toBe('Condition');
  });

  test('GET /api/fhir/medicationrequest returns medications array', async ({ request }) => {
    await request.post('/api/fhir/demo/connect', {
      data: { password: 'SmartHealth2025' },
    });

    const response = await request.get('/api/fhir/medicationrequest');
    expect(response.ok()).toBeTruthy();
    const meds = await response.json();
    expect(Array.isArray(meds)).toBe(true);
    // Demo data may return empty array if session was already active
  });

  test('GET /api/fhir/allergyintolerance returns allergies', async ({ request }) => {
    await request.post('/api/fhir/demo/connect', {
      data: { password: 'SmartHealth2025' },
    });

    const response = await request.get('/api/fhir/allergyintolerance');
    expect(response.ok()).toBeTruthy();
    const allergies = await response.json();
    expect(Array.isArray(allergies)).toBe(true);
  });

  test('GET /api/fhir/immunization returns immunizations', async ({ request }) => {
    await request.post('/api/fhir/demo/connect', {
      data: { password: 'SmartHealth2025' },
    });

    const response = await request.get('/api/fhir/immunization');
    expect(response.ok()).toBeTruthy();
    const immunizations = await response.json();
    expect(Array.isArray(immunizations)).toBe(true);
  });
});
