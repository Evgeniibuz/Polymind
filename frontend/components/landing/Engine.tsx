'use client';

import { Icon } from '@/components/ui/Icon';

const features = [
  {
    icon: 'radar' as const,
    title: 'Event Scanner',
    desc: 'AI continuously monitors X, Telegram, Reddit, news, YouTube, and onchain flow — surfacing emerging narratives 12+ hours before odds adjust.',
    metric: '12h ahead',
  },
  {
    icon: 'spread' as const,
    title: 'Mispricing Detector',
    desc: 'A probability engine derives true odds from base rates, momentum, and source credibility, then compares against Polymarket and Kalshi.',
    metric: '+18.4% avg edge',
  },
  {
    icon: 'whale' as const,
    title: 'Whale Tracker',
    desc: 'Watches 1,920+ wallets across Polymarket. Filters noise. Pings you only when a high-win-rate trader takes a non-trivial position.',
    metric: '1,920 wallets',
  },
  {
    icon: 'bot' as const,
    title: 'Execution Bots',
    desc: 'Configurable bots execute on your edge — budget, confidence floor, categories, venues. Auto or signal-only. Full audit trail.',
    metric: '24/7 execution',
  },
  {
    icon: 'lightning' as const,
    title: 'Real-time Stream',
    desc: 'WebSocket feed of every signal as it fires. Plug into the terminal, build your own alerts, or wire it into your own systems.',
    metric: '<60ms latency',
  },
  {
    icon: 'shield' as const,
    title: 'Risk Controls',
    desc: 'Per-bot caps, per-market exposure limits, daily loss circuit breakers. Your edge stays sharp, your downside stays bounded.',
    metric: 'Always on',
  },
];

export function Engine() {
  return (
    <section id="engine" className="relative py-24 sm:py-32 border-t border-ink/[0.06]">
      <div className="max-w-[1320px] mx-auto px-5 sm:px-8">
        {/* section header */}
        <div className="max-w-2xl mb-16 sm:mb-20">
          <div className="font-mono text-[11px] tracking-[0.18em] uppercase text-poly mb-4">
            ▸ The engine
          </div>
          <h2 className="text-[44px] sm:text-[56px] font-semibold tracking-tightest leading-[1.02] text-ink">
            Six systems working{' '}
            <span className="font-serif italic font-normal">in concert</span>.
          </h2>
          <p className="mt-5 text-[16px] sm:text-[17px] text-ink/60 leading-relaxed max-w-xl">
            Each module is best-in-class on its own. Together they compound into something no individual trader
            can match — a 24/7 intelligence layer over prediction markets.
          </p>
        </div>

        {/* grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-ink/[0.06] border border-ink/[0.06] rounded-2xl overflow-hidden">
          {features.map((f, i) => (
            <div
              key={f.title}
              className="bg-bone p-7 sm:p-8 group hover:bg-white transition-colors duration-300 relative"
            >
              <div className="flex items-start justify-between mb-6">
                <div className="w-11 h-11 rounded-xl bg-ink text-white flex items-center justify-center group-hover:bg-poly transition-colors duration-300">
                  <Icon name={f.icon} size={18} />
                </div>
                <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-ink/45">
                  0{i + 1}
                </span>
              </div>
              <h3 className="text-[19px] font-semibold tracking-tight text-ink mb-2">{f.title}</h3>
              <p className="text-[14px] leading-relaxed text-ink/60 mb-5">{f.desc}</p>
              <div className="font-mono text-[11px] tracking-[0.08em] uppercase text-poly font-medium">
                {f.metric}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
