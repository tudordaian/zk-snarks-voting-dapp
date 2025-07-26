import { Module } from '@nestjs/common';
import { ElectionMonitorService } from './election-monitor.service.js';
import { ContractModule } from '../contract/contract.module.js';

@Module({
    imports: [ContractModule],
    providers: [ElectionMonitorService],
    exports: [ElectionMonitorService],
})
export class TasksModule {}