import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { PublicationsService } from '../publications/publications.service';
import { PostStatus } from '@prisma/client';

@Processor('publish')
export class PublishProcessor extends WorkerHost {
  private readonly logger = new Logger(PublishProcessor.name);

  constructor(
    private publicationsService: PublicationsService,
    private prisma: PrismaService,
  ) {
    super();
  }

  async process(job: Job<{ postId: string }>) {
    const { postId } = job.data;

    if (job.name === 'delete') {
      this.logger.log(`Processing scheduled delete for post ${postId}`);
      try {
        await this.publicationsService.deletePublishedPost(postId);
        await this.prisma.post.update({
          where: { id: postId },
          data: { status: PostStatus.DELETED, deleteAt: null },
        });
        this.logger.log(`Post ${postId} deleted by schedule`);
      } catch (err: any) {
        this.logger.error(`Scheduled delete failed for post ${postId}: ${err.message}`);
        throw err;
      }
      return;
    }

    this.logger.log(`Processing publish job for post ${postId}`);

    try {
      const results = await this.publicationsService.publishPost(postId);
      const failed = results.filter((r) => !r.success);

      if (failed.length > 0) {
        this.logger.warn(
          `Post ${postId}: ${failed.length}/${results.length} targets failed`,
        );
      } else {
        this.logger.log(`Post ${postId} published to ${results.length} targets`);
      }

      return results;
    } catch (err: any) {
      this.logger.error(`Publish failed for post ${postId}: ${err.message}`);
      throw err;
    }
  }
}
