export enum Role {
  OWNER = 'OWNER',
  MANAGER = 'MANAGER',
  EDITOR = 'EDITOR',
  VIEWER = 'VIEWER',
}

export enum Network {
  INSTAGRAM = 'INSTAGRAM',
  TIKTOK = 'TIKTOK',
  TELEGRAM = 'TELEGRAM',
  THREADS = 'THREADS',
  FACEBOOK = 'FACEBOOK',
  TWITTER = 'TWITTER',
}

export enum PostStatus {
  DRAFT = 'DRAFT',
  SCHEDULED = 'SCHEDULED',
  PUBLISHING = 'PUBLISHING',
  PUBLISHED = 'PUBLISHED',
  ERROR = 'ERROR',
}

export enum PublicationStatus {
  PENDING = 'PENDING',
  PUBLISHING = 'PUBLISHING',
  PUBLISHED = 'PUBLISHED',
  ERROR = 'ERROR',
}

export enum AccountStatus {
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR',
  TOKEN_EXPIRING = 'TOKEN_EXPIRING',
  DISCONNECTED = 'DISCONNECTED',
}

export enum AssetType {
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  AUDIO = 'AUDIO',
}

export enum AssetSource {
  UPLOADED = 'UPLOADED',
  AI_GENERATED = 'AI_GENERATED',
}

export const NETWORK_LIMITS: Record<Network, { maxTextLength: number; maxMedia: number }> = {
  [Network.INSTAGRAM]: { maxTextLength: 2200, maxMedia: 10 },
  [Network.TIKTOK]: { maxTextLength: 4000, maxMedia: 1 },
  [Network.TELEGRAM]: { maxTextLength: 4096, maxMedia: 10 },
  [Network.THREADS]: { maxTextLength: 500, maxMedia: 10 },
  [Network.FACEBOOK]: { maxTextLength: 63206, maxMedia: 10 },
  [Network.TWITTER]: { maxTextLength: 280, maxMedia: 4 },
};

export const NETWORK_DAILY_LIMITS: Record<Network, number> = {
  [Network.INSTAGRAM]: 100,
  [Network.TIKTOK]: 15,
  [Network.TELEGRAM]: 1000,
  [Network.THREADS]: 250,
  [Network.FACEBOOK]: 100,
  [Network.TWITTER]: 100,
};
