import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ContractService } from '../contract/contract.service.js';

@Injectable()
export class ElectionMonitorService {
    private readonly logger = new Logger(ElectionMonitorService.name);

    constructor(private contractService: ContractService) {}

    private async retryWithBackoff(
        operation: () => Promise<any>, 
        operationName: string, 
        maxRetries: number = 3
    ): Promise<void> {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                await operation();
                return;
            } catch (error: any) {
                const isNonceError = error.name === 'NonceError' ||
                    error.code === 'NONCE_EXPIRED' || 
                    error.message?.includes('nonce') || 
                    error.message?.includes('Nonce too low');
                
                if (isNonceError && attempt < maxRetries) {
                    const backoffTime = attempt * 200; 
                    this.logger.debug(`Nonce conflict ${operationName}, retrying in ${backoffTime}ms (attempt ${attempt}/${maxRetries})`);
                    await new Promise(resolve => setTimeout(resolve, backoffTime));
                } else {
                    throw error;
                }
            }
        }
    }

    @Cron(CronExpression.EVERY_10_SECONDS)
    async checkElectionStatus() {
        try {
            const elections = await this.contractService.getAllElections();

            for (let i = 0; i < elections.length; i++) {
                const election = elections[i];
                
                // verificare daca trebuie dat start la vreun election
                try {
                    const shouldStart = await this.contractService.shouldElectionStart(i);
                    if (shouldStart) {
                        this.logger.log(`Starting election ${i} (${election.name})`);
                        await this.retryWithBackoff(() => this.contractService.startElection(i), `starting election ${i}`);
                    }
                } catch (error: any) {
                    this.logger.error(`Error starting election ${i}:`, error);
                }
                
                // verificare daca trebuie finalizat vreun election
                try {
                    const hasEnded = await this.contractService.hasElectionEnded(i);
                    if (hasEnded) {
                        this.logger.log(`Finalizing election ${i} (${election.name})`);
                        await this.retryWithBackoff(() => this.contractService.finalizeElection(i), `finalizing election ${i}`);
                    }
                } catch (error: any) {
                    this.logger.error(`Error finalizing election ${i}:`, error);
                }
            }
        } catch (error: any) {
            this.logger.error('Error checking election status:', error);
        }
    }
}