import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { PostStatus } from '@prisma/client';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    @InjectQueue('publish') private publishQueue: Queue,
    private prisma: PrismaService,
  ) {}

  async schedulePost(postId: string, scheduledAt: Date) {
    const delay = scheduledAt.getTime() - Date.now();

    if (delay <= 0) {
      await this.publishQueue.add('publish', { postId }, { jobId: postId });
    } else {
      await this.publishQueue.add('publish', { postId }, {
        jobId: postId,
        delay,
      });
    }

    this.logger.log(
      `Scheduled post ${postId} for ${scheduledAt.toISOString()} (delay: ${delay}ms)`,
    );
  }

  async cancelScheduledPost(postId: string) {
    const job = await this.publishQueue.getJob(postId);
    if (job) {
      await job.remove();
      this.logger.log(`Cancelled scheduled post ${postId}`);
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async processOverduePosts() {
    const overdue = await this.prisma.post.findMany({
      where: {
        status: PostStatus.SCHEDULED,
        scheduledAt: { lte: new Date() },
      },
      select: { id: true },
    });

    for (const post of overdue) {
      const existingJob = await this.publishQueue.getJob(post.id);
      if (!existingJob) {
        await this.publishQueue.add('publish', { postId: post.id }, {
          jobId: post.id,
        });
        this.logger.log(`Added overdue post ${post.id} to queue`);
      }
    }
  }
}
