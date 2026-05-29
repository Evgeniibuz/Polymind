'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { markets } from '@/lib/api';
import { fmtNum, fmtPrice } from '@/lib/utils';
import { PixelMosaic } from './PixelMosaic';
import type { MarketSummary } from '@/types/api';

interface Props {
  onCta: () => void;
}

export function Hero({ onCta }: Props) {
  return (
    <section className="relative pt-32 sm:pt-40 pb-20 sm:pb-28 overflow-hidden">
      {/* Background pixel grid */}
      <div className="absolute inset-0 pixel-grid-lg opacity-60 pointer-events-none" />

      {/* Soft poly glow */}
      <div
        className="absolute top-20 right-[-20%] w-[600px] h-[600px] rounded-full pointer-events-none opacity-30"
        style={{
          background: 'radial-gradient(circle, rgba(45,156,219,0.4) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />

      <div className="relative max-w-[1320px] mx-auto px-5 sm:px-8">
        <div className="grid lg:grid-cols-[1fr_540px] gap-12 lg:gap-16 items-center">
          {/* ─────── LEFT: copy ─────── */}
          <div className="animate-fade-up">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-line shadow-sm mb-6">
              <span className="dot-live" />
              <span className="font-mono text-[11px] tracking-[0.12em] uppercase text-ink/65">
                Live · monitoring 12,400+ markets
              </span>
            </div>

            <h1 className="text-hero font-semibold tracking-tightest leading-[0.95] text-ink">
              The trading{' '}
              <span className="font-serif italic font-normal text-poly">terminal</span>{' '}
              <br className="hidden sm:block" />
              prediction markets{' '}
              <br className="hidden sm:block" />
              were waiting for.
            </h1>

            <p className="mt-7 text-[16.5px] sm:text-[18px] leading-[1.55] text-ink/65 max-w-[560px]">
              Polymind monitors every signal across X, Telegram, Reddit, news, and onchain — then surfaces
              mispricings on Polymarket and Kalshi before the odds move. Execute manually or let bots trade on
              your edge.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Button variant="poly" size="lg" onClick={onCta}>
                Start trading <Icon name="arrow_right" size={16} />
              </Button>
              <a
                href="#engine"
                className="inline-flex items-center gap-2 h-13 px-5 text-[14.5px] font-medium text-ink/75 hover:text-ink link-underline"
                style={{ height: '52px' }}
              >
                See how the engine works
              </a>
            </div>

            <div className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-3">
              <Stat label="Markets tracked" value="12.4K" />
              <Divider />
              <Stat label="Signals / 24h" value="2,180" />
              <Divider />
              <Stat label="Avg edge" value="+18.4%" highlight />
              <Divider />
              <Stat label="Whale wallets" value="1,920" />
            </div>
          </div>

          {/* ─────── RIGHT: pixel mosaic + live tile ─────── */}
          <div className="relative animate-fade-up" style={{ animationDelay: '120ms' }}>
            <PixelMosaic />
            <LiveMarketCard />
          </div>
        </div>
      </div>

      {/* Marquee with live markets */}
      <div className="mt-20 sm:mt-28 relative">
        <MarketsMarquee />
      </div>
    </section>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <div
        className={`text-[20px] font-semibold tabular leading-none ${highlight ? 'text-positive' : 'text-ink'}`}
      >
        {value}
      </div>
      <div className="font-mono text-[10px] tracking-[0.12em] uppercase text-ink/45 mt-1.5">{label}</div>
    </div>
  );
}

function Divider() {
  return <div className="hidden sm:block w-px h-8 bg-ink/[0.08]" />;
}

/* ───────────── live market card overlay ───────────── */
function LiveMarketCard() {
  const { data } = useSWR<MarketSummary[]>(
    'hero-top-markets',
    () => markets.list({ limit: 1 }),
    { refreshInterval: 12000, revalidateOnFocus: false, shouldRetryOnError: false }
  );
  const m = data?.[0];

  return (
    <div
      className="absolute -bottom-6 -left-6 sm:-left-10 w-[290px] card p-4 animate-fade-up"
      style={{ animationDelay: '320ms' }}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="dot-live" />
        <span className="font-mono text-[10px] tracking-[0.12em] uppercase text-ink/55">Live mispricing</span>
      </div>
      {m ? (
        <>
          <div className="text-[12.5px] font-medium text-ink leading-snug line-clamp-2 mb-3">
            {m.question}
          </div>
          <div className="flex items-end justify-between">
            <div>
              <div className="font-mono text-[10px] uppercase text-ink/45 tracking-wider mb-0.5">Model</div>
              <div className="text-[20px] font-semibold text-poly tabular">{fmtPrice(parseFloat(m.yes_price) * 1.18)}</div>
            </div>
            <div className="text-right">
              <div className="font-mono text-[10px] uppercase text-ink/45 tracking-wider mb-0.5">Market</div>
              <div className="text-[20px] font-semibold text-ink/60 tabular line-through decoration-1">{fmtPrice(m.yes_price)}</div>
            </div>
            <div className="text-right">
              <div className="font-mono text-[10px] uppercase text-ink/45 tracking-wider mb-0.5">Edge</div>
              <div className="text-[20px] font-semibold text-positive tabular">+18%</div>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="text-[12.5px] font-medium text-ink/40 leading-snug mb-3">
            Connecting to live market feed…
          </div>
          <div className="h-7 skeleton" />
        </>
      )}
    </div>
  );
}

/* ───────────── marquee of live markets ───────────── */
function MarketsMarquee() {
  const { data } = useSWR<MarketSummary[]>(
    'hero-marquee',
    () => markets.list({ limit: 18 }),
    { refreshInterval: 30000, revalidateOnFocus: false, shouldRetryOnError: false }
  );
  const items = data && data.length ? data : null;

  return (
    <div className="border-y border-line py-4 marquee-mask overflow-hidden bg-white/40">
      {items ? (
        <div className="flex gap-10 animate-marquee whitespace-nowrap w-max">
          {[...items, ...items].map((m, i) => (
            <div key={`${m.id}-${i}`} className="flex items-center gap-3 text-[12.5px]">
              <span className="font-mono text-[10px] uppercase tracking-wider text-ink/40">{m.venue}</span>
              <span className="font-medium text-ink truncate max-w-[300px]">{m.question}</span>
              <span className="font-mono tabular text-poly font-medium">{fmtPrice(m.yes_price)}</span>
              <span className="font-mono tabular text-ink/40">{fmtNum(parseFloat(m.volume_24h), true)}</span>
              <span className="text-ink/20">•</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex gap-10 px-8 opacity-50">
          <span className="font-mono text-[11px] text-ink/40">Awaiting backend connection — set NEXT_PUBLIC_API_BASE_URL</span>
        </div>
      )}
    </div>
  );
}
