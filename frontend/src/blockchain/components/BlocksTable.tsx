import React from 'react';
import { BlockData } from '../types';
import { blockscoutService } from '../services/blockscoutService';

interface BlocksTableProps {
    blocks: BlockData[];
    onBlockClick: (block: BlockData) => void;
}

const BlocksTable: React.FC<BlocksTableProps> = ({ blocks, onBlockClick }) => {
    return (
        <div className="blocks-section">
            <div className="data-table">
                <div className="table-header">
                    <span>Block</span>
                    <span>Age</span>
                    <span>Txns</span>
                    <span>Proposer</span>
                    <span>Parent Hash</span>
                    <span>Gas Used</span>
                </div>
                {blocks.map((block) => (
                    <div 
                        key={block.hash} 
                        className="table-row clickable"
                        onClick={() => onBlockClick(block)}
                    >
                        <span className="block-number">#{block.height}</span>
                        <span className="age" title={blockscoutService.formatDate(block.timestamp)}>
                            {blockscoutService.formatTimeDisplay(block.timestamp)}
                        </span>
                        <span className="tx-count">{block.tx_count || 0}</span>
                        <span className="address" title={block.miner?.hash || 'Unknown'}>
                            {block.miner ? blockscoutService.formatAddress(block.miner.hash) : 'Unknown'}
                        </span>
                        <span className="hash" title={block.parent_hash}>
                            {blockscoutService.formatAddress(block.parent_hash)}
                        </span>
                        <span className="gas-used">
                            {blockscoutService.formatGas(block.gas_used)}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default BlocksTable;
