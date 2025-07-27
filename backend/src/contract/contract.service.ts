import { Injectable, OnModuleInit, Logger, InternalServerErrorException, ConflictException } from '@nestjs/common';
import { Contract, ethers, JsonRpcProvider, TransactionReceipt } from 'ethers';
import { createRequire } from 'module';
import { FirebaseService } from '../firebase/firebase.service.js';

const require = createRequire(import.meta.url);
const ProjectPollLedgerArtifact = require('../../abi/ProjectPollLedger.json');
const SemaphoreArtifact = require('../../abi/Semaphore.json');

@Injectable()
export class ContractService implements OnModuleInit {
    private logger = new Logger(ContractService.name);
    
    private provider: ethers.Provider;
    private ownerWallet: ethers.Wallet;

    private projectPollLedgerContract!: Contract;
    private semaphoreContract!: Contract;
    private semaphoreContractAddress: string | null = null;

    
    constructor(private readonly firebaseService: FirebaseService) {
        const ownerPrivateKey = process.env.ADMIN_METAMASK_PRIVATE_KEY!;
        const rpcUrl = process.env.RPC_URL!;
        
        this.provider = new JsonRpcProvider(rpcUrl);
        this.ownerWallet = new ethers.Wallet(ownerPrivateKey, this.provider);
    }

    async onModuleInit() {
        // conectare la projectPollLedger SC
        const projectPollLedgerAddress = process.env.PROJECT_POLL_LEDGER_ADDRESS!;

        this.projectPollLedgerContract = new ethers.Contract(
            projectPollLedgerAddress,
            ProjectPollLedgerArtifact.abi,
            this.ownerWallet
        );

        const owner = await this.projectPollLedgerContract.owner();
        this.logger.log(`Connected to ProjectPollLedger contract. Owner: ${owner}`);
        this.logger.log(`Backend wallet address: ${this.ownerWallet.address}`);

        // fetch adresa sc semaphore de pe sc parinte + instantiere sc semaphore
        this.semaphoreContractAddress = await this.projectPollLedgerContract.semaphore();
        this.logger.log(`Semaphore contract address: ${this.semaphoreContractAddress}`);
        
        if (this.semaphoreContractAddress) {
            this.semaphoreContract = new Contract(
                this.semaphoreContractAddress,
                SemaphoreArtifact.abi,
                this.ownerWallet
            );
            this.logger.log(`Connected to Semaphore contract at: ${this.semaphoreContractAddress}`);
            
            try {
                const groupSize = await this.semaphoreContract.getMerkleTreeSize(0);
                this.logger.log(`Group 0 size: ${groupSize}`);
            } catch (error) {
                this.logger.error('Failed to verify Semaphore contract connection:', error);
                throw new Error(`Cannot connect to Semaphore contract: ${error}`);
            }
        } else {
            throw new Error('Semaphore contract address is undefined');
        }
    }


    // SC READ
    async getAllElections() {
        return this.projectPollLedgerContract.getAllElections();
    }

    async hasElectionEnded(electionId: number) {
        return this.projectPollLedgerContract.hasElectionEnded(electionId);
    }

    async shouldElectionStart(electionId: number) {
        return this.projectPollLedgerContract.shouldElectionStart(electionId);
    }


    // SC WRITE

    async voteZkp(
        electionId: number,
        proposalIndex: number,
        merkleTreeRoot: string,
        nullifierHash: string,
        proof: string[],
    ): Promise<TransactionReceipt> {
        this.logger.log(`Processing ZKP vote tx for election ${electionId} with NULLIFIER ${nullifierHash}`);
        this.logger.log(`Merkle root used for vote: ${merkleTreeRoot}`);
        
        try {
            const currentNonce = await this.provider.getTransactionCount(this.ownerWallet.address, 'latest');
            
            const tx = await this.projectPollLedgerContract.vote(
                electionId,
                proposalIndex,
                merkleTreeRoot,
                nullifierHash,
                proof,
                { nonce: currentNonce }
            );
            
            this.logger.log(`Vote transaction sent, hash: ${tx.hash}, waiting for confirmation...`);
            
            const txReceipt = await tx.wait();
            if (!txReceipt) {
                throw new Error(`Vote failed for election ${electionId}`);
            }
            
            this.logger.log(`Vote successful for election ${electionId}, TX: ${txReceipt.hash}`);
            return txReceipt;
        } catch (error: any) {
            if (error.code === 'CALL_EXCEPTION') {
                // Semaphore errors
                if (error.data === '0x208b15e8') {
                    this.logger.warn(`Duplicate vote attempt on election ${electionId}: Semaphore__YouAreUsingTheSameNullifierTwice`);
                    const duplicateError = new Error('You have already voted in this election');
                    duplicateError.name = 'DuplicateVoteError';
                    throw duplicateError;
                }
                
                if (error.data === '0x4aa6bc40') {
                    this.logger.warn(`Invalid proof on election ${electionId}: Semaphore__InvalidProof`);
                    const invalidProofError = new Error('Invalid zero-knowledge proof');
                    invalidProofError.name = 'VotingError';
                    throw invalidProofError;
                }
                
                if (error.data === '0x4d329586') {
                    this.logger.warn(`Invalid merkle root on election ${electionId}: Semaphore__MerkleTreeRootIsNotPartOfTheGroup`);
                    const merkleError = new Error('Identity verification failed.');
                    merkleError.name = 'VotingError';
                    throw merkleError;
                }
                
                this.logger.error(`Unknown custom error on election ${electionId}: data=${error.data}`);
                const genericError = new Error('Smart contract error occurred.');
                genericError.name = 'VotingError';
                throw genericError;
            }
            
            // other
            this.logger.error(`Failed to vote on election ${electionId}:`, error);
            const errorMessage = error.reason || error.message || 'Unknown error during vote.';
            throw new InternalServerErrorException(errorMessage);
        }
    }

    async startElection(electionId: number) {
        try {
            const currentNonce = await this.provider.getTransactionCount(this.ownerWallet.address, 'latest');
            const tx = await this.projectPollLedgerContract.startElection(electionId, { nonce: currentNonce });
            await tx.wait();
            this.logger.log(`Election ${electionId} started.`);
        } catch (error: any) {
            this.handleContractError(error, 'start election', `${electionId}`);
        }
    }

    async finalizeElection(electionId: number) {
        try {
            const currentNonce = await this.provider.getTransactionCount(this.ownerWallet.address, 'latest');
            const tx = await this.projectPollLedgerContract.finalizeElection(electionId, { nonce: currentNonce });
            await tx.wait();
            this.logger.log(`Election ${electionId} finalized.`);
        } catch (error: any) {
            this.handleContractError(error, 'finalize election', `${electionId}`);
        }
    }
    
    async addMember(identityCommitment: string): Promise<string> {
        const GROUP_ID = 0;
        this.logger.log(`Adding member with ID COMMITMENT ${identityCommitment} to GROUP_ID ${GROUP_ID}.`);
            
        try {
            const currentNonce = await this.provider.getTransactionCount(this.ownerWallet.address, 'latest');
            this.logger.log(`Calling semaphoreContract.addMember with GROUP_ID: ${GROUP_ID}, commitment: ${identityCommitment}, nonce: ${currentNonce}`);
            
            const tx = await this.semaphoreContract.addMember(GROUP_ID, identityCommitment, {
                nonce: currentNonce
            });
            this.logger.log(`addMember transaction sent, hash: ${tx.hash}, waiting for confirmation...`);
            
            const receipt = await tx.wait();
            this.logger.log(`Member added successfully. TX HASH: ${tx.hash}, Block: ${receipt.blockNumber}.`);
            return tx.hash;
        } catch (error: any) {
            this.logger.error(`Error in addMember for ${identityCommitment}:`, error);
            this.handleContractError(error, 'add member', `${identityCommitment}`);
        }
    }

    async registerIdentityWithCnp(cnp: string, identityCommitment: string):
        Promise<{message: string, identityCommitmentAdded: boolean, transactionHash?: string}> {
        this.logger.log(`Registering CNP: ${cnp} with identityCommitment: ${identityCommitment}`);

        const existingCommitment = await this.firebaseService.getIdentityCommitmentByCnp(cnp);
        if (existingCommitment) {
            return existingCommitment === identityCommitment 
                ? { message: 'CNP already registered with this identity.', identityCommitmentAdded: false }
                : (() => { 
                    throw new ConflictException(`CNP ${cnp} is already associated with a different identityCommitment.`); 
                })();
        }

        let transactionHash: string | undefined;
        try {
            transactionHash = await this.addMember(identityCommitment);
        } catch (error: any) {
            if (!error.message?.includes('Identity commitment already exists')) {
                throw new InternalServerErrorException(`Failed to add identity to Semaphore group: ${error.message}`);
            }
        }

        await this.firebaseService.storeCnpIdentityMapping(cnp, identityCommitment);
        return { 
            message: 'Identity successfully registered.', 
            identityCommitmentAdded: true,
            transactionHash 
        };
    }

    async getCommitmentByCnp(cnp: string): Promise<string | null> {
        return this.firebaseService.getIdentityCommitmentByCnp(cnp);
    }

    private handleContractError(error: any, operation: string, context?: string): never {
        const contextMessage = context ? ` ${context}` : '';
        this.logger.error(`Failed to ${operation}${contextMessage}:`, error);
        throw error;
    }

}