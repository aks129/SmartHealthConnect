import React, { useEffect } from 'react';
import { useLocation } from 'wouter';
import { smartAuth } from '@/lib/smart-auth';
import { MedicalSpinner } from '@/components/ui/medical-spinner';
import { apiRequest } from '@/lib/queryClient';

export default function Callback() {
    const [, setLocation] = useLocation();

    useEffect(() => {
        const completeAuth = async () => {
            try {
                const client = await smartAuth.ready();

                // Sync session with backend
                const state = client.state;
                await apiRequest('POST', '/api/fhir/sessions', {
                    provider: 'smart', // generic smart provider
                    fhirServer: state.serverUrl,
                    patientId: client.patient.id,
                    accessToken: state.tokenResponse?.access_token,
                    refreshToken: state.tokenResponse?.refresh_token,
                    scope: state.tokenResponse?.scope,
                    expiresIn: state.tokenResponse?.expires_in,
                });

                setLocation('/dashboard');
            } catch (error) {
                console.error("SMART Auth Error", error);
                setLocation('/');
            }
        };

        completeAuth();
    }, [setLocation]);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
            <MedicalSpinner
                size="lg"
                text="Connecting to Health Provider..."
                variant="primary"
            />
        </div>
    );
}
