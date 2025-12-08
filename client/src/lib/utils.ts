import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, isValid, parseISO } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Safely formats a date string, returning a fallback if invalid
 */
export function formatDateSafe(dateString: string | undefined | null, formatStr: string = "PPP", fallback: string = "N/A"): string {
  if (!dateString) return fallback;
  try {
    const date = parseISO(dateString);
    if (!isValid(date)) return fallback;
    return format(date, formatStr);
  } catch (e) {
    return fallback;
  }
}

/**
 * Safely extracts a patient's full name from FHIR HumanName array
 */
export function getPatientName(name: any[] | undefined): string {
  if (!name || !name.length) return "Unknown Patient";

  const official = name.find(n => n.use === 'official') || name[0];
  const family = official.family || '';
  const given = official.given ? official.given.join(' ') : '';

  return `${given} ${family}`.trim() || "Unknown Patient";
}

/**
 * Safely retrieves a nested property from an object or array
 */
export function safeGet<T>(obj: any, path: string, fallback: T): T {
  try {
    const keys = path.split('.');
    let current = obj;

    for (const key of keys) {
      if (current === null || current === undefined) return fallback;
      current = current[key];
    }

    return (current === undefined || current === null) ? fallback : current;
  } catch (e) {
    return fallback;
  }
}
