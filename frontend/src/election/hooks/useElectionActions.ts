import { useState } from 'react';
import { contractService } from '../../blockchain/services/contractService';
import { UseElectionActionsReturn } from '../types';

export const useElectionActions = (
    isOwner: boolean,
    account: string | null,
    onActionSuccess: () => void
): UseElectionActionsReturn => {
    const [actionStatus, setActionStatus] = useState<string>('');

    const formatErrorMessage = (error: any): string => {
        const errorMessage = error.message || 'Unknown error occurred';
        
        if (errorMessage.includes('User denied transaction signature') || errorMessage.includes('User rejected the request')) {
            return 'Transaction cancelled by user.';
        }

        return errorMessage;
    };

    const executeElectionAction = async (verb: 'start' | 'end' | 'delete', electionId: number) => {
        if (!isOwner || !account) {
            setActionStatus(`Error: only owner can ${verb} the election.`);
            return;
        }

        const services = {
            start: contractService.startElection,
            end: contractService.endElection,
            delete: contractService.deleteElection
        };

        const actionName = verb.charAt(0).toUpperCase() + verb.slice(1);
        setActionStatus(`${actionName}ing election...`);

        try {
            setActionStatus('Confirm the transaction in MetaMask...');
            await services[verb](electionId);
            
            const pastTense = verb === 'start' ? 'started' : verb === 'end' ? 'ended' : 'deleted';
            setActionStatus(`Election ${pastTense} successfully.`);
            
            if (verb === 'delete') {
                setTimeout(() => window.location.href = '/', 2000);
            } else {
                onActionSuccess();
            }
        } catch (err: any) {
            console.error(`${actionName}ing election error:`, err);
            setActionStatus(`Error: ${formatErrorMessage(err)}`);
        }
    };

    const clearActionStatus = () => setActionStatus('');

    return {
        actionStatus,
        executeElectionAction,
        clearActionStatus
    };
};
