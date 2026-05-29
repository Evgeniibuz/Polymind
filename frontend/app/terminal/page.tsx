'use client';

import useSWR from 'swr';
import Link from 'next/link';
import { analytics, signals, whales, markets } from '@/lib/api';
import { Icon } from '@/components/ui/Icon';
import { Card, Skeleton, ErrorState, EmptyState, Badge } from '@/components/ui/Primitives';
import { fmtNum, fmtPct, fmtPrice, fmtUsd, timeAgo } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

export default function OverviewPage() {
  const stats = useSWR('overview-stats', () => analytics.dashboardStats(), { refreshInterval: 20000 });
  const portfolio = useSWR('overview-portfolio', () => analytics.portfolio(), { refreshInterval: 20000 });
  const topSignals = useSWR('overview-signals', () => signals.list({ limit: 6 }), { refreshInterval: 12000 });
  const recentWhales = useSWR('overview-whales', () => whales.recent(6), { refreshInterval: 20000 });

  return (
    <div className="max-w-[1320px] mx-auto px-5 sm:px-8 py-7 sm:py-10 space-y-8">
      {/* Page header */}
      <div>
        <div className="font-mono text-[10.5px] tracking-[0.18em] uppercase text-ink/45 mb-2">
          ▸ Terminal · overview
        </div>
        <h1 className="text-[34px] sm:text-[42px] font-semibold tracking-tightest leading-[1.05]">
          Today's intelligence
        </h1>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatTile
          label="Markets tracked"
          value={stats.data?.markets_tracked}
          loading={stats.isLoading}
          formatter={(v) => fmtNum(v, true)}
        />
        <StatTile
          label="Signals · 24h"
          value={stats.data?.signals_24h}
          loading={stats.isLoading}
          formatter={(v) => fmtNum(v)}
        />
        <StatTile
          label="Active bots"
          value={stats.data?.active_bots}
          loading={stats.isLoading}
          formatter={(v) => fmtNum(v)}
        />
        <StatTile
          label="Whales watched"
          value={stats.data?.whales_tracked}
          loading={stats.isLoading}
          formatter={(v) => fmtNum(v, true)}
        />
        <StatTile
          label="Volume · 24h"
          value={stats.data?.total_volume_24h_usd}
          loading={stats.isLoading}
          formatter={(v) => fmtUsd(v, { compact: true })}
        />
      </div>

      {/* Portfolio bar */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="font-mono text-[10.5px] tracking-[0.12em] uppercase text-ink/45 mb-1">
              Your portfolio
            </div>
            <h2 className="text-[20px] font-semibold tracking-tight">Performance</h2>
          </div>
          <Link href="/terminal/positions">
            <Button variant="ghost" size="sm">
              All positions <Icon name="arrow_right" size={13} />
            </Button>
          </Link>
        </div>
        {portfolio.error ? (
          <ErrorState error={portfolio.error} onRetry={() => portfolio.mutate()} />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            <Metric
              label="Equity"
              value={portfolio.data?.equity_usd}
              loading={portfolio.isLoading}
              formatter={(v) => fmtUsd(v)}
            />
            <Metric
              label="P&L · 24h"
              value={portfolio.data?.pnl_24h_usd}
              loading={portfolio.isLoading}
              formatter={(v) => fmtUsd(v, { sign: true })}
              colored
            />
            <Metric
              label="P&L · total"
              value={portfolio.data?.pnl_total_usd}
              loading={portfolio.isLoading}
              formatter={(v) => fmtUsd(v, { sign: true })}
              colored
            />
            <Metric
              label="Win rate"
              value={portfolio.data?.win_rate}
              loading={portfolio.isLoading}
              formatter={(v) => fmtPct(v)}
            />
          </div>
        )}
      </Card>

      {/* Signals + Whales */}
      <div className="grid lg:grid-cols-2 gap-5">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <div className="font-mono text-[10.5px] tracking-[0.12em] uppercase text-ink/45 mb-1">
                Top signals
              </div>
              <h2 className="text-[18px] font-semibold tracking-tight">Latest highest-confidence</h2>
            </div>
            <Link href="/terminal/signals">
              <Button variant="ghost" size="sm">
                Stream <Icon name="arrow_right" size={13} />
              </Button>
            </Link>
          </div>
          {topSignals.error ? (
            <ErrorState error={topSignals.error} onRetry={() => topSignals.mutate()} />
          ) : topSignals.isLoading ? (
            <div className="space-y-2.5">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
          ) : topSignals.data && topSignals.data.length > 0 ? (
            <div className="divide-y divide-line">
              {topSignals.data.slice(0, 6).map(s => (
                <div key={s.id} className="py-3 first:pt-0 last:pb-0 flex items-start gap-3">
                  <Badge variant="poly" className="!text-[9px] !py-0.5 !px-2 shrink-0 mt-0.5">{s.source}</Badge>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium text-ink leading-snug truncate">{s.market.question}</div>
                    <div className="font-mono text-[10.5px] text-ink/45 mt-0.5">{timeAgo(s.created_at)}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className={`text-[13px] font-semibold tabular ${s.edge > 0 ? 'text-positive' : 'text-negative'}`}>
                      {fmtPct(s.edge, { sign: true })}
                    </div>
                    <div className="font-mono text-[10px] text-ink/45 tabular">{(s.confidence * 100).toFixed(0)}%</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon="radar" title="No signals yet" description="The scanner is monitoring the feed. Signals will appear here as they fire." />
          )}
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <div className="font-mono text-[10.5px] tracking-[0.12em] uppercase text-ink/45 mb-1">
                Whale activity
              </div>
              <h2 className="text-[18px] font-semibold tracking-tight">Recent large positions</h2>
            </div>
            <Link href="/terminal/whales">
              <Button variant="ghost" size="sm">
                All whales <Icon name="arrow_right" size={13} />
              </Button>
            </Link>
          </div>
          {recentWhales.error ? (
            <ErrorState error={recentWhales.error} onRetry={() => recentWhales.mutate()} />
          ) : recentWhales.isLoading ? (
            <div className="space-y-2.5">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
          ) : recentWhales.data && recentWhales.data.length > 0 ? (
            <div className="divide-y divide-line">
              {recentWhales.data.slice(0, 6).map((w, i) => (
                <div key={i} className="py-3 first:pt-0 last:pb-0 flex items-start gap-3">
                  <div className="w-7 h-7 rounded-md bg-ink/[0.06] flex items-center justify-center shrink-0 mt-0.5">
                    <Icon name="whale" size={13} className="text-ink/55" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium text-ink leading-snug truncate">{w.market.question}</div>
                    <div className="font-mono text-[10.5px] text-ink/45 mt-0.5">
                      {w.whale.display || w.whale.address.slice(0, 8) + '…'} · {timeAgo(w.opened_at)}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className={`text-[13px] font-semibold ${w.side === 'yes' ? 'text-poly' : 'text-ink'}`}>
                      {w.side.toUpperCase()}
                    </div>
                    <div className="font-mono text-[10.5px] text-ink/55 tabular">{fmtUsd(w.notional_usd, { compact: true })}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon="whale" title="No whale activity" description="No tracked whales have opened positions recently." />
          )}
        </Card>
      </div>
    </div>
  );
}

function StatTile({ label, value, loading, formatter }: { label: string; value?: number; loading: boolean; formatter: (v: number) => string }) {
  return (
    <Card className="p-4">
      <div className="font-mono text-[10px] tracking-[0.12em] uppercase text-ink/45 mb-2">{label}</div>
      {loading ? <Skeleton className="h-7 w-20" /> : (
        <div className="text-[22px] font-semibold tabular leading-none">
          {value !== undefined ? formatter(value) : '—'}
        </div>
      )}
    </Card>
  );
}

function Metric({ label, value, loading, formatter, colored }: { label: string; value?: number | string; loading: boolean; formatter: (v: number) => string; colored?: boolean }) {
  const n = value === undefined ? undefined : typeof value === 'string' ? parseFloat(value) : value;
  const color = colored && n !== undefined ? (n >= 0 ? 'text-positive' : 'text-negative') : 'text-ink';
  return (
    <div>
      <div className="font-mono text-[10px] tracking-[0.12em] uppercase text-ink/45 mb-2">{label}</div>
      {loading ? <Skeleton className="h-7 w-24" /> : (
        <div className={`text-[24px] font-semibold tabular leading-none ${color}`}>
          {n !== undefined && Number.isFinite(n) ? formatter(n) : '—'}
        </div>
      )}
    </div>
  );
}
