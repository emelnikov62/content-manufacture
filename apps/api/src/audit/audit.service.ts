import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  log(data: {
    userId: string;
    action: string;
    entity: string;
    entityId?: string;
    brandId?: string;
    metadata?: Record<string, unknown>;
  }) {
    return this.prisma.auditLog.create({
      data: {
        action: data.action,
        entity: data.entity,
        entityId: data.entityId,
        metadata: (data.metadata ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        user: { connect: { id: data.userId } },
        ...(data.brandId && { brand: { connect: { id: data.brandId } } }),
      },
    });
  }

  findAll(params: {
    brandId?: string;
    userId?: string;
    page?: number;
    limit?: number;
  }) {
    const { brandId, userId, page = 1, limit = 50 } = params;
    return this.prisma.auditLog.findMany({
      where: {
        ...(brandId && { brandId }),
        ...(userId && { userId }),
      },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }
}
