import React from 'react';
import { TransactionData } from '../types';
import { blockscoutService } from '../services/blockscoutService';

interface TransactionDetailsModalProps {
    selectedTransaction: TransactionData;
    onClose: () => void;
    onBack?: () => void;
}

const TransactionDetailsModal: React.FC<TransactionDetailsModalProps> = ({ 
    selectedTransaction, 
    onClose,
    onBack
}) => {
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content transaction-details-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <div className="header-left">
                        {onBack && (
                            <button className="back-btn" onClick={onBack}>← Back</button>
                        )}
                        <h3>Transaction Details</h3>
                    </div>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>
                <div className="modal-body">
                    <div className="transaction-details-section">
                        <div className="detail-section">
                            <h4>Transaction Information</h4>
                            <div className="detail-grid">
                                <div className="detail-item">
                                    <label>Hash:</label>
                                    <span className="hash">{selectedTransaction.hash}</span>
                                </div>
                                <div className="detail-item">
                                    <label>Status:</label>
                                    <span className={`status ${selectedTransaction.status}`}>
                                        {selectedTransaction.status}
                                    </span>
                                </div>
                                <div className="detail-item">
                                    <label>Block:</label>
                                    <span>#{selectedTransaction.block_number}</span>
                                </div>
                                <div className="detail-item">
                                    <label>Timestamp:</label>
                                    <span>{blockscoutService.formatDate(selectedTransaction.timestamp)}</span>
                                </div>
                                <div className="detail-item">
                                    <label>From:</label>
                                    <span className="address">{selectedTransaction.from.hash}</span>
                                </div>
                                <div className="detail-item">
                                    <label>To:</label>
                                    <span className="address">
                                        {selectedTransaction.to ? selectedTransaction.to.hash : 'Contract Creation'}
                                    </span>
                                </div>
                                <div className="detail-item">
                                    <label>Gas Price:</label>
                                    <span>{blockscoutService.formatEther(selectedTransaction.gas_price)} ETH</span>
                                </div>
                                {selectedTransaction.gas_used && (
                                    <div className="detail-item">
                                        <label>Gas Used:</label>
                                        <span>{blockscoutService.formatGas(selectedTransaction.gas_used)}</span>
                                    </div>
                                )}
                                <div className="detail-item">
                                    <label>Nonce:</label>
                                    <span>{selectedTransaction.nonce}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="input-data-section">
                        <div className="detail-section">
                            <div className="input-data">
                                {(() => {
                                    const input = (selectedTransaction as any).raw_input || selectedTransaction.input;
                                    return input && input.length > 2 ? (
                                        <>
                                            {selectedTransaction.decoded_input ? (                                    
                                                <div className="input-decoded">
                                                    <h4>Input Data</h4> 
                                                    <h5>Function Call: {selectedTransaction.decoded_input.name}</h5>
                                                    {selectedTransaction.decoded_input.description && (
                                                        <p><strong>Description:</strong> {selectedTransaction.decoded_input.description}</p>
                                                    )}
                                                    {selectedTransaction.decoded_input.contractType && (
                                                        <p><strong>Contract:</strong> {selectedTransaction.decoded_input.contractType}</p>
                                                    )}
                                                    <div className="function-details">
                                                        <p><strong>Signature:</strong> {selectedTransaction.decoded_input.signature}</p>
                                                        <p><strong>Parameters:</strong></p>
                                                        <div className="function-args">
                                                            {selectedTransaction.decoded_input.args && selectedTransaction.decoded_input.args.length > 0 ? (
                                                                selectedTransaction.decoded_input.args.map((arg: any, index: number) => {
                                                                    const inputParam = selectedTransaction.decoded_input.fragment?.inputs?.[index];
                                                                    return (
                                                                        <div key={index} className="arg-item">
                                                                            <span className="arg-name">{inputParam?.name || `arg${index}`}:</span>
                                                                            <span className="arg-type">({inputParam?.type || 'unknown'})</span>
                                                                            <span className="arg-value" style={{wordBreak: 'break-all', display: 'inline-block'}}>
                                                                                {String(arg)}
                                                                            </span>
                                                                        </div>
                                                                    );
                                                                })
                                                            ) : (
                                                                <div className="no-args">No parameters</div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="input-info">
                                                    <span className="input-type">
                                                        Unrecognized Input Data ({input.length - 2} bytes)
                                                    </span>
                                                </div>
                                            )}
                                            <div className="input-raw">
                                                <h5>Raw Input:</h5>
                                                <pre>{input}</pre>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="no-input">
                                            Input: {input || 'No input data'}
                                            <br />
                                            <small>Raw input value: "{input}"</small>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TransactionDetailsModal;
