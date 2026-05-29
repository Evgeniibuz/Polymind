'use client';

import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';

const plans = [
  {
    name: 'Free',
    tag: 'For exploring',
    price: '$0',
    cadence: 'forever',
    features: [
      'Live market feed (Polymarket + Kalshi)',
      '10 signals per day',
      'Public whale tracker',
      'Manual trading from terminal',
    ],
    cta: 'Get started',
    variant: 'ghost' as const,
  },
  {
    name: 'Pro',
    tag: 'For serious traders',
    price: '$99',
    cadence: '/ month',
    features: [
      'Unlimited signals · real-time stream',
      'Mispricing detector (all categories)',
      'Whale alerts · custom filters',
      'Up to 5 execution bots',
      'WebSocket API + 10k req/day',
    ],
    cta: 'Start 7-day trial',
    variant: 'poly' as const,
    featured: true,
  },
  {
    name: 'Desk',
    tag: 'For trading firms',
    price: 'Custom',
    cadence: '',
    features: [
      'Everything in Pro',
      'Unlimited bots + dedicated workers',
      'Higher rate limits · priority routing',
      'Co-located execution (Polymarket CLOB)',
      'Slack/Telegram alert integration',
    ],
    cta: 'Talk to us',
    variant: 'ink' as const,
  },
];

export function Pricing({ onCta }: { onCta: () => void }) {
  return (
    <section id="pricing" className="relative py-24 sm:py-32 border-t border-ink/[0.06]">
      <div className="max-w-[1320px] mx-auto px-5 sm:px-8">
        <div className="max-w-2xl mx-auto text-center mb-16">
          <div className="font-mono text-[11px] tracking-[0.18em] uppercase text-poly mb-4">▸ Pricing</div>
          <h2 className="text-[44px] sm:text-[56px] font-semibold tracking-tightest leading-[1.02] text-ink">
            Simple plans.{' '}
            <span className="font-serif italic font-normal">Serious tools.</span>
          </h2>
          <p className="mt-5 text-[16px] text-ink/60 leading-relaxed">
            Start free. Upgrade when your edge demands more — uncapped signals, bots, and API access.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-4 max-w-5xl mx-auto">
          {plans.map(p => (
            <div
              key={p.name}
              className={`relative rounded-2xl p-7 border transition-all duration-300 ${
                p.featured
                  ? 'border-poly bg-white shadow-card scale-[1.02]'
                  : 'border-line bg-white/60 hover:bg-white'
              }`}
            >
              {p.featured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-poly text-white font-mono text-[10px] uppercase tracking-[0.12em] font-medium">
                  Most popular
                </div>
              )}
              <div className="mb-6">
                <div className="text-[22px] font-semibold tracking-tight">{p.name}</div>
                <div className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink/45 mt-1">
                  {p.tag}
                </div>
              </div>
              <div className="flex items-baseline gap-1.5 mb-7">
                <span className="text-[42px] font-semibold tracking-tightest leading-none">{p.price}</span>
                <span className="text-[13px] text-ink/50">{p.cadence}</span>
              </div>
              <ul className="space-y-3 mb-8">
                {p.features.map(f => (
                  <li key={f} className="flex items-start gap-2.5 text-[13.5px] text-ink/75">
                    <Icon name="check" size={14} className={p.featured ? 'text-poly mt-0.5' : 'text-ink/40 mt-0.5'} />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Button variant={p.variant} size="md" fullWidth onClick={onCta}>
                {p.cta} <Icon name="arrow_right" size={14} />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
