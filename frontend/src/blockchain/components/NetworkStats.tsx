import React from 'react';

interface NetworkStatsProps {
    networkStats: any;
    onRefresh: () => void;
}

const NetworkStats: React.FC<NetworkStatsProps> = ({ networkStats, onRefresh }) => {
    return (
        <div className="blockchain-header">
            <h2>Blockchain</h2>
            {networkStats && (
                <div className="network-stats">
                    <span>Latest Block: #{networkStats.total_blocks?.toLocaleString() || 'N/A'}</span>
                    <span>Total Transactions: {networkStats.total_transactions?.toLocaleString() || 'N/A'}</span>
                    <button onClick={onRefresh} className="refresh-btn">
                        <img src="/refresh.png" alt="Refresh" className="refresh-icon" />
                    </button>
                </div>
            )}
        </div>
    );
};

export default NetworkStats;
