import {ethers, Signer } from 'ethers';

declare global {
    interface Window {
        ethereum?: any;
    }
}

export const connectMetaMask = async (): Promise<string | null> => {
    if (!window.ethereum) {
        alert('MetaMask is not installed.');
        console.error('MetaMask not detected');
        return null;
    }

    try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        await provider.send('eth_requestAccounts', []);
        const signer = await provider.getSigner();
        return await signer.getAddress();
    } catch (error) {
        console.error('Error connecting to MetaMask:', error);
        alert('Failed to connect MetaMask.');
        return null;
    }
};


export const getSigner = async (): Promise<Signer | null> => {
    if (!window.ethereum) {
        console.error('MetaMask not detected');
        return null;
    }
    
    try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        
        return signer;
    } catch (error: any) {
        console.error('Error getting signer:', error);
        return null;
    }
};
