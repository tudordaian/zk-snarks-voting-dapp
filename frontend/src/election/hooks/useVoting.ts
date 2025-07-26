import { useState } from 'react';
import { Identity } from '@semaphore-protocol/identity';
import { SemaphoreProof } from '@semaphore-protocol/proof';
import { apiService } from '../services/apiService';
import { contractService } from '../../blockchain/services/contractService';
import { generateSemaphoreProof, createVoteSignal, MERKLE_TREE_DEPTH } from '../../identity/services/semaphoreClientService';
import { ElectionDetailView, UseVotingReturn } from '../types';

export const useVoting = (
    electionDetail: ElectionDetailView | null,
    semaphoreIdentity: Identity | null,
    cnp: string | null,
    onVoteSuccess: () => void
): UseVotingReturn => {
    const [selectedProposalIndex, setSelectedProposalIndex] = useState<number | null>(null);
    const [isVoting, setIsVoting] = useState(false);
    const [voteError, setVoteError] = useState('');
    const [voteStatus, setVoteStatus] = useState('');

    const getErrorMessage = (error: any): string => {
        // contract errors
        if (error.status === 409) {
            return error.message || "You have already voted in this election.";
        }
        
        if (error.message?.includes("You have already voted in this election") ||
            error.message?.includes("Nullifier was already used")) {
            return "You have already voted in this election.";
        }
        
        if (error.message?.includes("Election inactive") ||
            error.message?.includes("not currently active")) {
            return "This election is not currently active.";
        }
        
        if (error.message?.includes("Election has ended") ||
            error.message?.includes("already ended")) {
            return "This election has already ended.";
        }
        
        if (error.message?.includes("Election has not started") ||
            error.message?.includes("not started yet")) {
            return "This election has not started yet.";
        }
        
        // semaphore errors
        if (error.message?.includes("Semaphore__MerkleTreeRootIsNotPartOfTheGroup")) {
            return "Identity verification failed. Please try again.";
        }
        
        // nonce errors
        if (error.message?.includes("nonce has already been used") || 
            error.message?.includes("Nonce too low") ||
            error.message?.includes("NONCE_EXPIRED") ||
            error.message?.includes("nonce conflict")) {
            return "Transaction timing conflict. Please try again.";
        }
        
        // user rejection
        if (error.message?.includes("user rejected") || 
            error.message?.includes("User rejected") ||
            error.message?.includes("rejected by user")) {
            return "Transaction was cancelled.";
        }
        
        if (error.status >= 500) {
            return "Server error occurred. Please try again.";
        }
        
        // fallback
        if (error.message) {
            return error.message;
        }
        
        return 'Failed to cast vote. Please try again.';
    };

    const handleVote = async () => {
        if (!semaphoreIdentity || !cnp) {
            setVoteError("Identity or CNP not available. Cannot vote.");
            return;
        }
        if (selectedProposalIndex === null) {
            setVoteError("Please select a proposal to vote for.");
            return;
        }
        if (!electionDetail) {
            setVoteError("Election data not available.");
            return;
        }

        setIsVoting(true);
        setVoteError('');

        try {
            setVoteStatus('Verifying identity membership...');
            const groupMembers = await contractService.getSemaphoreGroupMembers();
            if (!groupMembers || groupMembers.length === 0) {
                throw new Error("Could not fetch group members or the group is empty.");
            }
            if (!groupMembers.includes(semaphoreIdentity.commitment.toString())) {
                throw new Error("Your identity commitment is not part of the retrieved group members.");
            }

            setVoteStatus('Fetching current merkle tree root from contract...');
            const currentMerkleRoot = await contractService.getCurrentMerkleTreeRoot();
            console.log("Fetched merkle root:", currentMerkleRoot);

            setVoteStatus('Generating ZK proof with current contract state...');
            const externalNullifier = BigInt(electionDetail.electionId);
            const voteSignal = createVoteSignal(selectedProposalIndex);

            const generatedProof: SemaphoreProof = await generateSemaphoreProof(
                semaphoreIdentity,
                groupMembers,
                externalNullifier,
                voteSignal,
                MERKLE_TREE_DEPTH
            );

            setVoteStatus('Proof generated. Submitting vote to be relayed...');

            const votePayload = {
                proposalIndex: selectedProposalIndex,
                merkleTreeRoot: currentMerkleRoot, 
                nullifierHash: generatedProof.nullifier,
                proof: generatedProof.points,
            };

            const result = await apiService.voteZkp(electionDetail.electionId, votePayload);
            setVoteStatus(`Vote casted successfully! Transaction: ${result.data?.hash || 'N/A'}`);
            setVoteError('');
            setSelectedProposalIndex(null);
            
            onVoteSuccess();

        } catch (e: any) {
            console.error("Voting process error:", e);
            setVoteError(getErrorMessage(e));
            setVoteStatus('');
        } finally {
            setIsVoting(false);
        }
    };

    const getVotingStatusMessage = () => {
        if (!electionDetail) return null;
        if (electionDetail.finalized) return "Voting has ended.";
        if (!electionDetail.active) {
            if (Date.now() < electionDetail.startTime * 1000) return "This election has not started yet.";
            if (Date.now() > electionDetail.endTime * 1000) return "Voting has ended.";
        }
        if (!cnp) return "Login with CNP to vote.";
        if (!semaphoreIdentity) return "Setup Semaphore Identity to vote.";
        return null;
    };

    const canVote = Boolean(cnp && semaphoreIdentity && electionDetail?.active && !electionDetail?.finalized);

    return {
        selectedProposalIndex,
        setSelectedProposalIndex,
        isVoting,
        voteError,
        voteStatus,
        handleVote,
        getVotingStatusMessage,
        canVote
    };
};
