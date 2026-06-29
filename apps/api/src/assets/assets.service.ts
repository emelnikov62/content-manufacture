import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AssetType, AssetSource } from '@prisma/client';
import { StorageService } from './storage.service';

@Injectable()
export class AssetsService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
  ) {}

  async upload(
    file: Express.Multer.File,
    brandId: string,
    userId: string,
    tags: string[] = [],
  ) {
    const { url, thumbnailUrl } = await this.storage.upload(file);

    const type = file.mimetype.startsWith('video')
      ? AssetType.VIDEO
      : file.mimetype.startsWith('audio')
        ? AssetType.AUDIO
        : AssetType.IMAGE;

    return this.prisma.asset.create({
      data: {
        brandId,
        type,
        source: AssetSource.UPLOADED,
        url,
        thumbnailUrl,
        filename: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        tags,
        createdById: userId,
      },
    });
  }

  findAllByBrand(
    brandId: string,
    filters?: { type?: AssetType; source?: AssetSource; tag?: string },
  ) {
    return this.prisma.asset.findMany({
      where: {
        brandId,
        ...(filters?.type && { type: filters.type }),
        ...(filters?.source && { source: filters.source }),
        ...(filters?.tag && { tags: { has: filters.tag } }),
      },
      include: {
        _count: { select: { posts: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    const asset = await this.prisma.asset.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, name: true } },
        posts: {
          include: { post: { select: { id: true, body: true, status: true } } },
        },
      },
    });
    if (!asset) throw new NotFoundException('Asset not found');
    return asset;
  }

  updateTags(id: string, tags: string[]) {
    return this.prisma.asset.update({
      where: { id },
      data: { tags },
    });
  }

  delete(id: string) {
    return this.prisma.asset.delete({ where: { id } });
  }
}
