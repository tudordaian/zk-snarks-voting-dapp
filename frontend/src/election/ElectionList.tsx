import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../identity/AuthContext';
import { contractService } from '../blockchain/services/contractService';
import { getElectionStatus, getElectionTimingMessage } from '../utils/timeUtils'; 
import { ContractElectionView, ElectionView } from './types';

const ElectionList: React.FC = () => {
    const [elections, setElections] = useState<ElectionView[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>('');
    const [actionStatus, setActionStatus] = useState<{[key: number]: string}>({});
    const [pendingCounts, setPendingCounts] = useState<{[key: number]: number}>({});
    const [proposalCounts, setProposalCounts] = useState<{[key: number]: number}>({});

    const { isOwner, account } = useAuth();
    const navigate = useNavigate();

    const transformToDisplayView = (contractElections: ContractElectionView[]): ElectionView[] => {
        return contractElections.map(({ electionId, startTime, endTime, ...rest }) => ({
            ...rest,
            electionId: Number(electionId),
            startTime: Number(startTime),
            endTime: Number(endTime),
        }));
    };
    
    useEffect(() => {
        fetchElections();
    }, []);

    const fetchPendingCounts = async (electionsData: ElectionView[]) => {
        if (!isOwner) return;
        
        const counts: {[key: number]: number} = {};
        for (const election of electionsData) {
            if (!election.active && !election.finalized) {
                try {
                    counts[election.electionId] = await contractService.getPendingProposalCount(election.electionId);
                } catch (err) {
                    console.error(`Error fetching pending count for election ${election.electionId}:`, err);
                    counts[election.electionId] = 0;
                }
            } else {
                counts[election.electionId] = 0;
            }
        }
        setPendingCounts(counts);
    };

    const fetchProposalCounts = async (electionsData: ElectionView[]) => {
        const counts: {[key: number]: number} = {};
        for (const election of electionsData) {
            try {
                const proposals = await contractService.getProposals(election.electionId);
                counts[election.electionId] = proposals.length;
            } catch (err) {
                console.error(`Error fetching proposal count for election ${election.electionId}:`, err);
                counts[election.electionId] = 0;
            }
        }
        setProposalCounts(counts);
    };

    const fetchElections = async () => {
        setIsLoading(true);
        setError('');
        try {
            const contractData = await contractService.getAllElections();
            const transformedElections = transformToDisplayView(contractData);
            setElections(transformedElections);
            
            await fetchPendingCounts(transformedElections);
            await fetchProposalCounts(transformedElections);
        } catch (e: any) {
            setError('Failed to fetch elections from contract.');
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const executeElectionAction = async (electionId: number, action: () => Promise<any>, actionName: string) => {
        setActionStatus(prev => ({ ...prev, [electionId]: `${actionName}...` }));
        try {
            if (!isOwner || !account) {
                throw new Error(`Only owner can ${actionName.toLowerCase()} the election.`);
            }

            setActionStatus(prev => ({ ...prev, [electionId]: `Admin: Requesting MetaMask signature.` }));
            
            const txResponse = await action();
            if (!txResponse) throw new Error(`Failed to initiate transaction`);

            setActionStatus(prev => ({ ...prev, [electionId]: `Transaction sent: ${txResponse.hash}. Waiting confirmation...` }));
            
            const receipt = await txResponse.wait();
            setActionStatus(prev => ({ ...prev, [electionId]: `Success! Tx: ${receipt?.hash}` }));
            
            await fetchElections();
        } catch (err: any) {
            console.error(`${actionName} election error:`, err);
            const errorMessage = err.message?.includes('user rejected') ? 'Transaction was rejected by user.' : err.message;
            setActionStatus(prev => ({ ...prev, [electionId]: `Error: ${errorMessage}` }));
        }
    };

    const handleStartElection = (electionId: number) => executeElectionAction(electionId, () => contractService.startElection(electionId), 'Starting');
    const handleEndElection = (electionId: number) => executeElectionAction(electionId, () => contractService.endElection(electionId), 'Ending');
    const handleDeleteElection = (electionId: number) => executeElectionAction(electionId, () => contractService.deleteElection(electionId), 'Deleting');

    const handleCardClick = (electionId: number) => {
        navigate(`/elections/${electionId}`);
    };

    const isButtonDisabled = (electionId: number) => isLoading || (!!actionStatus[electionId] && !actionStatus[electionId]?.includes('Error'));

    const canStart = (election: ElectionView) => {
        if (election.active || election.finalized) return false;
        const now = Date.now() / 1000;
        return now >= election.startTime && now < election.endTime;
    };

    if (isLoading && elections.length === 0) return <div className="loading-message">Loading elections...</div>;
    if (error) return <div className="status-message error">{error}</div>;

    return (
        <div className="election-list-container">
            <h2 className="election-list-title">Elections</h2>
            {elections.length === 0 && !isLoading ? (
                <p className="no-elections">
                    No elections found.
                </p>
            ) : (
                <div className="election-list">
                    {elections.map((election) => (
                        <div 
                            key={election.electionId} 
                            className="election-card clickable-card"
                            onClick={() => handleCardClick(election.electionId)}
                        >
                            <div className="election-card-header">
                                <h3 className="election-card-title">
                                    {election.name}
                                </h3>
                                
                                <div className="election-details-grid">
                                    <p className="election-card-details">
                                        <strong>Status:</strong> {getElectionStatus(election)}
                                    </p>

                                    <p className="election-card-details">
                                        <strong>Proposal count:</strong> {proposalCounts[election.electionId] || 0}
                                    </p>
                                    <div className="grid-empty-cell"></div>
                                    <p className="election-card-details">
                                        <strong>City Area:</strong> {election.cityArea}
                                    </p>


                                    {isOwner && pendingCounts[election.electionId] > 0 ? (
                                        <p className="pending-proposals grid-pending-message">
                                            📋 {pendingCounts[election.electionId]} pending proposal{pendingCounts[election.electionId] !== 1 ? 's' : ''}
                                        </p>
                                    ) : (
                                        <div className="grid-empty-cell"></div>
                                    )}

                                    <div className="grid-button-container">
                                        {isOwner && election.active && !election.finalized && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleEndElection(election.electionId);
                                                }}
                                                disabled={isButtonDisabled(election.electionId)}
                                                className={`action-button ${isButtonDisabled(election.electionId) ? '' : 'danger'}`}
                                            >
                                                End
                                            </button>
                                        )}
                                        {isOwner && canStart(election) && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleStartElection(election.electionId);
                                                }}
                                                disabled={isButtonDisabled(election.electionId)}
                                                className={`action-button ${isButtonDisabled(election.electionId) ? '' : 'primary'}`}
                                            >
                                                Start
                                            </button>
                                        )}
                                        {isOwner && !election.active && !election.finalized && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteElection(election.electionId);
                                                }}
                                                disabled={isButtonDisabled(election.electionId)}
                                                className={`action-button ${isButtonDisabled(election.electionId) ? '' : 'gray'}`}
                                            >
                                                Delete
                                            </button>
                                        )}
                                    </div>
                                    <p className="election-timing grid-timing-span">
                                        {getElectionTimingMessage(election)}
                                    </p>
                                    <div className="grid-empty-cell"></div>
                                </div>
                            </div>

                            {actionStatus[election.electionId] && (
                                <div className={`election-status-message ${actionStatus[election.electionId].includes('Error') ? 'error' : 'success'}`}>
                                    {actionStatus[election.electionId]}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ElectionList;