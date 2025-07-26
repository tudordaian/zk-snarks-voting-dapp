import React from 'react';
import { ProposalCardProps } from '../types';

const ProposalCard: React.FC<ProposalCardProps> = ({
    proposal,
    index,
    electionId,
    proposalData,
    canVote,
    selectedProposalIndex,
    isVoting,
    setSelectedProposalIndex,
    onImageClick
}) => {
    return (
        <div 
            key={index} 
            className={`proposal-card ${
                proposal.winningProposal ? 'winner' : 
                (canVote && selectedProposalIndex === index) ? 'selected' : ''
            }`}
            onClick={() => canVote && setSelectedProposalIndex(index)}
        >
            {proposal.winningProposal && (
                <div className="winner-badge">
                    WINNER🏆
                </div>
            )}

            <div className="proposal-content">
                {canVote && (
                    <div className="proposal-radio">
                        <input
                            type="radio"
                            id={`proposal-${electionId}-${index}`}
                            name={`election-${electionId}`}
                            checked={selectedProposalIndex === index}
                            onChange={() => setSelectedProposalIndex(index)}
                            disabled={isVoting}
                        />
                    </div>
                )}

                <div className="proposal-details">
                    <h3 className={`proposal-name ${proposal.winningProposal ? 'winner' : ''}`}>
                        {proposalData?.name || `Proposal ${index + 1}`}
                    </h3>

                    {proposalData?.description && (
                        <p className="proposal-description">
                            {proposalData.description}
                        </p>
                    )}

                    <div className="proposal-meta">
                        <span className="vote-count">
                            <strong>Votes:<span style={{color: 'white'}}> {proposal.voteCount}</span></strong>
                        </span>
                    </div>
                    
                    {proposalData?.proposerAddress && (
                        <div className="proposer-address">
                            Proposer address: {proposalData.proposerAddress}
                        </div>
                    )}
                </div>

                {proposalData?.imageUrl && (
                    <div>
                        <img
                            src={proposalData.imageUrl}
                            alt={proposalData.name}
                            className="proposal-image"
                            onClick={(e) => {
                                e.stopPropagation();
                                if (proposalData?.imageUrl) {
                                    onImageClick(
                                        proposalData.imageUrl,
                                        proposal.imageCID,
                                        proposalData.name || `Proposal ${index + 1}`
                                    );
                                }
                            }}
                            onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                            }}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProposalCard;
