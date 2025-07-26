import React, { useState } from 'react';
import { blockscoutService } from './services/blockscoutService';
import { BlockchainSearchProps } from './types';

const BlockchainSearch: React.FC<BlockchainSearchProps> = ({ onSearchResult }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState('');

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!searchQuery.trim()) {
            setSearchError('Enter a search query');
            return;
        }

        setIsSearching(true);
        setSearchError('');

        try {
            const query = searchQuery.trim();
            
            // verificare daca e hash de tranzactie sau de bloc
            if (query.startsWith('0x') && query.length === 66) {
                const tx = await blockscoutService.getTransaction(query);
                if (tx) {
                    onSearchResult(tx, 'transaction');
                    setSearchQuery('');
                    return;
                }
                const block = await blockscoutService.getBlock(query);
                if (block) {
                    onSearchResult(block, 'block');
                    setSearchQuery('');
                    return;
                }
            }
            
            // verificare daca e wallet address (42 caractere)
            if (query.startsWith('0x') && query.length === 42) {
                const transactions = await blockscoutService.getTransactionsByAddress(query);
                if (transactions.length > 0) {
                    onSearchResult({ address: query, transactions }, 'address');
                    setSearchQuery('');
                    return;
                } else {
                    setSearchError('No transactions found for this address.');
                    return;
                }
            }
            
            // nr bloc
            if (/^\d+$/.test(query)) {
                const blockNumber = parseInt(query);
                const block = await blockscoutService.getBlock(blockNumber);
                if (block) {
                    onSearchResult(block, 'block');
                    setSearchQuery('');
                    return;
                }
            }

            setSearchError('No results found. Enter a valid block number, block hash, transaction hash, or wallet address.');
        } catch (error: any) {
            console.error('Search error:', error);
            setSearchError('Search failed.');
        } finally {
            setIsSearching(false);
        }
    };

    return (
        <div className="blockchain-search">
            <form onSubmit={handleSearch} className="search-form">
                <div className="search-input-group">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by block number, block hash, transaction hash, or wallet address..."
                        className="search-input"
                        disabled={isSearching}
                    />
                    <button 
                        type="submit" 
                        className="search-btn"
                        disabled={isSearching || !searchQuery.trim()}
                    >
                        {isSearching ? (
                            <>
                                <img src="/magnifying-glass.png" alt="Searching" className="search-icon" />
                                Searching...
                            </>
                        ) : (
                            <img src="/magnifying-glass.png" alt="Search" className="search-icon" />
                        )}
                    </button>
                </div>
            </form>
            {searchError && (
                <div className="search-error">
                    {searchError}
                </div>
            )}
        </div>
    );
};

export default BlockchainSearch;
