import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../identity/AuthContext';
import { useElectionData, useVoting, useElectionActions } from './hooks';
import {
    ElectionHeader,
    ElectionActions,
    StatusMessages,
    ProposalsList,
    ImageModal
} from './components';
import UpdateElectionModal from './components/admin/UpdateElectionModal';
import SubmitProposalModal from './components/SubmitProposalModal';
import PendingProposalsManager from './components/admin/PendingProposalsManager';


const Election: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { cnp, semaphoreIdentity, isOwner, account } = useAuth();
    
    const {
        electionDetail,
        proposalData,
        isLoading,
        error,
        pendingProposalCount,
        refreshData
    } = useElectionData(id);

    const {
        selectedProposalIndex,
        setSelectedProposalIndex,
        isVoting,
        voteError,
        voteStatus,
        handleVote,
        getVotingStatusMessage,
        canVote
    } = useVoting(electionDetail, semaphoreIdentity, cnp, refreshData);

    const {
        actionStatus,
        executeElectionAction
    } = useElectionActions(isOwner, account, refreshData);

    const [showUpdateModal, setShowUpdateModal] = useState(false);
    const [showSubmitProposalModal, setShowSubmitProposalModal] = useState(false);
    const [showPendingProposalsModal, setShowPendingProposalsModal] = useState(false);
    const [showImageModal, setShowImageModal] = useState(false);
    const [selectedImage, setSelectedImage] = useState<{ url: string; cid: string; name: string } | null>(null);

    const canStart = () => {
        if (!electionDetail || electionDetail.active || electionDetail.finalized) return false;
        return Date.now() >= electionDetail.startTime * 1000 && Date.now() < electionDetail.endTime * 1000;
    };

    const canEdit = () => Boolean(electionDetail && !electionDetail.active && !electionDetail.finalized);

    const handleImageClick = (imageUrl: string, imageCID: string, name: string) => {
        setSelectedImage({ url: imageUrl, cid: imageCID, name });
        setShowImageModal(true);
    };

    if (isLoading && !electionDetail) return <div className="loading-message">Loading election details from blockchain...</div>;
    if (error && !electionDetail) return <div className="status-message error">Error: {error}</div>;
    if (!electionDetail) return <div className="status-message error">Election not found.</div>;

    const votingMessage = getVotingStatusMessage();

    return (
        <div className="election-container">
            <ElectionHeader electionDetail={electionDetail} />

            <ElectionActions
                electionDetail={electionDetail}
                canVote={Boolean(canVote)}
                isVoting={isVoting}
                selectedProposalIndex={selectedProposalIndex}
                handleVote={handleVote}
                isOwner={isOwner}
                pendingProposalCount={pendingProposalCount}
                canStart={canStart}
                canEdit={canEdit}
                actionStatus={actionStatus}
                executeElectionAction={executeElectionAction}
                onShowSubmitProposalModal={() => setShowSubmitProposalModal(true)}
                onShowPendingProposalsModal={() => setShowPendingProposalsModal(true)}
                onShowUpdateModal={() => setShowUpdateModal(true)}
                account={account}
            />

            <StatusMessages
                actionStatus={actionStatus}
                voteStatus={voteStatus}
                voteError={voteError}
                votingMessage={votingMessage}
            />

            <ProposalsList
                electionDetail={electionDetail}
                proposalData={proposalData}
                canVote={Boolean(canVote)}
                selectedProposalIndex={selectedProposalIndex}
                isVoting={isVoting}
                setSelectedProposalIndex={setSelectedProposalIndex}
                onImageClick={handleImageClick}
            />

            {/* Modals */}
            {showUpdateModal && (
                <UpdateElectionModal
                    electionId={electionDetail.electionId}
                    currentElection={{
                        name: electionDetail.name,
                        cityArea: electionDetail.cityArea,
                        startTime: electionDetail.startTime,
                        endTime: electionDetail.endTime,
                        proposals: electionDetail.proposals
                    }}
                    onClose={() => setShowUpdateModal(false)}
                    onSuccess={refreshData}
                />
            )}

            {showSubmitProposalModal && (
                <SubmitProposalModal
                    electionId={electionDetail.electionId}
                    electionName={electionDetail.name}
                    onClose={() => setShowSubmitProposalModal(false)}
                    onSubmitSuccess={refreshData}
                />
            )}

            {showPendingProposalsModal && (
                <PendingProposalsManager
                    electionId={electionDetail.electionId}
                    electionName={electionDetail.name}
                    onClose={() => setShowPendingProposalsModal(false)}
                    onProposalAccepted={refreshData}
                />
            )}

            <ImageModal
                show={showImageModal}
                selectedImage={selectedImage}
                onClose={() => setShowImageModal(false)}
            />
        </div>
    );
};

export default Election;
