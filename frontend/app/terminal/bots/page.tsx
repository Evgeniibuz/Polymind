'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { bots } from '@/lib/api';
import { Card, Skeleton, EmptyState, ErrorState, Badge } from '@/components/ui/Primitives';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';
import { fmtUsd, fmtPct, timeAgo, cn } from '@/lib/utils';
import { BotEditor } from '@/components/terminal/BotEditor';
import type { BotResponse } from '@/types/api';

export default function BotsPage() {
  const [editing, setEditing] = useState<BotResponse | null>(null);
  const [creating, setCreating] = useState(false);
  const { data, error, isLoading, mutate } = useSWR(
    'bots',
    () => bots.list(),
    { refreshInterval: 20000 }
  );

  async function togglePause(b: BotResponse) {
    const nextStatus = b.status === 'paused' ? 'running' : 'paused';
    try {
      await bots.update(b.id, { status: nextStatus });
      toast.success(`Bot ${nextStatus === 'paused' ? 'paused' : 'resumed'}`);
      mutate();
    } catch (e: any) {
      toast.error(e?.message || 'Update failed');
    }
  }

  async function remove(b: BotResponse) {
    if (!confirm(`Delete bot "${b.name}"? This cannot be undone.`)) return;
    try {
      await bots.delete(b.id);
      toast.success('Bot deleted');
      mutate();
    } catch (e: any) {
      toast.error(e?.message || 'Delete failed');
    }
  }

  return (
    <div className="max-w-[1320px] mx-auto px-5 sm:px-8 py-7 sm:py-10 space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="font-mono text-[10.5px] tracking-[0.18em] uppercase text-ink/45 mb-2">
            ▸ Terminal · bots
          </div>
          <h1 className="text-[34px] sm:text-[42px] font-semibold tracking-tightest leading-[1.05]">
            Execution bots
          </h1>
          <p className="text-[14px] text-ink/55 mt-2 max-w-2xl">
            Configure bots to act on signals automatically. Always within your risk caps.
          </p>
        </div>
        <Button variant="poly" size="md" onClick={() => setCreating(true)}>
          <Icon name="plus" size={14} /> New bot
        </Button>
      </div>

      {error ? (
        <ErrorState error={error} onRetry={() => mutate()} />
      ) : isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-2xl" />)}
        </div>
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon="bot"
          title="No bots yet"
          description="Deploy your first execution bot in 30 seconds."
          action={{ label: 'Create bot', onClick: () => setCreating(true) }}
        />
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {data.map(b => {
            const pnlTotal = parseFloat(b.pnl_total);
            const pnl24h = parseFloat(b.pnl_24h);
            return (
              <Card key={b.id} className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-[16px] font-semibold tracking-tight truncate">{b.name}</h3>
                      <StatusDot status={b.status} />
                    </div>
                    <div className="font-mono text-[10.5px] text-ink/45 uppercase tracking-wider">{b.config.kind}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => togglePause(b)}
                      className="w-7 h-7 rounded-md hover:bg-ink/[0.06] flex items-center justify-center text-ink/55"
                      title={b.status === 'paused' ? 'Resume' : 'Pause'}
                    >
                      <Icon name={b.status === 'paused' ? 'play' : 'pause'} size={12} />
                    </button>
                    <button
                      onClick={() => setEditing(b)}
                      className="w-7 h-7 rounded-md hover:bg-ink/[0.06] flex items-center justify-center text-ink/55"
                      title="Edit"
                    >
                      <Icon name="settings" size={12} />
                    </button>
                    <button
                      onClick={() => remove(b)}
                      className="w-7 h-7 rounded-md hover:bg-negative/10 hover:text-negative flex items-center justify-center text-ink/55"
                      title="Delete"
                    >
                      <Icon name="trash" size={12} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <div className="font-mono text-[9.5px] uppercase tracking-wider text-ink/45 mb-1">P&L 24h</div>
                    <div className={`text-[15px] font-semibold tabular ${pnl24h >= 0 ? 'text-positive' : 'text-negative'}`}>
                      {fmtUsd(pnl24h, { sign: true })}
                    </div>
                  </div>
                  <div>
                    <div className="font-mono text-[9.5px] uppercase tracking-wider text-ink/45 mb-1">Total P&L</div>
                    <div className={`text-[15px] font-semibold tabular ${pnlTotal >= 0 ? 'text-positive' : 'text-negative'}`}>
                      {fmtUsd(pnlTotal, { sign: true })}
                    </div>
                  </div>
                  <div>
                    <div className="font-mono text-[9.5px] uppercase tracking-wider text-ink/45 mb-1">Trades</div>
                    <div className="text-[14px] font-semibold tabular">{b.trades_total.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="font-mono text-[9.5px] uppercase tracking-wider text-ink/45 mb-1">Win rate</div>
                    <div className="text-[14px] font-semibold tabular">{fmtPct(b.win_rate)}</div>
                  </div>
                </div>

                <div className="pt-3 border-t border-line flex items-center justify-between font-mono text-[10.5px] text-ink/45">
                  <span>Budget {fmtUsd(b.config.budget_usd, { compact: true })}</span>
                  <span>Updated {timeAgo(b.updated_at)}</span>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <BotEditor
        open={creating || !!editing}
        onClose={() => { setCreating(false); setEditing(null); }}
        bot={editing}
        onSaved={() => mutate()}
      />
    </div>
  );
}

function StatusDot({ status }: { status: BotResponse['status'] }) {
  const map = {
    running: { color: 'bg-positive', label: 'Running' },
    idle: { color: 'bg-ink/30', label: 'Idle' },
    paused: { color: 'bg-amber-500', label: 'Paused' },
    error: { color: 'bg-negative', label: 'Error' },
  } as const;
  const m = map[status];
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-ink/[0.04]">
      <span className={cn('w-1.5 h-1.5 rounded-full', m.color)} />
      <span className="font-mono text-[9.5px] uppercase tracking-wider text-ink/65">{m.label}</span>
    </span>
  );
}
