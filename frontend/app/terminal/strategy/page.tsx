'use client';

import { useState } from 'react';
import { Card, Badge } from '@/components/ui/Primitives';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { BotEditor } from '@/components/terminal/BotEditor';
import type { BotKind, Venue } from '@/types/api';

interface Template {
  id: string;
  name: string;
  kind: BotKind;
  tagline: string;
  description: string;
  estEdge: string;
  cadence: string;
  config: {
    budget_usd: number;
    min_confidence: number;
    min_edge: number;
    categories: string[];
    venues: Venue[];
    max_position_usd: number;
    auto_execute: boolean;
  };
}

const TEMPLATES: Template[] = [
  {
    id: 'election-whales',
    name: 'Election Whale Mirror',
    kind: 'whale_follower',
    tagline: 'Follow proven political traders',
    description: 'Mirrors the top 50 wallets by realized P&L in election markets. Position sizing scales with whale conviction.',
    estEdge: '+22% backtested',
    cadence: 'Triggers ~3–8x/day during election cycles',
    config: { budget_usd: 1000, min_confidence: 0.75, min_edge: 0.05, categories: ['politics'], venues: ['polymarket'], max_position_usd: 150, auto_execute: false },
  },
  {
    id: 'breaking-news',
    name: 'Breaking News Sniper',
    kind: 'event_scanner',
    tagline: 'First in, first out — news-driven',
    description: 'Listens for breaking news on X and Reuters feeds, enters within 30s of detection. Tight stop on momentum failure.',
    estEdge: '+18% avg per trade',
    cadence: 'Bursty — 0–15 trades/day',
    config: { budget_usd: 500, min_confidence: 0.8, min_edge: 0.12, categories: ['politics', 'crypto', 'economics'], venues: ['polymarket', 'kalshi'], max_position_usd: 100, auto_execute: false },
  },
  {
    id: 'crypto-mispricing',
    name: 'Crypto Mispricing',
    kind: 'mispricing',
    tagline: 'Probability engine vs market consensus',
    description: 'Trades when our derived probability for crypto markets diverges from market price by 15%+ with high model confidence.',
    estEdge: '+15% per opportunity',
    cadence: '2–6 setups per day',
    config: { budget_usd: 750, min_confidence: 0.7, min_edge: 0.15, categories: ['crypto'], venues: ['polymarket'], max_position_usd: 120, auto_execute: true },
  },
  {
    id: 'sports-fade',
    name: 'Sports Sentiment Fade',
    kind: 'event_scanner',
    tagline: 'Fade Reddit hype on game day',
    description: 'Detects extreme social sentiment swings on sports markets and takes the contrarian side when book stays sharp.',
    estEdge: '+12% steady',
    cadence: 'Game days only · 5–20 trades',
    config: { budget_usd: 400, min_confidence: 0.7, min_edge: 0.08, categories: ['sports'], venues: ['polymarket', 'kalshi'], max_position_usd: 75, auto_execute: false },
  },
  {
    id: 'macro-fed',
    name: 'Macro Fed Watcher',
    kind: 'news_arb',
    tagline: 'Rate decisions + Fed speeches',
    description: 'Monitors Fed-related news drops and FOMC member speeches, positions on rate-cut and inflation markets.',
    estEdge: '+24% on event days',
    cadence: '8–12 events / quarter',
    config: { budget_usd: 600, min_confidence: 0.8, min_edge: 0.1, categories: ['economics'], venues: ['polymarket', 'kalshi'], max_position_usd: 150, auto_execute: false },
  },
  {
    id: 'custom-blank',
    name: 'Custom strategy',
    kind: 'custom',
    tagline: 'Build from scratch',
    description: 'Define your own categories, edge floor, confidence threshold, and execution mode. Full control.',
    estEdge: '—',
    cadence: 'Configure to taste',
    config: { budget_usd: 500, min_confidence: 0.7, min_edge: 0.1, categories: [], venues: ['polymarket'], max_position_usd: 100, auto_execute: false },
  },
];

export default function StrategyPage() {
  const [picked, setPicked] = useState<Template | null>(null);

  return (
    <div className="max-w-[1320px] mx-auto px-5 sm:px-8 py-7 sm:py-10 space-y-6">
      <div>
        <div className="font-mono text-[10.5px] tracking-[0.18em] uppercase text-ink/45 mb-2">
          ▸ Terminal · strategy library
        </div>
        <h1 className="text-[34px] sm:text-[42px] font-semibold tracking-tightest leading-[1.05]">
          Strategy library
        </h1>
        <p className="text-[14px] text-ink/55 mt-2 max-w-2xl">
          Pre-tuned templates. Pick one, review the config, deploy in one click.
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        {TEMPLATES.map(t => (
          <Card key={t.id} className="p-5 group hover:-translate-y-1 transition-transform">
            <div className="flex items-start justify-between mb-3">
              <Badge variant="poly">{t.kind.replace(/_/g, ' ')}</Badge>
              <span className="font-mono text-[10.5px] text-positive tabular">{t.estEdge}</span>
            </div>
            <h3 className="text-[17px] font-semibold tracking-tight mb-1">{t.name}</h3>
            <div className="text-[12px] text-ink/55 mb-3">{t.tagline}</div>
            <p className="text-[13px] text-ink/70 leading-relaxed mb-4 min-h-[60px]">{t.description}</p>
            <div className="font-mono text-[10.5px] text-ink/45 uppercase tracking-wider mb-4">{t.cadence}</div>
            <Button variant="ink" size="sm" fullWidth onClick={() => setPicked(t)}>
              Deploy template <Icon name="arrow_right" size={13} />
            </Button>
          </Card>
        ))}
      </div>

      {picked && (
        <BotEditor
          open={!!picked}
          onClose={() => setPicked(null)}
          bot={{
            id: '',
            user_id: '',
            name: picked.name,
            status: 'idle',
            config: { kind: picked.kind, ...picked.config },
            pnl_total: '0',
            pnl_24h: '0',
            trades_total: 0,
            win_rate: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }}
          onSaved={() => setPicked(null)}
        />
      )}
    </div>
  );
}
