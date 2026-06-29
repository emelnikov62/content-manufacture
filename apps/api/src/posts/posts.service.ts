import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, PostStatus } from '@prisma/client';
import { CreatePostDto, UpdatePostDto } from './posts.dto';

@Injectable()
export class PostsService {
  constructor(private prisma: PrismaService) {}

  async findAllByBrand(brandId: string, status?: PostStatus) {
    return this.prisma.post.findMany({
      where: { brandId, ...(status && { status }) },
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
    return this.prisma.post.create({
      data: {
        brandId: dto.brandId,
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
        ...(dto.assetIds?.length && {
          assets: {
            create: dto.assetIds.map((assetId, i) => ({
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
    return this.prisma.post.update({
      where: { id },
      data: {
        ...(dto.body !== undefined && { body: dto.body }),
        ...(dto.scheduledAt !== undefined && {
          scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        }),
        ...(dto.status !== undefined && { status: dto.status }),
      },
    });
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
