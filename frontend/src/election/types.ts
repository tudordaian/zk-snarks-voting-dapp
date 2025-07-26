import { Identity } from "@semaphore-protocol/identity";

export interface ContractElectionView {
    electionId: bigint;
    name: string;
    cityArea: string;
    startTime: bigint;
    endTime: bigint;
    active: boolean;
    finalized: boolean;
}

export interface ContractProposal {
    voteCount: bigint;
    winningProposal: boolean;
    dataCID: string;
    imageCID: string;
}

export interface PendingProposal {
    proposalId: number;
    dataCID: string;
    imageCID: string;
    timestamp: number;
    processed: boolean;
    proposer: string;
}

export interface ProposalFormData {
    name: string;
    description: string;
    imageFile?: File;
}

export interface BasicProposal {
    voteCount: number;
    winningProposal: boolean;
    dataCID: string;
    imageCID: string;
}

export interface UpdateElectionModalProps {
    electionId: number;
    currentElection: {
        name: string;
        cityArea: string;
        startTime: number;
        endTime: number;
        proposals: BasicProposal[];
    };
    onClose: () => void;
    onSuccess?: () => void;
}

export interface ElectionView {
    electionId: number;
    name: string;
    cityArea: string;
    startTime: number;
    endTime: number;
    active: boolean;
    finalized: boolean;
}

export interface Proposal {
    voteCount: number;
    winningProposal: boolean;
    dataCID: string;
    imageCID: string;
}

export interface ElectionDetailView extends ElectionView {
    proposals: Proposal[];
}

export interface ProposalData {
    name: string;
    description: string;
    imageUrl?: string;
    proposerAddress?: string;
}

export interface VoteZkpPayload {
    proposalIndex: number;
    merkleTreeRoot: string;
    nullifierHash: string;
    proof: string[];
}

export interface UseElectionDataReturn {
    electionDetail: ElectionDetailView | null;
    proposalData: Map<string, ProposalData>;
    isLoading: boolean;
    error: string;
    pendingProposalCount: number;
    refreshData: () => void;
    fetchElectionDetails: (electionId: string, showLoadingSpinner?: boolean) => Promise<void>;
}

export interface UseVotingReturn {
    selectedProposalIndex: number | null;
    setSelectedProposalIndex: (index: number | null) => void;
    isVoting: boolean;
    voteError: string;
    voteStatus: string;
    handleVote: () => Promise<void>;
    getVotingStatusMessage: () => string | null;
    canVote: boolean | null | undefined;
}

export interface UseElectionActionsReturn {
    actionStatus: string;
    executeElectionAction: (verb: 'start' | 'end' | 'delete', electionId: number) => Promise<void>;
    clearActionStatus: () => void;
}

export interface ElectionHeaderProps {
    electionDetail: ElectionDetailView;
}

export interface StatusMessagesProps {
    actionStatus: string;
    voteStatus: string;
    voteError: string;
    votingMessage: string | null;
}

export interface ElectionActionsProps {
    electionDetail: ElectionDetailView;
    canVote: boolean;
    isVoting: boolean;
    selectedProposalIndex: number | null;
    handleVote: () => void;
    isOwner: boolean;
    pendingProposalCount: number;
    canStart: () => boolean;
    canEdit: () => boolean;
    actionStatus: string;
    executeElectionAction: (verb: 'start' | 'end' | 'delete', electionId: number) => void;
    onShowSubmitProposalModal: () => void;
    onShowPendingProposalsModal: () => void;
    onShowUpdateModal: () => void;
    account: string | null;
}

export interface ProposalCardProps {
    proposal: Proposal;
    index: number;
    electionId: number;
    proposalData: ProposalData | undefined;
    canVote: boolean;
    selectedProposalIndex: number | null;
    isVoting: boolean;
    setSelectedProposalIndex: (index: number | null) => void;
    onImageClick: (imageUrl: string, imageCID: string, name: string) => void;
}

export interface ProposalsListProps {
    electionDetail: ElectionDetailView;
    proposalData: Map<string, ProposalData>;
    canVote: boolean;
    selectedProposalIndex: number | null;
    isVoting: boolean;
    setSelectedProposalIndex: (index: number | null) => void;
    onImageClick: (imageUrl: string, imageCID: string, name: string) => void;
}

export interface ImageModalProps {
    show: boolean;
    selectedImage: { url: string; cid: string; name: string } | null;
    onClose: () => void;
}

export interface UseVotingParams {
    electionDetail: ElectionDetailView | null;
    semaphoreIdentity: Identity | null;
    cnp: string | null;
    onVoteSuccess: () => void;
}

export interface UseElectionActionsParams {
    isOwner: boolean;
    account: string | null;
    onActionSuccess: () => void;
}


export interface IpfsUploadResponse {
    cid: string;
}
