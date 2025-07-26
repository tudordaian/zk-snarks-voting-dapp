import React from 'react';
import { TransactionData } from '../types';
import { blockscoutService } from '../services/blockscoutService';

interface AddressDetailsModalProps {
    address: string;
    transactions: TransactionData[];
    onClose: () => void;
    onTransactionClick: (transaction: TransactionData) => void;
}

const AddressDetailsModal: React.FC<AddressDetailsModalProps> = ({ 
    address,
    transactions, 
    onClose, 
    onTransactionClick 
}) => {
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content address-details-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>Address Transactions</h3>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>
                <div className="modal-body">
                    <div className="detail-section">
                        <h4>Address Details</h4>
                        <div className="detail-grid">
                            <div className="detail-item">
                                <label>Address:</label>
                                <span className="address">{address}</span>
                            </div>
                            <div className="detail-item">
                                <label>Total Transactions:</label>
                                <span>{transactions.length}</span>
                            </div>
                        </div>
                    </div>

                    {transactions.length > 0 && (
                        <div className="detail-section">
                            <h4>Recent Transactions ({transactions.length})</h4>
                            <div className="transactions-list">
                                {transactions.map((tx) => (
                                    <div 
                                        key={tx.hash} 
                                        className="transaction-summary clickable"
                                        onClick={() => onTransactionClick(tx)}
                                    >
                                        <div className="tx-row">
                                            <span className="tx-hash">{blockscoutService.formatAddress(tx.hash, 12)}</span>
                                            <span className={`status ${tx.status}`}>{tx.status}</span>
                                        </div>
                                        <div className="tx-row">
                                            <span className="tx-details">
                                                {blockscoutService.formatAddress(tx.from.hash)} → {tx.to ? blockscoutService.formatAddress(tx.to.hash) : 'Contract'}
                                            </span>
                                            <span className="tx-time">{blockscoutService.formatTimeDisplay(tx.timestamp)}</span>
                                        </div>
                                        <div className="tx-row">
                                            <span className="tx-block">Block #{tx.block_number}</span>
                                            {tx.gas_used && (
                                                <span className="tx-gas">Gas: {blockscoutService.formatGas(tx.gas_used)}</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {transactions.length === 0 && (
                        <div className="detail-section">
                            <div className="no-data">No transactions found for this address.</div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AddressDetailsModal;
