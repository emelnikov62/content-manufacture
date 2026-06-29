import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAccountDto, UpdateAccountDto } from './accounts.dto';

@Injectable()
export class AccountsService {
  constructor(private prisma: PrismaService) {}

  findAllByBrand(brandId: string) {
    return this.prisma.account.findMany({
      where: { brandId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    const account = await this.prisma.account.findUnique({ where: { id } });
    if (!account) throw new NotFoundException('Account not found');
    return account;
  }

  create(dto: CreateAccountDto) {
    return this.prisma.account.create({ data: dto });
  }

  update(id: string, dto: UpdateAccountDto) {
    return this.prisma.account.update({ where: { id }, data: dto });
  }

  delete(id: string) {
    return this.prisma.account.delete({ where: { id } });
  }
}
