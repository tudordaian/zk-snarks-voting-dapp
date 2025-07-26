import {
    BadRequestException,
    Body,
    ConflictException,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Logger,
    Param,
    Post,
} from '@nestjs/common';
import { ContractService } from './contract.service.js';

interface RegisterIdentityDTO {
    cnp: string;
    identityCommitment: string;
}

interface VoteZkpDTO {
    proposalIndex: number;
    merkleTreeRoot: string;
    nullifierHash: string;
    proof: string[];
}

@Controller('contract')
export class ContractController {
    private logger = new Logger(ContractController.name);

    constructor(private readonly contractService: ContractService) {}


    @Post('register-identity')
    @HttpCode(HttpStatus.CREATED)
    async registerVoter(@Body() registerData: RegisterIdentityDTO) {
        this.logger.log(`ContractController: Request to register identity with CNP: ${registerData.cnp}`);
        
        const result = await this.contractService.registerIdentityWithCnp(
            registerData.cnp,
            registerData.identityCommitment
        );
        
        return {
            message: result.message,
            data: { 
                cnp: registerData.cnp,
                identityCommitment: registerData.identityCommitment,
                commitmentAddedToGroup: result.identityCommitmentAdded,
                transactionHash: result.transactionHash
            }
        };
    }

    @Get('commitment/:cnp')
    async getIdentityCommitmentByCnp(@Param('cnp') cnp: string) {
        this.logger.log(`Request to get identity commitment for CNP: ${cnp}`);
        
        const identityCommitment = await this.contractService.getCommitmentByCnp(cnp);
        if (!identityCommitment) {
            return {
                success: false,
                data: null,
                message: 'Identity commitment not found for this CNP.'
            };
        }
        
        return {
            success: true,
            data: { identityCommitment },
            message: 'Identity commitment retrieved successfully.'
        };
    }

    @Post(':electionId/vote-zkp')
    @HttpCode(HttpStatus.OK)
    async voteZkp(@Param('electionId') electionIdStr: string, @Body() voteData: VoteZkpDTO) {
        this.logger.log(`Request to cast ZKP vote for election ID: ${electionIdStr}`);
        
        const electionId = parseInt(electionIdStr, 10);
        if (isNaN(electionId)) {
            throw new BadRequestException('Invalid election ID.');
        }

        try {
            const txReceipt = await this.contractService.voteZkp(
                electionId,
                voteData.proposalIndex,
                voteData.merkleTreeRoot,
                voteData.nullifierHash,
                voteData.proof,
            );
            
            return {
                success: true,
                message: 'Vote cast successfully.',
                data: {
                    hash: txReceipt.hash,
                    blockNumber: txReceipt.blockNumber,
                    gasUsed: txReceipt.gasUsed?.toString(),
                }
            };
        } catch (error: any) {
            this.logger.error(`Failed to cast ZKP vote for election ${electionId}: ${error.message}`);
            
            if (error.name === 'DuplicateVoteError') {
                throw new ConflictException('You have already voted in this election.');
            } else if (error.name === 'VotingError') {
                throw new BadRequestException(error.message || 'Voting failed due to contract constraints.');
            } else if (error.name === 'NonceError') {
                throw new BadRequestException('Transaction nonce conflict. Please try again.');
            }
            
            const errorMessage = error.message || 'Failed to cast vote';
            throw new BadRequestException(errorMessage);
        }
    }
}
