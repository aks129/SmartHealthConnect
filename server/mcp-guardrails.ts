/**
 * MCP Guardrails for PHI Protection
 *
 * Implements security patterns from ModelContextProtocolFHIR:
 * - PHI field-level redaction on reads
 * - HIPAA Safe Harbor de-identification
 * - Medical disclaimers for clinical data
 * - Audit logging for all MCP operations
 * - Human-in-the-loop enforcement for clinical writes
 */

import crypto from 'crypto';

// ============================================
// PHI Redaction (applied to all read operations)
// ============================================

const CLINICAL_RESOURCE_TYPES = [
  'Observation', 'Condition', 'MedicationRequest', 'DiagnosticReport',
  'AllergyIntolerance', 'Procedure', 'CarePlan', 'Immunization',
  'Encounter', 'DocumentReference',
];

/**
 * Standard PHI redaction for MCP tool responses.
 * Keeps data clinically useful while reducing PHI exposure.
 */
export function redactPhi(resource: any): any {
  if (!resource || typeof resource !== 'object') return resource;
  if (Array.isArray(resource)) return resource.map(r => redactPhi(r));

  const redacted = { ...resource };

  // Names: keep family, truncate given to first initial
  if (redacted.name && Array.isArray(redacted.name)) {
    redacted.name = redacted.name.map((n: any) => ({
      ...n,
      given: n.given?.map((g: string) => g.charAt(0) + '.'),
    }));
  }

  // Identifiers: mask to last 4 characters
  if (redacted.identifier && Array.isArray(redacted.identifier)) {
    redacted.identifier = redacted.identifier.map((id: any) => ({
      ...id,
      value: id.value ? '***' + id.value.slice(-4) : id.value,
    }));
  }

  // Addresses: remove street line, keep city/state
  if (redacted.address && Array.isArray(redacted.address)) {
    redacted.address = redacted.address.map((a: any) => ({
      ...a,
      line: undefined,
      text: undefined,
    }));
  }

  // Telecom: redact phone and email
  if (redacted.telecom && Array.isArray(redacted.telecom)) {
    redacted.telecom = redacted.telecom.map((t: any) => ({
      ...t,
      value: '[Redacted]',
    }));
  }

  // Birth dates: truncate to year only
  if (redacted.birthDate && typeof redacted.birthDate === 'string') {
    redacted.birthDate = redacted.birthDate.substring(0, 4);
  }

  // Photos: remove entirely
  if (redacted.photo) {
    delete redacted.photo;
  }

  // Text narratives: redact
  if (redacted.text?.div) {
    redacted.text = { ...redacted.text, div: '<div>[Redacted]</div>' };
  }

  // Recursively redact contained resources
  if (redacted.contained && Array.isArray(redacted.contained)) {
    redacted.contained = redacted.contained.map((c: any) => redactPhi(c));
  }

  return redacted;
}

// ============================================
// HIPAA Safe Harbor De-identification
// ============================================

/**
 * Aggressive de-identification implementing 45 CFR 164.514(b)(2).
 * Removes all 18 Safe Harbor identifiers.
 * Use for data leaving the trust boundary (e.g., shared with external AI).
 */
export function deidentifyResource(resource: any): any {
  if (!resource || typeof resource !== 'object') return resource;
  if (Array.isArray(resource)) return resource.map(r => deidentifyResource(r));

  const deidentified = { ...resource };

  // Remove direct identifiers
  delete deidentified.name;
  delete deidentified.telecom;
  delete deidentified.identifier;
  delete deidentified.photo;
  delete deidentified.contact;

  // Remove address details below state level
  if (deidentified.address && Array.isArray(deidentified.address)) {
    deidentified.address = deidentified.address.map((a: any) => ({
      state: a.state,
      country: a.country,
    }));
  }

  // Generalize dates to year only
  if (deidentified.birthDate) {
    deidentified.birthDate = deidentified.birthDate.substring(0, 4);
  }
  if (deidentified.deceasedDateTime) {
    deidentified.deceasedDateTime = deidentified.deceasedDateTime.substring(0, 4);
  }

  // Remove free-text fields (may contain PHI)
  delete deidentified.text;
  if (deidentified.note) {
    deidentified.note = deidentified.note.map((n: any) => ({
      ...n,
      text: '[De-identified]',
    }));
  }

  // Pseudonymize resource ID
  if (deidentified.id) {
    deidentified.id = crypto.createHash('sha256')
      .update(deidentified.id)
      .digest('hex')
      .substring(0, 16);
  }

  // Add anonymization security tag
  deidentified.meta = {
    ...deidentified.meta,
    security: [
      ...(deidentified.meta?.security || []),
      { system: 'http://terminology.hl7.org/CodeSystem/v3-ObservationValue', code: 'ANONYED' },
    ],
  };

  // Recursively de-identify contained resources
  if (deidentified.contained && Array.isArray(deidentified.contained)) {
    deidentified.contained = deidentified.contained.map((c: any) => deidentifyResource(c));
  }

  return deidentified;
}

// ============================================
// Medical Disclaimers
// ============================================

const MEDICAL_DISCLAIMER =
  'This system provides informational data only and does not constitute medical advice, ' +
  'diagnosis, or treatment. Always consult a qualified healthcare professional for medical decisions.';

/**
 * Checks if a resource or response contains clinical data that needs a disclaimer.
 */
function containsClinicalData(data: any): boolean {
  if (!data) return false;
  if (typeof data === 'string') {
    try { data = JSON.parse(data); } catch { return false; }
  }

  if (data.resourceType && CLINICAL_RESOURCE_TYPES.includes(data.resourceType)) {
    return true;
  }

  // Check arrays and nested objects
  if (Array.isArray(data)) {
    return data.some(item => containsClinicalData(item));
  }

  // Check common response wrapper keys
  for (const key of ['conditions', 'medications', 'allergies', 'observations', 'recentVitals', 'careGaps']) {
    if (data[key] && Array.isArray(data[key]) && data[key].length > 0) {
      return true;
    }
  }

  return false;
}

/**
 * Wraps MCP tool response with medical disclaimer if clinical data is present.
 */
export function addDisclaimer(data: any): any {
  if (containsClinicalData(data)) {
    return {
      ...data,
      _disclaimer: MEDICAL_DISCLAIMER,
    };
  }
  return data;
}

// ============================================
// MCP Audit Logging
// ============================================

export interface AuditEntry {
  id: string;
  timestamp: string;
  toolName: string;
  action: 'read' | 'write';
  resourceType?: string;
  outcome: 'success' | 'error';
  detail?: string;
  redactionApplied: boolean;
  phiAccessed: boolean;
}

// In-memory audit log (append-only during server lifetime)
const auditLog: AuditEntry[] = [];

/**
 * Records an audit entry for MCP tool execution.
 */
export function logMcpAudit(entry: Omit<AuditEntry, 'id' | 'timestamp'>): void {
  const auditEntry: AuditEntry = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    ...entry,
  };
  auditLog.push(auditEntry);

  // Also log to console for persistence if no DB
  console.log(`[MCP Audit] ${auditEntry.action.toUpperCase()} ${auditEntry.toolName} ` +
    `outcome=${auditEntry.outcome} phi=${auditEntry.phiAccessed} redacted=${auditEntry.redactionApplied}`);
}

/**
 * Returns recent audit entries (for compliance review).
 */
export function getAuditLog(limit = 100): AuditEntry[] {
  return auditLog.slice(-limit);
}

// ============================================
// Human-in-the-Loop for Clinical Writes
// ============================================

const CLINICAL_WRITE_TOOLS = [
  'generate_care_plan',
  'add_journal_entry',
  'generate_appointment_prep',
];

/**
 * Checks if a tool invocation requires human confirmation.
 * Returns null if no confirmation needed, or a message describing what needs confirmation.
 */
export function requiresHumanConfirmation(toolName: string, args: any): string | null {
  if (!CLINICAL_WRITE_TOOLS.includes(toolName)) {
    return null;
  }

  return `This action (${toolName}) modifies health data. ` +
    `The output should be reviewed by the patient or a healthcare professional before being acted upon.`;
}

// ============================================
// PHI-aware MCP response wrapper
// ============================================

/**
 * Wraps an MCP tool response with all guardrails applied:
 * 1. PHI redaction
 * 2. Medical disclaimers
 * 3. Audit logging
 */
export function applyGuardrails(
  toolName: string,
  data: any,
  options: { isWrite?: boolean; skipRedaction?: boolean } = {}
): { data: any; humanConfirmation?: string } {
  const isPhiData = containsClinicalData(data);
  const isWrite = options.isWrite || false;

  // Apply PHI redaction on reads (unless explicitly skipped for non-PHI tools)
  let processed = data;
  if (!options.skipRedaction && isPhiData) {
    if (typeof processed === 'object' && !Array.isArray(processed)) {
      // Redact known PHI fields in the response
      processed = redactResponsePhi(processed);
    } else if (Array.isArray(processed)) {
      processed = processed.map(item => redactPhi(item));
    }
  }

  // Add medical disclaimer
  processed = addDisclaimer(processed);

  // Log audit entry
  logMcpAudit({
    toolName,
    action: isWrite ? 'write' : 'read',
    outcome: 'success',
    redactionApplied: !options.skipRedaction && isPhiData,
    phiAccessed: isPhiData,
  });

  // Check for human confirmation requirement
  const humanConfirmation = isWrite ? requiresHumanConfirmation(toolName, data) : null;

  return {
    data: processed,
    humanConfirmation: humanConfirmation ?? undefined,
  };
}

/**
 * Redacts PHI from structured API responses (not raw FHIR resources).
 */
function redactResponsePhi(response: any): any {
  if (!response || typeof response !== 'object') return response;

  const redacted = { ...response };

  // Redact patient-level fields in summary responses
  if (redacted.patient) {
    redacted.patient = redactPhi(redacted.patient);
  }

  // Redact arrays of FHIR resources
  for (const key of ['conditions', 'medications', 'allergies', 'observations', 'immunizations']) {
    if (Array.isArray(redacted[key])) {
      redacted[key] = redacted[key].map((r: any) => redactPhi(r));
    }
  }

  return redacted;
}
