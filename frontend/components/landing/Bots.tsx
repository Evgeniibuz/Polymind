'use client';

import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';

const bots = [
  {
    name: 'Event Scanner',
    kind: 'event_scanner',
    desc: 'Detects breaking news across X, Telegram, Reddit, and 180+ feeds. Enters positions before odds reprice.',
    pnl: '+34.8%',
    trades: 1240,
    accent: 'from-poly to-poly-deep',
  },
  {
    name: 'Whale Follower',
    kind: 'whale_follower',
    desc: 'Mirrors high-win-rate Polymarket whales with configurable position sizing and per-trader filters.',
    pnl: '+28.1%',
    trades: 612,
    accent: 'from-ink to-ink-soft',
  },
  {
    name: 'Mispricing Arb',
    kind: 'mispricing',
    desc: 'Trades when our probability engine diverges from market consensus by your minimum edge threshold.',
    pnl: '+22.5%',
    trades: 980,
    accent: 'from-positive/90 to-positive',
  },
];

export function Bots({ onCta }: { onCta: () => void }) {
  return (
    <section id="bots" className="relative py-24 sm:py-32 border-t border-ink/[0.06]">
      <div className="max-w-[1320px] mx-auto px-5 sm:px-8">
        <div className="grid lg:grid-cols-[1fr_2fr] gap-12 lg:gap-16 items-start mb-14">
          <div>
            <div className="font-mono text-[11px] tracking-[0.18em] uppercase text-poly mb-4">▸ Bots</div>
            <h2 className="text-[44px] sm:text-[56px] font-semibold tracking-tightest leading-[1.02] text-ink">
              Your edge,{' '}
              <span className="font-serif italic font-normal">on autopilot</span>.
            </h2>
          </div>
          <p className="text-[16px] sm:text-[17px] text-ink/60 leading-relaxed lg:pt-3">
            Configure a bot in 30 seconds — budget, confidence floor, categories, venues. The bot watches the
            signal feed and executes only when your rules fire. You stay in control with circuit breakers and a
            full audit trail.
          </p>
        </div>

        {/* bot cards */}
        <div className="grid md:grid-cols-3 gap-4">
          {bots.map((b, i) => (
            <div
              key={b.name}
              className="card p-6 group hover:-translate-y-1 transition-transform duration-300 relative overflow-hidden"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              {/* accent stripe */}
              <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${b.accent}`} />

              <div className="flex items-center justify-between mb-5">
                <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink/45">{b.kind}</span>
                <span className="tag tag-positive">{b.pnl} · 30d</span>
              </div>
              <h3 className="text-[20px] font-semibold tracking-tight mb-2">{b.name}</h3>
              <p className="text-[13.5px] text-ink/60 leading-relaxed mb-6 min-h-[64px]">{b.desc}</p>
              <div className="flex items-center justify-between pt-5 border-t border-line">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-wider text-ink/45 mb-0.5">Trades</div>
                  <div className="text-[14px] font-semibold tabular">{b.trades.toLocaleString()}</div>
                </div>
                <Button variant="outline" size="sm" onClick={onCta}>
                  Deploy <Icon name="arrow_right" size={13} />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 flex justify-center">
          <Button variant="ink" size="md" onClick={onCta}>
            Build a custom bot <Icon name="arrow_right" size={14} />
          </Button>
        </div>
      </div>
    </section>
  );
}
