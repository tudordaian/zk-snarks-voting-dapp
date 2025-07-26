import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { MulterModule } from '@nestjs/platform-express';
import { ContractModule } from './contract/contract.module.js';
import { TasksModule } from './tasks/tasks.module.js';
import { ConfigModule } from '@nestjs/config';
import { FirebaseModule } from './firebase/firebase.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    MulterModule.register({
      dest: './uploads',
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
    }),
    ContractModule, 
    TasksModule, 
    FirebaseModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
