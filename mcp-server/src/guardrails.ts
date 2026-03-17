/**
 * MCP Guardrails for PHI Protection
 *
 * Applied to all MCP tool responses to ensure:
 * 1. PHI is redacted before reaching the AI model
 * 2. Clinical data includes medical disclaimers
 * 3. All operations are audit-logged
 * 4. Write operations flag human-in-the-loop requirements
 *
 * Based on patterns from ModelContextProtocolFHIR (aks129)
 */

import crypto from 'crypto';

// ============================================
// PHI Redaction
// ============================================

const CLINICAL_RESOURCE_TYPES = [
  'Observation', 'Condition', 'MedicationRequest', 'DiagnosticReport',
  'AllergyIntolerance', 'Procedure', 'CarePlan', 'Immunization',
  'Encounter', 'DocumentReference',
];

/**
 * Redact PHI fields from a FHIR resource while keeping clinical data.
 * - Names: family kept, given names → first initial
 * - Identifiers: masked to last 4 chars
 * - Addresses: street removed, city/state kept
 * - Telecom: replaced with [Redacted]
 * - Birth dates: year only
 * - Photos: removed
 */
export function redactPhi(resource: any): any {
  if (!resource || typeof resource !== 'object') return resource;
  if (Array.isArray(resource)) return resource.map(r => redactPhi(r));

  const redacted = { ...resource };

  if (redacted.name && Array.isArray(redacted.name)) {
    redacted.name = redacted.name.map((n: any) => ({
      ...n,
      given: n.given?.map((g: string) => g.charAt(0) + '.'),
    }));
  }

  if (redacted.identifier && Array.isArray(redacted.identifier)) {
    redacted.identifier = redacted.identifier.map((id: any) => ({
      ...id,
      value: id.value ? '***' + id.value.slice(-4) : id.value,
    }));
  }

  if (redacted.address && Array.isArray(redacted.address)) {
    redacted.address = redacted.address.map((a: any) => ({
      ...a,
      line: undefined,
      text: undefined,
    }));
  }

  if (redacted.telecom && Array.isArray(redacted.telecom)) {
    redacted.telecom = redacted.telecom.map((t: any) => ({
      ...t,
      value: '[Redacted]',
    }));
  }

  if (redacted.birthDate && typeof redacted.birthDate === 'string') {
    redacted.birthDate = redacted.birthDate.substring(0, 4);
  }

  delete redacted.photo;

  if (redacted.text?.div) {
    redacted.text = { ...redacted.text, div: '<div>[Redacted]</div>' };
  }

  if (redacted.contained && Array.isArray(redacted.contained)) {
    redacted.contained = redacted.contained.map((c: any) => redactPhi(c));
  }

  return redacted;
}

// ============================================
// Disclaimers
// ============================================

const MEDICAL_DISCLAIMER =
  'DISCLAIMER: This data is informational only and does not constitute medical advice, ' +
  'diagnosis, or treatment. Always consult a qualified healthcare professional.';

function containsClinicalData(data: any): boolean {
  if (!data) return false;
  if (data.resourceType && CLINICAL_RESOURCE_TYPES.includes(data.resourceType)) return true;
  if (Array.isArray(data)) return data.some(item => containsClinicalData(item));
  for (const key of ['conditions', 'medications', 'allergies', 'observations', 'recentVitals', 'careGaps']) {
    if (data[key] && Array.isArray(data[key]) && data[key].length > 0) return true;
  }
  return false;
}

// ============================================
// Audit Log
// ============================================

interface AuditEntry {
  id: string;
  timestamp: string;
  toolName: string;
  action: 'read' | 'write';
  outcome: 'success' | 'error';
  redactionApplied: boolean;
  phiAccessed: boolean;
  detail?: string;
}

const auditLog: AuditEntry[] = [];

function logAudit(entry: Omit<AuditEntry, 'id' | 'timestamp'>): void {
  const full: AuditEntry = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    ...entry,
  };
  auditLog.push(full);
  console.error(
    `[MCP Audit] ${full.action.toUpperCase()} ${full.toolName} ` +
    `outcome=${full.outcome} phi=${full.phiAccessed} redacted=${full.redactionApplied}`
  );
}

export function getAuditLog(limit = 100): AuditEntry[] {
  return auditLog.slice(-limit);
}

// ============================================
// Write operation tools that require human review
// ============================================

const WRITE_TOOLS = new Set([
  'generate_care_plan',
  'add_journal_entry',
  'generate_appointment_prep',
]);

// ============================================
// Main guardrail wrapper
// ============================================

/**
 * Apply all guardrails to an MCP tool response.
 * Called after the tool executes but before returning to the MCP client.
 *
 * Returns the modified content array for the MCP response.
 */
export function applyGuardrails(
  toolName: string,
  data: any,
): { type: 'text'; text: string }[] {
  const isWrite = WRITE_TOOLS.has(toolName);
  const isClinical = containsClinicalData(data);

  // 1. Redact PHI from response data
  let processed = data;
  if (isClinical) {
    processed = redactResponseData(processed);
  }

  // 2. Add disclaimer for clinical data
  if (isClinical && typeof processed === 'object') {
    processed = { ...processed, _disclaimer: MEDICAL_DISCLAIMER };
  }

  // 3. Audit log
  logAudit({
    toolName,
    action: isWrite ? 'write' : 'read',
    outcome: 'success',
    redactionApplied: isClinical,
    phiAccessed: isClinical,
  });

  // 4. Build response content
  const content: { type: 'text'; text: string }[] = [];

  // Add human-in-the-loop notice for write operations
  if (isWrite) {
    content.push({
      type: 'text',
      text: `⚕️ HUMAN REVIEW REQUIRED: This action (${toolName}) modifies health data. ` +
        `Output should be reviewed by the patient or a healthcare professional before being acted upon.`,
    });
  }

  content.push({
    type: 'text',
    text: JSON.stringify(processed, null, 2),
  });

  return content;
}

/**
 * Log an error in the audit trail.
 */
export function logAuditError(toolName: string, error: string): void {
  logAudit({
    toolName,
    action: WRITE_TOOLS.has(toolName) ? 'write' : 'read',
    outcome: 'error',
    redactionApplied: false,
    phiAccessed: false,
    detail: error,
  });
}

/**
 * Redact PHI from structured API responses (summaries, lists, etc.).
 */
function redactResponseData(data: any): any {
  if (!data || typeof data !== 'object') return data;
  if (Array.isArray(data)) return data.map(item => redactPhi(item));

  const redacted = { ...data };

  // Redact patient data in summary responses
  if (redacted.patient) {
    redacted.patient = redactPhi(redacted.patient);
  }

  // Redact arrays of FHIR-like objects
  for (const key of ['conditions', 'medications', 'allergies', 'observations', 'immunizations']) {
    if (Array.isArray(redacted[key])) {
      redacted[key] = redacted[key].map((r: any) => redactPhi(r));
    }
  }

  return redacted;
}
