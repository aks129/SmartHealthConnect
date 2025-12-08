import FHIR from 'fhirclient';

/**
 * SMART on FHIR Authentication Utility
 * Handles the OAuth2 flow with the FHIR Provider
 */

const FHIR_CLIENT_ID = import.meta.env.VITE_FHIR_CLIENT_ID;
const FHIR_SCOPE = import.meta.env.VITE_FHIR_SCOPE;
const FHIR_ISS = import.meta.env.VITE_FHIR_ISS;

export const smartAuth = {
    /**
     * Initiates the SMART on FHIR Launch Flow
     */
    authorize: async () => {
        try {
            await FHIR.oauth2.authorize({
                clientId: FHIR_CLIENT_ID,
                scope: FHIR_SCOPE,
                iss: FHIR_ISS,
                // redirectUri is auto-detected or can be explicit
                redirectUri: window.location.origin + '/callback'
            });
        } catch (error) {
            console.error("SMART Authorization Failed:", error);
            throw error;
        }
    },

    /**
     * Completes the OAuth2 flow (to be called on redirect back)
     */
    ready: async () => {
        try {
            const client = await FHIR.oauth2.ready();
            return client;
        } catch (error) {
            console.error("SMART Ready Failed:", error);
            throw error;
        }
    },

    /**
     * Get the access token if available
     */
    getToken: () => {
        const state = sessionStorage.getItem('SMART_KEY'); // fhirclient stores state here usually
        // Helper to get token from fhirclient's storage if needed, 
        // but usually we use the client instance.
        return sessionStorage.getItem('token');
    }
};
