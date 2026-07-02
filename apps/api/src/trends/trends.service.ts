import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const BASE_URL = 'https://ensembledata.com/apis';

@Injectable()
export class TrendsService {
  constructor(private prisma: PrismaService) {}

  private async getToken(): Promise<string> {
    const row = await this.prisma.setting.findUnique({
      where: { key: 'ENSEMBLE_DATA_API_KEY' },
    });
    if (!row?.value) {
      throw new BadRequestException(
        'EnsembleData API ключ не настроен. Добавьте его в Настройки → Интеграции.',
      );
    }
    return row.value;
  }

  private async request(path: string, params: Record<string, string>) {
    const token = await this.getToken();
    const qs = new URLSearchParams({ ...params, token });
    const res = await fetch(`${BASE_URL}${path}?${qs}`, {
      signal: AbortSignal.timeout(30000),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok || body?.detail) {
      const detail = body?.detail || `HTTP ${res.status}`;
      const msg = typeof detail === 'string' && detail.includes('Maximum requests limit')
        ? 'Исчерпан дневной лимит запросов EnsembleData. Лимит сбрасывается в 00:00 UTC.'
        : typeof detail === 'string' && detail.includes('email has not been verified')
          ? 'Email не подтверждён в EnsembleData. Подтвердите email в dashboard.ensembledata.com.'
          : typeof detail === 'string' ? detail : JSON.stringify(detail).slice(0, 200);
      throw new BadRequestException(msg);
    }
    return body;
  }

  async tiktokHashtag(name: string, cursor = '0') {
    return this.request('/tt/hashtag/posts', { name, cursor });
  }

  async tiktokKeyword(name: string, cursor = '0', period = '7', sorting = '0', country?: string) {
    const params: Record<string, string> = { name, cursor, period, sorting };
    if (country) params.country = country;
    return this.request('/tt/keyword/search', params);
  }

  async tiktokPostInfo(url: string) {
    return this.request('/tt/post/info', { url });
  }

  async instagramSearch(text: string) {
    return this.request('/instagram/search', { text });
  }

  async instagramUserReels(userId: string, depth = '1') {
    return this.request('/instagram/user/reels', { user_id: userId, depth });
  }

  async instagramUserInfo(username: string) {
    return this.request('/instagram/user/info', { username });
  }

  async instagramPostInfo(code: string) {
    return this.request('/instagram/post/details', { code });
  }

  async youtubeKeyword(keyword: string, depth = '1', period?: string, sorting?: string) {
    const params: Record<string, string> = { keyword, depth };
    if (period) params.period = period;
    if (sorting) params.sorting = sorting;
    return this.request('/youtube/search', params);
  }

  async youtubeHashtag(name: string, depth = '1') {
    return this.request('/youtube/hashtag/search', { name, depth });
  }

  async getUsedUnits(date: string) {
    return this.request('/customer/get-used-units', { date });
  }

  async getUnitsHistory(days: string) {
    return this.request('/customer/get-history', { days });
  }
}
