'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PolymindLogo } from '@/components/brand/Logo';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { useAuth } from '@/hooks/useAuth';
import { cn, shortAddr } from '@/lib/utils';

interface NavProps {
  onOpenAuth: () => void;
}

export function Nav({ onOpenAuth }: NavProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, isAuthed, logout } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const links = [
    { href: '#product', label: 'Product' },
    { href: '#engine', label: 'Engine' },
    { href: '#bots', label: 'Bots' },
    { href: '#pricing', label: 'Pricing' },
  ];

  return (
    <header
      className={cn(
        'fixed top-0 inset-x-0 z-50 transition-all duration-300',
        scrolled ? 'bg-bone/85 backdrop-blur-xl border-b border-ink/[0.06]' : 'bg-transparent'
      )}
    >
      <div className="max-w-[1320px] mx-auto px-5 sm:px-8 h-[68px] flex items-center justify-between">
        <Link href="/" className="flex items-center" aria-label="Polymind home">
          <PolymindLogo size={26} />
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {links.map(l => (
            <a
              key={l.href}
              href={l.href}
              className="px-3.5 py-2 text-[13.5px] font-medium text-ink/65 hover:text-ink transition-colors rounded-full hover:bg-ink/[0.04]"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {isAuthed ? (
            <>
              <Link href="/terminal">
                <Button variant="poly" size="sm">
                  Open Terminal <Icon name="arrow_right" size={14} />
                </Button>
              </Link>
              <button
                onClick={logout}
                className="hidden sm:inline-flex items-center gap-2 px-3 h-9 rounded-full hover:bg-ink/[0.06] text-[12.5px] font-mono text-ink/60"
              >
                {user?.wallet_address ? shortAddr(user.wallet_address) : user?.email}
                <Icon name="logout" size={12} />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onOpenAuth}
                className="hidden sm:inline-flex h-9 px-3.5 text-[13px] font-medium text-ink/70 hover:text-ink rounded-full hover:bg-ink/[0.04] transition-colors"
              >
                Sign in
              </button>
              <Button variant="poly" size="sm" onClick={onOpenAuth}>
                Get started <Icon name="arrow_right" size={14} />
              </Button>
            </>
          )}
          <button
            className="md:hidden w-9 h-9 rounded-full hover:bg-ink/[0.06] flex items-center justify-center"
            onClick={() => setMobileOpen(v => !v)}
            aria-label="Menu"
          >
            <Icon name={mobileOpen ? 'close' : 'menu'} size={16} />
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-line bg-bone/95 backdrop-blur-xl">
          <div className="px-5 py-4 flex flex-col gap-1">
            {links.map(l => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setMobileOpen(false)}
                className="px-3 py-2.5 text-[15px] font-medium text-ink/80 rounded-lg hover:bg-ink/[0.04]"
              >
                {l.label}
              </a>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
