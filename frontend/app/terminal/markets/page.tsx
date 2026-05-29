'use client';

import { useState, useMemo } from 'react';
import useSWR from 'swr';
import { markets } from '@/lib/api';
import { Card, Skeleton, EmptyState, ErrorState, Badge } from '@/components/ui/Primitives';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { fmtNum, fmtPrice, fmtUsd, timeUntil, cn } from '@/lib/utils';
import { TradeModal } from '@/components/terminal/TradeModal';
import type { MarketSummary, Venue } from '@/types/api';

type SortKey = 'volume' | 'liquidity' | 'ending';

export default function MarketsPage() {
  const [q, setQ] = useState('');
  const [venue, setVenue] = useState<'all' | Venue>('all');
  const [sortKey, setSortKey] = useState<SortKey>('volume');
  const [trading, setTrading] = useState<MarketSummary | null>(null);

  const { data, error, isLoading, mutate } = useSWR(
    ['markets', venue, q],
    () => markets.list({
      venue: venue === 'all' ? undefined : venue,
      q: q || undefined,
      limit: 100,
    }),
    { refreshInterval: 30000, keepPreviousData: true }
  );

  const sorted = useMemo(() => {
    if (!data) return [];
    const arr = [...data];
    if (sortKey === 'volume') {
      arr.sort((a, b) => parseFloat(b.volume_24h) - parseFloat(a.volume_24h));
    } else if (sortKey === 'liquidity') {
      arr.sort((a, b) => parseFloat(b.liquidity) - parseFloat(a.liquidity));
    } else {
      arr.sort((a, b) => {
        const ax = a.ends_at ? new Date(a.ends_at).getTime() : Infinity;
        const bx = b.ends_at ? new Date(b.ends_at).getTime() : Infinity;
        return ax - bx;
      });
    }
    return arr;
  }, [data, sortKey]);

  return (
    <div className="max-w-[1320px] mx-auto px-5 sm:px-8 py-7 sm:py-10 space-y-6">
      <div>
        <div className="font-mono text-[10.5px] tracking-[0.18em] uppercase text-ink/45 mb-2">
          ▸ Terminal · markets
        </div>
        <h1 className="text-[34px] sm:text-[42px] font-semibold tracking-tightest leading-[1.05]">
          Markets browser
        </h1>
        <p className="text-[14px] text-ink/55 mt-2 max-w-2xl">
          Every monitored market across Polymarket and Kalshi. Filter, sort, trade.
        </p>
      </div>

      {/* Filters */}
      <Card className="p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Icon name="search" size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/40" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search markets…"
            className="w-full h-10 pl-10 pr-3 rounded-lg border border-line focus:border-poly focus:outline-none text-[13.5px] bg-white"
          />
        </div>
        <div className="flex items-center gap-1.5">
          {(['all', 'polymarket', 'kalshi'] as const).map(v => (
            <button
              key={v}
              onClick={() => setVenue(v)}
              className={cn(
                'px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors capitalize',
                venue === v ? 'bg-ink text-white' : 'bg-ink/[0.04] text-ink/65 hover:bg-ink/[0.08]'
              )}
            >
              {v}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5 ml-auto">
          <span className="font-mono text-[10.5px] uppercase tracking-wider text-ink/45">Sort:</span>
          {(['volume', 'liquidity', 'ending'] as const).map(k => (
            <button
              key={k}
              onClick={() => setSortKey(k)}
              className={cn(
                'px-2.5 py-1.5 rounded-md text-[11.5px] font-medium transition-colors',
                sortKey === k ? 'bg-poly/10 text-poly' : 'text-ink/55 hover:bg-ink/[0.04]'
              )}
            >
              {k}
            </button>
          ))}
        </div>
      </Card>

      {error ? (
        <ErrorState error={error} onRetry={() => mutate()} />
      ) : isLoading && !data ? (
        <Card className="p-4 space-y-2">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-14" />)}
        </Card>
      ) : sorted.length === 0 ? (
        <EmptyState icon="search" title="No markets match" description="Try a different search or venue filter." />
      ) : (
        <Card className="overflow-hidden">
          <div className="hidden sm:grid grid-cols-[1fr_90px_90px_110px_110px_100px_100px] gap-3 px-5 py-3 border-b border-line font-mono text-[10px] uppercase tracking-wider text-ink/45">
            <div>Market</div>
            <div className="text-right">Yes</div>
            <div className="text-right">No</div>
            <div className="text-right">Volume 24h</div>
            <div className="text-right">Liquidity</div>
            <div className="text-right">Ends</div>
            <div></div>
          </div>
          {sorted.map(m => (
            <div key={m.id} className="grid grid-cols-[1fr_90px] sm:grid-cols-[1fr_90px_90px_110px_110px_100px_100px] gap-3 px-5 py-4 items-center border-b border-line last:border-b-0 hover:bg-chalk/40 transition-colors">
              <div className="min-w-0">
                <div className="text-[13.5px] font-medium text-ink leading-snug line-clamp-1">{m.question}</div>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="poly" className="!text-[9px] !py-0 !px-1.5">{m.venue}</Badge>
                  {m.category && (
                    <span className="font-mono text-[10px] text-ink/45 uppercase tracking-wider">{m.category}</span>
                  )}
                </div>
              </div>
              <div className="hidden sm:block font-mono text-[12.5px] tabular text-right text-poly font-semibold">{fmtPrice(m.yes_price)}</div>
              <div className="hidden sm:block font-mono text-[12.5px] tabular text-right text-ink">{fmtPrice(m.no_price)}</div>
              <div className="hidden sm:block font-mono text-[12.5px] tabular text-right">{fmtUsd(m.volume_24h, { compact: true })}</div>
              <div className="hidden sm:block font-mono text-[12.5px] tabular text-right text-ink/65">{fmtUsd(m.liquidity, { compact: true })}</div>
              <div className="hidden sm:block font-mono text-[11px] text-ink/45 text-right">{timeUntil(m.ends_at)}</div>
              <div className="flex justify-end">
                <Button variant="poly" size="sm" onClick={() => setTrading(m)}>
                  Trade
                </Button>
              </div>
            </div>
          ))}
        </Card>
      )}

      <TradeModal market={trading} open={!!trading} onClose={() => setTrading(null)} />
    </div>
  );
}
