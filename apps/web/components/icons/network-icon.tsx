import { TelegramIcon } from './telegram';
import { InstagramIcon } from './instagram';
import { TiktokIcon } from './tiktok';
import { ThreadsIcon } from './threads';
import { FacebookIcon } from './facebook';
import { TwitterIcon } from './twitter';
import { YoutubeIcon } from './youtube';
import { LinkedinIcon } from './linkedin';
import { PinterestIcon } from './pinterest';
import { SnapchatIcon } from './snapchat';
import { VkIcon } from './vk';
import { OkIcon } from './ok';
import { WhatsappIcon } from './whatsapp';
import { RedditIcon } from './reddit';

const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  TELEGRAM: TelegramIcon,
  INSTAGRAM: InstagramIcon,
  TIKTOK: TiktokIcon,
  THREADS: ThreadsIcon,
  FACEBOOK: FacebookIcon,
  TWITTER: TwitterIcon,
  YOUTUBE: YoutubeIcon,
  LINKEDIN: LinkedinIcon,
  PINTEREST: PinterestIcon,
  SNAPCHAT: SnapchatIcon,
  VK: VkIcon,
  OK: OkIcon,
  WHATSAPP: WhatsappIcon,
  REDDIT: RedditIcon,
};

export function NetworkIcon({ network, className }: { network: string; className?: string }) {
  const Icon = ICON_MAP[network];
  if (Icon) return <Icon className={className || 'w-[1em] h-[1em] inline'} />;
  return <span className={className}>🌐</span>;
}
