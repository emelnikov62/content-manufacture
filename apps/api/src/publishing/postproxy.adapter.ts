import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  PublishingProvider,
  PublishRequest,
  PublishResult,
  DirectMessageRequest,
  PrivateReplyRequest,
} from './publishing.interface';

@Injectable()
export class PostproxyAdapter implements PublishingProvider {
  private readonly logger = new Logger(PostproxyAdapter.name);
  private readonly apiUrl = 'https://api.postproxy.dev';
  private readonly apiKey: string;

  constructor(private config: ConfigService) {
    this.apiKey = this.config.get<string>('POSTPROXY_API_KEY', '');
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${this.apiUrl}${path}`;
    this.logger.debug(`${method} ${url}`);

    const init: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
    };
    if (body) {
      init.body = JSON.stringify(body);
    }

    const res = await fetch(url, init);

    if (!res.ok) {
      const text = await res.text();
      this.logger.error(`Postproxy error ${res.status}: ${text}`);
      throw new Error(`Postproxy API error: ${res.status}`);
    }

    return res.json();
  }

  async publish(request: PublishRequest): Promise<PublishResult[]> {
    if (!this.apiKey) {
      this.logger.warn('Postproxy API key not configured, simulating publish');
      return request.targets.map((t) => ({
        profileId: t.profileId,
        network: t.network,
        success: true,
        externalId: `sim_${Date.now()}_${t.profileId}`,
      }));
    }

    try {
      const platforms: Record<string, Record<string, unknown>> = {};
      for (const t of request.targets) {
        if (t.networkParams && Object.keys(t.networkParams).length > 0) {
          const net = t.network.toLowerCase();
          platforms[net] = { ...(platforms[net] || {}), ...t.networkParams };
        }
      }

      const body: Record<string, unknown> = {
        post: { body: request.text },
        profiles: request.targets.map((t) => t.profileId),
        platforms,
      };
      if (request.mediaUrls?.length) body.media = request.mediaUrls;

      const response = await this.request<any>('POST', '/api/posts', body);

      return request.targets.map((t) => ({
        profileId: t.profileId,
        network: t.network,
        success: true,
        externalId: response?.id ?? response?.data?.id,
      }));
    } catch (err: any) {
      return request.targets.map((t) => ({
        profileId: t.profileId,
        network: t.network,
        success: false,
        error: err.message,
      }));
    }
  }

  async schedule(request: PublishRequest): Promise<PublishResult[]> {
    if (!this.apiKey) {
      return request.targets.map((t) => ({
        profileId: t.profileId,
        network: t.network,
        success: true,
        externalId: `scheduled_${Date.now()}_${t.profileId}`,
      }));
    }

    try {
      const platforms: Record<string, Record<string, unknown>> = {};
      for (const t of request.targets) {
        if (t.networkParams && Object.keys(t.networkParams).length > 0) {
          const net = t.network.toLowerCase();
          platforms[net] = { ...(platforms[net] || {}), ...t.networkParams };
        }
      }

      const body: Record<string, unknown> = {
        post: { body: request.text },
        profiles: request.targets.map((t) => t.profileId),
        platforms,
        scheduled_at: request.scheduledAt?.toISOString(),
      };
      if (request.mediaUrls?.length) body.media = request.mediaUrls;

      const response = await this.request<any>('POST', '/api/posts', body);

      return request.targets.map((t) => ({
        profileId: t.profileId,
        network: t.network,
        success: true,
        externalId: response?.id ?? response?.data?.id,
      }));
    } catch (err: any) {
      return request.targets.map((t) => ({
        profileId: t.profileId,
        network: t.network,
        success: false,
        error: err.message,
      }));
    }
  }

  async getPublicationStatus(externalId: string) {
    if (!this.apiKey) {
      return { status: 'published' };
    }
    const response = await this.request<any>('GET', `/api/posts/${externalId}`);
    return { status: response.status, error: response.error };
  }

  async sendDirectMessage(request: DirectMessageRequest) {
    if (!this.apiKey) {
      return { success: true };
    }
    try {
      await this.request('POST', '/api/dm/send', {
        profileId: request.profileId,
        recipientId: request.recipientId,
        text: request.text,
        attachmentUrl: request.attachmentUrl,
      });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  async sendPrivateReply(request: PrivateReplyRequest) {
    if (!this.apiKey) {
      return { success: true };
    }
    try {
      await this.request('POST', '/api/dm/private-reply', {
        profileId: request.profileId,
        commentId: request.commentId,
        text: request.text,
      });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
}
