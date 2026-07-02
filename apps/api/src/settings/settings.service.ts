import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

const INTEGRATION_KEYS = [
  'POSTPROXY_API_KEY',
  'POSTPROXY_WEBHOOK_SECRET',
  'KIE_API_KEY',
  'ENSEMBLE_DATA_API_KEY',
  'ENSEMBLE_DATA_UNIT_PRICE',
  'S3_ENDPOINT',
  'S3_ACCESS_KEY',
  'S3_SECRET_KEY',
  'S3_BUCKET',
] as const;

const PREFERENCE_KEYS = [
  'PREF_NOTIF_ERRORS',
  'PREF_NOTIF_TOKENS',
  'PREF_NOTIF_AI',
  'PREF_NOTIF_FUNNELS',
  'PREF_BUDGET_ALERT',
] as const;

const PREFERENCE_DEFAULTS: Record<string, boolean> = {
  PREF_NOTIF_ERRORS: true,
  PREF_NOTIF_TOKENS: true,
  PREF_NOTIF_AI: true,
  PREF_NOTIF_FUNNELS: false,
  PREF_BUDGET_ALERT: true,
};

type IntegrationKey = (typeof INTEGRATION_KEYS)[number];

type IntegrationStatus = 'connected' | 'error' | 'not_configured';

export interface IntegrationInfo {
  configured: boolean;
  value: string;
  status: IntegrationStatus;
  error?: string;
}

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(private prisma: PrismaService) {}

  private async getKeyMap(): Promise<Map<string, string>> {
    const rows = await this.prisma.setting.findMany({
      where: { key: { in: [...INTEGRATION_KEYS] } },
    });
    return new Map(rows.map((r) => [r.key, r.value]));
  }

  async getIntegrations(): Promise<Record<string, IntegrationInfo>> {
    const map = await this.getKeyMap();
    const plainKeys = new Set(['S3_ENDPOINT', 'S3_BUCKET']);
    const result: Record<string, IntegrationInfo> = {};

    for (const key of INTEGRATION_KEYS) {
      const val = map.get(key) ?? '';
      result[key] = {
        configured: val.length > 0,
        value: val ? (plainKeys.has(key) ? val : this.mask(val)) : '',
        status: 'not_configured',
      };
    }

    return result;
  }

  async verifyIntegrations(): Promise<Record<string, { status: IntegrationStatus; error?: string }>> {
    const map = await this.getKeyMap();
    const get = (k: string) => map.get(k) ?? '';

    const [postproxy, kie, ensemble, s3] = await Promise.allSettled([
      this.checkPostproxy(get('POSTPROXY_API_KEY')),
      this.checkKie(get('KIE_API_KEY')),
      this.checkEnsemble(get('ENSEMBLE_DATA_API_KEY')),
      this.checkS3(get('S3_ENDPOINT'), get('S3_ACCESS_KEY'), get('S3_SECRET_KEY'), get('S3_BUCKET')),
    ]);

    return {
      postproxy: this.unwrap(postproxy),
      kie: this.unwrap(kie),
      ensembleData: this.unwrap(ensemble),
      storage: this.unwrap(s3),
    };
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

  async getPreferences(): Promise<Record<string, boolean>> {
    const rows = await this.prisma.setting.findMany({
      where: { key: { in: [...PREFERENCE_KEYS] } },
    });
    const map = new Map(rows.map((r) => [r.key, r.value]));
    const result: Record<string, boolean> = {};
    for (const key of PREFERENCE_KEYS) {
      const val = map.get(key);
      result[key] = val !== undefined ? val === 'true' : PREFERENCE_DEFAULTS[key];
    }
    return result;
  }

  async updatePreferences(data: Record<string, boolean>) {
    const ops = Object.entries(data)
      .filter(([key]) => (PREFERENCE_KEYS as readonly string[]).includes(key))
      .map(([key, value]) =>
        this.prisma.setting.upsert({
          where: { key },
          create: { key, value: String(value) },
          update: { value: String(value) },
        }),
      );
    if (ops.length > 0) await this.prisma.$transaction(ops);
  }

  async revealKey(key: string): Promise<{ value: string }> {
    if (!(INTEGRATION_KEYS as readonly string[]).includes(key)) {
      return { value: '' };
    }
    const row = await this.prisma.setting.findUnique({ where: { key } });
    return { value: row?.value ?? '' };
  }

  private unwrap(
    result: PromiseSettledResult<{ status: IntegrationStatus; error?: string }>,
  ): { status: IntegrationStatus; error?: string } {
    if (result.status === 'fulfilled') return result.value;
    return { status: 'error', error: String((result as PromiseRejectedResult).reason) };
  }

  private async checkPostproxy(apiKey: string): Promise<{ status: IntegrationStatus; error?: string }> {
    if (!apiKey) return { status: 'not_configured' };
    try {
      const res = await fetch('https://api.postproxy.dev/api/me', {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) return { status: 'connected' };
      if (res.status === 401) return { status: 'error', error: 'Неверный API-ключ' };
      return { status: 'error', error: `HTTP ${res.status}` };
    } catch (e: any) {
      return { status: 'error', error: e.message };
    }
  }

  private async checkKie(apiKey: string): Promise<{ status: IntegrationStatus; error?: string }> {
    if (!apiKey) return { status: 'not_configured' };
    try {
      const res = await fetch('https://api.kie.ai/api/v1/chat/credit', {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(5000),
      });
      const body = await res.json().catch(() => ({}));
      if (body.code === 401 || body.code === 403) return { status: 'error', error: 'Неверный API-ключ' };
      if (res.ok && body.code !== 401) return { status: 'connected' };
      return { status: 'error', error: body.msg || `HTTP ${res.status}` };
    } catch (e: any) {
      return { status: 'error', error: e.message };
    }
  }

  private async checkEnsemble(apiKey: string): Promise<{ status: IntegrationStatus; error?: string }> {
    if (!apiKey) return { status: 'not_configured' };
    try {
      const res = await fetch('https://api.ensembledata.com/health', {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) return { status: 'connected' };
      if (res.status === 401) return { status: 'error', error: 'Неверный API-ключ' };
      return { status: 'error', error: `HTTP ${res.status}` };
    } catch (e: any) {
      return { status: 'error', error: e.message };
    }
  }

  private async checkS3(
    endpoint: string,
    accessKey: string,
    secretKey: string,
    bucket: string,
  ): Promise<{ status: IntegrationStatus; error?: string }> {
    if (!endpoint || !accessKey || !secretKey || !bucket) return { status: 'not_configured' };

    try {
      const epNorm = endpoint.replace(/\/+$/, '');
      const url = `${epNorm}/${bucket}?list-type=2&max-keys=1`;
      const parsed = new URL(url);
      const host = parsed.host;
      const path = parsed.pathname;
      const query = parsed.search.slice(1);

      const now = new Date();
      const amzDate = now.toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z';
      const dateStamp = amzDate.slice(0, 8);
      const region = 'us-east-1';
      const service = 's3';

      const payloadHash = crypto.createHash('sha256').update('').digest('hex');

      const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
      const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';

      const canonicalRequest = [
        'GET', path, query, canonicalHeaders, signedHeaders, payloadHash,
      ].join('\n');

      const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
      const stringToSign = [
        'AWS4-HMAC-SHA256', amzDate, credentialScope,
        crypto.createHash('sha256').update(canonicalRequest).digest('hex'),
      ].join('\n');

      const sign = (key: Buffer | string, msg: string) =>
        crypto.createHmac('sha256', key).update(msg).digest();
      const signingKey = sign(sign(sign(sign(`AWS4${secretKey}`, dateStamp), region), service), 'aws4_request');
      const signature = crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex');

      const authorization = `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

      const res = await fetch(url, {
        method: 'GET',
        headers: {
          Host: host,
          'x-amz-date': amzDate,
          'x-amz-content-sha256': payloadHash,
          Authorization: authorization,
        },
        signal: AbortSignal.timeout(10000),
      });

      if (res.ok) return { status: 'connected' };
      const body = await res.text();
      if (res.status === 403) {
        if (body.includes('SignatureDoesNotMatch')) return { status: 'error', error: 'Неверный Secret Key' };
        if (body.includes('InvalidAccessKeyId')) return { status: 'error', error: 'Неверный Access Key' };
        return { status: 'error', error: 'Доступ запрещён' };
      }
      if (res.status === 404) return { status: 'error', error: 'Бакет не найден' };
      return { status: 'error', error: `HTTP ${res.status}` };
    } catch (e: any) {
      if (e.cause?.code === 'ENOTFOUND') return { status: 'error', error: 'Endpoint недоступен' };
      return { status: 'error', error: e.message };
    }
  }

  async getBudget(): Promise<{
    items: { name: string; amount: number }[];
    total: number;
    limit: number;
    kieBalance: number | null;
    ensembleUnits: number;
  }> {
    const costByType = await this.prisma.generation.groupBy({
      by: ['type'],
      where: { status: 'COMPLETED', cost: { not: null } },
      _sum: { cost: true },
    });

    let textCost = 0;
    let imageCost = 0;
    let videoCost = 0;
    let audioCost = 0;

    for (const g of costByType) {
      const amount = g._sum.cost ?? 0;
      switch (g.type) {
        case 'text': textCost = amount; break;
        case 'image': imageCost = amount; break;
        case 'video': videoCost = amount; break;
        case 'audio': audioCost = amount; break;
      }
    }

    let kieBalance: number | null = null;
    try {
      const kieKey = await this.prisma.setting.findUnique({
        where: { key: 'KIE_API_KEY' },
      });
      if (kieKey?.value) {
        const res = await fetch('https://api.kie.ai/api/v1/chat/credit', {
          headers: { Authorization: `Bearer ${kieKey.value}` },
          signal: AbortSignal.timeout(5000),
        });
        const body = await res.json().catch(() => null);
        if (body?.code === 200 && typeof body.data === 'number') {
          kieBalance = body.data;
        }
      }
    } catch {}

    const edUnitPriceRow = await this.prisma.setting.findUnique({
      where: { key: 'ENSEMBLE_DATA_UNIT_PRICE' },
    });
    const edUnitPrice = edUnitPriceRow ? parseFloat(edUnitPriceRow.value) || 0.00222 : 0.00222;

    let edUnits = 0;
    try {
      const edToken = await this.prisma.setting.findUnique({
        where: { key: 'ENSEMBLE_DATA_API_KEY' },
      });
      if (edToken?.value) {
        const qs = new URLSearchParams({ days: '30', token: edToken.value });
        const res = await fetch(`https://ensembledata.com/apis/customer/get-history?${qs}`, {
          signal: AbortSignal.timeout(5000),
        });
        const body = await res.json().catch(() => null);
        if (body?.data && Array.isArray(body.data)) {
          edUnits = body.data.reduce((sum: number, d: any) => sum + (d.units_used ?? 0), 0);
        }
      }
    } catch {}
    const ensembleCost = edUnits * edUnitPrice;

    const postproxyCost = 0;

    const items = [
      { name: 'Postproxy', amount: postproxyCost },
      { name: 'kie.ai · видео', amount: videoCost },
      { name: 'kie.ai · фото', amount: imageCost },
      { name: 'kie.ai · текст', amount: textCost },
      { name: 'kie.ai · аудио', amount: audioCost },
      { name: 'EnsembleData', amount: ensembleCost },
    ];

    const total = items.reduce((s, i) => s + i.amount, 0);

    const limitRow = await this.prisma.setting.findUnique({
      where: { key: 'BUDGET_LIMIT' },
    });
    const limit = limitRow ? parseFloat(limitRow.value) || 300 : 300;

    return { items, total, limit, kieBalance, ensembleUnits: edUnits };
  }

  private mask(val: string): string {
    if (val.length <= 8) return '••••••••';
    return val.slice(0, 4) + '••••' + val.slice(-4);
  }
}
