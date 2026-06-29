import { Injectable, Inject, Logger } from '@nestjs/common';
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

    let allSuccess = true;
    for (const result of results) {
      const target = post.targets.find(
        (t) => t.account.postproxyProfileId === result.profileId,
      );
      if (!target) continue;

      const status = result.success
        ? PublicationStatus.PUBLISHED
        : PublicationStatus.ERROR;

      if (!result.success) allSuccess = false;

      await this.prisma.publication.upsert({
        where: { postTargetId: target.id },
        update: {
          status,
          externalId: result.externalId,
          error: result.error,
          publishedAt: result.success ? new Date() : null,
        },
        create: {
          postTargetId: target.id,
          status,
          externalId: result.externalId,
          error: result.error,
          publishedAt: result.success ? new Date() : null,
          scheduledAt: post.scheduledAt,
        },
      });
    }

    await this.prisma.post.update({
      where: { id: postId },
      data: {
        status: allSuccess ? PostStatus.PUBLISHED : PostStatus.ERROR,
      },
    });

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
