import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { smartAuth } from '@/lib/smart-auth';
import { MedicalSpinner } from '@/components/ui/medical-spinner';
import { apiRequest } from '@/lib/queryClient';

export default function Callback() {
    const [, setLocation] = useLocation();
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const completeAuth = async () => {
            const urlParams = new URLSearchParams(window.location.search);
            const code = urlParams.get('code');
            const state = urlParams.get('state');
            const errorParam = urlParams.get('error');
            const provider = localStorage.getItem('selected_provider');

            // Handle OAuth errors
            if (errorParam) {
                console.error('OAuth Error:', errorParam, urlParams.get('error_description'));
                setError(urlParams.get('error_description') || errorParam);
                setTimeout(() => setLocation('/'), 3000);
                return;
            }

            // Handle Epic Sandbox OAuth flow
            if (provider === 'epic-sandbox' && code) {
                const savedState = localStorage.getItem('epic_oauth_state');

                // Verify state to prevent CSRF
                if (state !== savedState) {
                    console.error('OAuth state mismatch');
                    setError('Security error: state mismatch. Please try again.');
                    setTimeout(() => setLocation('/'), 3000);
                    return;
                }

                try {
                    // Exchange code for tokens via backend
                    const response = await fetch('/api/fhir/epic/callback', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            code,
                            redirectUri: `${window.location.origin}/callback`
                        })
                    });

                    if (!response.ok) {
                        const data = await response.json();
                        throw new Error(data.message || 'Failed to exchange authorization code');
                    }

                    // Clear OAuth state
                    localStorage.removeItem('epic_oauth_state');
                    localStorage.removeItem('selected_provider');

                    // Redirect to dashboard
                    window.location.href = '/dashboard';
                } catch (err) {
                    console.error('Epic OAuth Error:', err);
                    setError(err instanceof Error ? err.message : 'Failed to connect to Epic');
                    setTimeout(() => setLocation('/'), 3000);
                }
                return;
            }

            // Handle generic SMART on FHIR flow (fhirclient library)
            try {
                const client = await smartAuth.ready();

                // Sync session with backend
                const clientState = client.state;
                await apiRequest('POST', '/api/fhir/sessions', {
                    provider: provider || 'smart',
                    fhirServer: clientState.serverUrl,
                    patientId: client.patient.id,
                    accessToken: clientState.tokenResponse?.access_token,
                    refreshToken: clientState.tokenResponse?.refresh_token,
                    scope: clientState.tokenResponse?.scope,
                    expiresIn: clientState.tokenResponse?.expires_in,
                });

                setLocation('/dashboard');
            } catch (err) {
                console.error("SMART Auth Error", err);
                setError('Failed to complete authentication');
                setTimeout(() => setLocation('/'), 3000);
            }
        };

        completeAuth();
    }, [setLocation]);

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-background">
                <div className="text-center p-8">
                    <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-semibold text-foreground mb-2">Connection Failed</h2>
                    <p className="text-muted-foreground mb-4">{error}</p>
                    <p className="text-sm text-muted-foreground">Redirecting to home page...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background">
            <MedicalSpinner
                size="lg"
                text="Connecting to Health Provider..."
                variant="primary"
            />
        </div>
    );
}
