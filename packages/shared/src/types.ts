import type { Role, Network, PostStatus, PublicationStatus, AccountStatus, AssetType, AssetSource } from './enums';

export interface UserDto {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  locale: string;
  theme: 'light' | 'dark';
  createdAt: string;
}

export interface BrandDto {
  id: string;
  name: string;
  description: string | null;
  brandVoice: string | null;
  targetAudience: string | null;
  color: string;
  createdAt: string;
}

export interface UserBrandDto {
  userId: string;
  brandId: string;
  role: Role;
  brand?: BrandDto;
  user?: UserDto;
}

export interface AccountDto {
  id: string;
  brandId: string;
  network: Network;
  postproxyProfileId: string;
  handle: string;
  status: AccountStatus;
  statusMessage: string | null;
  tokenExpiresAt: string | null;
  dailyPostLimit: number;
  createdAt: string;
}

export interface AssetDto {
  id: string;
  brandId: string;
  type: AssetType;
  source: AssetSource;
  url: string;
  thumbnailUrl: string | null;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  tags: string[];
  createdById: string;
  createdAt: string;
}

export interface PostDto {
  id: string;
  brandId: string;
  body: string;
  status: PostStatus;
  scheduledAt: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  targets?: PostTargetDto[];
  assets?: AssetDto[];
}

export interface PostTargetDto {
  id: string;
  postId: string;
  accountId: string;
  networkParams: Record<string, unknown>;
  account?: AccountDto;
  publication?: PublicationDto;
}

export interface PublicationDto {
  id: string;
  postTargetId: string;
  scheduledAt: string | null;
  publishedAt: string | null;
  status: PublicationStatus;
  externalId: string | null;
  error: string | null;
  retryCount: number;
}

export interface AnalyticsSnapshotDto {
  id: string;
  accountId: string;
  date: string;
  followers: number;
  reach: number;
  impressions: number;
  engagement: number;
  postsCount: number;
}

export interface AuditLogDto {
  id: string;
  userId: string;
  action: string;
  entity: string;
  entityId: string | null;
  brandId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  user?: UserDto;
}

export interface AuthTokensDto {
  accessToken: string;
  refreshToken: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  email: string;
  password: string;
  name: string;
}

export interface CreateBrandDto {
  name: string;
  description?: string;
  brandVoice?: string;
  targetAudience?: string;
  color: string;
}

export interface CreatePostDto {
  brandId: string;
  body: string;
  scheduledAt?: string;
  targets: CreatePostTargetDto[];
  assetIds?: string[];
}

export interface CreatePostTargetDto {
  accountId: string;
  networkParams?: Record<string, unknown>;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
