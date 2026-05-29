import { cn } from '@/lib/utils';

type IconName =
  | 'arrow_right' | 'arrow_left' | 'arrow_up' | 'arrow_down'
  | 'check' | 'close' | 'plus' | 'minus' | 'menu' | 'search'
  | 'radar' | 'spread' | 'whale' | 'bot' | 'terminal'
  | 'twitter' | 'telegram' | 'reddit' | 'news' | 'onchain' | 'youtube' | 'google' | 'phantom'
  | 'lightning' | 'shield' | 'chart' | 'pulse' | 'globe' | 'book' | 'play' | 'pause' | 'settings' | 'trash'
  | 'wallet' | 'logout' | 'external' | 'dot' | 'lock' | 'sparkle' | 'filter';

interface IconProps {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

const PATHS: Record<IconName, React.ReactNode> = {
  arrow_right: <path d="M5 12h14M13 5l7 7-7 7" />,
  arrow_left: <path d="M19 12H5M11 5l-7 7 7 7" />,
  arrow_up: <path d="M12 19V5M5 12l7-7 7 7" />,
  arrow_down: <path d="M12 5v14M19 12l-7 7-7-7" />,
  check: <path d="M20 6L9 17l-5-5" />,
  close: <path d="M18 6L6 18M6 6l12 12" />,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  search: <><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></>,
  radar: <><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /><path d="M12 2v4M12 18v4M2 12h4M18 12h4" /></>,
  spread: <><path d="M3 12h7M14 12h7" /><path d="M7 8l-4 4 4 4M17 8l4 4-4 4" /></>,
  whale: <path d="M2 12c0-4 3-7 7-7h6c4 0 7 3 7 7v0c0 4-3 7-7 7H9l-5 3v-5c-1-1-2-3-2-5z" />,
  bot: <><rect x="4" y="8" width="16" height="12" rx="2" /><path d="M12 8V4M8 4h8M9 14h.01M15 14h.01M9 18h6" /></>,
  terminal: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M7 9l3 3-3 3M13 15h5" /></>,
  twitter: <path d="M18 4h3l-7 8 8 10h-6l-5-6-5 6H3l8-9-8-9h6l4 5z" />,
  telegram: <path d="M21 4L2 11l6 2 2 6 3-4 5 4 3-15z" />,
  reddit: <><circle cx="12" cy="13" r="8" /><path d="M9 13h.01M15 13h.01M9 16c1 1 5 1 6 0" /><circle cx="20" cy="6" r="2" /><path d="M14 5l6 1" /></>,
  news: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M7 8h10M7 12h10M7 16h6" /></>,
  onchain: <><path d="M12 2l9 5-9 5-9-5 9-5z" /><path d="M3 12l9 5 9-5M3 17l9 5 9-5" /></>,
  youtube: <><rect x="2" y="6" width="20" height="12" rx="3" /><path d="M10 9l5 3-5 3z" fill="currentColor" /></>,
  google: <><path d="M21 12c0 5-4 9-9 9s-9-4-9-9 4-9 9-9c2.5 0 4.5 1 6 2.5l-2.5 2.5C14.5 6.5 13.5 6 12 6c-3 0-5.5 2.5-5.5 6s2.5 6 5.5 6c2.5 0 4.5-1.5 5-4h-5v-3h8c0 .5.5 1 .5 1.5z" /></>,
  phantom: <><path d="M3 12c0-5 4-9 9-9s9 4 9 9c0 5-3 7-6 7H9c-1 0-3-1-3-2v-1" /><circle cx="9" cy="11" r="1.5" fill="currentColor" /><circle cx="15" cy="11" r="1.5" fill="currentColor" /></>,
  lightning: <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" />,
  shield: <path d="M12 2l8 4v6c0 5-4 9-8 10-4-1-8-5-8-10V6l8-4z" />,
  chart: <><path d="M3 3v18h18" /><path d="M7 14l4-4 3 3 5-7" /></>,
  pulse: <path d="M3 12h4l3-8 4 16 3-8h4" />,
  globe: <><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2c3 3 4 6 4 10s-1 7-4 10c-3-3-4-6-4-10s1-7 4-10z" /></>,
  book: <path d="M4 4v16c0-2 4-2 8-2s8 0 8 2V4c0-2-4-2-8-2S4 2 4 4zM12 2v16" />,
  play: <path d="M6 4l14 8-14 8V4z" fill="currentColor" />,
  pause: <><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 01-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 010-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3h.1a1.7 1.7 0 001-1.5V3a2 2 0 014 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8v.1a1.7 1.7 0 001.5 1H21a2 2 0 010 4h-.1a1.7 1.7 0 00-1.5 1z" /></>,
  trash: <><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" /></>,
  wallet: <><path d="M3 7h18v12a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" /><path d="M3 7l3-4h12l3 4M17 13h.01" /></>,
  logout: <><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3" /></>,
  external: <><path d="M14 4h6v6M10 14L20 4M19 13v5a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2h5" /></>,
  dot: <circle cx="12" cy="12" r="3" fill="currentColor" />,
  lock: <><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 018 0v4" /></>,
  sparkle: <path d="M12 2l2 6 6 2-6 2-2 6-2-6-6-2 6-2 2-6z" />,
  filter: <path d="M3 5h18l-7 9v6l-4-2v-4z" />,
};

export function Icon({ name, size = 16, strokeWidth = 1.75, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('shrink-0', className)}
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}
