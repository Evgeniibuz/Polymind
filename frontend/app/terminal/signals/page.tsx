'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { signals, signalsStream } from '@/lib/api';
import { Card, Skeleton, EmptyState, ErrorState, Badge } from '@/components/ui/Primitives';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { fmtPct, fmtPrice, timeAgo, cn } from '@/lib/utils';
import { TradeModal } from '@/components/terminal/TradeModal';
import type { SignalWithMarket } from '@/types/api';

const SOURCES = ['all', 'twitter', 'telegram', 'reddit', 'news', 'onchain'] as const;

export default function SignalsPage() {
  const [source, setSource] = useState<(typeof SOURCES)[number]>('all');
  const [minConf, setMinConf] = useState(0.6);
  const [live, setLive] = useState<SignalWithMarket[]>([]);
  const [tradingMarket, setTradingMarket] = useState<SignalWithMarket | null>(null);

  const { data, error, isLoading, mutate } = useSWR(
    ['signals', source, minConf],
    () => signals.list({
      source: source === 'all' ? undefined : source,
      min_confidence: minConf,
      limit: 50,
    }),
    { refreshInterval: 15000 }
  );

  // Real-time WebSocket stream
  useEffect(() => {
    const stop = signalsStream((s) => {
      setLive(prev => {
        if (prev.some(x => x.id === s.id)) return prev;
        return [s, ...prev].slice(0, 30);
      });
    });
    return stop;
  }, []);

  // Merge live ahead of fetched
  const merged: SignalWithMarket[] = [
    ...live.filter(l => !data?.some(d => d.id === l.id)),
    ...(data || []),
  ];

  return (
    <div className="max-w-[1320px] mx-auto px-5 sm:px-8 py-7 sm:py-10 space-y-6">
      <div>
        <div className="font-mono text-[10.5px] tracking-[0.18em] uppercase text-ink/45 mb-2">
          ▸ Terminal · signals
        </div>
        <h1 className="text-[34px] sm:text-[42px] font-semibold tracking-tightest leading-[1.05]">Signal stream</h1>
        <p className="text-[14px] text-ink/55 mt-2 max-w-2xl">
          Live feed of mispricing signals across all monitored sources. WebSocket-streamed in real time.
        </p>
      </div>

      {/* Filters */}
      <Card className="p-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-1.5 flex-wrap">
          {SOURCES.map(s => (
            <button
              key={s}
              onClick={() => setSource(s)}
              className={cn(
                'px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors',
                source === s ? 'bg-ink text-white' : 'bg-ink/[0.04] text-ink/65 hover:bg-ink/[0.08]'
              )}
            >
              {s === 'all' ? 'All sources' : s}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-3">
          <label className="font-mono text-[10.5px] uppercase tracking-wider text-ink/55">Min confidence</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={minConf}
            onChange={(e) => setMinConf(parseFloat(e.target.value))}
            className="w-32 accent-poly"
          />
          <span className="font-mono text-[12px] tabular w-10 text-ink/75">{(minConf * 100).toFixed(0)}%</span>
        </div>
      </Card>

      {/* List */}
      {error ? (
        <ErrorState error={error} onRetry={() => mutate()} />
      ) : isLoading && merged.length === 0 ? (
        <Card className="p-4 space-y-2">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
        </Card>
      ) : merged.length === 0 ? (
        <EmptyState
          icon="radar"
          title="No signals match your filters"
          description="Loosen the confidence threshold or switch sources to see more."
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="hidden sm:grid grid-cols-[80px_1fr_90px_100px_90px_120px_120px] gap-3 px-5 py-3 border-b border-line font-mono text-[10px] uppercase tracking-wider text-ink/45">
            <div>Source</div>
            <div>Market</div>
            <div className="text-right">Yes</div>
            <div className="text-right">Edge</div>
            <div className="text-right">Conf</div>
            <div className="text-right">When</div>
            <div></div>
          </div>
          {merged.map((s, i) => (
            <div
              key={s.id}
              className={cn(
                'grid grid-cols-[80px_1fr_120px] sm:grid-cols-[80px_1fr_90px_100px_90px_120px_120px] gap-3 px-5 py-4 items-center border-b border-line last:border-b-0 hover:bg-chalk/40 transition-colors',
                i === 0 && live[0]?.id === s.id && 'animate-tick bg-poly/[0.04]'
              )}
            >
              <Badge variant="poly" className="!text-[9.5px] !py-0.5 !px-2 w-fit">{s.source}</Badge>
              <div className="min-w-0">
                <div className="text-[13.5px] font-medium text-ink leading-snug truncate">{s.market.question}</div>
                <div className="font-mono text-[10.5px] text-ink/45 mt-0.5 line-clamp-1 sm:hidden">
                  {fmtPct(s.edge, { sign: true })} edge · {(s.confidence * 100).toFixed(0)}% conf · {timeAgo(s.created_at)}
                </div>
              </div>
              <div className="hidden sm:block font-mono text-[12.5px] tabular text-right text-ink">{fmtPrice(s.market.yes_price)}</div>
              <div className={`hidden sm:block font-mono text-[12.5px] tabular text-right font-semibold ${s.edge > 0 ? 'text-positive' : 'text-negative'}`}>
                {fmtPct(s.edge, { sign: true })}
              </div>
              <div className="hidden sm:block font-mono text-[12.5px] tabular text-right text-ink/65">{(s.confidence * 100).toFixed(0)}%</div>
              <div className="hidden sm:block font-mono text-[11px] text-ink/45 text-right">{timeAgo(s.created_at)}</div>
              <div className="flex justify-end">
                <Button variant="poly" size="sm" onClick={() => setTradingMarket(s)}>
                  Trade
                </Button>
              </div>
            </div>
          ))}
        </Card>
      )}

      <TradeModal
        signal={tradingMarket}
        open={!!tradingMarket}
        onClose={() => setTradingMarket(null)}
      />
    </div>
  );
}
