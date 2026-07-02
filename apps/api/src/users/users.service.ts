import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: { userBrands: { include: { brand: true } } },
    });
  }

  create(data: { email: string; passwordHash: string; name: string }) {
    return this.prisma.user.create({ data });
  }

  update(id: string, data: { name?: string; avatarUrl?: string; locale?: string; theme?: string }) {
    return this.prisma.user.update({ where: { id }, data });
  }

  updatePassword(id: string, passwordHash: string) {
    return this.prisma.user.update({ where: { id }, data: { passwordHash } });
  }
}
