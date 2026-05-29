'use client';

import useSWR from 'swr';
import { analytics } from '@/lib/api';
import { Card, Skeleton, EmptyState, ErrorState, Badge } from '@/components/ui/Primitives';
import { Icon } from '@/components/ui/Icon';
import { fmtPct, fmtPrice, fmtUsd, timeUntil } from '@/lib/utils';

export default function MispricingPage() {
  const { data, error, isLoading, mutate } = useSWR(
    'arbitrage',
    () => analytics.arbitrage(),
    { refreshInterval: 30000 }
  );

  return (
    <div className="max-w-[1320px] mx-auto px-5 sm:px-8 py-7 sm:py-10 space-y-6">
      <div>
        <div className="font-mono text-[10.5px] tracking-[0.18em] uppercase text-ink/45 mb-2">
          ▸ Terminal · mispricing
        </div>
        <h1 className="text-[34px] sm:text-[42px] font-semibold tracking-tightest leading-[1.05]">
          Cross-venue arbitrage
        </h1>
        <p className="text-[14px] text-ink/55 mt-2 max-w-2xl">
          Same-question markets priced differently across Polymarket and Kalshi. Lock in the spread.
        </p>
      </div>

      {error ? (
        <ErrorState error={error} onRetry={() => mutate()} />
      ) : isLoading ? (
        <Card className="p-4 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
        </Card>
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon="spread"
          title="No arbitrage opportunities right now"
          description="Spreads tighten and widen continuously. The scanner will surface new opportunities as they emerge."
        />
      ) : (
        <div className="space-y-3">
          {data.map(opp => (
            <Card key={opp.id} className="p-5">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-semibold text-ink leading-snug mb-1.5">{opp.market_a.question}</div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="poly">{opp.market_a.venue}</Badge>
                    <Icon name="arrow_right" size={12} className="text-ink/30" />
                    <Badge variant="default">{opp.market_b.venue}</Badge>
                    {opp.expires_at && (
                      <span className="font-mono text-[10px] text-ink/45 uppercase tracking-wider">
                        · expires in {timeUntil(opp.expires_at)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[28px] font-semibold tabular text-positive leading-none">
                    {fmtPct(opp.edge_pct / 100, { sign: true })}
                  </div>
                  <div className="font-mono text-[10px] uppercase tracking-wider text-ink/45 mt-1">Edge</div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-line">
                <Stat label={`${opp.market_a.venue} YES`} value={fmtPrice(opp.market_a.yes_price)} />
                <Stat label={`${opp.market_b.venue} YES`} value={fmtPrice(opp.market_b.yes_price)} />
                <Stat label="Capital needed" value={fmtUsd(opp.required_capital_usd, { compact: true })} />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-wider text-ink/45 mb-1">{label}</div>
      <div className="text-[16px] font-semibold tabular">{value}</div>
    </div>
  );
}
