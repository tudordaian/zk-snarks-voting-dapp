import React from 'react';

interface StatusMessagesProps {
    actionStatus: string;
    voteStatus: string;
    voteError: string;
    votingMessage: string | null;
}

const StatusMessages: React.FC<StatusMessagesProps> = ({
    actionStatus,
    voteStatus,
    voteError,
    votingMessage
}) => {
    return (
        <>
            {actionStatus && (
                <div className={`status-message ${actionStatus.includes('Error') ? 'error' : 'success'}`}>
                    {actionStatus}
                </div>
            )}

            {voteStatus && (
                <div className="status-message success">
                    {voteStatus}
                </div>
            )}

            {voteError && (
                <div className="status-message error">
                    {voteError}
                </div>
            )}

            {votingMessage && (
                <div className="status-message info">
                    {votingMessage}
                </div>
            )}
        </>
    );
};

export default StatusMessages;
