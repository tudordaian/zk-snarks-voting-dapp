import React from 'react';
import { BlockData, TransactionData } from '../types';
import { blockscoutService } from '../services/blockscoutService';

interface BlockDetailsModalProps {
    selectedBlock: BlockData;
    blockTransactions: TransactionData[];
    onClose: () => void;
    onTransactionClick: (transaction: TransactionData) => void;
}

const BlockDetailsModal: React.FC<BlockDetailsModalProps> = ({ 
    selectedBlock, 
    blockTransactions, 
    onClose, 
    onTransactionClick 
}) => {
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>Block #{selectedBlock.height}</h3>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>
                <div className="modal-body">
                    <div className="detail-section">
                        <h4>Block Details</h4>
                        <div className="detail-grid">
                            <div className="detail-item">
                                <label>Hash:</label>
                                <span className="hash">{selectedBlock.hash}</span>
                            </div>
                            <div className="detail-item">
                                <label>Parent Hash:</label>
                                <span className="hash">{selectedBlock.parent_hash}</span>
                            </div>
                            <div className="detail-item">
                                <label>Timestamp:</label>
                                <span>{blockscoutService.formatDate(selectedBlock.timestamp)}</span>
                            </div>
                            <div className="detail-item">
                                <label>Miner:</label>
                                <span className="address">{selectedBlock.miner.hash}</span>
                            </div>
                            <div className="detail-item">
                                <label>Size:</label>
                                <span>{selectedBlock.size} bytes</span>
                            </div>
                            <div className="detail-item">
                                <label>Gas Used:</label>
                                <span>{blockscoutService.formatGas(selectedBlock.gas_used)}</span>
                            </div>
                            <div className="detail-item">
                                <label>Gas Limit:</label>
                                <span>{blockscoutService.formatGas(selectedBlock.gas_limit)}</span>
                            </div>
                        </div>
                    </div>

                    {blockTransactions.length > 0 && (
                        <div className="detail-section">
                            <h4>Transactions ({blockTransactions.length})</h4>
                            <div className="transactions-list">
                                {blockTransactions.map((tx) => (
                                    <div 
                                        key={tx.hash} 
                                        className="transaction-summary clickable"
                                        onClick={() => onTransactionClick(tx)}
                                    >
                                        <span className="tx-hash">{blockscoutService.formatAddress(tx.hash, 12)}</span>
                                        <span className="tx-details">
                                            {blockscoutService.formatAddress(tx.from.hash)} → {tx.to ? blockscoutService.formatAddress(tx.to.hash) : 'Contract'}
                                        </span>
                                        <span className="tx-value">Gas: {blockscoutService.formatGas(tx.gas_used!)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BlockDetailsModal;
