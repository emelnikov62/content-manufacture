import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

const INTEGRATION_KEYS = [
  'POSTPROXY_API_KEY',
  'POSTPROXY_WEBHOOK_SECRET',
  'KIE_API_KEY',
  'ENSEMBLE_DATA_API_KEY',
  'S3_ENDPOINT',
  'S3_ACCESS_KEY',
  'S3_SECRET_KEY',
  'S3_BUCKET',
] as const;

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
      const res = await fetch('https://api.kie.ai/v1/me', {
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
      const now = new Date();
      const dateStamp = now.toISOString().replace(/[-:]/g, '').slice(0, 8);
      const amzDate = dateStamp + 'T' + now.toISOString().replace(/[-:]/g, '').slice(9, 15) + 'Z';
      const url = new URL(`/${bucket}`, endpoint);
      const host = url.host;
      const region = 'us-east-1';

      const canonicalHeaders = `host:${host}\nx-amz-date:${amzDate}\n`;
      const signedHeaders = 'host;x-amz-date';
      const payloadHash = crypto.createHash('sha256').update('').digest('hex');
      const canonicalRequest = `HEAD\n/${bucket}\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
      const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
      const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${crypto.createHash('sha256').update(canonicalRequest).digest('hex')}`;

      const sign = (key: Buffer | string, msg: string) =>
        crypto.createHmac('sha256', key).update(msg).digest();
      const signingKey = sign(
        sign(sign(sign(`AWS4${secretKey}`, dateStamp), region), 's3'),
        'aws4_request',
      );
      const signature = crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex');
      const authHeader = `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

      const res = await fetch(url.toString(), {
        method: 'HEAD',
        headers: {
          Host: host,
          'x-amz-date': amzDate,
          'x-amz-content-sha256': payloadHash,
          Authorization: authHeader,
        },
        signal: AbortSignal.timeout(5000),
      });

      if (res.ok || res.status === 301) return { status: 'connected' };
      if (res.status === 403) return { status: 'error', error: 'Доступ запрещён (проверьте ключи)' };
      if (res.status === 404) return { status: 'error', error: 'Бакет не найден' };
      return { status: 'error', error: `HTTP ${res.status}` };
    } catch (e: any) {
      return { status: 'error', error: e.message };
    }
  }

  private mask(val: string): string {
    if (val.length <= 8) return '••••••••';
    return val.slice(0, 4) + '••••' + val.slice(-4);
  }
}
