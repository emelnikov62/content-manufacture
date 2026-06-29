import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { SchedulerService } from './scheduler.service';
import { PublishProcessor } from './publish.processor';
import { PublicationsModule } from '../publications/publications.module';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'publish' }),
    PublicationsModule,
  ],
  providers: [SchedulerService, PublishProcessor],
  exports: [SchedulerService],
})
export class SchedulerModule {}
