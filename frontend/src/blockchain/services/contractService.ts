import {Contract, ethers, Signer, TransactionResponse} from 'ethers';
import ProjectPollLedgerArtifact from '../../../abi/ProjectPollLedger.json';
import {getSigner} from "./metamaskService";
import { ContractProposal, ContractElectionView, PendingProposal } from '../../election/types';
import SemaphoreArtifact from '../../../abi/Semaphore.json';

const RPC_URL = import.meta.env.VITE_APP_RPC_URL;
const CONTRACT_ADDRESS = import.meta.env.VITE_APP_PROJECT_POLL_LEDGER_ADDRESS;

const getContract = (signer?: Signer): Contract => {
    const contractProvider = signer || new ethers.JsonRpcProvider(RPC_URL);
    return new Contract(
        CONTRACT_ADDRESS,
        ProjectPollLedgerArtifact.abi,
        contractProvider
    );
}

const getContractWithSigner = async (): Promise<Contract | null> => {
    const signer = await getSigner();
    if(!signer) {
        console.error("failed to get metamask signer");
        return null;
    }
    return getContract(signer);
}


// SC READ

const getAllElections = async (): Promise<ContractElectionView[]> => {
    const contract = getContract();
    try {
        const elections = await contract.getAllElections();
        return elections.map((election: any) => ({
            electionId: BigInt(election.electionId),
            name: election.name,
            cityArea: election.cityArea,
            startTime: BigInt(election.startTime),
            endTime: BigInt(election.endTime),
            active: election.active,
            finalized: election.finalized
        }));
    } catch (error) {
        console.error("error fetching all elections from contract:", error);
        throw error;
    }
}

const getElection = async (electionId: string | number): Promise<ContractElectionView> => {
    const contract = getContract();
    try {
        const election = await contract.getElection(electionId);
        return {
            electionId: BigInt(election.electionId),
            name: election.name,
            cityArea: election.cityArea,
            startTime: BigInt(election.startTime),
            endTime: BigInt(election.endTime),
            active: election.active,
            finalized: election.finalized
        };
    } catch (error) {
        console.error("error fetching election by id from contract:", error);
        throw error;
    }
}

const getProposals = async (electionId: string | number): Promise<ContractProposal[]> => {
    const contract = getContract();
    try {
        const proposals = await contract.getProposals(electionId);
        return proposals.map((proposal: any) => ({
            voteCount: BigInt(proposal.voteCount),
            winningProposal: proposal.winningProposal,
            dataCID: proposal.dataCID,
            imageCID: proposal.imageCID
        }));
    } catch (error) {
        console.error(`Error fetching proposals for election ${electionId} from contract:`, error);
        throw error;
    }
};

const checkVotes = async (electionId: string | number): Promise<bigint[]> => {
    const contract = getContract();
    try {
        const voteCounts = await contract.checkVotes(electionId);
        return voteCounts.map((voteCount: any) => BigInt(voteCount));
    } catch (error) {
        console.error(`Error checking votes for election ${electionId} from contract:`, error);
        throw error;
    }
};

const getCurrentMerkleTreeRoot = async (localGroupId: number): Promise<string> => {
    const contract = getContract();
    try {
        const semaphoreGroupId = await contract.getSemaphoreGroupId(localGroupId);
        console.log(`Getting merkle root for local group ${localGroupId} (Semaphore group ${semaphoreGroupId})`);
        
        const semaphoreAddress = await contract.semaphore();
        const semaphoreContract = new Contract(
            semaphoreAddress,
            SemaphoreArtifact.abi,
            contract.runner
        );
        
        const merkleTreeRoot = await semaphoreContract.getMerkleTreeRoot(semaphoreGroupId);
        console.log(`Merkle root for Semaphore group ${semaphoreGroupId}:`, merkleTreeRoot.toString());
        return merkleTreeRoot.toString();
    } catch (error) {
        console.error('Error fetching merkle tree root:', error);
        throw handleContractError(error, 'fetch merkle tree root');
    }
};

const getSemaphoreGroupMembers = async (localGroupId: number = 0): Promise<string[]> => {
    const contract = getContract();
    try {
        const semaphoreGroupId = await contract.getSemaphoreGroupId(localGroupId);
        console.log(`Local group ${localGroupId} maps to Semaphore group ${semaphoreGroupId}`);
        
        const semaphoreAddress = await contract.semaphore();
        const semaphoreContract = new Contract(
            semaphoreAddress,
            SemaphoreArtifact.abi,
            contract.runner
        );
        
        const filter = semaphoreContract.filters.MemberAdded(semaphoreGroupId);
        const events = await semaphoreContract.queryFilter(filter);
        
        const members = events.map(event => {
            if ('args' in event && event.args) {
                const identityCommitment = event.args.identityCommitment;
                return identityCommitment ? identityCommitment.toString() : null;
            }
            return null;
        }).filter(commitment => commitment !== null) as string[];
        
        console.log(`Found ${members.length} members in Semaphore group ${semaphoreGroupId}:`, members);
        return members;
    } catch (error) {
        console.error('Error fetching group members:', error);
        throw handleContractError(error, 'fetch group members');
    }
};

const getSemaphoreGroupId = async (localGroupId: number): Promise<number> => {
    const contract = getContract();
    try {
        const semaphoreGroupId = await contract.getSemaphoreGroupId(localGroupId);
        return Number(semaphoreGroupId);
    } catch (error) {
        console.error(`Error getting Semaphore group ID for local group ${localGroupId}:`, error);
        throw handleContractError(error, 'get Semaphore group ID');
    }
};

const getGroupSize = async (): Promise<number> => {
    const contract = getContract();
    try {
        const semaphoreAddress = await contract.semaphore();
        const semaphoreContract = new Contract(
            semaphoreAddress,
            SemaphoreArtifact.abi,
            contract.runner
        );
        
        const GROUP_ID = 0;
        const size = await semaphoreContract.getMerkleTreeSize(GROUP_ID);
        return Number(size);
    } catch (error) {
        console.error('Error fetching group size:', error);
        throw handleContractError(error, 'fetch group size');
    }
};

const getPendingProposals = async (electionId: string | number): Promise<PendingProposal[]> => {
    const contract = getContract();
    try {
        const pendingProposals = await contract.getPendingProposals(electionId);
        return pendingProposals.map((proposal: any) => ({
            proposalId: Number(proposal.proposalId),
            dataCID: proposal.dataCID,
            imageCID: proposal.imageCID,
            timestamp: Number(proposal.timestamp),
            processed: proposal.processed
        }));
    } catch (error) {
        console.error(`Error getting pending proposals for election ${electionId}:`, error);
        throw error;
    }
};

const getPendingProposalCount = async (electionId: string | number): Promise<number> => {
    const contract = getContract();
    try {
        const count = await contract.getPendingProposalCount(electionId);
        return Number(count);
    } catch (error) {
        console.error(`Error getting pending proposal count for election ${electionId}:`, error);
        throw error;
    }
};

const getContractOwner = async (): Promise<string> => {
    const contract = getContract();
    try {
        return await contract.owner();
    } catch (error: any) {
        console.error("Error fetching contract owner:", error);
        if (error?.message?.includes('network') || error?.message?.includes('connection')) {
            console.log("Retrying contract owner fetch due to network problem...");
            try {
                await new Promise(resolve => setTimeout(resolve, 1000));
                return await contract.owner();
            } catch (retryError: any) {
                console.error("Retry failed:", retryError);
                throw retryError;
            }
        }
        throw error;
    }
};


// SC WRITE

const createElection = async (
    name: string,
    cityArea: string,
    proposalCount: number,
    proposalDataCIDs: string[],
    proposalImageCIDs: string[],
    startTime: number,
    endTime: number,
): Promise<TransactionResponse | null> => {
    const contract = await getContractWithSigner();
    if (!contract) return null
    try {
        return await contract.createElection(name, cityArea, proposalCount, proposalDataCIDs, proposalImageCIDs, startTime, endTime);
    } catch (error: any) {
        throw handleContractError(error, 'createElection');
    }
};

const startElection = async (electionId: number): Promise<TransactionResponse | null> => {
    const contract = await getContractWithSigner();
    if (!contract) return null;
    try {
        return await contract.startElection(electionId);
    } catch (error: any) {
        throw handleContractError(error, 'startElection');
    }
};

const endElection = async (electionId: number): Promise<TransactionResponse | null> => {
    const contract = await getContractWithSigner();
    if (!contract) return null;
    try {
        return await contract.endElection(electionId);
    } catch (error: any) {
        throw handleContractError(error, 'endElection');
    }
};

const updateElection = async (
    electionId: number,
    name: string,
    cityArea: string,
    proposalCount: number,
    proposalDataCIDs: string[],
    proposalImageCIDs: string[],
    startTime: number,
    endTime: number,
): Promise<TransactionResponse | null> => {
    const contract = await getContractWithSigner();
    if (!contract) return null;
    try {
        return await contract.updateElection(electionId, name, cityArea, proposalCount, proposalDataCIDs, proposalImageCIDs, startTime, endTime);
    } catch (error: any) {
        throw handleContractError(error, 'updateElection');
    }
};

const deleteElection = async (electionId: number): Promise<TransactionResponse | null> => {
    const contract = await getContractWithSigner();
    if (!contract) return null;
    try {
        return await contract.deleteElection(electionId);
    } catch (error: any) {
        throw handleContractError(error, 'deleteElection');
    }
};



const submitProposal = async (
    electionId: number,
    dataCID: string,
    imageCID: string
): Promise<TransactionResponse | null> => {
    const contract = await getContractWithSigner();
    if (!contract) return null;
    try {
        return await contract.submitProposal(electionId, dataCID, imageCID);
    } catch (error: any) {
        throw handleContractError(error, 'submitProposal');
    }
};

const acceptProposal = async (
    electionId: number,
    proposalId: number
): Promise<TransactionResponse | null> => {
    const contract = await getContractWithSigner();
    if (!contract) return null;
    try {
        return await contract.acceptProposal(electionId, proposalId);
    } catch (error: any) {
        throw handleContractError(error, 'acceptProposal');
    }
};

const declineProposal = async (
    electionId: number,
    proposalId: number
): Promise<TransactionResponse | null> => {
    const contract = await getContractWithSigner();
    if (!contract) return null;
    try {
        return await contract.declineProposal(electionId, proposalId);
    } catch (error: any) {
        throw handleContractError(error, 'declineProposal');
    }
};


// ERROR

const handleContractError = (error: any, operation: string): Error => {
    console.error(`Error in ${operation}:`, error);
    
    if (error.code === 'NONCE_EXPIRED' || error.message?.includes('nonce')) {
        const nonceError = new Error('Transaction nonce conflict. Please try again.');
        nonceError.name = 'NonceError';
        return nonceError;
    }
    
    if (error.code === 'ACTION_REJECTED' || 
        error.message?.includes('user rejected') || 
        error.message?.includes('User rejected')) {
        const rejectionError = new Error('Transaction was rejected by user');
        rejectionError.name = 'UserRejectionError';
        return rejectionError;
    }
    
    // contract
    if (error.code === 'CALL_EXCEPTION' && error.reason) {
        if (error.reason.includes('Only owner')) {
            const ownerError = new Error('Only the contract owner can perform this action');
            ownerError.name = 'OwnerError';
            return ownerError;
        }
        
        if (error.reason.includes('Nullifier was already used')) {
            const duplicateError = new Error('You have already voted in this election');
            duplicateError.name = 'DuplicateVoteError';
            return duplicateError;
        }
        
        if (error.reason.includes('Cannot submit proposals to an active election')) {
            const proposalError = new Error('Cannot submit proposals to an active election');
            proposalError.name = 'ProposalError';
            return proposalError;
        }
        
        if (error.reason.includes('Cannot submit proposals to a finalized election')) {
            const proposalError = new Error('Cannot submit proposals to a finalized election');
            proposalError.name = 'ProposalError';
            return proposalError;
        }
        
        if (error.reason.includes('Cannot submit proposals after election start time')) {
            const proposalError = new Error('Cannot submit proposals after election start time');
            proposalError.name = 'ProposalError';
            return proposalError;
        }
        
        const contractError = new Error(error.reason);
        contractError.name = 'ContractError';
        return contractError;
    }
    
    const fallbackError = new Error(error.message || 'Transaction failed');
    fallbackError.name = error.name || 'UnknownError';
    return fallbackError;
};

export const contractService = {
    getAllElections,
    getElection,
    getProposals,
    checkVotes,
    createElection,
    startElection,
    endElection,
    updateElection,
    deleteElection,
    getContractOwner,
    submitProposal,
    acceptProposal,
    declineProposal,
    getPendingProposals,
    getPendingProposalCount,
    getCurrentMerkleTreeRoot,
    getSemaphoreGroupMembers,
    getSemaphoreGroupId,
    getGroupSize,
};
