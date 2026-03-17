import { describe, it, expect } from 'vitest';
import {
  buildAuthorizationUrl,
  extractResourcesFromBundle,
} from '../server/integrations/flexpa-client';

describe('Flexpa Client', () => {
  describe('buildAuthorizationUrl', () => {
    it('should generate authorization URL with PKCE parameters', () => {
      const config = {
        publishableKey: 'pk_test_123',
        secretKey: 'sk_test_456',
        redirectUri: 'http://localhost:5000/callback',
      };

      const result = buildAuthorizationUrl(config);

      expect(result.url).toContain('https://auth.flexpa.com/authorize');
      expect(result.url).toContain('client_id=pk_test_123');
      expect(result.url).toContain('redirect_uri=');
      expect(result.url).toContain('code_challenge=');
      expect(result.url).toContain('code_challenge_method=S256');
      expect(result.url).toContain('response_type=code');
      expect(result.state).toBeDefined();
      expect(result.state).toHaveLength(36); // UUID format
    });

    it('should generate unique state for each call', () => {
      const config = {
        publishableKey: 'pk_test_123',
        secretKey: 'sk_test_456',
        redirectUri: 'http://localhost:5000/callback',
      };

      const result1 = buildAuthorizationUrl(config);
      const result2 = buildAuthorizationUrl(config);

      expect(result1.state).not.toBe(result2.state);
    });

    it('should generate unique code challenges for each call', () => {
      const config = {
        publishableKey: 'pk_test_123',
        secretKey: 'sk_test_456',
        redirectUri: 'http://localhost:5000/callback',
      };

      const result1 = buildAuthorizationUrl(config);
      const result2 = buildAuthorizationUrl(config);

      // Extract code_challenge from URLs
      const url1 = new URL(result1.url);
      const url2 = new URL(result2.url);
      expect(url1.searchParams.get('code_challenge')).not.toBe(
        url2.searchParams.get('code_challenge')
      );
    });
  });

  describe('extractResourcesFromBundle', () => {
    it('should extract resources grouped by type from FHIR Bundle', () => {
      const bundle = {
        resourceType: 'Bundle',
        entry: [
          { resource: { resourceType: 'Patient', id: 'p1' } },
          { resource: { resourceType: 'Condition', id: 'c1' } },
          { resource: { resourceType: 'Condition', id: 'c2' } },
          { resource: { resourceType: 'Observation', id: 'o1' } },
        ],
      };

      const result = extractResourcesFromBundle(bundle);

      expect(result.Patient).toHaveLength(1);
      expect(result.Condition).toHaveLength(2);
      expect(result.Observation).toHaveLength(1);
      expect(result.Patient[0].id).toBe('p1');
    });

    it('should handle empty bundle', () => {
      const bundle = { resourceType: 'Bundle', entry: [] };
      const result = extractResourcesFromBundle(bundle);
      expect(Object.keys(result)).toHaveLength(0);
    });

    it('should handle bundle with no entry array', () => {
      const bundle = { resourceType: 'Bundle' };
      const result = extractResourcesFromBundle(bundle);
      expect(Object.keys(result)).toHaveLength(0);
    });

    it('should handle non-bundle input', () => {
      const result = extractResourcesFromBundle({ resourceType: 'Patient' });
      expect(Object.keys(result)).toHaveLength(0);
    });

    it('should skip entries without resource', () => {
      const bundle = {
        resourceType: 'Bundle',
        entry: [
          { resource: { resourceType: 'Patient', id: 'p1' } },
          { fullUrl: 'urn:uuid:123' }, // No resource property
          { resource: null },
        ],
      };

      const result = extractResourcesFromBundle(bundle);
      expect(result.Patient).toHaveLength(1);
    });

    it('should skip resources without resourceType', () => {
      const bundle = {
        resourceType: 'Bundle',
        entry: [
          { resource: { id: 'unknown' } }, // No resourceType
          { resource: { resourceType: 'Patient', id: 'p1' } },
        ],
      };

      const result = extractResourcesFromBundle(bundle);
      expect(result.Patient).toHaveLength(1);
      expect(Object.keys(result)).toHaveLength(1);
    });
  });
});
