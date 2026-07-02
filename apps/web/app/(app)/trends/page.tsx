'use client';

import { useState } from 'react';
import { Search, TrendingUp, Heart, Eye, MessageCircle, Play, ExternalLink, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { NetworkIcon } from '@/components/icons/network-icon';

const NICHES = [
  { key: 'cooking', emoji: '🍳', label: 'Кулинария', hashtags: ['cooking', 'recipe', 'food', 'easyrecipe'] },
  { key: 'fitness', emoji: '💪', label: 'Фитнес', hashtags: ['fitness', 'workout', 'gym', 'fitnessmotivation'] },
  { key: 'beauty', emoji: '💄', label: 'Красота', hashtags: ['beauty', 'makeup', 'skincare', 'beautytips'] },
  { key: 'fashion', emoji: '👗', label: 'Мода', hashtags: ['fashion', 'outfit', 'style', 'ootd'] },
  { key: 'travel', emoji: '✈️', label: 'Путешествия', hashtags: ['travel', 'wanderlust', 'traveldiaries', 'vacation'] },
  { key: 'business', emoji: '💼', label: 'Бизнес', hashtags: ['business', 'entrepreneur', 'startup', 'marketing'] },
  { key: 'tech', emoji: '📱', label: 'Технологии', hashtags: ['tech', 'gadgets', 'ai', 'programming'] },
  { key: 'education', emoji: '📚', label: 'Образование', hashtags: ['education', 'learning', 'study', 'learnontiktok'] },
  { key: 'pets', emoji: '🐱', label: 'Питомцы', hashtags: ['pets', 'dogsoftiktok', 'catsoftiktok', 'animals'] },
  { key: 'humor', emoji: '😂', label: 'Юмор', hashtags: ['funny', 'comedy', 'humor', 'memes'] },
  { key: 'music', emoji: '🎵', label: 'Музыка', hashtags: ['music', 'singer', 'cover', 'newmusic'] },
  { key: 'diy', emoji: '🔨', label: 'DIY', hashtags: ['diy', 'crafts', 'lifehacks', 'howto'] },
] as const;

const PLATFORMS = [
  { key: 'tiktok', label: 'TikTok', network: 'TIKTOK', color: '#111315' },
  { key: 'instagram', label: 'Instagram', network: 'INSTAGRAM', color: 'linear-gradient(135deg,#F58529,#DD2A7B,#8134AF)' },
  { key: 'youtube', label: 'YouTube', network: 'YOUTUBE', color: '#FF0000' },
] as const;

type Platform = (typeof PLATFORMS)[number]['key'];

const SEARCH_MODES = [
  { key: 'keyword', label: 'По ключевому слову' },
  { key: 'hashtag', label: 'По хэштегу' },
  { key: 'user', label: 'Рилсы пользователя' },
] as const;

type SearchMode = (typeof SEARCH_MODES)[number]['key'];

const SORT_OPTIONS = [
  { key: 'relevant', label: 'Релевантность' },
  { key: 'likes', label: 'По лайкам' },
  { key: 'views', label: 'По просмотрам' },
  { key: 'comments', label: 'По комментариям' },
  { key: 'recent', label: 'Новые' },
] as const;

type SortKey = (typeof SORT_OPTIONS)[number]['key'];

function formatNumber(n: number | undefined | null): string {
  if (n == null) return '—';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

function timeAgo(ts: number | string | undefined): string {
  if (!ts) return '';
  const date = typeof ts === 'number' ? new Date(ts * 1000) : new Date(ts);
  const diff = (Date.now() - date.getTime()) / 1000;
  if (diff < 3600) return `${Math.floor(diff / 60)}м назад`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}ч назад`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}д назад`;
  return date.toLocaleDateString('ru', { day: 'numeric', month: 'short' });
}

interface TrendResult {
  id: string;
  platform: Platform;
  type: 'video' | 'post';
  thumbnail?: string;
  videoUrl?: string;
  description: string;
  author: string;
  authorAvatar?: string;
  likes?: number;
  views?: number;
  comments?: number;
  shares?: number;
  createdAt?: number | string;
  externalUrl?: string;
}

function parseTikTokResults(data: any): TrendResult[] {
  const inner = data?.data;
  const raw = inner?.data ?? inner;
  const posts = Array.isArray(raw) ? raw : [];
  return posts.map((item: any) => {
    const p = item.aweme_info || item;
    return {
      id: p.aweme_id || p.id || String(Math.random()),
      platform: 'tiktok' as Platform,
      type: 'video' as const,
      thumbnail: p.video?.cover?.url_list?.[0] || p.video?.origin_cover?.url_list?.[0],
      videoUrl: p.video?.play_addr?.url_list?.[0],
      description: p.desc || '',
      author: p.author?.unique_id || p.author?.nickname || '',
      authorAvatar: p.author?.avatar_thumb?.url_list?.[0],
      likes: p.statistics?.digg_count,
      views: p.statistics?.play_count,
      comments: p.statistics?.comment_count,
      shares: p.statistics?.share_count,
      createdAt: p.create_time,
      externalUrl: `https://www.tiktok.com/@${p.author?.unique_id || ''}/video/${p.aweme_id || ''}`,
    };
  });
}

function parseInstagramReels(data: any): TrendResult[] {
  const raw = data?.data;
  const items = Array.isArray(raw) ? raw : [];
  return items.map((p: any) => {
    const node = p.node || p;
    return {
      id: node.id || node.pk || String(Math.random()),
      platform: 'instagram' as Platform,
      type: 'video',
      thumbnail: node.image_versions2?.candidates?.[0]?.url || node.thumbnail_url || node.display_url,
      description: node.caption?.text || '',
      author: node.user?.username || node.owner?.username || '',
      authorAvatar: node.user?.profile_pic_url,
      likes: node.like_count,
      views: node.play_count || node.view_count || node.video_view_count,
      comments: node.comment_count,
      createdAt: node.taken_at,
      externalUrl: node.code ? `https://www.instagram.com/reel/${node.code}/` : undefined,
    };
  });
}

function parseInstagramSearch(data: any): TrendResult[] {
  const raw = data?.data;
  const items = Array.isArray(raw) ? raw : [];
  return items.map((p: any) => ({
    id: p.pk || p.id || String(Math.random()),
    platform: 'instagram' as Platform,
    type: 'post',
    thumbnail: p.image_versions2?.candidates?.[0]?.url || p.thumbnail_url || p.display_url,
    description: p.caption?.text || '',
    author: p.user?.username || '',
    authorAvatar: p.user?.profile_pic_url,
    likes: p.like_count,
    views: p.play_count || p.view_count,
    comments: p.comment_count,
    createdAt: p.taken_at,
    externalUrl: p.code ? `https://www.instagram.com/p/${p.code}/` : undefined,
  }));
}

function parseYouTubeResults(data: any): TrendResult[] {
  const raw = data?.data;
  const items = Array.isArray(raw) ? raw : [];
  return items.map((p: any) => ({
    id: p.videoId || p.id || String(Math.random()),
    platform: 'youtube' as Platform,
    type: 'video',
    thumbnail: p.thumbnail?.[0]?.url || p.thumbnails?.[0]?.url,
    description: p.title || '',
    author: p.channelTitle || p.channelName || '',
    views: p.viewCount != null ? Number(p.viewCount) : undefined,
    createdAt: p.publishedTimeText || p.publishDate,
    externalUrl: p.videoId ? `https://www.youtube.com/watch?v=${p.videoId}` : undefined,
  }));
}

export default function TrendsPage() {
  const [platform, setPlatform] = useState<Platform>('tiktok');
  const [searchMode, setSearchMode] = useState<SearchMode>('keyword');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<TrendResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>('relevant');
  const [activeNiche, setActiveNiche] = useState<string | null>(null);
  const [nicheLoading, setNicheLoading] = useState(false);

  const availableModes = (() => {
    if (platform === 'tiktok') return SEARCH_MODES.filter((m) => m.key !== 'user');
    if (platform === 'instagram') return SEARCH_MODES.filter((m) => m.key !== 'hashtag');
    return SEARCH_MODES.filter((m) => m.key !== 'user');
  })();

  const handlePlatformChange = (p: Platform) => {
    setPlatform(p);
    setResults([]);
    setHasSearched(false);
    setNextCursor(null);
    const modes = p === 'tiktok'
      ? ['keyword', 'hashtag']
      : p === 'instagram'
        ? ['keyword', 'user']
        : ['keyword', 'hashtag'];
    if (!modes.includes(searchMode)) setSearchMode(modes[0] as SearchMode);
  };

  const doNicheSearch = async (nicheKey: string) => {
    const niche = NICHES.find((n) => n.key === nicheKey);
    if (!niche) return;

    setActiveNiche(nicheKey);
    setNicheLoading(true);
    setResults([]);
    setHasSearched(false);
    setNextCursor(null);

    try {
      const requests = niche.hashtags.map((tag) =>
        api.get<any>(`/trends/tiktok/hashtag?name=${encodeURIComponent(tag)}&cursor=0`).catch(() => null),
      );
      const responses = await Promise.all(requests);

      let allPosts: TrendResult[] = [];
      for (const resp of responses) {
        if (!resp) continue;
        allPosts = allPosts.concat(parseTikTokResults(resp));
      }

      const seen = new Set<string>();
      allPosts = allPosts.filter((p) => {
        if (seen.has(p.id)) return false;
        seen.add(p.id);
        return true;
      });

      allPosts.sort((a, b) => ((b.views ?? 0) + (b.likes ?? 0)) - ((a.views ?? 0) + (a.likes ?? 0)));

      setResults(allPosts);
      setHasSearched(true);
    } catch (err: any) {
      toast.error(err?.message || 'Ошибка поиска');
    } finally {
      setNicheLoading(false);
    }
  };

  const doSearch = async (cursor?: string) => {
    if (!query.trim()) {
      toast.error('Введите запрос для поиска');
      return;
    }

    if (cursor) setLoadingMore(true);
    else setLoading(true);

    try {
      let data: any;
      let parsed: TrendResult[] = [];

      const ttSorting = sortBy === 'likes' ? '1' : sortBy === 'recent' ? '2' : '0';
      const ytSorting = sortBy === 'views' ? 'view count' : sortBy === 'recent' ? 'upload time' : sortBy === 'likes' ? 'rating' : 'relevance';

      if (platform === 'tiktok') {
        if (searchMode === 'hashtag') {
          data = await api.get(`/trends/tiktok/hashtag?name=${encodeURIComponent(query.replace('#', ''))}&cursor=${cursor || '0'}`);
          parsed = parseTikTokResults(data);
        } else {
          data = await api.get(`/trends/tiktok/keyword?name=${encodeURIComponent(query)}&cursor=${cursor || '0'}&sorting=${ttSorting}`);
          parsed = parseTikTokResults(data);
        }
      } else if (platform === 'instagram') {
        if (searchMode === 'user') {
          const username = query.replace('@', '').trim();
          const userInfo = await api.get<any>(`/trends/instagram/user?username=${encodeURIComponent(username)}`);
          const userId = userInfo?.data?.user?.pk || userInfo?.data?.pk || userInfo?.data?.user?.id;
          if (!userId) throw new Error('Пользователь не найден');
          data = await api.get(`/trends/instagram/reels?userId=${userId}`);
          parsed = parseInstagramReels(data);
        } else {
          data = await api.get(`/trends/instagram/search?text=${encodeURIComponent(query)}`);
          parsed = parseInstagramSearch(data);
        }
      } else {
        if (searchMode === 'hashtag') {
          data = await api.get(`/trends/youtube/hashtag?name=${encodeURIComponent(query.replace('#', ''))}`);
        } else {
          data = await api.get(`/trends/youtube/keyword?keyword=${encodeURIComponent(query)}&sorting=${encodeURIComponent(ytSorting)}`);
        }
        parsed = parseYouTubeResults(data);
      }

      if (sortBy !== 'relevant') {
        const sortField = sortBy === 'likes' ? 'likes' : sortBy === 'views' ? 'views' : sortBy === 'comments' ? 'comments' : null;
        if (sortField) {
          parsed.sort((a, b) => ((b as any)[sortField] ?? 0) - ((a as any)[sortField] ?? 0));
        } else if (sortBy === 'recent') {
          parsed.sort((a, b) => {
            const ta = typeof a.createdAt === 'number' ? a.createdAt : 0;
            const tb = typeof b.createdAt === 'number' ? b.createdAt : 0;
            return tb - ta;
          });
        }
      }

      const nc = data?.data?.nextCursor ?? data?.nextCursor ?? data?.next_cursor ?? null;
      setNextCursor(nc ? String(nc) : null);

      if (cursor) {
        setResults((prev) => [...prev, ...parsed]);
      } else {
        setResults(parsed);
      }
      setHasSearched(true);
    } catch (err: any) {
      toast.error(err?.message || 'Ошибка поиска');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const placeholder = searchMode === 'hashtag'
    ? 'Введите хэштег…'
    : searchMode === 'user'
      ? 'Введите username…'
      : 'Введите ключевое слово…';

  return (
    <div className="flex flex-col gap-[18px]">
      {/* Header */}
      <div>
        <h1 className="text-[26px] font-extrabold tracking-tight leading-tight">Тренды</h1>
        <p className="text-muted-foreground text-[13.5px] mt-1">
          Найдите трендовый контент в социальных сетях
        </p>
      </div>

      {/* Niches */}
      <div className="bg-card border border-border rounded-[22px] shadow-card p-[18px]">
        <div className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase mb-3">
          Топ по нишам · TikTok
        </div>
        <div className="flex gap-2 flex-wrap">
          {NICHES.map((n) => (
            <button
              key={n.key}
              onClick={() => doNicheSearch(n.key)}
              disabled={nicheLoading}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12.5px] font-semibold border transition-colors disabled:opacity-50 ${
                activeNiche === n.key
                  ? 'border-primary bg-primary/10'
                  : 'border-border bg-card hover:bg-secondary'
              }`}
            >
              <span className="text-[14px]">{n.emoji}</span>
              {n.label}
            </button>
          ))}
        </div>
        {nicheLoading && (
          <div className="flex items-center gap-2 mt-3 text-[12.5px] text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Ищем топовый контент…
          </div>
        )}
      </div>

      {/* Search card */}
      <div className="bg-card border border-border rounded-[22px] shadow-card p-[18px]">
        {/* Platform tabs */}
        <div className="flex gap-2 mb-4">
          {PLATFORMS.map((p) => (
            <button
              key={p.key}
              onClick={() => handlePlatformChange(p.key)}
              className={`flex items-center gap-[7px] px-[11px] py-[7px] rounded-full text-[12.5px] font-semibold border transition-colors ${
                platform === p.key
                  ? 'border-primary bg-primary/10'
                  : 'border-border bg-card hover:bg-secondary'
              }`}
            >
              <span
                className="w-[20px] h-[20px] rounded-[6px] grid place-items-center text-white text-[10px] shrink-0"
                style={{ background: p.color }}
              >
                <NetworkIcon network={p.network} className="w-[12px] h-[12px]" />
              </span>
              {p.label}
            </button>
          ))}
        </div>

        {/* Search mode tabs + sorting */}
        <div className="flex items-center gap-1.5 mb-3 flex-wrap">
          {availableModes.map((m) => (
            <button
              key={m.key}
              onClick={() => { setSearchMode(m.key); setResults([]); setHasSearched(false); }}
              className={`text-[12px] font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                searchMode === m.key
                  ? 'border-primary bg-primary/10 text-foreground'
                  : 'border-border bg-card text-muted-foreground hover:bg-secondary'
              }`}
            >
              {m.label}
            </button>
          ))}
          <span className="w-px h-5 bg-border mx-1" />
          {SORT_OPTIONS.map((s) => (
            <button
              key={s.key}
              onClick={() => setSortBy(s.key)}
              className={`text-[12px] font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                sortBy === s.key
                  ? 'border-primary bg-primary/10 text-foreground'
                  : 'border-border bg-card text-muted-foreground hover:bg-secondary'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Search input */}
        <div className="flex gap-2.5">
          <div className="flex-1 border border-border rounded-[11px] focus-within:border-ring focus-within:shadow-[0_0_0_3px_color-mix(in_srgb,var(--primary)_35%,transparent)]">
            <input
              placeholder={placeholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && doSearch()}
              className="w-full border-0 rounded-[11px] px-3 py-2.5 text-[13.5px] bg-transparent outline-none"
            />
          </div>
          <button
            onClick={() => doSearch()}
            disabled={loading}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-bold text-[13px] rounded-xl px-5 py-2.5 hover:brightness-95 transition-all disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            Найти
          </button>
        </div>
      </div>

      {/* Results */}
      {loading && !hasSearched && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {hasSearched && results.length === 0 && !loading && (
        <div className="bg-card border border-border rounded-[22px] shadow-card p-[18px] text-center">
          <p className="text-[13.5px] text-muted-foreground py-8">
            Ничего не найдено. Попробуйте другой запрос.
          </p>
        </div>
      )}

      {results.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {results.map((item) => (
            <div
              key={item.id}
              className="bg-card border border-border rounded-[18px] shadow-card overflow-hidden flex flex-col"
            >
              {/* Thumbnail */}
              <div className="relative aspect-[9/16] max-h-[320px] bg-secondary overflow-hidden">
                {item.thumbnail ? (
                  <img
                    src={item.thumbnail}
                    alt=""
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Play className="h-10 w-10 text-muted-foreground/30" />
                  </div>
                )}
                {item.views != null && (
                  <div className="absolute bottom-2 left-2 bg-black/70 text-white text-[11px] font-semibold px-2 py-0.5 rounded-md flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    {formatNumber(item.views)}
                  </div>
                )}
                {item.externalUrl && (
                  <a
                    href={item.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute top-2 right-2 bg-black/70 text-white p-1.5 rounded-lg hover:bg-black/90 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>

              {/* Info */}
              <div className="p-3 flex flex-col gap-2 flex-1">
                {/* Author */}
                <div className="flex items-center gap-2">
                  {item.authorAvatar ? (
                    <img src={item.authorAvatar} alt="" className="w-6 h-6 rounded-full object-cover" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-secondary" />
                  )}
                  <span className="text-[12px] font-semibold truncate">@{item.author}</span>
                  {item.createdAt && (
                    <span className="text-[11px] text-muted-foreground ml-auto shrink-0">
                      {typeof item.createdAt === 'string' ? item.createdAt : timeAgo(item.createdAt)}
                    </span>
                  )}
                </div>

                {/* Description */}
                <p className="text-[12.5px] leading-snug line-clamp-3">{item.description}</p>

                {/* Stats */}
                <div className="flex items-center gap-3 mt-auto pt-1">
                  {item.likes != null && (
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Heart className="h-3 w-3" />
                      {formatNumber(item.likes)}
                    </span>
                  )}
                  {item.comments != null && (
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <MessageCircle className="h-3 w-3" />
                      {formatNumber(item.comments)}
                    </span>
                  )}
                  {item.shares != null && (
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <TrendingUp className="h-3 w-3" />
                      {formatNumber(item.shares)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Load more */}
      {nextCursor && results.length > 0 && (
        <div className="flex justify-center">
          <button
            onClick={() => doSearch(nextCursor)}
            disabled={loadingMore}
            className="inline-flex items-center gap-2 font-bold text-[13px] rounded-xl px-6 py-2.5 border border-border bg-card hover:bg-secondary transition-colors hover:shadow-card disabled:opacity-50"
          >
            {loadingMore ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : null}
            {loadingMore ? 'Загрузка…' : 'Загрузить ещё'}
          </button>
        </div>
      )}
    </div>
  );
}
