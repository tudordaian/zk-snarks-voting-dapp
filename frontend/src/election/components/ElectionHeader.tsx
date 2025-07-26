import React from 'react';
import { ElectionDetailView } from '../types';
import { getElectionStatus, getElectionTimingMessage } from '../../utils/timeUtils';

interface ElectionHeaderProps {
    electionDetail: ElectionDetailView;
}

const ElectionHeader: React.FC<ElectionHeaderProps> = ({ electionDetail }) => {
    return (
        <div className="election-header">
            <h2 className="election-title">
                {electionDetail.name}
            </h2>
            <p className="election-info">
                <strong>City Area:</strong> {electionDetail.cityArea}
            </p>
            <p className="election-info">
                <strong>Status:</strong> {getElectionStatus(electionDetail)}
            </p>
            <p className="election-timing">
                {getElectionTimingMessage(electionDetail)}
            </p>
        </div>
    );
};

export default ElectionHeader;
