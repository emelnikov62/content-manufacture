import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import * as crypto from 'crypto';

interface CreateGenerationDto {
  userId: string;
  brandId: string;
  model: string;
  modelName: string;
  provider: string;
  type: string;
  prompt: string;
  params?: Record<string, any>;
}

@Injectable()
export class GenerationsService {
  private readonly logger = new Logger(GenerationsService.name);

  constructor(
    private prisma: PrismaService,
    private settings: SettingsService,
  ) {}

  async create(dto: CreateGenerationDto) {
    const gen = await this.prisma.generation.create({
      data: {
        userId: dto.userId,
        brandId: dto.brandId,
        model: dto.model,
        modelName: dto.modelName,
        provider: dto.provider,
        type: dto.type,
        prompt: dto.prompt,
        params: dto.params ?? undefined,
        status: 'PROCESSING',
      },
    });

    this.processGeneration(gen.id, dto).catch((e) =>
      this.logger.error(`Generation ${gen.id} failed: ${e.message}`),
    );

    return gen;
  }

  async findByBrand(brandId: string, limit = 20) {
    return this.prisma.generation.findMany({
      where: { brandId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async findMedia(brandId: string, type?: string) {
    return this.prisma.generation.findMany({
      where: {
        brandId,
        status: 'COMPLETED',
        type: type ? type : { in: ['image', 'video'] },
        result: { not: null },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        type: true,
        model: true,
        modelName: true,
        prompt: true,
        result: true,
        createdAt: true,
      },
    });
  }

  async findById(id: string) {
    return this.prisma.generation.findUnique({ where: { id } });
  }

  async cancel(id: string) {
    return this.prisma.generation.update({
      where: { id },
      data: { status: 'ERROR', error: 'Отменено пользователем' },
    });
  }

  async remove(id: string) {
    await this.prisma.generation.delete({ where: { id } });
  }

  async removeAllErrors(brandId: string) {
    await this.prisma.generation.deleteMany({
      where: { brandId, status: 'ERROR' },
    });
  }

  private async processGeneration(id: string, dto: CreateGenerationDto) {
    try {
      const apiKey = await this.getKieApiKey();
      if (!apiKey) {
        await this.fail(id, 'API-ключ kie.ai не настроен');
        return;
      }

      if (dto.type === 'image' || dto.type === 'video') {
        const result = await this.callMediaApi(apiKey, dto.model, dto.type, dto.prompt, id, dto.params);
        const isVideo = dto.type === 'video';
        const s3Urls = await this.uploadResultsToS3(result.urls, id, isVideo ? 'mp4' : undefined);
        await this.prisma.generation.update({
          where: { id },
          data: {
            status: 'COMPLETED',
            result: s3Urls.join('\n'),
          },
        });
      } else {
        const result = await this.callTextApi(apiKey, dto.model, dto.prompt, dto.params);
        await this.prisma.generation.update({
          where: { id },
          data: {
            status: 'COMPLETED',
            result: result.text,
            tokens: result.tokens ?? null,
          },
        });
      }
    } catch (e: any) {
      await this.fail(id, e.message);
    }
  }

  private async fail(id: string, error: string) {
    await this.prisma.generation.update({
      where: { id },
      data: { status: 'ERROR', error },
    });
  }

  private async getKieApiKey(): Promise<string> {
    const { value } = await this.settings.revealKey('KIE_API_KEY');
    return value;
  }

  // --- Image generation (jobs API) ---

  private buildMediaInput(model: string, type: string, prompt: string, params?: Record<string, any>): Record<string, any> {
    const p = params || {};
    if (type === 'video' && model.startsWith('kling')) {
      const input: Record<string, any> = {
        prompt,
        duration: p.duration ?? '5',
        aspect_ratio: p.aspect_ratio ?? '16:9',
        mode: p.mode ?? 'std',
        multi_shots: false,
      };
      if (p.sound !== false) input.sound = true;
      if (p.image_input && Array.isArray(p.image_input) && p.image_input.length > 0) {
        input.image_urls = p.image_input;
      }
      if (p.kling_elements && Array.isArray(p.kling_elements) && p.kling_elements.length > 0) {
        input.kling_elements = p.kling_elements.map((el: any) => ({
          name: el.name,
          type: el.type,
          urls: el.urls,
        }));
      }
      return input;
    }
    if (type === 'video' && model.startsWith('bytedance')) {
      const input: Record<string, any> = {
        prompt,
        duration: Number(p.duration ?? 10),
        aspect_ratio: p.aspect_ratio ?? '16:9',
        resolution: p.resolution ?? '720p',
        generate_audio: p.generate_audio ?? false,
        web_search: p.web_search ?? false,
        return_last_frame: false,
      };
      if (p.image_input && Array.isArray(p.image_input)) {
        if (p.image_input[0]) input.first_frame_url = p.image_input[0];
        if (p.image_input[1]) input.last_frame_url = p.image_input[1];
      }
      if (p.kling_elements && Array.isArray(p.kling_elements)) {
        const imgRefs = p.kling_elements.filter((e: any) => e.type === 'image').flatMap((e: any) => e.urls);
        const vidRefs = p.kling_elements.filter((e: any) => e.type === 'video').flatMap((e: any) => e.urls);
        const audRefs = p.kling_elements.filter((e: any) => e.type === 'audio').flatMap((e: any) => e.urls);
        if (imgRefs.length) input.reference_image_urls = imgRefs;
        if (vidRefs.length) input.reference_video_urls = vidRefs;
        if (audRefs.length) input.reference_audio_urls = audRefs;
      }
      return input;
    }
    const imageInput: Record<string, any> = {
      prompt,
      aspect_ratio: p.aspect_ratio ?? '1:1',
      resolution: p.resolution ?? '1K',
      output_format: p.output_format ?? 'png',
    };
    imageInput.image_input = p.image_input && Array.isArray(p.image_input) ? p.image_input : [];
    return imageInput;
  }

  private async callMediaApi(
    apiKey: string,
    model: string,
    type: string,
    prompt: string,
    generationId: string,
    params?: Record<string, any>,
  ): Promise<{ urls: string[] }> {
    const input = this.buildMediaInput(model, type, prompt, params);
    this.logger.log(`createTask payload: ${JSON.stringify({ model, input })}`);

    const createRes = await fetch('https://api.kie.ai/api/v1/jobs/createTask', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model, input }),
      signal: AbortSignal.timeout(15000),
    });

    const createBody = await createRes.json();
    if (createBody.code !== 200) {
      throw new Error(createBody.msg || `Ошибка создания задачи: ${createBody.code}`);
    }

    const taskId = createBody.data?.taskId;
    if (!taskId) throw new Error('Не получен taskId');

    return this.pollTaskResult(apiKey, taskId, generationId);
  }

  private async pollTaskResult(
    apiKey: string,
    taskId: string,
    generationId: string,
  ): Promise<{ urls: string[] }> {
    const maxAttempts = 120;
    const interval = 3000;

    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, interval));

      const gen = await this.prisma.generation.findUnique({
        where: { id: generationId },
        select: { status: true },
      });
      if (gen?.status === 'ERROR') {
        throw new Error('Отменено пользователем');
      }

      const res = await fetch(
        `https://api.kie.ai/api/v1/jobs/recordInfo?taskId=${taskId}`,
        {
          headers: { Authorization: `Bearer ${apiKey}` },
          signal: AbortSignal.timeout(10000),
        },
      );

      const body = await res.json();
      const data = body.data;
      if (!data) continue;

      if (data.state === 'success') {
        try {
          const resultJson = JSON.parse(data.resultJson);
          const urls: string[] = resultJson.resultUrls || [];
          if (urls.length === 0) throw new Error('Нет URL в результате');
          return { urls };
        } catch (e: any) {
          throw new Error(`Ошибка парсинга результата: ${e.message}`);
        }
      }

      if (data.state === 'failed' || data.failMsg) {
        throw new Error(data.failMsg || 'Генерация не удалась');
      }

      if (data.progress !== undefined) {
        await this.prisma.generation.update({
          where: { id: generationId },
          data: { cost: data.progress },
        });
      }
    }

    throw new Error('Таймаут: генерация не завершилась за 6 минут');
  }

  // --- S3 upload ---

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

  private async uploadResultsToS3(urls: string[], generationId: string, forceExt?: string): Promise<string[]> {
    let s3: { endpoint: string; accessKey: string; secretKey: string; bucket: string };
    try {
      s3 = await this.getS3Config();
    } catch {
      this.logger.warn('S3 not configured, keeping original URLs');
      return urls;
    }

    if (!s3.endpoint || !s3.accessKey || !s3.secretKey || !s3.bucket) {
      this.logger.warn('S3 not fully configured, keeping original URLs');
      return urls;
    }

    const uploaded: string[] = [];

    for (let i = 0; i < urls.length; i++) {
      try {
        const res = await fetch(urls[i], { signal: AbortSignal.timeout(30000) });
        if (!res.ok) throw new Error(`Download failed: ${res.status}`);

        const buffer = Buffer.from(await res.arrayBuffer());
        const contentType = res.headers.get('content-type') || (forceExt === 'mp4' ? 'video/mp4' : 'image/png');
        const ext = forceExt || (contentType.includes('jpeg') || contentType.includes('jpg') ? 'jpg' : 'png');
        const key = `generations/${generationId}/${i}.${ext}`;

        const s3Url = await this.putObjectS3(s3, key, buffer, contentType);
        uploaded.push(s3Url);
      } catch (e: any) {
        this.logger.error(`S3 upload failed for ${urls[i]}: ${e.message}`);
        uploaded.push(urls[i]);
      }
    }

    return uploaded;
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
    const path = parsed.pathname;

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
      'PUT', path, '', canonicalHeaders, signedHeaders, payloadHash,
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

  // --- Text generation ---

  private async callTextApi(
    apiKey: string,
    model: string,
    prompt: string,
    params?: Record<string, any>,
  ): Promise<{ text: string; tokens?: number }> {
    const maxTokens = Number(params?.max_tokens) || 8192;
    if (model.startsWith('claude')) {
      return this.callClaude(apiKey, model, prompt, maxTokens);
    }
    if (model.startsWith('gemini')) {
      return this.callGemini(apiKey, model, prompt);
    }
    return this.callGpt(apiKey, model, prompt);
  }

  private async callGpt(
    apiKey: string,
    model: string,
    prompt: string,
  ): Promise<{ text: string; tokens?: number }> {
    const res = await fetch('https://api.kie.ai/codex/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        input: prompt,
        stream: false,
      }),
      signal: AbortSignal.timeout(60000),
    });

    const body = await res.json();
    if (!res.ok || body.code === 401) {
      throw new Error(body.msg || body.error?.message || `HTTP ${res.status}`);
    }

    const text =
      body.output_text ||
      body.output?.map((o: any) => o.content?.map((c: any) => c.text).join('')).join('\n') ||
      JSON.stringify(body.output);
    return { text, tokens: body.usage?.total_tokens };
  }

  private async callClaude(
    apiKey: string,
    model: string,
    prompt: string,
    maxTokens = 8192,
  ): Promise<{ text: string; tokens?: number }> {
    const res = await fetch('https://api.kie.ai/claude/v1/messages', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        stream: false,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: AbortSignal.timeout(60000),
    });

    const body = await res.json();
    if (!res.ok || body.code === 401) {
      throw new Error(body.msg || body.error?.message || `HTTP ${res.status}`);
    }

    const text = body.content?.map((c: any) => c.text).join('') || '';
    const tokens =
      (body.usage?.input_tokens ?? 0) + (body.usage?.output_tokens ?? 0) || undefined;
    return { text, tokens };
  }

  private async callGemini(
    apiKey: string,
    model: string,
    prompt: string,
  ): Promise<{ text: string; tokens?: number }> {
    const res = await fetch(
      `https://api.kie.ai/gemini/v1/models/${model}:generateContent`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
        }),
        signal: AbortSignal.timeout(60000),
      },
    );

    const body = await res.json();
    if (!res.ok || body.code === 401) {
      throw new Error(body.msg || body.error?.message || `HTTP ${res.status}`);
    }

    const text =
      body.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('') || '';
    const usage = body.usageMetadata;
    const tokens =
      (usage?.promptTokenCount ?? 0) + (usage?.candidatesTokenCount ?? 0) || undefined;
    return { text, tokens };
  }
}
