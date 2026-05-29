'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { positions } from '@/lib/api';
import { Card, Skeleton, EmptyState, ErrorState, Badge } from '@/components/ui/Primitives';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';
import { fmtPrice, fmtUsd, timeAgo, cn } from '@/lib/utils';
import type { PositionWithMarket } from '@/types/api';

export default function PositionsPage() {
  const [tab, setTab] = useState<'open' | 'closed'>('open');
  const { data, error, isLoading, mutate } = useSWR(
    ['positions', tab],
    () => positions.list(tab),
    { refreshInterval: 15000 }
  );

  async function close(p: PositionWithMarket) {
    if (!confirm(`Close ${p.side.toUpperCase()} position on "${p.market.question.slice(0, 60)}…"?`)) return;
    try {
      await positions.close(p.id);
      toast.success('Position closed');
      mutate();
    } catch (e: any) {
      toast.error(e?.message || 'Close failed');
    }
  }

  return (
    <div className="max-w-[1320px] mx-auto px-5 sm:px-8 py-7 sm:py-10 space-y-6">
      <div>
        <div className="font-mono text-[10.5px] tracking-[0.18em] uppercase text-ink/45 mb-2">
          ▸ Terminal · positions
        </div>
        <h1 className="text-[34px] sm:text-[42px] font-semibold tracking-tightest leading-[1.05]">Positions</h1>
        <p className="text-[14px] text-ink/55 mt-2 max-w-2xl">
          Your open and closed positions across all markets and bots.
        </p>
      </div>

      <div className="flex items-center gap-2 border-b border-line">
        {(['open', 'closed'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'px-4 py-3 text-[13.5px] font-medium border-b-2 -mb-px transition-colors capitalize',
              tab === t ? 'border-poly text-ink' : 'border-transparent text-ink/55 hover:text-ink/80'
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {error ? (
        <ErrorState error={error} onRetry={() => mutate()} />
      ) : isLoading ? (
        <Card className="p-4 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14" />)}
        </Card>
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon="wallet"
          title={tab === 'open' ? 'No open positions' : 'No closed positions yet'}
          description={tab === 'open' ? 'Open a position from the signals or markets page.' : 'Closed positions will appear here.'}
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="hidden sm:grid grid-cols-[1fr_70px_90px_90px_90px_100px_100px_100px] gap-3 px-5 py-3 border-b border-line font-mono text-[10px] uppercase tracking-wider text-ink/45">
            <div>Market</div>
            <div className="text-right">Side</div>
            <div className="text-right">Shares</div>
            <div className="text-right">Entry</div>
            <div className="text-right">Current</div>
            <div className="text-right">P&L</div>
            <div className="text-right">{tab === 'open' ? 'Opened' : 'Closed'}</div>
            <div></div>
          </div>
          {data.map(p => {
            const pnl = parseFloat(p.pnl);
            return (
              <div key={p.id} className="grid grid-cols-[1fr_100px_100px] sm:grid-cols-[1fr_70px_90px_90px_90px_100px_100px_100px] gap-3 px-5 py-3.5 items-center border-b border-line last:border-b-0 hover:bg-chalk/40 transition-colors">
                <div className="min-w-0">
                  <div className="text-[13.5px] font-medium text-ink leading-snug line-clamp-1">{p.market.question}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="poly" className="!text-[9px] !py-0 !px-1.5">{p.market.venue}</Badge>
                    {p.bot_id && <span className="font-mono text-[10px] text-ink/45">bot</span>}
                  </div>
                </div>
                <div className={`hidden sm:block text-[12.5px] font-semibold text-right ${p.side === 'yes' ? 'text-poly' : 'text-ink'}`}>
                  {p.side.toUpperCase()}
                </div>
                <div className="hidden sm:block font-mono text-[12px] tabular text-right text-ink/75">{parseFloat(p.shares).toFixed(2)}</div>
                <div className="hidden sm:block font-mono text-[12px] tabular text-right">{fmtPrice(p.entry_price)}</div>
                <div className="hidden sm:block font-mono text-[12px] tabular text-right">{fmtPrice(p.exit_price || p.current_price)}</div>
                <div className={`font-mono text-[12.5px] tabular text-right font-semibold ${pnl >= 0 ? 'text-positive' : 'text-negative'}`}>
                  {fmtUsd(pnl, { sign: true })}
                </div>
                <div className="hidden sm:block font-mono text-[11px] text-ink/45 text-right">
                  {timeAgo(tab === 'closed' ? p.closed_at : p.opened_at)}
                </div>
                <div className="flex justify-end">
                  {tab === 'open' ? (
                    <Button variant="outline" size="sm" onClick={() => close(p)}>
                      Close
                    </Button>
                  ) : (
                    <span className="font-mono text-[10px] text-ink/45 uppercase tracking-wider">settled</span>
                  )}
                </div>
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}
