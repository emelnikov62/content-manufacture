import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAccountDto, UpdateAccountDto } from './accounts.dto';

@Injectable()
export class AccountsService {
  private readonly logger = new Logger(AccountsService.name);
  private readonly ppUrl = 'https://api.postproxy.dev';

  constructor(private prisma: PrismaService) {}

  private async getApiKey(): Promise<string> {
    const row = await this.prisma.setting.findUnique({ where: { key: 'POSTPROXY_API_KEY' } });
    if (!row?.value) throw new BadRequestException('PostProxy API ключ не настроен. Укажите его в Настройки → Интеграции.');
    return row.value;
  }

  private async ppRequest<T>(method: string, path: string, body?: unknown): Promise<T> {
    const apiKey = await this.getApiKey();
    const res = await fetch(`${this.ppUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      const text = await res.text();
      this.logger.error(`PostProxy ${method} ${path} → ${res.status}: ${text}`);
      throw new BadRequestException(`PostProxy error: ${res.status} ${text}`);
    }
    return res.json();
  }

  // ── Local CRUD ──

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

  // ── PostProxy: Profile Groups ──

  async getProfileGroups(): Promise<any[]> {
    const res = await this.ppRequest<any>('GET', '/api/profile_groups');
    return res?.data ?? res ?? [];
  }

  async createProfileGroup(name: string): Promise<any> {
    return this.ppRequest('POST', '/api/profile_groups', { name });
  }

  // ── PostProxy: Profiles ──

  async getProfiles(): Promise<any[]> {
    const res = await this.ppRequest<any>('GET', '/api/profiles');
    return res?.data ?? res ?? [];
  }

  // ── PostProxy: Connect Telegram bot ──

  async connectTelegram(
    brandId: string,
    botToken: string,
    profileGroupId?: string,
  ) {
    // 1. Use provided group, or find existing, or create new
    if (!profileGroupId) {
      const groups = await this.getProfileGroups();
      if (groups.length > 0) {
        profileGroupId = groups[0].id;
      } else {
        const brand = await this.prisma.brand.findUnique({ where: { id: brandId } });
        const group = await this.createProfileGroup(brand?.name ?? 'Brand');
        profileGroupId = group.id;
      }
    }

    // 2. Initialize Telegram profile in PostProxy
    const res = await this.ppRequest<any>(
      'POST',
      `/api/profile_groups/${profileGroupId}/initialize_connection`,
      { platform: 'telegram', bot_token: botToken },
    );

    const profile = res.profile ?? res.data ?? res;
    const profileId = profile.id ?? '';
    const handle = profile.external_username ?? profile.name ?? 'telegram-bot';

    // 3. Save to our DB
    const account = await this.prisma.account.create({
      data: {
        brandId,
        network: 'TELEGRAM',
        postproxyProfileId: profileId,
        handle,
        status: 'CONNECTED',
      },
    });

    return { account, profile };
  }

  // ── PostProxy: Placements (channels) ──

  async getPlacements(accountId: string): Promise<any[]> {
    const account = await this.findById(accountId);
    const res = await this.ppRequest<any>(
      'GET',
      `/api/profiles/${account.postproxyProfileId}/placements`,
    );
    return res?.data ?? res ?? [];
  }

  // ── PostProxy: Profile Stats ──

  async getProfileStats(accountId: string, placementId?: string): Promise<any> {
    const account = await this.findById(accountId);
    let path = `/api/profiles/${account.postproxyProfileId}/stats`;
    if (placementId) path += `?placement_id=${placementId}`;
    return this.ppRequest('GET', path);
  }
}
