/**
 * HIPAA-compliant Audit Logging Middleware
 *
 * Tracks all access to Protected Health Information (PHI) with:
 * - User identification
 * - Timestamp
 * - Action performed
 * - Resource accessed
 * - IP address
 * - Success/failure status
 */

import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../auth';
import { db } from '../db';
import { auditLogs } from '@shared/schema';

// PHI-related endpoints that require audit logging
const PHI_ENDPOINTS = [
  '/api/fhir/patient',
  '/api/fhir/condition',
  '/api/fhir/observation',
  '/api/fhir/medicationrequest',
  '/api/fhir/allergyintolerance',
  '/api/fhir/immunization',
  '/api/fhir/coverage',
  '/api/fhir/claim',
  '/api/fhir/appointment',
  '/api/fhir/care-gaps',
  '/api/chat/messages',
];

export interface AuditLogEntry {
  userId: string | null;
  userEmail: string | null;
  action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'ACCESS' | 'EXPORT';
  resourceType: string;
  resourceId: string | null;
  ipAddress: string;
  userAgent: string;
  endpoint: string;
  method: string;
  statusCode: number;
  success: boolean;
  errorMessage: string | null;
  metadata: Record<string, unknown> | null;
}

/**
 * Get action type from HTTP method
 */
function getActionFromMethod(method: string): AuditLogEntry['action'] {
  switch (method.toUpperCase()) {
    case 'POST': return 'CREATE';
    case 'GET': return 'READ';
    case 'PUT':
    case 'PATCH': return 'UPDATE';
    case 'DELETE': return 'DELETE';
    default: return 'ACCESS';
  }
}

/**
 * Extract resource type from endpoint
 */
function getResourceType(path: string): string {
  const match = path.match(/\/api\/fhir\/([^\/\?]+)/);
  if (match) {
    return match[1].toUpperCase();
  }
  if (path.includes('/api/chat')) return 'CHAT';
  if (path.includes('/api/user')) return 'USER';
  return 'UNKNOWN';
}

/**
 * Check if endpoint contains PHI
 */
function isPHIEndpoint(path: string): boolean {
  return PHI_ENDPOINTS.some(endpoint => path.startsWith(endpoint));
}

/**
 * Get client IP address, handling proxies
 */
function getClientIP(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  if (Array.isArray(forwarded)) {
    return forwarded[0];
  }
  return req.ip || req.socket.remoteAddress || 'unknown';
}

/**
 * Audit logging middleware
 * Logs all PHI access for HIPAA compliance
 */
export function auditMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  // Skip non-PHI endpoints
  if (!isPHIEndpoint(req.path)) {
    next();
    return;
  }

  const startTime = Date.now();

  // Capture original end function
  const originalEnd = res.end;
  const originalJson = res.json;

  let responseBody: unknown = null;

  // Override json to capture response
  res.json = function(body: unknown) {
    responseBody = body;
    return originalJson.call(this, body);
  };

  // Override end to log after response
  res.end = function(chunk?: unknown, encoding?: BufferEncoding | (() => void), callback?: () => void) {
    const duration = Date.now() - startTime;

    // Build audit log entry
    const entry: AuditLogEntry = {
      userId: req.user?.userId || null,
      userEmail: req.user?.email || null,
      action: getActionFromMethod(req.method),
      resourceType: getResourceType(req.path),
      resourceId: req.params.id || null,
      ipAddress: getClientIP(req),
      userAgent: req.headers['user-agent'] || 'unknown',
      endpoint: req.path,
      method: req.method,
      statusCode: res.statusCode,
      success: res.statusCode >= 200 && res.statusCode < 400,
      errorMessage: res.statusCode >= 400 ? String(responseBody) : null,
      metadata: {
        duration,
        query: req.query,
        contentLength: res.get('content-length'),
      }
    };

    // Log asynchronously to not block response
    logAuditEntry(entry).catch(err => {
      console.error('Failed to write audit log:', err);
    });

    // Call original end with proper typing
    return originalEnd.call(this, chunk, encoding as BufferEncoding);
  };

  next();
}

/**
 * Write audit log entry to database
 */
async function logAuditEntry(entry: AuditLogEntry): Promise<void> {
  try {
    if (db) {
      await db.insert(auditLogs).values({
        userId: entry.userId,
        userEmail: entry.userEmail,
        action: entry.action,
        resourceType: entry.resourceType,
        resourceId: entry.resourceId,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
        endpoint: entry.endpoint,
        method: entry.method,
        statusCode: entry.statusCode,
        success: entry.success,
        errorMessage: entry.errorMessage,
        metadata: entry.metadata,
        createdAt: new Date(),
      });
    } else {
      // Fallback to console logging in development
      console.log('[AUDIT]', JSON.stringify(entry));
    }
  } catch (error) {
    // Always log to console as backup
    console.error('[AUDIT ERROR]', error);
    console.log('[AUDIT FALLBACK]', JSON.stringify(entry));
  }
}

/**
 * Export audit logs for compliance reporting
 */
export async function exportAuditLogs(
  startDate: Date,
  endDate: Date,
  userId?: string
): Promise<AuditLogEntry[]> {
  // Implementation would query database
  // For now, return empty array
  console.log(`Exporting audit logs from ${startDate} to ${endDate} for user ${userId || 'all'}`);
  return [];
}
