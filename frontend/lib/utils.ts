import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ───────────── numbers ─────────────
export function fmtUsd(n: number | string | null | undefined, opts: { compact?: boolean; sign?: boolean } = {}): string {
  if (n === null || n === undefined) return '—';
  const num = typeof n === 'string' ? parseFloat(n) : n;
  if (!Number.isFinite(num)) return '—';
  const abs = Math.abs(num);
  if (opts.compact && abs >= 1000) {
    const f = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(num);
    return `${opts.sign && num > 0 ? '+' : ''}$${f}`;
  }
  const f = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
  return `${opts.sign && num > 0 ? '+' : ''}$${f}`;
}

export function fmtPct(n: number | null | undefined, opts: { digits?: number; sign?: boolean } = {}): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—';
  const digits = opts.digits ?? 1;
  const v = (n * 100).toFixed(digits);
  return `${opts.sign && n > 0 ? '+' : ''}${v}%`;
}

export function fmtPrice(n: number | string | null | undefined): string {
  if (n === null || n === undefined) return '—';
  const num = typeof n === 'string' ? parseFloat(n) : n;
  if (!Number.isFinite(num)) return '—';
  return `¢${(num * 100).toFixed(1)}`;
}

export function fmtNum(n: number | string | null | undefined, compact = false): string {
  if (n === null || n === undefined) return '—';
  const num = typeof n === 'string' ? parseFloat(n) : n;
  if (!Number.isFinite(num)) return '—';
  if (compact) return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(num);
  return new Intl.NumberFormat('en-US').format(num);
}

// ───────────── time ─────────────
export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return '—';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '—';
  const diff = (Date.now() - then) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function timeUntil(iso: string | null | undefined): string {
  if (!iso) return '—';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '—';
  const diff = (then - Date.now()) / 1000;
  if (diff < 0) return 'ended';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 86400 * 30) return `${Math.floor(diff / 86400)}d`;
  return `${Math.floor(diff / (86400 * 30))}mo`;
}

// ───────────── address ─────────────
export function shortAddr(addr: string | null | undefined): string {
  if (!addr) return '—';
  if (addr.length < 10) return addr;
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}
