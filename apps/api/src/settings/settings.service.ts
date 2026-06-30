import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const INTEGRATION_KEYS = [
  'POSTPROXY_API_KEY',
  'POSTPROXY_WEBHOOK_SECRET',
  'KIE_API_KEY',
  'ENSEMBLE_DATA_API_KEY',
] as const;

type IntegrationKey = (typeof INTEGRATION_KEYS)[number];

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async getIntegrations(): Promise<Record<string, { configured: boolean; value: string }>> {
    const rows = await this.prisma.setting.findMany({
      where: { key: { in: [...INTEGRATION_KEYS] } },
    });

    const map = new Map(rows.map((r) => [r.key, r.value]));
    const result: Record<string, { configured: boolean; value: string }> = {};

    for (const key of INTEGRATION_KEYS) {
      const val = map.get(key) ?? '';
      result[key] = {
        configured: val.length > 0,
        value: val ? this.mask(val) : '',
      };
    }

    return result;
  }

  async updateIntegrations(data: Partial<Record<IntegrationKey, string>>) {
    const ops = Object.entries(data)
      .filter(([key]) => (INTEGRATION_KEYS as readonly string[]).includes(key))
      .map(([key, value]) =>
        this.prisma.setting.upsert({
          where: { key },
          create: { key, value: value ?? '' },
          update: { value: value ?? '' },
        }),
      );

    await this.prisma.$transaction(ops);
  }

  private mask(val: string): string {
    if (val.length <= 8) return '••••••••';
    return val.slice(0, 4) + '••••' + val.slice(-4);
  }
}
