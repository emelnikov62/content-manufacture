import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SettingsService } from '../settings/settings.service';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly uploadDir: string;

  constructor(
    private config: ConfigService,
    private settings: SettingsService,
  ) {
    this.uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async upload(file: Express.Multer.File): Promise<{
    url: string;
    thumbnailUrl: string | null;
  }> {
    const ext = path.extname(file.originalname);
    const hash = crypto.randomBytes(16).toString('hex');
    const filename = `${hash}${ext}`;

    try {
      const s3 = await this.getS3Config();
      if (s3.endpoint && s3.accessKey && s3.secretKey && s3.bucket) {
        const contentType = file.mimetype || 'application/octet-stream';
        const key = `uploads/${filename}`;
        const url = await this.putObjectS3(s3, key, file.buffer, contentType);
        return { url, thumbnailUrl: url };
      }
    } catch (e: any) {
      this.logger.warn(`S3 upload failed, falling back to local: ${e.message}`);
    }

    const filePath = path.join(this.uploadDir, filename);
    fs.writeFileSync(filePath, file.buffer);
    const baseUrl = this.config.get('API_BASE_URL', 'http://localhost:3001');
    const url = `${baseUrl}/api/assets/file/${filename}`;
    return { url, thumbnailUrl: url };
  }

  getFilePath(filename: string): string {
    return path.join(this.uploadDir, filename);
  }

  private async getS3Config() {
    const [endpoint, accessKey, secretKey, bucket] = await Promise.all([
      this.settings.revealKey('S3_ENDPOINT'),
      this.settings.revealKey('S3_ACCESS_KEY'),
      this.settings.revealKey('S3_SECRET_KEY'),
      this.settings.revealKey('S3_BUCKET'),
    ]);
    return {
      endpoint: endpoint.value.replace(/\/+$/, ''),
      accessKey: accessKey.value,
      secretKey: secretKey.value,
      bucket: bucket.value,
    };
  }

  private async putObjectS3(
    s3: { endpoint: string; accessKey: string; secretKey: string; bucket: string },
    key: string,
    body: Buffer,
    contentType: string,
  ): Promise<string> {
    const url = `${s3.endpoint}/${s3.bucket}/${key}`;
    const parsed = new URL(url);
    const host = parsed.host;
    const urlPath = parsed.pathname;

    const now = new Date();
    const amzDate = now.toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z';
    const dateStamp = amzDate.slice(0, 8);
    const region = 'us-east-1';
    const service = 's3';

    const payloadHash = crypto.createHash('sha256').update(body).digest('hex');

    const canonicalHeaders =
      `content-type:${contentType}\n` +
      `host:${host}\n` +
      `x-amz-acl:public-read\n` +
      `x-amz-content-sha256:${payloadHash}\n` +
      `x-amz-date:${amzDate}\n`;
    const signedHeaders = 'content-type;host;x-amz-acl;x-amz-content-sha256;x-amz-date';

    const canonicalRequest = [
      'PUT', urlPath, '', canonicalHeaders, signedHeaders, payloadHash,
    ].join('\n');

    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
    const stringToSign = [
      'AWS4-HMAC-SHA256', amzDate, credentialScope,
      crypto.createHash('sha256').update(canonicalRequest).digest('hex'),
    ].join('\n');

    const sign = (k: Buffer | string, msg: string) =>
      crypto.createHmac('sha256', k).update(msg).digest();
    const signingKey = sign(
      sign(sign(sign(`AWS4${s3.secretKey}`, dateStamp), region), service),
      'aws4_request',
    );
    const signature = crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex');

    const authorization = `AWS4-HMAC-SHA256 Credential=${s3.accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        Host: host,
        'Content-Type': contentType,
        'x-amz-acl': 'public-read',
        'x-amz-date': amzDate,
        'x-amz-content-sha256': payloadHash,
        Authorization: authorization,
      },
      body: new Uint8Array(body),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`S3 PUT ${res.status}: ${text.slice(0, 200)}`);
    }

    return url;
  }
}
