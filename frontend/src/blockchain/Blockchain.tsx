import React, { useState, useEffect } from 'react';
import { blockscoutService } from './services/blockscoutService';
import { BlockData, TransactionData, BlockchainProps } from './types';
import BlockchainSearch from './BlockchainSearch';
import { 
    NetworkStats, 
    BlocksTable, 
    TransactionsTable, 
    BlockDetailsModal, 
    TransactionDetailsModal,
    AddressDetailsModal
} from './components';

const Blockchain: React.FC<BlockchainProps> = ({ refreshInterval = 5000 }) => {
    const [blocks, setBlocks] = useState<BlockData[]>([]);
    const [transactions, setTransactions] = useState<TransactionData[]>([]);
    const [selectedBlock, setSelectedBlock] = useState<BlockData | null>(null);
    const [selectedTransaction, setSelectedTransaction] = useState<TransactionData | null>(null);
    const [selectedAddress, setSelectedAddress] = useState<{address: string, transactions: TransactionData[]} | null>(null);
    const [blockTransactions, setBlockTransactions] = useState<TransactionData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string>('');
    const [activeTab, setActiveTab] = useState<'blocks' | 'transactions'>('blocks');
    const [networkStats, setNetworkStats] = useState<any>(null);
    const [previousModal, setPreviousModal] = useState<'block' | 'address' | null>(null);

   
    const fetchData = async () => {
        try {
            setError('');
            
            const [blocksData, transactionsData, statsData] = await Promise.all([
                blockscoutService.getBlocks(20),
                blockscoutService.getTransactions(20),
                blockscoutService.getStats()
            ]);
        
            setBlocks(blocksData);
            setTransactions(transactionsData);
            setNetworkStats(statsData);
        } catch (err) {
            console.error('Error fetching blockchain data:', err);
            setError('Failed to fetch blockchain data');
        } finally {
            setIsLoading(false);
        }
    };

    // autorefresh
    useEffect(() => {
        fetchData();
        
        const interval = setInterval(fetchData, refreshInterval);
        
        return () => clearInterval(interval);
    }, [refreshInterval]);

    const handleManualRefresh = () => {
        setIsLoading(true);
        fetchData();
    };

    const handleBlockClick = async (block: BlockData) => {
        setSelectedBlock(block);
        setSelectedTransaction(null);
        setSelectedAddress(null);
        setBlockTransactions([]);
        
        try {
            const txs = await blockscoutService.getBlockTransactions(block.hash);
            setBlockTransactions(txs);
        } catch (err) {
            console.error('Error fetching block transactions:', err);
            setBlockTransactions([]);
        }
    };

    const handleTransactionClick = (transaction: TransactionData) => {
        setSelectedTransaction(transaction);
        if (selectedBlock) {
            setPreviousModal('block');
        } else if (selectedAddress) {
            setPreviousModal('address');
        } else {
            setPreviousModal(null);
        }
    };

    const closeDetails = () => {
        setSelectedBlock(null);
        setSelectedTransaction(null);
        setSelectedAddress(null);
        setBlockTransactions([]);
        setPreviousModal(null);
    };

    const handleBackFromTransaction = () => {
        if (previousModal === 'block' && selectedBlock) {
            setSelectedTransaction(null);
            setPreviousModal(null);
        } else if (previousModal === 'address' && selectedAddress) {
            setSelectedTransaction(null);
            setPreviousModal(null);
        } else {
            closeDetails();
        }
    };

    const handleSearchResult = (result: any, type: 'block' | 'transaction' | 'address') => {
        closeDetails(); 
        
        if (type === 'block') {
            handleBlockClick(result as BlockData);
        } else if (type === 'transaction') {
            handleTransactionClick(result as TransactionData);
        } else if (type === 'address') {
            setSelectedAddress(result);
        }
    };

    if (isLoading && blocks.length === 0) {
        return (
            <div className="blockchain-container">
                <div className="loading">Loading blockchain data...</div>
            </div>
        );
    }

    return (
        <div className="blockchain-container">
            <NetworkStats networkStats={networkStats} onRefresh={handleManualRefresh} />

            <BlockchainSearch onSearchResult={handleSearchResult} />

            {error && (
                <div className="error-banner">
                    {error}
                    <button onClick={handleManualRefresh} className="retry-btn">Retry</button>
                </div>
            )}

            <div className="blockchain-tabs">
                <button 
                    className={`tab-btn ${activeTab === 'blocks' ? 'active' : ''}`}
                    onClick={() => setActiveTab('blocks')}
                >
                    Latest Blocks ({blocks.length})
                </button>
                <button 
                    className={`tab-btn ${activeTab === 'transactions' ? 'active' : ''}`}
                    onClick={() => setActiveTab('transactions')}
                >
                    Latest Transactions ({transactions.length})
                </button>
            </div>

            <div className="blockchain-content">
                {activeTab === 'blocks' && (
                    <BlocksTable blocks={blocks} onBlockClick={handleBlockClick} />
                )}

                {activeTab === 'transactions' && (
                    <TransactionsTable transactions={transactions} onTransactionClick={handleTransactionClick} />
                )}
            </div>
            
            {selectedTransaction && (
                <TransactionDetailsModal 
                    selectedTransaction={selectedTransaction}
                    onClose={closeDetails}
                    onBack={previousModal ? handleBackFromTransaction : undefined}
                />
            )}

            {selectedBlock && !selectedTransaction && (
                <BlockDetailsModal 
                    selectedBlock={selectedBlock}
                    blockTransactions={blockTransactions}
                    onClose={closeDetails}
                    onTransactionClick={handleTransactionClick}
                />
            )}

            {selectedAddress && !selectedTransaction && (
                <AddressDetailsModal 
                    address={selectedAddress.address}
                    transactions={selectedAddress.transactions}
                    onClose={closeDetails}
                    onTransactionClick={handleTransactionClick}
                />
            )}
        </div>
    );
};

export default Blockchain;
