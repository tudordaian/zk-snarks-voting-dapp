import React from 'react';
import { TransactionData } from '../types';
import { blockscoutService } from '../services/blockscoutService';

interface TransactionsTableProps {
    transactions: TransactionData[];
    onTransactionClick: (transaction: TransactionData) => void;
}

const TransactionsTable: React.FC<TransactionsTableProps> = ({ transactions, onTransactionClick }) => {
    return (
        <div className="transactions-section">
            <div className="data-table">
                <div className="table-header">
                    <span>Hash</span>
                    <span>Block</span>
                    <span>Age</span>
                    <span>From</span>
                    <span>To</span>
                    <span>Gas Used</span>
                </div>
                {transactions.map((tx) => (
                    <div 
                        key={tx.hash} 
                        className="table-row clickable"
                        onClick={() => onTransactionClick(tx)}
                    >
                        <span className="tx-hash" title={tx.hash}>
                            {blockscoutService.formatAddress(tx.hash, 10)}
                        </span>
                        <span className="block-number">#{tx.block_number}</span>
                        <span className="age" title={blockscoutService.formatDate(tx.timestamp)}>
                            {blockscoutService.formatTimeDisplay(tx.timestamp)}
                        </span>
                        <span className="address" title={tx.from.hash}>
                            {blockscoutService.formatAddress(tx.from.hash)}
                        </span>
                        <span className="address" title={tx.to?.hash || 'Contract Creation'}>
                            {tx.to ? blockscoutService.formatAddress(tx.to.hash) : 'Contract Creation'}
                        </span>
                        <span className="gas-used">
                            {tx.gas_used ? blockscoutService.formatGas(tx.gas_used) : 'N/A'}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TransactionsTable;
