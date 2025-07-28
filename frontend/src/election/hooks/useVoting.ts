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
        if (error.status >= 500) {
            return "Server error occurred. Please try again.";
        }
        
        if (error.status === 409) {
            return error.message || "You have already voted in this election.";
        }
        
        if (error.message?.includes("You have already voted in this election")) {
            return "You have already voted in this election.";
        }
        
        if (error.message?.includes("Invalid zero-knowledge proof")) {
            return "Invalid voting proof.";
        }
        
        if (error.message?.includes("Identity verification failed")) {
            return "Identity verification failed.";
        }
        
        if (error.message?.includes("Smart contract error occurred")) {
            return "Blockchain error occurred.";
        }
        
        // nonce errors
        if (error.message?.includes("nonce has already been used") || 
            error.message?.includes("Nonce too low") ||
            error.message?.includes("NONCE_EXPIRED") ||
            error.message?.includes("nonce conflict")) {
            return "Transaction nonce error.";
        }
        
        // user rejection
        if (error.message?.includes("user rejected") || 
            error.message?.includes("User rejected") ||
            error.message?.includes("rejected by user")) {
            return "Transaction was cancelled.";
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
            setVoteStatus('Fetching identity mapping...');
            const identityMapping = await apiService.getIdentityMappingByCnp(cnp);
            if (!identityMapping.success || !identityMapping.data) {
                throw new Error("Could not fetch identity mapping for CNP.");
            }
            
            const { groupId } = identityMapping.data;
            console.log("User belongs to group:", groupId);

            setVoteStatus('Verifying identity membership in group...');
            const groupMembers = await contractService.getSemaphoreGroupMembers(groupId);
            if (!groupMembers || groupMembers.length === 0) {
                throw new Error(`Could not fetch group members for group ${groupId} or the group is empty.`);
            }
            if (!groupMembers.includes(semaphoreIdentity.commitment.toString())) {
                throw new Error("Your identity commitment is not part of the retrieved group members.");
            }

            setVoteStatus('Fetching current merkle tree root from contract...');
            const currentMerkleRoot = await contractService.getCurrentMerkleTreeRoot(groupId);
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
                groupId: groupId,
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
