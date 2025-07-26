import { RegisterIdentityPayload } from "../../identity/types";
import { VoteZkpPayload } from "../types";

export const apiService = {
    
    registerIdentity: async (payload: RegisterIdentityPayload): Promise<{ message: string, data?: any }> => {
        const response = await fetch(`${import.meta.env.VITE_APP_API_URL}/contract/register-identity`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });
        if (!response.ok) {
            let errorMessage = 'Failed to register identity';
            try {
                const errorBody = await response.json();
                errorMessage = errorBody?.message || errorMessage;
            } catch {}
            throw new Error(errorMessage);
        }
        return response.json();
    },

    getIdentityCommitmentByCnp: async (cnp: string): Promise<{ success: boolean, data?: { identityCommitment: string }, message?: string }> => {
        const response = await fetch(`${import.meta.env.VITE_APP_API_URL}/contract/commitment/${cnp}`);
        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`);
        }
        return response.json();
    },

    voteZkp: async (electionId: string | number, payload: VoteZkpPayload): Promise<any> => {
        const response = await fetch(`${import.meta.env.VITE_APP_API_URL}/contract/${electionId}/vote-zkp`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            let errorMessage = 'Failed to submit vote';
            try {
                const errorBody = await response.json();
                errorMessage = errorBody?.message || errorMessage;
            } catch (parseError) {
                errorMessage = response.statusText || errorMessage;
            }
            
            const error = new Error(errorMessage);
            (error as any).status = response.status;
            throw error;
        }
        
        return response.json();
    },
};
