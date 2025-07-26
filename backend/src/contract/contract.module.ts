import { Module } from '@nestjs/common';
import { ContractService } from './contract.service.js';
import { ContractController } from './contract.controller.js';
import { FirebaseModule } from '../firebase/firebase.module.js';

@Module({
  imports: [FirebaseModule],
  controllers: [ContractController],
  providers: [ContractService],
  exports: [ContractService],
})
export class ContractModule {}
