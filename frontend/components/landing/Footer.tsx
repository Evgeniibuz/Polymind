'use client';

import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { PolymindLogo } from '@/components/brand/Logo';

export function FinalCTA({ onCta }: { onCta: () => void }) {
  return (
    <section className="relative py-24 sm:py-32 border-t border-ink/[0.06]">
      <div className="max-w-[1320px] mx-auto px-5 sm:px-8">
        <div className="relative rounded-3xl overflow-hidden p-12 sm:p-20 text-center bg-ink text-white">
          {/* pixel grid bg */}
          <div
            className="absolute inset-0 opacity-25 pointer-events-none"
            style={{
              backgroundImage:
                'linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)',
              backgroundSize: '32px 32px',
            }}
          />
          <div
            className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full pointer-events-none"
            style={{
              background: 'radial-gradient(circle, rgba(45,156,219,0.35) 0%, transparent 60%)',
              filter: 'blur(60px)',
            }}
          />

          <div className="relative">
            <div className="font-mono text-[11px] tracking-[0.18em] uppercase text-poly mb-6">
              ▸ Ready when you are
            </div>
            <h2 className="text-[44px] sm:text-[64px] font-semibold tracking-tightest leading-[1.02] max-w-3xl mx-auto">
              The market is moving.{' '}
              <span className="font-serif italic font-normal text-poly">You should be too.</span>
            </h2>
            <p className="mt-7 text-[16px] sm:text-[17px] text-white/65 max-w-xl mx-auto leading-relaxed">
              Sign in with a wallet or email. Be in the terminal in under 30 seconds.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <Button variant="poly" size="lg" onClick={onCta}>
                Open Polymind <Icon name="arrow_right" size={16} />
              </Button>
              <a
                href="#engine"
                className="inline-flex items-center gap-2 h-13 px-5 text-[14.5px] font-medium text-white/70 hover:text-white link-underline"
                style={{ height: '52px' }}
              >
                Read the docs
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  const twitterUrl = process.env.NEXT_PUBLIC_TWITTER_URL || '';
  return (
    <footer className="border-t border-ink/[0.06] py-12 sm:py-16">
      <div className="max-w-[1320px] mx-auto px-5 sm:px-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <PolymindLogo size={26} />
            <span className="hidden sm:block text-[12.5px] text-ink/45">
              AI intelligence for prediction markets
            </span>
          </div>

          <div className="flex items-center gap-3">
            {twitterUrl ? (
              <a
                href={twitterUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Polymind on X"
                className="w-9 h-9 rounded-full btn-ghost flex items-center justify-center"
              >
                <Icon name="twitter" size={14} />
              </a>
            ) : (
              <a
                href="#"
                aria-label="X (link not configured)"
                className="w-9 h-9 rounded-full btn-ghost flex items-center justify-center opacity-60"
                onClick={(e) => e.preventDefault()}
              >
                <Icon name="twitter" size={14} />
              </a>
            )}
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-ink/[0.05] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <p className="text-[11.5px] text-ink/40">
            © {new Date().getFullYear()} Polymind. Trading involves substantial risk of loss.
          </p>
          <p className="font-mono text-[10px] tracking-[0.12em] uppercase text-ink/35">
            Built for serious event traders
          </p>
        </div>
      </div>
    </footer>
  );
}
