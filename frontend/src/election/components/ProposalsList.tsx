import React from 'react';
import { ProposalsListProps } from '../types';
import ProposalCard from './ProposalCard';

const ProposalsList: React.FC<ProposalsListProps> = ({
    electionDetail,
    proposalData,
    canVote,
    selectedProposalIndex,
    isVoting,
    setSelectedProposalIndex,
    onImageClick
}) => {
    return (
        <div className="proposals-section">
            <h3 className="proposals-title">
                Current Proposals ({electionDetail.proposals.length}):
            </h3>

            {electionDetail.proposals.length === 0 ? (
                <p className="no-proposals">
                    No proposals available yet.
                </p>
            ) : (
                <div className="proposals-list">
                    {electionDetail.proposals.map((proposal, index) => {
                        const data = proposalData.get(proposal.dataCID);
                        
                        return (
                            <ProposalCard
                                key={index}
                                proposal={proposal}
                                index={index}
                                electionId={electionDetail.electionId}
                                proposalData={data}
                                canVote={canVote}
                                selectedProposalIndex={selectedProposalIndex}
                                isVoting={isVoting}
                                setSelectedProposalIndex={setSelectedProposalIndex}
                                onImageClick={onImageClick}
                            />
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default ProposalsList;
