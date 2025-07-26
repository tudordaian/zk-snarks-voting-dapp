export interface BlockchainProps {
    refreshInterval?: number;
}

export interface BlockchainSearchProps {
    onSearchResult: (result: any, type: 'block' | 'transaction' | 'address') => void;
}

export interface BlockData {
    hash: string;
    height: number;
    timestamp: string;
    tx_count?: number;          
    transaction_count?: number; 
    miner: {
        hash: string;
    };
    size: number;
    gas_used: string;
    gas_limit: string;
    parent_hash: string;
    nonce: string;
}

export interface TransactionData {
    hash: string;
    block_hash: string;
    block_number: number;
    from: {
        hash: string;
    };
    to?: {
        hash: string;
    };
    value: string;
    gas: string;
    gas_price: string;
    gas_used?: string;
    input?: string;
    raw_input?: string;
    nonce: number;
    position: number;
    status: string;
    timestamp: string;
    fee?: {
        type: string;
        value: string;
    };
    type: number;
    logs?: any[];
    decoded_input?: any;
}

export interface BlockscoutResponse<T> {
    items: T[];
    next_page_params?: any;
}
