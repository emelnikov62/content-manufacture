import { TelegramIcon } from './telegram';

const EMOJI_ICONS: Record<string, string> = {
  INSTAGRAM: '📷',
  TIKTOK: '🎵',
  THREADS: '🧵',
  FACEBOOK: '📘',
  TWITTER: '𝕏',
};

export function NetworkIcon({ network, className }: { network: string; className?: string }) {
  if (network === 'TELEGRAM') {
    return <TelegramIcon className={className || 'w-[1em] h-[1em] inline'} />;
  }
  return <span className={className}>{EMOJI_ICONS[network] || '🌐'}</span>;
}
