import { Module, forwardRef } from '@nestjs/common';
import { PostsService } from './posts.service';
import { PostsController } from './posts.controller';
import { SchedulerModule } from '../scheduler/scheduler.module';
import { PublicationsModule } from '../publications/publications.module';

@Module({
  imports: [forwardRef(() => SchedulerModule), PublicationsModule],
  controllers: [PostsController],
  providers: [PostsService],
  exports: [PostsService],
})
export class PostsModule {}
