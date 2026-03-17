/**
 * React Query hooks for data connections (Flexpa, Health Skillz).
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// ============================================
// Types
// ============================================

export interface DataConnection {
  id: string;
  name: string;
  description: string;
  configured: boolean;
  type: 'oauth' | 'session';
}

export interface FlexpaAuthResponse {
  authorizationUrl: string;
  state: string;
}

export interface FlexpaExchangeResponse {
  connected: boolean;
  source: string;
  accessToken: string;
  expiresAt: string;
}

export interface FlexpaDataResponse {
  resourceCounts: Record<string, number>;
  data: Record<string, any[]>;
}

export interface HealthSkillzSessionResponse {
  sessionId: string;
  connectUrl: string;
  instructions: string;
}

export interface HealthSkillzStatusResponse {
  status: string;
  ready: boolean;
  providerCount?: number;
}

export interface HealthSkillzDownloadResponse {
  source: string;
  providerCount: number;
  providers: Array<{ name: string; fhirServer: string; connectedAt: string }>;
  resourceCounts: Record<string, number>;
  data: Record<string, any[]>;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  toolName: string;
  action: 'read' | 'write';
  outcome: 'success' | 'error';
  redactionApplied: boolean;
  phiAccessed: boolean;
  detail?: string;
}

// ============================================
// Available Connections
// ============================================

export function useAvailableConnections() {
  return useQuery({
    queryKey: ['connections', 'available'],
    queryFn: async (): Promise<{ connections: DataConnection[] }> => {
      const response = await fetch('/api/connections/available');
      if (!response.ok) throw new Error('Failed to fetch connections');
      return response.json();
    },
    staleTime: Infinity, // Static configuration data
  });
}

// ============================================
// Flexpa Hooks
// ============================================

export function useFlexpaAuthorize() {
  return useMutation({
    mutationFn: async (redirectUri?: string): Promise<FlexpaAuthResponse> => {
      const response = await fetch('/api/connections/flexpa/authorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ redirectUri }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || error.error || 'Failed to start Flexpa authorization');
      }
      return response.json();
    },
  });
}

export function useFlexpaExchange() {
  return useMutation({
    mutationFn: async (params: { code: string; state: string; redirectUri: string }): Promise<FlexpaExchangeResponse> => {
      const response = await fetch('/api/connections/flexpa/exchange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || error.error || 'Token exchange failed');
      }
      return response.json();
    },
  });
}

export function useFlexpaFhirData() {
  return useMutation({
    mutationFn: async (params: {
      accessToken: string;
      resourceType?: string;
      searchParams?: Record<string, string>;
    }): Promise<FlexpaDataResponse> => {
      const response = await fetch('/api/connections/flexpa/fhir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (!response.ok) throw new Error('Failed to fetch FHIR data');
      return response.json();
    },
  });
}

// ============================================
// Health Skillz Hooks
// ============================================

export function useHealthSkillzCreateSession() {
  return useMutation({
    mutationFn: async (): Promise<HealthSkillzSessionResponse> => {
      const response = await fetch('/api/connections/health-skillz/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || error.error || 'Failed to create session');
      }
      return response.json();
    },
  });
}

export function useHealthSkillzStatus(sessionId: string | null, enabled = true) {
  return useQuery({
    queryKey: ['health-skillz', 'status', sessionId],
    queryFn: async (): Promise<HealthSkillzStatusResponse> => {
      const response = await fetch(`/api/connections/health-skillz/session/${sessionId}/status`);
      if (!response.ok) throw new Error('Failed to poll status');
      return response.json();
    },
    enabled: enabled && !!sessionId,
    refetchInterval: (query) => {
      // Poll every 3 seconds until ready
      return query.state.data?.ready ? false : 3000;
    },
  });
}

export function useHealthSkillzDownload() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (sessionId: string): Promise<HealthSkillzDownloadResponse> => {
      const response = await fetch(`/api/connections/health-skillz/session/${sessionId}/download`, {
        method: 'POST',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || error.error || 'Failed to download data');
      }
      return response.json();
    },
    onSuccess: () => {
      // Invalidate FHIR data queries to reflect imported data
      queryClient.invalidateQueries({ queryKey: ['fhir'] });
    },
  });
}

export function useHealthSkillzSessions() {
  return useQuery({
    queryKey: ['health-skillz', 'sessions'],
    queryFn: async () => {
      const response = await fetch('/api/connections/health-skillz/sessions');
      if (!response.ok) throw new Error('Failed to fetch sessions');
      return response.json();
    },
    staleTime: 10000, // Refresh every 10 seconds
  });
}

// ============================================
// MCP Audit Log Hook
// ============================================

export function useMcpAuditLog(limit = 100) {
  return useQuery({
    queryKey: ['audit-log', limit],
    queryFn: async (): Promise<{ entries: AuditLogEntry[]; count: number }> => {
      const response = await fetch(`/api/connections/audit-log?limit=${limit}`);
      if (!response.ok) throw new Error('Failed to fetch audit log');
      return response.json();
    },
    staleTime: 30000, // Refresh every 30 seconds
  });
}
