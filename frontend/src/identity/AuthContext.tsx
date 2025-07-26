import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Identity } from '@semaphore-protocol/identity';
import { connectMetaMask } from '../blockchain/services/metamaskService';
import { apiService } from '../election/services/apiService';
import { contractService } from '../blockchain/services/contractService';
import { AuthContextType } from './types';
import { generateSemaphoreIdentity } from './services/semaphoreClientService';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({children}: {children: ReactNode}) => {
    const [account, setAccount] = useState<string | null>(null);
    const [cnp, setCnp] = useState<string | null>(null);
    const [semaphoreIdentity, setSemaphoreIdentity] = useState<Identity | null>(null);
    const [identityPrivateKey, setIdentityPrivateKey] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isOwner, setIsOwner] = useState(false);
    const [contractOwnerAddress, setContractOwnerAddress] = useState<string | null>(null);
    const [registrationTxHash, setRegistrationTxHashState] = useState<string | null>(null);

    const clearIdentity = () => {
        setSemaphoreIdentity(null);
        setIdentityPrivateKey(null);
    };

    const updateIdentity = (identity: Identity | null, identityPrivateKey: string | null) => {
        setSemaphoreIdentity(identity);
        setIdentityPrivateKey(identityPrivateKey);
    };

    const setRegistrationTxHash = (txHash: string | null) => {
        setRegistrationTxHashState(txHash);
        if (txHash) {
            localStorage.setItem('registrationTxHash', txHash);
        } else {
            localStorage.removeItem('registrationTxHash');
        }
    };

    const connectWallet = async () => {
        setIsLoading(true);
        try {
            const acc = await connectMetaMask();
            setAccount(acc);
            if (acc) {
                await fetchContractOwner();
            } else {
                setIsOwner(false);
            }
        } catch (error) {
            console.error("failed to connect wallet", error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchContractOwner = async () => {
        try {
            const ownerAddr = await contractService.getContractOwner();
            
            if (contractOwnerAddress !== ownerAddr) {
                setContractOwnerAddress(ownerAddr);
                localStorage.setItem('contractOwnerAddress', ownerAddr);
            }
            
        } catch (error) {
            console.error("failed to fetch contract owner:", error);
            if (!contractOwnerAddress) {
                setIsOwner(false);
            }
        }
    };

    const loginWithCnp = async (cnpInput: string): Promise<void> => {
        if (!account) {
            alert("Connect your MetaMask wallet first.");
            return;
        }
        const trimmedCnp = cnpInput.trim();
        localStorage.setItem('userCnp', trimmedCnp);
        setCnp(trimmedCnp);
        console.log(`CNP set: ${trimmedCnp}`);
    };

    const setIdentity = (identity: Identity) => {
        const identityPrivateKey = identity.export();
        updateIdentity(identity, identityPrivateKey);
        console.log(`Semaphore identity set.`);
    };

    const loadIdentity = useCallback(async (): Promise<Identity | null> => {
        // verificare daca putem reconstitui identitatea local
        if (!cnp) {
            clearIdentity();
            return null;
        }

        // reconstituie identitatea local deterministic 
        const identity = generateSemaphoreIdentity(cnp); 
        if (!identity) {
            clearIdentity();
            return null;
        }

        // verificare daca identity commitment ul este inregistrat in firebase
        try {
            const response = await apiService.getIdentityCommitmentByCnp(cnp);
            const isRegistered = response.success && response.data?.identityCommitment === identity.commitment.toString();
            
            const identityPrivateKey = identity.export();
            updateIdentity(identity, identityPrivateKey);
            
            if (isRegistered) {
                console.log(`Semaphore identity reconstructed and verified as registered.`);
            } else {
                console.log(`Semaphore identity constructed but not yet registered.`);
            }
            
            return identity;
        } catch (error) {
            console.log(`Could not verify identity registration for CNP ${cnp}:`, error);
            const identityPrivateKey = identity.export();
            updateIdentity(identity, identityPrivateKey);
            console.log(`Semaphore identity reconstructed.`);
            return identity;
        }
    }, [cnp]);


    useEffect(() => {
        const initialLoad = async () => {
            setIsLoading(true);
            
            const storedAccount = localStorage.getItem('userAccount');
            const storedOwnerAddress = localStorage.getItem('contractOwnerAddress');
            const storedCnp = localStorage.getItem('userCnp');
            const storedTxHash = localStorage.getItem('registrationTxHash');
            
            if (storedAccount) {
                setAccount(storedAccount);
            }
            
            if (storedOwnerAddress) {
                setContractOwnerAddress(storedOwnerAddress);
            }
            
            if (storedCnp) {
                setCnp(storedCnp);
            }

            if (storedTxHash) {
                setRegistrationTxHashState(storedTxHash);
            }

            if (storedAccount && storedOwnerAddress) {
                setIsOwner(storedAccount.toLowerCase() === storedOwnerAddress.toLowerCase());
            }

            try {
                await fetchContractOwner();
            } catch (error) {
                console.error('Error fetching contract owner during initialization:', error);
            }

            setIsLoading(false);
        };

        // listener pentru schimbarea contului de MetaMask
        const handleAccountsChanged = (accounts: string[]) => {
            if (accounts.length === 0) {
                logout();
            } else if (accounts[0] !== account) {
                setAccount(accounts[0]);
                fetchContractOwner();
            }
        };

        if (window.ethereum) {
            window.ethereum.on('accountsChanged', handleAccountsChanged); // asculta pt event ul de accountsChanged
        }

        initialLoad();

        // cleanup pt listener
        return () => {
            if (window.ethereum) {
                window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
            }
        };
    }, []); 

    // pt a oferi privilegii de admin sau nu
    useEffect(() => {
        const shouldBeOwner = Boolean(account && contractOwnerAddress && 
            account.toLowerCase() === contractOwnerAddress.toLowerCase());
        
        setIsOwner(shouldBeOwner);
        
        if (account) {
            localStorage.setItem('userAccount', account);
        } else {
            localStorage.removeItem('userAccount');
        }
    }, [account, contractOwnerAddress]);

    useEffect(() => {
        const handleIdentityLoad = async () => {
            if (cnp && account) {
                try {
                    await loadIdentity();
                } catch (error) {
                    console.error('Error loading identity:', error);
                }
            }
        };
        
        handleIdentityLoad();
    }, [cnp, account, loadIdentity]);

    const logout = () => {
        setAccount(null);
        setCnp(null);
        
        localStorage.removeItem('userAccount');
        localStorage.removeItem('userCnp');
        localStorage.removeItem('contractOwnerAddress');
        localStorage.removeItem('registrationTxHash');
        
        clearIdentity();
        setIsOwner(false);
        setContractOwnerAddress(null);
        setRegistrationTxHashState(null);

        console.log("User logged out.");
    };

    return (
        <AuthContext.Provider value={{
            account, cnp, semaphoreIdentity, identityPrivateKey, isLoading, isOwner, contractOwnerAddress, registrationTxHash,
            connectWallet, loginWithCnp, setIdentity, loadIdentity, logout, fetchContractOwner, setRegistrationTxHash
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};