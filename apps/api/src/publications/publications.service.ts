import { Injectable, Inject, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { PostStatus, PublicationStatus } from '@prisma/client';
import type { PublishingProvider } from '../publishing/publishing.interface';
import { PUBLISHING_PROVIDER } from '../publishing/publishing.interface';

@Injectable()
export class PublicationsService {
  private readonly logger = new Logger(PublicationsService.name);

  constructor(
    private prisma: PrismaService,
    @Inject(PUBLISHING_PROVIDER) private publisher: PublishingProvider,
  ) {}

  async publishPost(postId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: {
        targets: { include: { account: true, publication: true } },
        assets: { include: { asset: true }, orderBy: { order: 'asc' } },
      },
    });

    if (!post) throw new Error('Post not found');

    await this.prisma.post.update({
      where: { id: postId },
      data: { status: PostStatus.PUBLISHING },
    });

    const targets = post.targets.map((t) => ({
      profileId: t.account.postproxyProfileId,
      network: t.account.network,
      networkParams: t.networkParamsJson as Record<string, unknown>,
    }));

    const mediaUrls = post.assets.map((pa) => pa.asset.url);

    const results = await this.publisher.publish({
      text: post.body,
      mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined,
      targets,
    });

    let hasError = false;
    for (const result of results) {
      const target = post.targets.find(
        (t) => t.account.postproxyProfileId === result.profileId,
      );
      if (!target) continue;

      const status = result.success
        ? PublicationStatus.PUBLISHING
        : PublicationStatus.ERROR;

      if (!result.success) hasError = true;

      await this.prisma.publication.upsert({
        where: { postTargetId: target.id },
        update: {
          status,
          externalId: result.externalId,
          error: result.error,
        },
        create: {
          postTargetId: target.id,
          status,
          externalId: result.externalId,
          error: result.error,
          scheduledAt: post.scheduledAt,
        },
      });
    }

    if (hasError) {
      await this.prisma.post.update({
        where: { id: postId },
        data: { status: PostStatus.ERROR },
      });
    }

    return results;
  }

  async retryPublication(publicationId: string) {
    const pub = await this.prisma.publication.findUnique({
      where: { id: publicationId },
      include: {
        postTarget: {
          include: {
            account: true,
            post: { include: { assets: { include: { asset: true } } } },
          },
        },
      },
    });

    if (!pub) throw new Error('Publication not found');

    const target = pub.postTarget;
    const mediaUrls = target.post.assets.map((pa) => pa.asset.url);

    const results = await this.publisher.publish({
      text: target.post.body,
      mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined,
      targets: [
        {
          profileId: target.account.postproxyProfileId,
          network: target.account.network,
          networkParams: target.networkParamsJson as Record<string, unknown>,
        },
      ],
    });

    const result = results[0];
    await this.prisma.publication.update({
      where: { id: publicationId },
      data: {
        status: result.success
          ? PublicationStatus.PUBLISHED
          : PublicationStatus.ERROR,
        externalId: result.externalId,
        error: result.error,
        publishedAt: result.success ? new Date() : null,
        retryCount: { increment: 1 },
      },
    });

    return result;
  }

  async updateExternalPosts(
    posts: { externalId: string; profileId: string; network: string; networkParams: Record<string, unknown> }[],
    text: string,
    mediaUrls: string[],
  ) {
    for (const p of posts) {
      try {
        await this.publisher.updatePost(p.externalId, {
          text,
          mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined,
          targets: [{ profileId: p.profileId, network: p.network, networkParams: p.networkParams }],
        });
        this.logger.log(`Updated external post ${p.externalId}`);
      } catch (err) {
        this.logger.warn(`Failed to update external post ${p.externalId}: ${err}`);
      }
    }
  }

  async updatePublishedPost(postId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: {
        targets: { include: { account: true, publication: true } },
        assets: { include: { asset: true }, orderBy: { order: 'asc' } },
      },
    });
    if (!post) return;

    for (const target of post.targets) {
      const pub = target.publication;
      if (!pub || !pub.externalId) continue;
      if (!pub.externalId.startsWith('sim_')) {
        try {
          await this.publisher.deletePost(pub.externalId);
          this.logger.log(`Deleted old external post ${pub.externalId}`);
        } catch (err) {
          this.logger.warn(`Failed to delete old external post ${pub.externalId}: ${err}`);
        }
      }
    }

    await this.prisma.post.update({
      where: { id: postId },
      data: { status: PostStatus.PUBLISHING },
    });

    const targets = post.targets.map((t) => ({
      profileId: t.account.postproxyProfileId,
      network: t.account.network,
      networkParams: t.networkParamsJson as Record<string, unknown>,
    }));
    const mediaUrls = post.assets.map((pa) => pa.asset.url);

    const results = await this.publisher.publish({
      text: post.body,
      mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined,
      targets,
    });

    for (const result of results) {
      const target = post.targets.find(
        (t) => t.account.postproxyProfileId === result.profileId,
      );
      if (!target) continue;

      await this.prisma.publication.upsert({
        where: { postTargetId: target.id },
        update: {
          status: result.success ? PublicationStatus.PUBLISHING : PublicationStatus.ERROR,
          externalId: result.externalId,
          error: result.error,
          publishedAt: null,
        },
        create: {
          postTargetId: target.id,
          status: result.success ? PublicationStatus.PUBLISHING : PublicationStatus.ERROR,
          externalId: result.externalId,
          error: result.error,
        },
      });
    }
  }

  async deletePublishedPost(postId: string) {
    const publications = await this.prisma.publication.findMany({
      where: { postTarget: { postId }, status: 'PUBLISHED', externalId: { not: null } },
    });
    for (const pub of publications) {
      if (pub.externalId && !pub.externalId.startsWith('sim_')) {
        try {
          await this.publisher.deletePost(pub.externalId);
        } catch (err) {
          this.logger.warn(`Failed to delete external post ${pub.externalId}: ${err}`);
        }
      }
    }
  }

  @Cron('*/30 * * * * *')
  async checkPendingPublications() {
    const pending = await this.prisma.publication.findMany({
      where: { status: PublicationStatus.PUBLISHING, externalId: { not: null } },
      include: { postTarget: { select: { postId: true } } },
    });

    if (pending.length === 0) return;
    this.logger.log(`Checking ${pending.length} pending publications...`);

    for (const pub of pending) {
      if (!pub.externalId) continue;

      if (pub.externalId.startsWith('sim_')) {
        await this.prisma.publication.update({
          where: { id: pub.id },
          data: { status: PublicationStatus.PUBLISHED, publishedAt: new Date() },
        });
        continue;
      }

      try {
        const result = await this.publisher.getPublicationStatus(pub.externalId);
        if (result.status === 'published' || result.status === 'sent') {
          await this.prisma.publication.update({
            where: { id: pub.id },
            data: { status: PublicationStatus.PUBLISHED, publishedAt: new Date() },
          });
          this.logger.log(`Publication ${pub.id} confirmed published`);
        } else if (result.status === 'error' || result.status === 'failed') {
          await this.prisma.publication.update({
            where: { id: pub.id },
            data: { status: PublicationStatus.ERROR, error: result.error || 'Publication failed' },
          });
          this.logger.warn(`Publication ${pub.id} failed: ${result.error}`);
        }
      } catch (err) {
        this.logger.warn(`Failed to check publication ${pub.id}: ${err}`);
      }
    }

    const postIds = [...new Set(pending.map((p) => p.postTarget.postId))];
    for (const postId of postIds) {
      const allPubs = await this.prisma.publication.findMany({
        where: { postTarget: { postId } },
      });
      const allDone = allPubs.every((p) => p.status !== PublicationStatus.PUBLISHING);
      if (allDone) {
        const hasError = allPubs.some((p) => p.status === PublicationStatus.ERROR);
        const allPublished = allPubs.every((p) => p.status === PublicationStatus.PUBLISHED);
        await this.prisma.post.update({
          where: { id: postId },
          data: { status: hasError ? PostStatus.ERROR : allPublished ? PostStatus.PUBLISHED : PostStatus.PUBLISHING },
        });
        if (allPublished) this.logger.log(`Post ${postId} fully published`);
      }
    }
  }

  findByPost(postId: string) {
    return this.prisma.publication.findMany({
      where: { postTarget: { postId } },
      include: {
        postTarget: {
          include: { account: { select: { id: true, network: true, handle: true } } },
        },
      },
    });
  }
}
