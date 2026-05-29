'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { PolymindLogo, PolymindMark } from '@/components/brand/Logo';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { cn, shortAddr } from '@/lib/utils';

const NAV = [
  { href: '/terminal',           label: 'Overview',    icon: 'pulse' as const },
  { href: '/terminal/signals',   label: 'Signals',     icon: 'radar' as const },
  { href: '/terminal/mispricing',label: 'Mispricing',  icon: 'spread' as const },
  { href: '/terminal/whales',    label: 'Whales',      icon: 'whale' as const },
  { href: '/terminal/markets',   label: 'Markets',     icon: 'chart' as const },
  { href: '/terminal/bots',      label: 'Bots',        icon: 'bot' as const },
  { href: '/terminal/positions', label: 'Positions',   icon: 'wallet' as const },
  { href: '/terminal/strategy',  label: 'Strategy',    icon: 'book' as const },
];

export default function TerminalLayout({ children }: { children: React.ReactNode }) {
  const { user, ready, isAuthed, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (ready && !isAuthed) router.replace('/');
  }, [ready, isAuthed, router]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bone">
        <div className="animate-pulse-soft">
          <PolymindMark size={32} />
        </div>
      </div>
    );
  }

  if (!isAuthed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bone text-center px-6">
        <div>
          <PolymindMark size={40} className="mx-auto mb-5" />
          <h2 className="text-[20px] font-semibold tracking-tightest">Redirecting…</h2>
          <p className="text-[13px] text-ink/55 mt-1">Sign in to access the terminal.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-bone">
      {/* SIDEBAR */}
      <aside className="hidden md:flex flex-col w-60 shrink-0 border-r border-ink/[0.06] bg-white">
        <div className="h-[60px] flex items-center px-5 border-b border-ink/[0.06]">
          <Link href="/" className="flex items-center" aria-label="Polymind home">
            <PolymindLogo size={22} />
          </Link>
        </div>
        <nav className="flex-1 p-3 space-y-0.5">
          {NAV.map(n => {
            const active = pathname === n.href || (n.href !== '/terminal' && pathname.startsWith(n.href));
            return (
              <Link
                key={n.href}
                href={n.href}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13.5px] font-medium transition-colors',
                  active
                    ? 'bg-poly/8 text-poly border border-poly/15'
                    : 'text-ink/65 hover:text-ink hover:bg-ink/[0.04] border border-transparent'
                )}
              >
                <Icon name={n.icon} size={14} />
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-ink/[0.06]">
          <div className="px-3 py-2.5 rounded-lg bg-ink/[0.04] flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-poly to-poly-deep flex items-center justify-center text-white text-[11px] font-semibold">
              {(user?.display_name || user?.email || user?.wallet_address || '?').slice(0, 1).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-medium text-ink truncate">
                {user?.display_name || (user?.email ? user.email.split('@')[0] : shortAddr(user?.wallet_address))}
              </div>
              <div className="font-mono text-[10px] text-ink/45 truncate">
                {user?.is_pro ? 'Pro' : 'Free'}
              </div>
            </div>
            <button
              onClick={logout}
              aria-label="Sign out"
              className="w-7 h-7 rounded-md hover:bg-ink/[0.08] flex items-center justify-center text-ink/55"
            >
              <Icon name="logout" size={13} />
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* topbar */}
        <header className="h-[60px] shrink-0 border-b border-ink/[0.06] bg-white px-5 sm:px-7 flex items-center justify-between">
          {/* mobile logo */}
          <Link href="/" className="md:hidden flex items-center"><PolymindLogo size={22} /></Link>
          <div className="hidden md:flex items-center gap-2">
            <span className="dot-live" />
            <span className="font-mono text-[11px] tracking-[0.12em] uppercase text-ink/55">
              connected · real-time stream
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/terminal/bots">
              <Button variant="poly" size="sm">
                <Icon name="plus" size={13} /> New bot
              </Button>
            </Link>
          </div>
        </header>

        {/* mobile bottom nav */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-ink/[0.06] flex items-center justify-around py-2">
          {NAV.slice(0, 5).map(n => {
            const active = pathname === n.href || (n.href !== '/terminal' && pathname.startsWith(n.href));
            return (
              <Link key={n.href} href={n.href} className="flex flex-col items-center gap-0.5 px-3 py-1.5">
                <Icon name={n.icon} size={16} className={active ? 'text-poly' : 'text-ink/55'} />
                <span className={cn('text-[9px] uppercase tracking-wider font-mono', active ? 'text-poly' : 'text-ink/55')}>
                  {n.label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* content */}
        <main className="flex-1 overflow-auto pb-20 md:pb-0">
          {children}
        </main>
      </div>
    </div>
  );
}
