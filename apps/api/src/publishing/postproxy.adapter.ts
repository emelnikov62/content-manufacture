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
      const response = await this.request<any>('POST', '/api/posts', {
        text: request.text,
        mediaUrls: request.mediaUrls,
        profileIds: request.targets.map((t) => t.profileId),
        platformSpecific: request.targets.reduce(
          (acc, t) => {
            if (t.networkParams && Object.keys(t.networkParams).length > 0) {
              acc[t.profileId] = t.networkParams;
            }
            return acc;
          },
          {} as Record<string, unknown>,
        ),
      });

      return request.targets.map((t) => {
        const result = response?.postIds?.[t.profileId];
        const error = response?.errors?.[t.profileId];
        return {
          profileId: t.profileId,
          network: t.network,
          success: !error && !!result,
          externalId: result,
          error: error?.message,
        };
      });
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
      const response = await this.request<any>('POST', '/api/posts', {
        text: request.text,
        mediaUrls: request.mediaUrls,
        profileIds: request.targets.map((t) => t.profileId),
        scheduledAt: request.scheduledAt?.toISOString(),
        platformSpecific: request.targets.reduce(
          (acc, t) => {
            if (t.networkParams && Object.keys(t.networkParams).length > 0) {
              acc[t.profileId] = t.networkParams;
            }
            return acc;
          },
          {} as Record<string, unknown>,
        ),
      });

      return request.targets.map((t) => ({
        profileId: t.profileId,
        network: t.network,
        success: true,
        externalId: response?.postIds?.[t.profileId],
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
