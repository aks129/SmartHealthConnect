import { describe, it, expect } from 'vitest';
import {
  extractFhirFromProviderData,
  getSessionStatus,
  getActiveSessions,
} from '../server/integrations/health-skillz-client';

describe('Health Skillz Client', () => {
  describe('extractFhirFromProviderData', () => {
    it('should extract and tag resources from multiple providers', () => {
      const providers = [
        {
          name: 'Hospital A',
          fhirBaseUrl: 'https://hospital-a.org/fhir',
          connectedAt: '2024-01-01T00:00:00Z',
          fhir: {
            Patient: [{ resourceType: 'Patient', id: 'p1' }],
            Condition: [
              { resourceType: 'Condition', id: 'c1' },
              { resourceType: 'Condition', id: 'c2' },
            ],
          },
        },
        {
          name: 'Clinic B',
          fhirBaseUrl: 'https://clinic-b.org/fhir',
          connectedAt: '2024-01-02T00:00:00Z',
          fhir: {
            Condition: [{ resourceType: 'Condition', id: 'c3' }],
            Observation: [{ resourceType: 'Observation', id: 'o1' }],
          },
        },
      ];

      const result = extractFhirFromProviderData(providers);

      expect(result.Patient).toHaveLength(1);
      expect(result.Condition).toHaveLength(3); // 2 from Hospital A + 1 from Clinic B
      expect(result.Observation).toHaveLength(1);

      // Check source tagging
      expect(result.Patient[0]._source.provider).toBe('Hospital A');
      expect(result.Condition[2]._source.provider).toBe('Clinic B');
      expect(result.Observation[0]._source.fhirServer).toBe('https://clinic-b.org/fhir');
    });

    it('should handle empty provider list', () => {
      const result = extractFhirFromProviderData([]);
      expect(Object.keys(result)).toHaveLength(0);
    });

    it('should handle providers with no FHIR data', () => {
      const providers = [
        {
          name: 'Empty Hospital',
          fhirBaseUrl: 'https://empty.org/fhir',
          connectedAt: '2024-01-01T00:00:00Z',
          fhir: {},
        },
      ];

      const result = extractFhirFromProviderData(providers);
      expect(Object.keys(result)).toHaveLength(0);
    });

    it('should handle providers with null fhir property', () => {
      const providers = [
        {
          name: 'Null Hospital',
          fhirBaseUrl: 'https://null.org/fhir',
          connectedAt: '2024-01-01T00:00:00Z',
          fhir: null as any,
        },
      ];

      const result = extractFhirFromProviderData(providers);
      expect(Object.keys(result)).toHaveLength(0);
    });

    it('should add importedAt timestamp to source tag', () => {
      const before = new Date().toISOString();
      const providers = [
        {
          name: 'Test',
          fhirBaseUrl: 'https://test.org/fhir',
          connectedAt: '2024-01-01T00:00:00Z',
          fhir: {
            Patient: [{ resourceType: 'Patient', id: 'p1' }],
          },
        },
      ];

      const result = extractFhirFromProviderData(providers);
      const importedAt = result.Patient[0]._source.importedAt;
      expect(importedAt).toBeDefined();
      expect(new Date(importedAt).getTime()).toBeGreaterThanOrEqual(new Date(before).getTime());
    });
  });

  describe('Session Management', () => {
    it('should return null for non-existent session', () => {
      const status = getSessionStatus('non-existent-id');
      expect(status).toBeNull();
    });

    it('should return active sessions list', () => {
      const sessions = getActiveSessions();
      expect(Array.isArray(sessions)).toBe(true);
    });
  });
});
