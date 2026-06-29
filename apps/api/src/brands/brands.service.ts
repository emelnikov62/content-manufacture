import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';
import { CreateBrandDto, UpdateBrandDto } from './brands.dto';

@Injectable()
export class BrandsService {
  constructor(private prisma: PrismaService) {}

  async findAllForUser(userId: string) {
    const userBrands = await this.prisma.userBrand.findMany({
      where: { userId },
      include: {
        brand: {
          include: {
            accounts: { select: { id: true, network: true, status: true } },
            _count: { select: { posts: true } },
          },
        },
      },
    });
    return userBrands.map((ub) => ({ ...ub.brand, role: ub.role }));
  }

  async findById(id: string, userId: string) {
    const userBrand = await this.prisma.userBrand.findUnique({
      where: { userId_brandId: { userId, brandId: id } },
      include: { brand: { include: { accounts: true } } },
    });
    if (!userBrand) throw new NotFoundException('Brand not found');
    return { ...userBrand.brand, role: userBrand.role };
  }

  async create(dto: CreateBrandDto, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const brand = await tx.brand.create({ data: dto });
      await tx.userBrand.create({
        data: { userId, brandId: brand.id, role: Role.OWNER },
      });
      return brand;
    });
  }

  async update(id: string, dto: UpdateBrandDto, userId: string) {
    await this.ensureAccess(id, userId, [Role.OWNER, Role.MANAGER]);
    return this.prisma.brand.update({ where: { id }, data: dto });
  }

  async delete(id: string, userId: string) {
    await this.ensureAccess(id, userId, [Role.OWNER]);
    return this.prisma.brand.delete({ where: { id } });
  }

  async addMember(brandId: string, targetUserId: string, role: Role, requesterId: string) {
    await this.ensureAccess(brandId, requesterId, [Role.OWNER]);
    return this.prisma.userBrand.upsert({
      where: { userId_brandId: { userId: targetUserId, brandId } },
      update: { role },
      create: { userId: targetUserId, brandId, role },
    });
  }

  async removeMember(brandId: string, targetUserId: string, requesterId: string) {
    await this.ensureAccess(brandId, requesterId, [Role.OWNER]);
    return this.prisma.userBrand.delete({
      where: { userId_brandId: { userId: targetUserId, brandId } },
    });
  }

  async getMembers(brandId: string, requesterId: string) {
    await this.ensureAccess(brandId, requesterId, [Role.OWNER, Role.MANAGER, Role.EDITOR, Role.VIEWER]);
    const members = await this.prisma.userBrand.findMany({
      where: { brandId },
      include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
    });
    return members.map((m) => ({ ...m.user, role: m.role }));
  }

  async addMemberByEmail(brandId: string, email: string, role: Role, requesterId: string) {
    await this.ensureAccess(brandId, requesterId, [Role.OWNER]);
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return null;
    return this.prisma.userBrand.upsert({
      where: { userId_brandId: { userId: user.id, brandId } },
      update: { role },
      create: { userId: user.id, brandId, role },
      include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
    });
  }

  private async ensureAccess(brandId: string, userId: string, allowedRoles: Role[]) {
    const ub = await this.prisma.userBrand.findUnique({
      where: { userId_brandId: { userId, brandId } },
    });
    if (!ub) throw new NotFoundException('Brand not found');
    if (!allowedRoles.includes(ub.role)) throw new ForbiddenException();
  }
}
