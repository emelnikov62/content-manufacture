import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getOverview(brandId: string) {
    const [accounts, posts, publications] = await Promise.all([
      this.prisma.account.count({ where: { brandId } }),
      this.prisma.post.count({ where: { brandId } }),
      this.prisma.publication.count({
        where: {
          postTarget: { post: { brandId } },
          status: 'PUBLISHED',
        },
      }),
    ]);

    const latestSnapshots = await this.prisma.analyticsSnapshot.findMany({
      where: { accountId: { in: (await this.prisma.account.findMany({ where: { brandId }, select: { id: true } })).map(a => a.id) } },
      orderBy: { date: 'desc' },
      distinct: ['accountId'],
    });

    const totalFollowers = latestSnapshots.reduce((sum, s) => sum + s.followers, 0);
    const totalReach = latestSnapshots.reduce((sum, s) => sum + s.reach, 0);

    return {
      accounts,
      posts,
      publications,
      totalFollowers,
      totalReach,
    };
  }

  async getAccountSnapshots(
    accountId: string,
    from: Date,
    to: Date,
  ) {
    return this.prisma.analyticsSnapshot.findMany({
      where: {
        accountId,
        date: { gte: from, lte: to },
      },
      orderBy: { date: 'asc' },
    });
  }

  async getDashboardData(brandId: string | null) {
    const where = brandId ? { brandId } : {};

    const [
      totalPosts,
      scheduledPosts,
      publishedPosts,
      errorPosts,
      recentPosts,
    ] = await Promise.all([
      this.prisma.post.count({ where }),
      this.prisma.post.count({ where: { ...where, status: 'SCHEDULED' } }),
      this.prisma.post.count({ where: { ...where, status: 'PUBLISHED' } }),
      this.prisma.post.count({ where: { ...where, status: 'ERROR' } }),
      this.prisma.post.findMany({
        where: { ...where, scheduledAt: { gte: new Date() } },
        include: {
          targets: { include: { account: { select: { network: true, handle: true } } } },
          createdBy: { select: { name: true } },
        },
        orderBy: { scheduledAt: 'asc' },
        take: 10,
      }),
    ]);

    const errorPublications = await this.prisma.publication.findMany({
      where: {
        status: 'ERROR',
        postTarget: { post: where },
      },
      include: {
        postTarget: {
          include: {
            account: { select: { network: true, handle: true } },
            post: { select: { id: true, body: true } },
          },
        },
      },
      orderBy: { publishedAt: 'desc' },
      take: 5,
    });

    return {
      totalPosts,
      scheduledPosts,
      publishedPosts,
      errorPosts,
      upcomingPosts: recentPosts,
      errorPublications,
    };
  }
}
