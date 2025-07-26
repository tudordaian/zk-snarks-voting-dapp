import { ethers } from 'ethers';
import { BlockData, TransactionData, BlockscoutResponse } from '../types';

class BlockscoutService {
    private baseUrl: string;
    private contractInterface: ethers.Interface | null = null;
    private semaphoreInterface: ethers.Interface | null = null;
    private abiLoaded: Promise<void>;

    constructor() {
        this.baseUrl = import.meta.env.VITE_APP_BLOCKSCOUT_URL;
        this.abiLoaded = this.initializeContractInterfaces();
    }

    private async initializeContractInterfaces(): Promise<void> {
        try {
            const [projectPollLedgerResponse, semaphoreResponse] = await Promise.all([
                fetch('/abi/ProjectPollLedger.json'),
                fetch('/abi/Semaphore.json')
            ]);
            
            if (projectPollLedgerResponse.ok) {
                const projectPollLedgerAbiData = await projectPollLedgerResponse.json();
                this.contractInterface = new ethers.Interface(projectPollLedgerAbiData.abi);
            } else {
                console.warn(`Failed to fetch ProjectPollLedger ABI: ${projectPollLedgerResponse.status}`);
            }

            if (semaphoreResponse.ok) {
                const semaphoreAbiData = await semaphoreResponse.json();
                this.semaphoreInterface = new ethers.Interface(semaphoreAbiData.abi);
            } else {
                console.warn(`Failed to fetch Semaphore ABI: ${semaphoreResponse.status}`);
            }
        } catch (error) {
            console.warn('Could not load contract ABIs for input decoding:', error);
        }
    }

    private async fetchFromApi<T>(endpoint: string): Promise<T> {
        const url = `${this.baseUrl}/api/v2${endpoint}`;
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                },
                cache: 'no-store'
            });

            if (!response.ok) {
                console.error(`BlockScout API error: ${response.status} ${response.statusText}`);
                throw new Error(`BlockScout API error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            return data;
        } catch (error: any) {
            console.error(`Error fetching from BlockScout API (${endpoint}):`, error);
            throw new Error(`Failed to fetch from BlockScout: ${error.message}`);
        }
    }

    private async decodeTransactionInput(tx: TransactionData): Promise<any> {
        try {
            const input = tx.raw_input || tx.input;       
            await this.abiLoaded;         
            if (!input || input === '0x' || input.length <= 2) {
                return null;
            }
            
            if (this.contractInterface) {
                try {
                    const decoded = this.contractInterface.parseTransaction({ data: input });
                    if (decoded) {
                        return {
                            name: decoded.name,
                            args: decoded.args,
                            signature: decoded.signature,
                            fragment: decoded.fragment,
                            contractType: 'ProjectPollLedger'
                        };
                    }
                } catch (error) {}
            }
            
            if (this.semaphoreInterface) {
                try {
                    const decoded = this.semaphoreInterface.parseTransaction({ data: input });
                    if (decoded) {
                        return {
                            name: decoded.name,
                            args: decoded.args,
                            signature: decoded.signature,
                            fragment: decoded.fragment,
                            contractType: 'Semaphore'
                        };
                    }
                } catch (error) {}
            }
            
            return null;
        } catch (error) {
            return null;
        }
    }

    async getBlocks(limit: number = 20): Promise<BlockData[]> {
        try {
            const response = await this.fetchFromApi<BlockscoutResponse<BlockData>>(`/blocks?limit=${limit}`);
            return (response.items || []).map(block => ({
                ...block,
                tx_count: block.tx_count ?? block.transaction_count ?? 0
            }));
        } catch (error) {
            console.error('Error fetching blocks:', error);
            return [];
        }
    }

    async getBlock(hashOrNumber: string | number): Promise<BlockData | null> {
        try {
            const response = await this.fetchFromApi<BlockData>(`/blocks/${hashOrNumber}`);
            return response;
        } catch (error) {
            console.error(`Error fetching block ${hashOrNumber}:`, error);
            return null;
        }
    }

    async getBlockTransactions(hashOrNumber: string | number): Promise<TransactionData[]> {
        try {
            const response = await this.fetchFromApi<BlockscoutResponse<TransactionData>>(
                `/blocks/${hashOrNumber}/transactions`
            );
            const transactions = response.items || [];
            
            return Promise.all(
                transactions.map(async tx => ({
                    ...tx,
                    decoded_input: await this.decodeTransactionInput(tx)
                }))
            );
        } catch (error) {
            console.error(`Error fetching transactions for block ${hashOrNumber}:`, error);
            return [];
        }
    }

    async getTransactions(limit: number = 20): Promise<TransactionData[]> {
        try {
            const response = await this.fetchFromApi<BlockscoutResponse<TransactionData>>(
                `/transactions?limit=${limit}`
            );
            const transactions = response.items || [];
            
            return Promise.all(
                transactions.map(async tx => ({
                    ...tx,
                    decoded_input: await this.decodeTransactionInput(tx)
                }))
            );
        } catch (error) {
            console.error('Error fetching transactions:', error);
            return [];
        }
    }

    async getTransaction(hash: string): Promise<TransactionData | null> {
        try {
            const response = await this.fetchFromApi<TransactionData>(`/transactions/${hash}`);
            if (response) {
                return {
                    ...response,
                    decoded_input: await this.decodeTransactionInput(response)
                };
            }
            return response;
        } catch (error) {
            console.error(`Error fetching transaction ${hash}:`, error);
            return null;
        }
    }

    async getTransactionsByAddress(address: string, limit: number = 20): Promise<TransactionData[]> {
        try {
            const response = await this.fetchFromApi<BlockscoutResponse<TransactionData>>(
                `/addresses/${address}/transactions?limit=${limit}`
            );
            const transactions = response.items || [];
            
            return Promise.all(
                transactions.map(async tx => ({
                    ...tx,
                    decoded_input: await this.decodeTransactionInput(tx)
                }))
            );
        } catch (error) {
            console.error(`Error fetching transactions for address ${address}:`, error);
            return [];
        }
    }

    async getStats(): Promise<any> {
        try {
            const response = await this.fetchFromApi<any>('/stats');
            return response;
        } catch (error) {
            console.error('Error fetching network stats:', error);
            return null;
        }
    }

    formatEther(wei: string): string {
        try {
            const value = BigInt(wei);
            const ether = Number(value) / Math.pow(10, 18);
            return ether.toFixed(6);
        } catch (error) {
            return '0';
        }
    }

    formatGas(gas: string): string {
        try {
            return parseInt(gas).toLocaleString();
        } catch (error) {
            return gas;
        }
    }

    formatDate(timestamp: string): string {
        try {
            const date = new Date(timestamp);
            return date.toLocaleString();
        } catch (error) {
            return timestamp;
        }
    }

    formatAddress(address: string, length: number = 8): string {
        if (!address || address.length < length) return address;
        return `${address.slice(0, length)}...${address.slice(-length)}`;
    }

    formatTimeDisplay(timestamp: string) {
        return new Date(timestamp).toLocaleTimeString();
    } 

}

export const blockscoutService = new BlockscoutService();
