import { Identity } from "@semaphore-protocol/identity";

export interface RegisterIdentityPayload {
    cnp: string;
    identityCommitment: string;
    identityPrivateKey?: string;
}

export interface AuthContextType {
    account: string | null;
    cnp: string | null;
    semaphoreIdentity: Identity | null;
    identityPrivateKey: string | null;
    isLoading: boolean;
    isOwner: boolean;
    contractOwnerAddress: string | null;
    registrationTxHash: string | null;
    connectWallet: () => Promise<void>;
    loginWithCnp: (cnpInput: string) => Promise<void>;
    setIdentity: (identity: Identity) => void;
    loadIdentity: () => Promise<Identity | null>;
    logout: () => void;
    fetchContractOwner: () => Promise<void>;
    setRegistrationTxHash: (txHash: string | null) => void;
}