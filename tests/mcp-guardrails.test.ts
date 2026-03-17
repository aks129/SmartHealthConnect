import { describe, it, expect, beforeEach } from 'vitest';
import {
  redactPhi,
  deidentifyResource,
  addDisclaimer,
  applyGuardrails,
  requiresHumanConfirmation,
  logMcpAudit,
  getAuditLog,
} from '../server/mcp-guardrails';

describe('MCP Guardrails', () => {
  describe('PHI Redaction', () => {
    it('should truncate given names to first initial', () => {
      const patient = {
        resourceType: 'Patient',
        name: [{ family: 'Smith', given: ['John', 'Michael'] }],
      };
      const redacted = redactPhi(patient);
      expect(redacted.name[0].family).toBe('Smith');
      expect(redacted.name[0].given).toEqual(['J.', 'M.']);
    });

    it('should mask identifiers to last 4 characters', () => {
      const patient = {
        resourceType: 'Patient',
        identifier: [{ value: '123-45-6789' }],
      };
      const redacted = redactPhi(patient);
      expect(redacted.identifier[0].value).toBe('***6789');
    });

    it('should remove address street lines', () => {
      const patient = {
        resourceType: 'Patient',
        address: [{
          line: ['123 Main St'],
          text: '123 Main St, City, ST',
          city: 'TestCity',
          state: 'TS',
        }],
      };
      const redacted = redactPhi(patient);
      expect(redacted.address[0].line).toBeUndefined();
      expect(redacted.address[0].text).toBeUndefined();
      expect(redacted.address[0].city).toBe('TestCity');
      expect(redacted.address[0].state).toBe('TS');
    });

    it('should redact telecom values', () => {
      const patient = {
        resourceType: 'Patient',
        telecom: [
          { system: 'phone', value: '555-123-4567' },
          { system: 'email', value: 'patient@email.com' },
        ],
      };
      const redacted = redactPhi(patient);
      expect(redacted.telecom[0].value).toBe('[Redacted]');
      expect(redacted.telecom[1].value).toBe('[Redacted]');
    });

    it('should truncate birth dates to year only', () => {
      const patient = {
        resourceType: 'Patient',
        birthDate: '1985-06-15',
      };
      const redacted = redactPhi(patient);
      expect(redacted.birthDate).toBe('1985');
    });

    it('should remove photos', () => {
      const patient = {
        resourceType: 'Patient',
        photo: [{ data: 'base64data' }],
      };
      const redacted = redactPhi(patient);
      expect(redacted.photo).toBeUndefined();
    });

    it('should redact text narratives', () => {
      const resource = {
        resourceType: 'Condition',
        text: { div: '<div>Patient has severe condition...</div>' },
      };
      const redacted = redactPhi(resource);
      expect(redacted.text.div).toBe('<div>[Redacted]</div>');
    });

    it('should handle null/undefined inputs', () => {
      expect(redactPhi(null)).toBeNull();
      expect(redactPhi(undefined)).toBeUndefined();
    });

    it('should handle arrays of resources', () => {
      const patients = [
        { name: [{ given: ['Alice'] }] },
        { name: [{ given: ['Bob'] }] },
      ];
      const redacted = redactPhi(patients);
      expect(redacted).toHaveLength(2);
      expect(redacted[0].name[0].given).toEqual(['A.']);
      expect(redacted[1].name[0].given).toEqual(['B.']);
    });

    it('should recursively redact contained resources', () => {
      const resource = {
        resourceType: 'Observation',
        contained: [
          { resourceType: 'Patient', name: [{ given: ['Jane'] }] },
        ],
      };
      const redacted = redactPhi(resource);
      expect(redacted.contained[0].name[0].given).toEqual(['J.']);
    });
  });

  describe('HIPAA Safe Harbor De-identification', () => {
    it('should remove name, telecom, identifier, contact, photo', () => {
      const patient = {
        resourceType: 'Patient',
        id: 'patient-123',
        name: [{ family: 'Smith', given: ['John'] }],
        telecom: [{ value: '555-1234' }],
        identifier: [{ value: 'MRN-12345' }],
        contact: [{ name: { family: 'Smith' } }],
        photo: [{ data: 'base64' }],
      };
      const deidentified = deidentifyResource(patient);
      expect(deidentified.name).toBeUndefined();
      expect(deidentified.telecom).toBeUndefined();
      expect(deidentified.identifier).toBeUndefined();
      expect(deidentified.contact).toBeUndefined();
      expect(deidentified.photo).toBeUndefined();
    });

    it('should pseudonymize resource ID with SHA-256', () => {
      const resource = { id: 'patient-123' };
      const deidentified = deidentifyResource(resource);
      expect(deidentified.id).not.toBe('patient-123');
      expect(deidentified.id).toHaveLength(16);
      // Same input should produce same hash
      const deidentified2 = deidentifyResource({ id: 'patient-123' });
      expect(deidentified.id).toBe(deidentified2.id);
    });

    it('should generalize dates to year only', () => {
      const resource = {
        birthDate: '1985-06-15',
        deceasedDateTime: '2024-01-20T10:30:00Z',
      };
      const deidentified = deidentifyResource(resource);
      expect(deidentified.birthDate).toBe('1985');
      expect(deidentified.deceasedDateTime).toBe('2024');
    });

    it('should strip address to state/country only', () => {
      const resource = {
        address: [{
          line: ['123 Main St'],
          city: 'TestCity',
          state: 'NY',
          postalCode: '10001',
          country: 'US',
        }],
      };
      const deidentified = deidentifyResource(resource);
      expect(deidentified.address[0].state).toBe('NY');
      expect(deidentified.address[0].country).toBe('US');
      expect(deidentified.address[0].line).toBeUndefined();
      expect(deidentified.address[0].city).toBeUndefined();
    });

    it('should add ANONYED security tag', () => {
      const resource = { id: 'test-1', resourceType: 'Patient' };
      const deidentified = deidentifyResource(resource);
      expect(deidentified.meta.security).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: 'ANONYED' }),
        ])
      );
    });

    it('should de-identify notes to [De-identified]', () => {
      const resource = {
        note: [{ text: 'Patient complained of headaches' }],
      };
      const deidentified = deidentifyResource(resource);
      expect(deidentified.note[0].text).toBe('[De-identified]');
    });

    it('should remove text narratives', () => {
      const resource = { text: { div: '<div>Clinical narrative</div>' } };
      const deidentified = deidentifyResource(resource);
      expect(deidentified.text).toBeUndefined();
    });
  });

  describe('Medical Disclaimers', () => {
    it('should add disclaimer to data with conditions', () => {
      const data = {
        conditions: [{ code: { text: 'Diabetes' } }],
      };
      const result = addDisclaimer(data);
      expect(result._disclaimer).toBeDefined();
      expect(result._disclaimer).toContain('does not constitute medical advice');
    });

    it('should add disclaimer to data with medications', () => {
      const data = {
        medications: [{ name: 'Metformin' }],
      };
      const result = addDisclaimer(data);
      expect(result._disclaimer).toBeDefined();
    });

    it('should add disclaimer to data with observations', () => {
      const data = {
        observations: [{ code: { text: 'Blood Pressure' } }],
      };
      const result = addDisclaimer(data);
      expect(result._disclaimer).toBeDefined();
    });

    it('should not add disclaimer to non-clinical data', () => {
      const data = { providers: [{ name: 'Dr. Smith' }] };
      const result = addDisclaimer(data);
      expect(result._disclaimer).toBeUndefined();
    });

    it('should not add disclaimer to empty arrays', () => {
      const data = { conditions: [], medications: [] };
      const result = addDisclaimer(data);
      expect(result._disclaimer).toBeUndefined();
    });
  });

  describe('Human-in-the-Loop', () => {
    it('should require confirmation for generate_care_plan', () => {
      const result = requiresHumanConfirmation('generate_care_plan', {});
      expect(result).not.toBeNull();
      expect(result).toContain('generate_care_plan');
    });

    it('should require confirmation for add_journal_entry', () => {
      const result = requiresHumanConfirmation('add_journal_entry', {});
      expect(result).not.toBeNull();
    });

    it('should require confirmation for generate_appointment_prep', () => {
      const result = requiresHumanConfirmation('generate_appointment_prep', {});
      expect(result).not.toBeNull();
    });

    it('should not require confirmation for read operations', () => {
      expect(requiresHumanConfirmation('get_conditions', {})).toBeNull();
      expect(requiresHumanConfirmation('get_medications', {})).toBeNull();
      expect(requiresHumanConfirmation('get_health_summary', {})).toBeNull();
      expect(requiresHumanConfirmation('find_specialists', {})).toBeNull();
    });
  });

  describe('Audit Logging', () => {
    it('should log audit entries', () => {
      const before = getAuditLog().length;
      logMcpAudit({
        toolName: 'test_tool',
        action: 'read',
        outcome: 'success',
        redactionApplied: true,
        phiAccessed: true,
      });
      const after = getAuditLog();
      expect(after.length).toBe(before + 1);
      const last = after[after.length - 1];
      expect(last.toolName).toBe('test_tool');
      expect(last.action).toBe('read');
      expect(last.outcome).toBe('success');
      expect(last.redactionApplied).toBe(true);
      expect(last.phiAccessed).toBe(true);
      expect(last.id).toBeDefined();
      expect(last.timestamp).toBeDefined();
    });

    it('should respect limit parameter', () => {
      // Log multiple entries
      for (let i = 0; i < 5; i++) {
        logMcpAudit({
          toolName: `tool_${i}`,
          action: 'read',
          outcome: 'success',
          redactionApplied: false,
          phiAccessed: false,
        });
      }
      const limited = getAuditLog(3);
      expect(limited.length).toBeLessThanOrEqual(3);
    });
  });

  describe('applyGuardrails', () => {
    it('should redact PHI and add disclaimer for clinical data', () => {
      const data = {
        patient: {
          name: [{ family: 'Smith', given: ['John'] }],
          telecom: [{ value: '555-1234' }],
          birthDate: '1985-06-15',
        },
        conditions: [{ code: { text: 'Diabetes' } }],
      };
      const result = applyGuardrails('get_health_summary', data);
      expect(result.data.patient.name[0].given).toEqual(['J.']);
      expect(result.data.patient.telecom[0].value).toBe('[Redacted]');
      expect(result.data.patient.birthDate).toBe('1985');
      expect(result.data._disclaimer).toBeDefined();
    });

    it('should flag write operations for human confirmation', () => {
      const data = { conditionName: 'Diabetes', title: 'Plan' };
      const result = applyGuardrails('generate_care_plan', data, { isWrite: true });
      expect(result.humanConfirmation).toBeDefined();
      expect(result.humanConfirmation).toContain('generate_care_plan');
    });

    it('should not flag read operations for human confirmation', () => {
      const data = { conditions: [] };
      const result = applyGuardrails('get_conditions', data);
      expect(result.humanConfirmation).toBeUndefined();
    });

    it('should log audit for every call', () => {
      const before = getAuditLog().length;
      applyGuardrails('get_vitals', [{ code: { text: 'BP' } }]);
      const after = getAuditLog().length;
      expect(after).toBe(before + 1);
    });
  });
});
