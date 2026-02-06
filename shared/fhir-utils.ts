/**
 * Shared FHIR utility functions used by both server and client.
 * These are pure functions with no browser or Node.js specific dependencies.
 */

/**
 * Get formatted name from a FHIR Patient resource
 */
export function getPatientName(patient: any): string {
  if (!patient || !patient.name || !patient.name.length) {
    return 'Unknown Patient';
  }

  const nameObj = patient.name[0];
  if (nameObj.text) return nameObj.text;

  const given = nameObj.given || [];
  const family = nameObj.family || '';

  return [...given, family].filter(Boolean).join(' ');
}

/**
 * Format a FHIR date (date only, no time)
 */
export function formatFhirDate(date: string | undefined): string {
  if (!date) return 'Unknown';

  try {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch {
    return date;
  }
}

/**
 * Format a FHIR datetime
 */
export function formatFhirDateTime(datetime: string | undefined): string {
  if (!datetime) return 'Unknown';

  try {
    return new Date(datetime).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return datetime;
  }
}

/**
 * Get display text from a FHIR CodeableConcept
 */
export function getDisplayFromCodeableConcept(codeableConcept: any): string {
  if (!codeableConcept) return 'Unknown';

  if (codeableConcept.text) {
    return codeableConcept.text;
  }

  if (codeableConcept.coding && codeableConcept.coding.length > 0) {
    return codeableConcept.coding[0].display || codeableConcept.coding[0].code || 'Unknown';
  }

  return 'Unknown';
}
