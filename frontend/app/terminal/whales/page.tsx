'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { whales } from '@/lib/api';
import { Card, Skeleton, EmptyState, ErrorState, Badge } from '@/components/ui/Primitives';
import { Icon } from '@/components/ui/Icon';
import { fmtPct, fmtUsd, shortAddr, timeAgo, cn } from '@/lib/utils';

export default function WhalesPage() {
  const [tab, setTab] = useState<'top' | 'recent'>('top');

  return (
    <div className="max-w-[1320px] mx-auto px-5 sm:px-8 py-7 sm:py-10 space-y-6">
      <div>
        <div className="font-mono text-[10.5px] tracking-[0.18em] uppercase text-ink/45 mb-2">
          ▸ Terminal · whales
        </div>
        <h1 className="text-[34px] sm:text-[42px] font-semibold tracking-tightest leading-[1.05]">
          Whale tracker
        </h1>
        <p className="text-[14px] text-ink/55 mt-2 max-w-2xl">
          High-volume traders on Polymarket. Watch the smartest money in real time.
        </p>
      </div>

      <div className="flex items-center gap-2 border-b border-line">
        {(['top', 'recent'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'px-4 py-3 text-[13.5px] font-medium border-b-2 -mb-px transition-colors',
              tab === t ? 'border-poly text-ink' : 'border-transparent text-ink/55 hover:text-ink/80'
            )}
          >
            {t === 'top' ? 'Top whales' : 'Recent positions'}
          </button>
        ))}
      </div>

      {tab === 'top' ? <TopWhales /> : <RecentPositions />}
    </div>
  );
}

function TopWhales() {
  const { data, error, isLoading, mutate } = useSWR(
    'whales-top',
    () => whales.list(50),
    { refreshInterval: 60000 }
  );

  if (error) return <ErrorState error={error} onRetry={() => mutate()} />;
  if (isLoading) return <Card className="p-4 space-y-2">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</Card>;
  if (!data || data.length === 0) return <EmptyState icon="whale" title="No whales tracked yet" />;

  return (
    <Card className="overflow-hidden">
      <div className="hidden sm:grid grid-cols-[40px_1fr_120px_120px_100px_120px] gap-3 px-5 py-3 border-b border-line font-mono text-[10px] uppercase tracking-wider text-ink/45">
        <div>#</div>
        <div>Wallet</div>
        <div className="text-right">Volume</div>
        <div className="text-right">Realized P&L</div>
        <div className="text-right">Win rate</div>
        <div className="text-right">Last seen</div>
      </div>
      {data.map((w, i) => (
        <div key={w.address} className="grid grid-cols-[1fr_100px] sm:grid-cols-[40px_1fr_120px_120px_100px_120px] gap-3 px-5 py-3.5 items-center border-b border-line last:border-b-0 hover:bg-chalk/40 transition-colors">
          <div className="hidden sm:block font-mono text-[11px] text-ink/45 tabular">{i + 1}</div>
          <div className="min-w-0">
            <div className="text-[13.5px] font-medium text-ink truncate">{w.display || shortAddr(w.address)}</div>
            <div className="font-mono text-[10.5px] text-ink/45 truncate">{shortAddr(w.address)}</div>
          </div>
          <div className="hidden sm:block font-mono text-[12.5px] tabular text-right">{fmtUsd(w.total_volume_usd, { compact: true })}</div>
          <div className={`font-mono text-[12.5px] tabular text-right font-semibold ${parseFloat(w.realized_pnl_usd) > 0 ? 'text-positive' : 'text-negative'}`}>
            {fmtUsd(w.realized_pnl_usd, { compact: true, sign: true })}
          </div>
          <div className="hidden sm:block font-mono text-[12.5px] tabular text-right text-ink/65">{fmtPct(w.win_rate)}</div>
          <div className="hidden sm:block font-mono text-[11px] text-ink/45 text-right">{timeAgo(w.last_seen)}</div>
        </div>
      ))}
    </Card>
  );
}

function RecentPositions() {
  const { data, error, isLoading, mutate } = useSWR(
    'whales-recent',
    () => whales.recent(50),
    { refreshInterval: 30000 }
  );

  if (error) return <ErrorState error={error} onRetry={() => mutate()} />;
  if (isLoading) return <Card className="p-4 space-y-2">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</Card>;
  if (!data || data.length === 0) return <EmptyState icon="pulse" title="No recent whale positions" />;

  return (
    <Card className="overflow-hidden">
      {data.map((w, i) => (
        <div key={i} className="grid grid-cols-[1fr_80px_90px] sm:grid-cols-[1fr_120px_80px_100px_100px] gap-3 px-5 py-4 items-center border-b border-line last:border-b-0 hover:bg-chalk/40 transition-colors">
          <div className="min-w-0">
            <div className="text-[13.5px] font-medium text-ink truncate">{w.market.question}</div>
            <div className="font-mono text-[10.5px] text-ink/45 mt-0.5">{shortAddr(w.whale.address)}</div>
          </div>
          <div className="hidden sm:block font-mono text-[10.5px] text-ink/55 uppercase tracking-wider">{w.market.venue}</div>
          <div className={`text-[12.5px] font-semibold ${w.side === 'yes' ? 'text-poly' : 'text-ink'}`}>{w.side.toUpperCase()}</div>
          <div className="hidden sm:block font-mono text-[12.5px] tabular text-right">{fmtUsd(w.notional_usd, { compact: true })}</div>
          <div className="font-mono text-[11px] text-ink/45 text-right">{timeAgo(w.opened_at)}</div>
        </div>
      ))}
    </Card>
  );
}
