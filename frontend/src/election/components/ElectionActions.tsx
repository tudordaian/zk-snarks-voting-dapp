import React from 'react';
import { ElectionActionsProps } from '../types';

const ElectionActions: React.FC<ElectionActionsProps> = ({
    electionDetail,
    canVote,
    isVoting,
    selectedProposalIndex,
    handleVote,
    isOwner,
    pendingProposalCount,
    canStart,
    canEdit,
    actionStatus,
    executeElectionAction,
    onShowSubmitProposalModal,
    onShowPendingProposalsModal,
    onShowUpdateModal,
    account
}) => {
    const canSubmitProposalCheck = () => {
        if (!electionDetail || !account) return false;
        if (electionDetail.active || electionDetail.finalized) return false;
        return Date.now() < electionDetail.startTime * 1000;
    };

    return (
        <div className="election-actions">
            {canVote && (
                <button
                    onClick={handleVote}
                    disabled={isVoting || selectedProposalIndex === null}
                    className={`action-button ${(isVoting || selectedProposalIndex === null) ? '' : 'primary'}`}
                >
                    {isVoting ? 'Processing...' : 'Cast Vote'}
                </button>
            )}

            {canSubmitProposalCheck() && (
                <button
                    onClick={onShowSubmitProposalModal}
                    className="action-button primary"
                >
                    Submit Proposal
                </button>
            )}

            {isOwner && (
                <>
                    {pendingProposalCount > 0 && (
                        <button
                            onClick={onShowPendingProposalsModal}
                            className="action-button orange"
                        >
                            Manage Proposals ({pendingProposalCount})
                        </button>
                    )}

                    {canStart() && (
                        <button
                            onClick={() => executeElectionAction('start', electionDetail.electionId)}
                            disabled={!!actionStatus}
                            className={`action-button ${!!actionStatus ? '' : 'primary'}`}
                        >
                            Start Election
                        </button>
                    )}

                    {electionDetail.active && !electionDetail.finalized && (
                        <button
                            onClick={() => executeElectionAction('end', electionDetail.electionId)}
                            disabled={!!actionStatus}
                            className={`action-button ${!!actionStatus ? '' : 'danger'}`}
                        >
                            End Election
                        </button>
                    )}

                    {canEdit() && (
                        <button
                            onClick={onShowUpdateModal}
                            className="action-button primary"
                        >
                            Edit
                        </button>
                    )}

                    {!electionDetail.active && !electionDetail.finalized && (
                        <button
                            onClick={() => executeElectionAction('delete', electionDetail.electionId)}
                            disabled={!!actionStatus}
                            className={`action-button ${!!actionStatus ? '' : 'gray'}`}
                        >
                            Delete
                        </button>
                    )}
                </>
            )}
        </div>
    );
};

export default ElectionActions;
