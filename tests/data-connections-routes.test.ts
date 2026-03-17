import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import request from 'supertest';
import dataConnectionsRoutes from '../server/data-connections-routes';

describe('Data Connections Routes', () => {
  let app: express.Express;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/connections', dataConnectionsRoutes);
  });

  describe('GET /api/connections/available', () => {
    it('should return list of available connection methods', async () => {
      const res = await request(app).get('/api/connections/available');

      expect(res.status).toBe(200);
      expect(res.body.connections).toBeDefined();
      expect(Array.isArray(res.body.connections)).toBe(true);
      expect(res.body.connections.length).toBeGreaterThanOrEqual(3);

      const ids = res.body.connections.map((c: any) => c.id);
      expect(ids).toContain('flexpa');
      expect(ids).toContain('health-skillz');
      expect(ids).toContain('smart-on-fhir');
    });

    it('should include configuration status for each connection', async () => {
      const res = await request(app).get('/api/connections/available');

      for (const conn of res.body.connections) {
        expect(conn).toHaveProperty('id');
        expect(conn).toHaveProperty('name');
        expect(conn).toHaveProperty('description');
        expect(conn).toHaveProperty('configured');
        expect(conn).toHaveProperty('type');
        expect(['oauth', 'session']).toContain(conn.type);
      }
    });

    it('should show health-skillz as always configured', async () => {
      const res = await request(app).get('/api/connections/available');
      const healthSkillz = res.body.connections.find((c: any) => c.id === 'health-skillz');
      expect(healthSkillz.configured).toBe(true);
    });

    it('should show flexpa as unconfigured without env vars', async () => {
      // Env vars not set in test environment
      const res = await request(app).get('/api/connections/available');
      const flexpa = res.body.connections.find((c: any) => c.id === 'flexpa');
      expect(flexpa.configured).toBe(false);
    });
  });

  describe('POST /api/connections/flexpa/authorize', () => {
    it('should return 503 when Flexpa is not configured', async () => {
      const res = await request(app)
        .post('/api/connections/flexpa/authorize')
        .send({});

      expect(res.status).toBe(503);
      expect(res.body.error).toContain('not configured');
    });
  });

  describe('POST /api/connections/flexpa/exchange', () => {
    it('should validate required fields', async () => {
      const res = await request(app)
        .post('/api/connections/flexpa/exchange')
        .send({ code: 'test' }); // Missing state and redirectUri

      expect(res.status).toBe(400);
    });

    it('should return 503 when Flexpa not configured', async () => {
      const res = await request(app)
        .post('/api/connections/flexpa/exchange')
        .send({
          code: 'test-code',
          state: 'test-state',
          redirectUri: 'http://localhost:5000/callback',
        });

      expect(res.status).toBe(503);
    });
  });

  describe('POST /api/connections/flexpa/fhir', () => {
    it('should validate accessToken is required', async () => {
      const res = await request(app)
        .post('/api/connections/flexpa/fhir')
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/connections/audit-log', () => {
    it('should return audit log entries', async () => {
      const res = await request(app).get('/api/connections/audit-log');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('entries');
      expect(res.body).toHaveProperty('count');
      expect(Array.isArray(res.body.entries)).toBe(true);
    });

    it('should respect limit parameter', async () => {
      const res = await request(app).get('/api/connections/audit-log?limit=5');

      expect(res.status).toBe(200);
      expect(res.body.entries.length).toBeLessThanOrEqual(5);
    });
  });

  describe('GET /api/connections/health-skillz/sessions', () => {
    it('should return list of active sessions', async () => {
      const res = await request(app).get('/api/connections/health-skillz/sessions');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('GET /api/connections/health-skillz/session/:id/status', () => {
    it('should return 404 for non-existent session', async () => {
      const res = await request(app)
        .get('/api/connections/health-skillz/session/non-existent-id/status');

      expect(res.status).toBe(404);
      expect(res.body.error).toContain('not found');
    });
  });
});
