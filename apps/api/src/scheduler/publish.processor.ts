import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PublicationsService } from '../publications/publications.service';

@Processor('publish')
export class PublishProcessor extends WorkerHost {
  private readonly logger = new Logger(PublishProcessor.name);

  constructor(private publicationsService: PublicationsService) {
    super();
  }

  async process(job: Job<{ postId: string }>) {
    const { postId } = job.data;
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
