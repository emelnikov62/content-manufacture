import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, PostStatus } from '@prisma/client';
import { CreatePostDto, UpdatePostDto } from './posts.dto';

@Injectable()
export class PostsService {
  constructor(private prisma: PrismaService) {}

  async findAllByBrand(brandId: string, status?: PostStatus) {
    const statusFilter = status
      ? { status }
      : { status: { not: PostStatus.DELETED as PostStatus } };
    return this.prisma.post.findMany({
      where: { brandId, ...statusFilter },
      include: {
        brand: { select: { id: true, name: true, color: true } },
        targets: {
          include: {
            account: true,
            publication: true,
          },
        },
        assets: { include: { asset: true }, orderBy: { order: 'asc' } },
        createdBy: { select: { id: true, name: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    const post = await this.prisma.post.findUnique({
      where: { id },
      include: {
        targets: {
          include: {
            account: true,
            publication: true,
          },
        },
        assets: { include: { asset: true }, orderBy: { order: 'asc' } },
        createdBy: { select: { id: true, name: true, avatarUrl: true } },
      },
    });
    if (!post) throw new NotFoundException('Post not found');
    return post;
  }

  async create(dto: CreatePostDto, userId: string) {
    const allAssetIds = [...(dto.assetIds ?? [])];

    if (dto.mediaUrls?.length) {
      for (const url of dto.mediaUrls) {
        const existing = await this.prisma.asset.findFirst({ where: { url } });
        if (existing) {
          allAssetIds.push(existing.id);
        } else {
          const ext = url.split('.').pop()?.split('?')[0]?.toLowerCase() ?? '';
          const type = ['mp4', 'webm', 'mov'].includes(ext) ? 'VIDEO'
            : ['mp3', 'wav', 'ogg', 'flac'].includes(ext) ? 'AUDIO'
            : 'IMAGE';
          const mime = type === 'VIDEO' ? `video/${ext}` : type === 'AUDIO' ? `audio/${ext === 'mp3' ? 'mpeg' : ext}` : `image/${ext || 'png'}`;
          const asset = await this.prisma.asset.create({
            data: {
              brandId: dto.brandId,
              type,
              source: 'AI_GENERATED',
              url,
              thumbnailUrl: url,
              filename: url.split('/').pop() ?? `media.${ext}`,
              mimeType: mime,
              sizeBytes: 0,
              createdById: userId,
            },
          });
          allAssetIds.push(asset.id);
        }
      }
    }

    return this.prisma.post.create({
      data: {
        brandId: dto.brandId,
        title: dto.title || '',
        body: dto.body,
        status: dto.scheduledAt ? PostStatus.SCHEDULED : PostStatus.DRAFT,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        createdById: userId,
        targets: {
          create: dto.targets.map((t) => ({
            account: { connect: { id: t.accountId } },
            networkParamsJson: (t.networkParams ?? {}) as Prisma.InputJsonValue,
          })),
        },
        ...(allAssetIds.length && {
          assets: {
            create: allAssetIds.map((assetId, i) => ({
              assetId,
              order: i,
            })),
          },
        }),
      },
      include: {
        targets: { include: { account: true } },
        assets: { include: { asset: true } },
      },
    });
  }

  async update(id: string, dto: UpdatePostDto) {
    let savedPubs: { accountId: string; status: any; externalId: string | null; publishedAt: Date | null; scheduledAt: Date | null; retryCount: number; error: string | null }[] = [];

    if (dto.targets !== undefined) {
      const oldTargets = await this.prisma.postTarget.findMany({
        where: { postId: id },
        include: { publication: true },
      });
      savedPubs = oldTargets
        .filter((t) => t.publication)
        .map((t) => ({
          accountId: t.accountId,
          status: t.publication!.status,
          externalId: t.publication!.externalId,
          publishedAt: t.publication!.publishedAt,
          scheduledAt: t.publication!.scheduledAt,
          retryCount: t.publication!.retryCount,
          error: t.publication!.error,
        }));
      await this.prisma.postTarget.deleteMany({ where: { postId: id } });
    }
    if (dto.assetIds !== undefined || dto.mediaUrls !== undefined) {
      await this.prisma.postAsset.deleteMany({ where: { postId: id } });
    }

    const allAssetIds = [...(dto.assetIds ?? [])];
    if (dto.mediaUrls?.length) {
      const post = await this.prisma.post.findUniqueOrThrow({ where: { id }, select: { brandId: true, createdById: true } });
      for (const url of dto.mediaUrls) {
        const existing = await this.prisma.asset.findFirst({ where: { url } });
        if (existing) {
          allAssetIds.push(existing.id);
        } else {
          const ext = url.split('.').pop()?.split('?')[0]?.toLowerCase() ?? '';
          const type = ['mp4', 'webm', 'mov'].includes(ext) ? 'VIDEO'
            : ['mp3', 'wav', 'ogg', 'flac'].includes(ext) ? 'AUDIO'
            : 'IMAGE';
          const mime = type === 'VIDEO' ? `video/${ext}` : type === 'AUDIO' ? `audio/${ext === 'mp3' ? 'mpeg' : ext}` : `image/${ext || 'png'}`;
          const asset = await this.prisma.asset.create({
            data: {
              brandId: post.brandId,
              type,
              source: 'AI_GENERATED',
              url,
              thumbnailUrl: url,
              filename: url.split('/').pop() ?? `media.${ext}`,
              mimeType: mime,
              sizeBytes: 0,
              createdById: post.createdById,
            },
          });
          allAssetIds.push(asset.id);
        }
      }
    }

    const result = await this.prisma.post.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.body !== undefined && { body: dto.body }),
        ...(dto.scheduledAt !== undefined && {
          scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.targets !== undefined && {
          targets: {
            create: dto.targets.map((t) => ({
              account: { connect: { id: t.accountId } },
              networkParamsJson: (t.networkParams ?? {}) as Prisma.InputJsonValue,
            })),
          },
        }),
        ...((dto.assetIds !== undefined || dto.mediaUrls !== undefined) && allAssetIds.length > 0 && {
          assets: {
            create: allAssetIds.map((assetId, i) => ({
              assetId,
              order: i,
            })),
          },
        }),
      },
      include: {
        targets: { include: { account: true, publication: true } },
        assets: { include: { asset: true } },
      },
    });

    if (savedPubs.length > 0) {
      for (const target of result.targets) {
        const oldPub = savedPubs.find((p) => p.accountId === target.accountId);
        if (oldPub) {
          await this.prisma.publication.create({
            data: {
              postTargetId: target.id,
              status: oldPub.status,
              externalId: oldPub.externalId,
              publishedAt: oldPub.publishedAt,
              scheduledAt: oldPub.scheduledAt,
              retryCount: oldPub.retryCount,
              error: oldPub.error,
            },
          });
        }
      }
    }

    return result;
  }

  async delete(id: string) {
    return this.prisma.post.delete({ where: { id } });
  }

  async findScheduledPosts() {
    return this.prisma.post.findMany({
      where: {
        status: PostStatus.SCHEDULED,
        scheduledAt: { lte: new Date() },
      },
      include: {
        targets: {
          include: {
            account: true,
            publication: true,
          },
        },
        assets: { include: { asset: true }, orderBy: { order: 'asc' } },
      },
    });
  }

  async getCalendarPosts(brandId: string, from: Date, to: Date) {
    return this.prisma.post.findMany({
      where: {
        brandId,
        scheduledAt: { gte: from, lte: to },
      },
      include: {
        targets: { include: { account: { select: { id: true, network: true, handle: true } } } },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { scheduledAt: 'asc' },
    });
  }
}
