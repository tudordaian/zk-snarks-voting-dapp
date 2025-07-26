import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../identity/AuthContext';
import { contractService } from '../../../blockchain/services/contractService';
import { ipfsService } from '../../services/ipfsService';
import { PendingProposal } from '../../types';
import { ProposalData } from '../../types';

interface PendingProposalsManagerProps {
    electionId: number;
    electionName: string;
    onClose: () => void;
    onProposalAccepted: () => void;
}

const PendingProposalsManager: React.FC<PendingProposalsManagerProps> = ({ 
    electionId, 
    electionName, 
    onClose,
    onProposalAccepted 
}) => {
    const [pendingProposals, setPendingProposals] = useState<PendingProposal[]>([]);
    const [proposalData, setProposalData] = useState<Map<string, ProposalData>>(new Map());
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [actionStatus, setActionStatus] = useState<{[key: number]: string}>({});

    const { isOwner } = useAuth();

    useEffect(() => {
        if (isOwner) {
            fetchPendingProposals();
        }
    }, [electionId, isOwner]);

    const fetchPendingProposals = async () => {
        setIsLoading(true);
        setError('');
        try {
            const proposals = await contractService.getPendingProposals(electionId);
            setPendingProposals(proposals);
                 const dataMap = new Map<string, ProposalData>();
        for (const proposal of proposals) {
            if (proposal.dataCID && !dataMap.has(proposal.dataCID)) {
                try {
                    const timeoutPromise = new Promise<never>((_, reject) =>
                        setTimeout(() => reject(new Error('IPFS request timed out')), 8000)
                    );
                    
                    const dataPromise = ipfsService.getData(proposal.dataCID);
                    const data = await Promise.race([dataPromise, timeoutPromise]);
                    
                    dataMap.set(proposal.dataCID, data);
                } catch (err: any) {
                    console.error(`Failed to fetch data for CID ${proposal.dataCID}:`, err);
                    
                    const isNetworkError = err.message?.includes('timeout') || 
                                         err.message?.includes('fetch failed') ||
                                         err.message?.includes('ETIMEDOUT');
                    
                    dataMap.set(proposal.dataCID, { 
                        name: isNetworkError 
                            ? 'Unable to load proposal title due to network issues'
                            : 'Failed to load proposal', 
                        description: isNetworkError 
                            ? 'Please try again later when network connection improves.'
                            : 'Error loading proposal data' 
                    });
                }
            }
        }
            setProposalData(dataMap);
        } catch (err: any) {
            console.error('Error fetching pending proposals:', err);
            setError('Failed to fetch pending proposals');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAcceptProposal = async (proposalIndex: number) => {
        const proposal = pendingProposals[proposalIndex];
        const proposalId = proposal.proposalId;
        
        setActionStatus(prev => ({ ...prev, [proposalIndex]: 'Requesting MetaMask signature...' }));
        try {
            const txResponse = await contractService.acceptProposal(electionId, proposalId);
            
            if (!txResponse) {
                throw new Error('Transaction failed');
            }

            setActionStatus(prev => ({ ...prev, [proposalIndex]: `Transaction sent: ${txResponse.hash}. Waiting for confirmation...` }));
            
            const receipt = await txResponse.wait();
            setActionStatus(prev => ({ ...prev, [proposalIndex]: `Accepted! TX: ${receipt?.hash}` }));
            
            setTimeout(() => {
                onProposalAccepted();
                fetchPendingProposals();
            }, 2000);
        } catch (err: any) {
            console.error('Error accepting proposal:', err);
            let errorMessage = err.message || 'Failed to accept proposal';
            
            if (errorMessage.includes('user rejected') || errorMessage.includes('User rejected')) {
                errorMessage = 'Transaction was rejected by user';
            }
            
            setActionStatus(prev => ({ ...prev, [proposalIndex]: `Error: ${errorMessage}` }));
        }
    };

    const handleDeclineProposal = async (proposalIndex: number) => {
        const proposal = pendingProposals[proposalIndex];
        const proposalId = proposal.proposalId;
        
        setActionStatus(prev => ({ ...prev, [proposalIndex]: 'Requesting MetaMask signature...' }));
        try {
            const txResponse = await contractService.declineProposal(electionId, proposalId);
            
            if (!txResponse) {
                throw new Error('Transaction failed');
            }

            setActionStatus(prev => ({ ...prev, [proposalIndex]: `Transaction sent: ${txResponse.hash}. Waiting for confirmation...` }));
            
            const receipt = await txResponse.wait();
            setActionStatus(prev => ({ ...prev, [proposalIndex]: `Declined! TX: ${receipt?.hash}` }));
            
            setTimeout(() => {
                fetchPendingProposals();
            }, 2000);
        } catch (err: any) {
            console.error('Error declining proposal:', err);
            let errorMessage = err.message || 'Failed to decline proposal';
            
            if (errorMessage.includes('user rejected') || errorMessage.includes('User rejected')) {
                errorMessage = 'Transaction was rejected by user';
            }
            
            setActionStatus(prev => ({ ...prev, [proposalIndex]: `Error: ${errorMessage}` }));
        }
    };

    const formatTimestamp = (timestamp: number) => {
        return new Date(timestamp * 1000).toLocaleString();
    };

    if (!isOwner) {
        return (
            <div className="modal-overlay">
                <div className="access-denied-container">
                    <h2 className="access-denied-title">Access Denied</h2>
                    <p className="access-denied-text">Only the contract owner can manage pending proposals.</p>
                    <button
                        onClick={onClose}
                        className="modal-button cancel"
                    >
                        Close
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="modal-overlay">
            <div className="modal-container-large">
                <div className="modal-header">
                    <h2 className="modal-title">
                        Pending Proposals for "{electionName}"
                    </h2>
                    <button
                        onClick={onClose}
                        className="modal-close-button"
                    >
                        Close
                    </button>
                </div>

                {error && (
                    <div className="modal-message error">
                        {error}
                    </div>
                )}

                {isLoading ? (
                    <div className="loading-container">
                        <p>Loading pending proposals...</p>
                    </div>
                ) : pendingProposals.length === 0 ? (
                    <div className="empty-state">
                        <p>No pending proposals found.</p>
                    </div>
                ) : (
                    <div className="proposals-list">
                        {pendingProposals.map((proposal, index) => {
                            const data = proposalData.get(proposal.dataCID);
                            const status = actionStatus[index];
                            const isActionInProgress = !!(status && !status.includes('Error') && !status.includes('!'));

                            return (
                                <div key={index} className="proposal-item">
                                    <div className="proposal-item-header">
                                        <div className="proposal-item-content">
                                            <h3 className="proposal-item-title">
                                                {data?.name || 'Loading...'}
                                            </h3>
                                            {data?.description && (
                                                <p className="proposal-item-description">
                                                    {data.description}
                                                </p>
                                            )}
                                            <div className="proposal-item-meta">
                                                <p>
                                                    <strong>Submitted:</strong> {formatTimestamp(proposal.timestamp)}
                                                </p>
                                                {data?.proposerAddress && (
                                                    <p>
                                                        <strong>Proposer address:</strong> {data.proposerAddress}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {proposal.imageCID && (
                                            <div className="proposal-item-image">
                                                <img
                                                    src={ipfsService.getUrl(proposal.imageCID)}
                                                    alt="Proposal"
                                                    className="proposal-image"
                                                    onError={(e) => {
                                                        const target = e.target as HTMLImageElement;
                                                        target.style.display = 'none';
                                                    }}
                                                />
                                            </div>
                                        )}
                                    </div>

                                    {status && (
                                        <div className={`proposal-status ${status.includes('Error') ? 'error' : 'success'}`}>
                                            {status}
                                        </div>
                                    )}

                                    <div className="proposal-actions">
                                        <button
                                            onClick={() => handleDeclineProposal(index)}
                                            disabled={isActionInProgress}
                                            className="proposal-action-button decline"
                                        >
                                            Decline
                                        </button>
                                        <button
                                            onClick={() => handleAcceptProposal(index)}
                                            disabled={isActionInProgress}
                                            className="proposal-action-button accept"
                                        >
                                            Accept
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default PendingProposalsManager;
