import { ProposalData } from "../types";

const PINATA_JWT = import.meta.env.VITE_APP_PINATA_JWT;
const PINATA_GATEWAY = import.meta.env.VITE_APP_PINATA_GATEWAY;


export class IpfsService {
    private dataCache = new Map<string, ProposalData>();
    
    private async retryRequest<T>(
        requestFn: () => Promise<T>, 
        retries: number = 2,
        delay: number = 1000
    ): Promise<T> {
        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                return await requestFn();
            } catch (error: any) {
                const isLastAttempt = attempt === retries;
                const isNetworkError = error.message?.includes('fetch') || 
                                     error.message?.includes('timeout') ||
                                     error.message?.includes('Network');
                
                if (isLastAttempt || !isNetworkError) {
                    throw error;
                }
                
                console.warn(`IPFS request attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 2; 
            }
        }
        throw new Error('All retry attempts failed');
    }

    getUrl(cid: string): string {
        return `https://${PINATA_GATEWAY}/ipfs/${cid}`;
    }
    
    async uploadData(data: ProposalData): Promise<string> {
        return this.retryRequest(async () => {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); 
            
            try {
                const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${PINATA_JWT}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        pinataContent: data,
                        pinataMetadata: {
                            name: `proposal-${data.name}-${Date.now()}`
                        }
                    }),
                    signal: controller.signal
                });

                if (!response.ok) {
                    const error = await response.text();
                    throw new Error(`Failed to upload data: ${error}`);
                }

                const result = await response.json();
                const cid = result.IpfsHash;
                
                console.log(`Data uploaded successfully to IPFS: ${cid}`);
                
                return cid;
            } finally {
                clearTimeout(timeoutId);
            }
        });
    }

    async uploadImage(file: File): Promise<string> {
        return this.retryRequest(async () => {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000); 
            
            try {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('pinataMetadata', JSON.stringify({
                    name: `proposal-image-${file.name}-${Date.now()}`
                }));

                const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${PINATA_JWT}`
                    },
                    body: formData,
                    signal: controller.signal
                });

                if (!response.ok) {
                    const error = await response.text();
                    throw new Error(`Failed to upload image: ${error}`);
                }

                const result = await response.json();
                const cid = result.IpfsHash;
                
                console.log(`Image uploaded successfully to IPFS: ${cid}`);
                
                return cid;
            } finally {
                clearTimeout(timeoutId);
            }
        });
    }

    async getData(cid: string): Promise<ProposalData> {
        if (this.dataCache.has(cid)) {
            return this.dataCache.get(cid)!;
        }

        const data = await this.retryRequest(async () => {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000); 
            
            try {
                const response = await fetch(`https://${PINATA_GATEWAY}/ipfs/${cid}`, {
                    signal: controller.signal
                });

                if (!response.ok) {
                    throw new Error(`Failed to retrieve data from IPFS: ${response.status} ${response.statusText}`);
                }

                const result = await response.json();
                return result;
            } finally {
                clearTimeout(timeoutId);
            }
        });

        this.dataCache.set(cid, data);
        return data;
    }

}

export const ipfsService = new IpfsService();
