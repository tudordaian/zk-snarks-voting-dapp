import { useState, useEffect, useRef } from 'react';
import { contractService } from '../../blockchain/services/contractService';
import { ipfsService } from '../services/ipfsService';
import { ElectionDetailView, ProposalData, UseElectionDataReturn } from '../types';

export const useElectionData = (electionId: string | undefined): UseElectionDataReturn => {
    const [electionDetail, setElectionDetail] = useState<ElectionDetailView | null>(null);
    const [proposalData, setProposalData] = useState<Map<string, ProposalData>>(new Map());
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [pendingProposalCount, setPendingProposalCount] = useState<number>(0);
    const isFetchingRef = useRef(false);

    const fetchElectionDetails = async (currentElectionId: string, showLoadingSpinner = true) => {
        if (isFetchingRef.current && !showLoadingSpinner) {
            console.log('Skipping fetch - already in progress');
            return;
        }
        
        isFetchingRef.current = true;
        
        if (showLoadingSpinner) setIsLoading(true);
        setError('');
        try {
            const election = await contractService.getElection(currentElectionId);
            if (!election) {
                setError(`Election with ID ${currentElectionId} not found.`);
                setElectionDetail(null);
                if (showLoadingSpinner) setIsLoading(false);
                return;
            }

            const proposalsData = await contractService.getProposals(currentElectionId);
            const dataMap = new Map<string, ProposalData>();
        
            for (let i = 0; i < proposalsData.length; i++) {
                const proposal = proposalsData[i];
                
                if (proposal.dataCID && proposal.dataCID.trim() !== '') {
                    try {
                        const timeoutPromise = new Promise<never>((_, reject) =>
                            setTimeout(() => reject(new Error('IPFS request timed out')), 8000)
                        );
                        
                        const dataPromise = ipfsService.getData(proposal.dataCID);
                        const data = await Promise.race([dataPromise, timeoutPromise]);
                        
                        let imageUrl: string | undefined;
                        
                        if (proposal.imageCID && proposal.imageCID.trim() !== '') {
                            try {
                                imageUrl = ipfsService.getUrl(proposal.imageCID);
                            } catch (imgError) {
                                console.warn(`Failed to generate image URL for proposal ${i + 1}:`, imgError);
                                imageUrl = ipfsService.getUrl(proposal.imageCID);
                            }
                        }
                        
                        dataMap.set(proposal.dataCID, {
                            name: data.name,
                            description: data.description || 'No description available',
                            imageUrl: imageUrl,
                            proposerAddress: data.proposerAddress
                        });
                    } catch (error: any) {
                        console.warn(`Failed to fetch data for proposal ${i + 1}:`, error);
                        
                        const isNetworkError = error.message?.includes('timeout') || 
                                             error.message?.includes('fetch failed') ||
                                             error.message?.includes('ETIMEDOUT');
                        
                        dataMap.set(proposal.dataCID, {
                            name: `Proposal ${i + 1}`,
                            description: isNetworkError 
                                ? 'Unable to load description due to network issues. Please try again later.'
                                : 'Description not available',
                            imageUrl: undefined,
                            proposerAddress: undefined
                        });
                    }
                }
            }
            
            setProposalData(dataMap);

            setElectionDetail({
                electionId: Number(election.electionId),
                name: election.name,
                cityArea: election.cityArea,
                startTime: Number(election.startTime),
                endTime: Number(election.endTime),
                active: election.active,
                finalized: election.finalized,
                proposals: proposalsData.map(p => ({
                    voteCount: Number(p.voteCount),
                    winningProposal: p.winningProposal,
                    dataCID: p.dataCID,
                    imageCID: p.imageCID,
                })),
            });

        } catch {
            setError("failed to fetch election details from contract");
            setElectionDetail(null);
        } finally {
            if (showLoadingSpinner) setIsLoading(false);
            isFetchingRef.current = false;
        }
    };

    const pollVoteCounts = async (currentElectionId: string) => {
        if (!electionDetail || electionDetail.finalized) return;

        console.log(`Polling votes for election ${currentElectionId}`);
        try {
            await fetchElectionDetails(currentElectionId, false);
        } catch (err: any) {
            console.warn(`Failed to poll data for election ${currentElectionId}: ${err.message}`);
        }
    };

    const fetchPendingProposalCount = async (currentElectionId: string) => {
        if (!currentElectionId) return;
        try {
            const count = await contractService.getPendingProposalCount(currentElectionId);
            setPendingProposalCount(count);
        } catch (err: any) {
            console.error('Error fetching pending proposal count:', err);
        }
    };

    const refreshData = () => {
        if (electionId) {
            fetchElectionDetails(electionId, false);
            fetchPendingProposalCount(electionId);
        }
    };

    useEffect(() => {
        if (electionId) {
            fetchElectionDetails(electionId);
            fetchPendingProposalCount(electionId);
        }
    }, [electionId]);

    useEffect(() => {
        if (!electionId || !electionDetail || electionDetail.finalized) return;
        
        const intervalId = setInterval(() => pollVoteCounts(electionId), 10000);
        return () => clearInterval(intervalId);
    }, [electionId, electionDetail?.finalized, electionDetail?.active]);

    return {
        electionDetail,
        proposalData,
        isLoading,
        error,
        pendingProposalCount,
        refreshData,
        fetchElectionDetails
    };
};
