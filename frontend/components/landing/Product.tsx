'use client';

import { Icon } from '@/components/ui/Icon';

export function Product() {
  return (
    <section id="product" className="relative py-24 sm:py-32 bg-ink text-white overflow-hidden">
      {/* dark pixel grid */}
      <div
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(45,156,219,0.15) 0%, transparent 60%)',
          filter: 'blur(40px)',
        }}
      />

      <div className="relative max-w-[1320px] mx-auto px-5 sm:px-8">
        <div className="max-w-2xl mb-14">
          <div className="font-mono text-[11px] tracking-[0.18em] uppercase text-poly mb-4">▸ The terminal</div>
          <h2 className="text-[44px] sm:text-[56px] font-semibold tracking-tightest leading-[1.02]">
            A trading desk built for{' '}
            <span className="font-serif italic font-normal text-poly">event markets</span>.
          </h2>
        </div>

        {/* Mock-up terminal frame — pure design, not "data" */}
        <div className="relative rounded-2xl overflow-hidden border border-white/[0.08] bg-white/[0.02] backdrop-blur-xl">
          <div className="h-9 bg-white/[0.04] border-b border-white/[0.08] flex items-center px-4 gap-3">
            <div className="flex gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-white/15" />
              <span className="w-2.5 h-2.5 rounded-full bg-white/15" />
              <span className="w-2.5 h-2.5 rounded-full bg-white/15" />
            </div>
            <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-white/45">
              polymind ▸ signals · live stream
            </div>
            <div className="ml-auto flex items-center gap-2">
              <span className="dot-live" />
              <span className="font-mono text-[10px] text-white/60">connected</span>
            </div>
          </div>

          <div className="grid grid-cols-[200px_1fr] min-h-[420px]">
            {/* sidebar */}
            <div className="border-r border-white/[0.06] p-4 space-y-1.5">
              {[
                { i: 'pulse', l: 'Signals', active: true },
                { i: 'spread', l: 'Mispricing' },
                { i: 'whale', l: 'Whales' },
                { i: 'bot', l: 'Bots' },
                { i: 'chart', l: 'Markets' },
                { i: 'wallet', l: 'Positions' },
                { i: 'book', l: 'Strategies' },
              ].map(it => (
                <div
                  key={it.l}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] ${
                    it.active ? 'bg-poly/15 text-poly border border-poly/25' : 'text-white/55'
                  }`}
                >
                  <Icon name={it.i as any} size={14} />
                  {it.l}
                </div>
              ))}
            </div>

            {/* main content — design preview */}
            <div className="p-5">
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  { l: 'Markets · 24h', v: '12,409' },
                  { l: 'Signals · 24h', v: '2,184' },
                  { l: 'Avg edge', v: '+18.4%' },
                ].map(s => (
                  <div key={s.l} className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-3.5">
                    <div className="font-mono text-[9.5px] uppercase tracking-wider text-white/40 mb-1">
                      {s.l}
                    </div>
                    <div className="text-[20px] font-semibold tabular">{s.v}</div>
                  </div>
                ))}
              </div>

              <div className="space-y-1.5">
                {[
                  { src: 'X', t: 'Fed minutes leak suggests 50bp cut', e: '+22%', c: '91' },
                  { src: 'Onchain', t: 'Whale 0x7a…f3 buys $480k YES on BTC-200k', e: '+14%', c: '87' },
                  { src: 'Telegram', t: 'Insider chatter on Q3 earnings beat', e: '+19%', c: '82' },
                  { src: 'News', t: 'Polling shift in PA reduces D odds', e: '−11%', c: '79' },
                  { src: 'Reddit', t: 'Sentiment spike on UFC 312 main card', e: '+8%', c: '74' },
                ].map((r, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-[80px_1fr_60px_50px] items-center px-3 py-2.5 rounded-md hover:bg-white/[0.04] transition-colors"
                  >
                    <span className="font-mono text-[10px] uppercase tracking-wider text-poly">{r.src}</span>
                    <span className="text-[13px] text-white/85 truncate">{r.t}</span>
                    <span className={`font-mono text-[12px] tabular text-right ${r.e.startsWith('+') ? 'text-positive' : 'text-negative'}`}>
                      {r.e}
                    </span>
                    <span className="font-mono text-[11px] tabular text-white/45 text-right">{r.c}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.12em] text-white/35 text-center">
          ↑ Preview frame · the live terminal renders real signals from the connected backend
        </p>
      </div>
    </section>
  );
}
