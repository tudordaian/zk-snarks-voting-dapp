import { Identity } from '@semaphore-protocol/identity';
import { Group } from '@semaphore-protocol/group';
import { generateProof, SemaphoreProof } from '@semaphore-protocol/proof';
import { ethers } from 'ethers';

export const SEMAPHORE_GROUP_ID = "0";
export const MERKLE_TREE_DEPTH = 20;

// generare deterministica a identitatii 
export const generateSemaphoreIdentity = (secret: string): Identity => {
    const identity = new Identity(secret);
    console.log("Identity generated/reconstructed:");
    console.log("  Private key:", identity.privateKey.toString());
    console.log("  Secret Scalar:", identity.secretScalar.toString());
    console.log("  Public key:", identity.publicKey.toString());
    console.log("  Identity Commitment:", identity.commitment.toString());
    return identity;
};

export const generateSemaphoreProof = async (
    identity: Identity,          // identitatea userului
    groupMembers: string[],      // array de identity commitments din merkle tree
    externalNullifier: bigint,   // o valoare unica scope-ului pentru proof
    signal: string,              // proposalurile votate ce vor fi hashed de generateProof pentru inputul de 'message' din circuit
    merkleTreeDepth: number = MERKLE_TREE_DEPTH     // adancimea merkle tree-ului
): Promise<SemaphoreProof> => {
    const group: Group = new Group(groupMembers.map(member => BigInt(member)));

    if (group.indexOf(identity.commitment) === -1) {
        throw new Error("Identity commitment not found in the group.");
    }

    console.log("Generating ZK proof:");
    console.log("  Identity commitment:", identity.commitment.toString());
    console.log("  Group root:", group.root.toString());
    console.log("  Group size:", group.size);
    console.log("  External nullifier:", externalNullifier.toString());
    console.log("  Signal:", signal);
    console.log("  Merkle tree depth for proof:", merkleTreeDepth);

    try {
        const proofGenerated: SemaphoreProof = await generateProof(
            identity,
            group,
            signal,            
            externalNullifier, 
            merkleTreeDepth
        );

        console.log("ZK proof generated successfully:", proofGenerated);
        return proofGenerated; 
    } catch (error) {
        console.error("Error generating ZK proof:", error);
        throw error;
    }
};

// crearea unui signal string din hash-ul indicelui propunerii alese pt vot ce corespunde
// campului message din semaphore proof ul din contract
export const createVoteSignal = (proposalIndex: number): string => {
    const abiCoder = ethers.AbiCoder.defaultAbiCoder();
    const encoded: string = abiCoder.encode(["uint256"], [proposalIndex]);
    const hash: string = ethers.keccak256(encoded); //32 bytes
    return BigInt(hash).toString();
};