export interface PublishTarget {
  profileId: string;
  network: string;
  networkParams?: Record<string, unknown>;
}

export interface PublishRequest {
  text: string;
  mediaUrls?: string[];
  targets: PublishTarget[];
  scheduledAt?: Date;
}

export interface PublishResult {
  profileId: string;
  network: string;
  success: boolean;
  externalId?: string;
  error?: string;
}

export interface DirectMessageRequest {
  profileId: string;
  recipientId: string;
  text: string;
  attachmentUrl?: string;
}

export interface PrivateReplyRequest {
  profileId: string;
  commentId: string;
  text: string;
}

export interface PublishingProvider {
  publish(request: PublishRequest): Promise<PublishResult[]>;
  schedule(request: PublishRequest): Promise<PublishResult[]>;
  deletePost(externalId: string): Promise<{ success: boolean; error?: string }>;
  getPublicationStatus(externalId: string): Promise<{ status: string; error?: string }>;
  sendDirectMessage(request: DirectMessageRequest): Promise<{ success: boolean; error?: string }>;
  sendPrivateReply(request: PrivateReplyRequest): Promise<{ success: boolean; error?: string }>;
}

export const PUBLISHING_PROVIDER = 'PUBLISHING_PROVIDER';
