'use client';

import { useState, useEffect } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { bots } from '@/lib/api';
import { toast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';
import type { BotResponse, BotKind, Venue } from '@/types/api';

interface Props {
  open: boolean;
  onClose: () => void;
  bot?: BotResponse | null;
  onSaved: () => void;
}

const KIND_OPTIONS: { value: BotKind; label: string; desc: string }[] = [
  { value: 'event_scanner', label: 'Event Scanner', desc: 'Trades on breaking news + social signals' },
  { value: 'whale_follower', label: 'Whale Follower', desc: 'Mirrors high-win-rate Polymarket traders' },
  { value: 'mispricing', label: 'Mispricing Arb', desc: 'Trades when model edge exceeds threshold' },
  { value: 'news_arb', label: 'News Arb', desc: 'News-driven directional positions' },
  { value: 'custom', label: 'Custom', desc: 'Define your own rules later' },
];

const CATEGORY_OPTIONS = ['politics', 'sports', 'crypto', 'economics', 'pop_culture', 'tech', 'science'];

export function BotEditor({ open, onClose, bot, onSaved }: Props) {
  const isEdit = !!bot && !!bot.id;
  const [name, setName] = useState('');
  const [kind, setKind] = useState<BotKind>('event_scanner');
  const [budget, setBudget] = useState(500);
  const [minConfidence, setMinConfidence] = useState(0.7);
  const [minEdge, setMinEdge] = useState(0.1);
  const [maxPos, setMaxPos] = useState(100);
  const [categories, setCategories] = useState<string[]>(['politics', 'crypto']);
  const [venues, setVenues] = useState<Venue[]>(['polymarket']);
  const [autoExec, setAutoExec] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open && bot) {
      setName(bot.name);
      setKind(bot.config.kind);
      setBudget(bot.config.budget_usd);
      setMinConfidence(bot.config.min_confidence);
      setMinEdge(bot.config.min_edge);
      setMaxPos(bot.config.max_position_usd);
      setCategories(bot.config.categories);
      setVenues(bot.config.venues);
      setAutoExec(bot.config.auto_execute);
    } else if (open) {
      setName('');
      setKind('event_scanner');
      setBudget(500);
      setMinConfidence(0.7);
      setMinEdge(0.1);
      setMaxPos(100);
      setCategories(['politics', 'crypto']);
      setVenues(['polymarket']);
      setAutoExec(false);
    }
  }, [open, bot]);

  function toggleCategory(c: string) {
    setCategories(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);
  }

  function toggleVenue(v: Venue) {
    setVenues(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);
  }

  async function submit() {
    if (!name.trim()) {
      toast.error('Give your bot a name');
      return;
    }
    if (categories.length === 0) {
      toast.error('Pick at least one category');
      return;
    }
    if (venues.length === 0) {
      toast.error('Pick at least one venue');
      return;
    }

    const config = {
      kind,
      budget_usd: budget,
      min_confidence: minConfidence,
      min_edge: minEdge,
      categories,
      venues,
      max_position_usd: maxPos,
      auto_execute: autoExec,
    };

    setBusy(true);
    try {
      if (isEdit && bot) {
        await bots.update(bot.id, { name: name.trim(), config });
        toast.success('Bot updated');
      } else {
        await bots.create({ name: name.trim(), config });
        toast.success('Bot created');
      }
      onSaved();
      onClose();
    } catch (e: any) {
      toast.error(e?.message || 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} size="lg">
      <ModalHeader
        title={isEdit ? 'Edit bot' : 'Create bot'}
        subtitle={isEdit ? 'Adjust strategy parameters' : 'Configure your execution rules'}
      />
      <ModalBody className="!py-6">
        <div className="space-y-5">
          {/* Name */}
          <Field label="Bot name">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Election Whale Mirror"
              className="w-full h-11 px-3.5 rounded-lg border border-line focus:border-poly focus:outline-none text-[14px] bg-white"
            />
          </Field>

          {/* Strategy */}
          <Field label="Strategy kind">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {KIND_OPTIONS.map(k => (
                <button
                  key={k.value}
                  onClick={() => setKind(k.value)}
                  className={cn(
                    'text-left p-3 rounded-lg border transition-all',
                    kind === k.value
                      ? 'border-poly bg-poly/[0.06] ring-1 ring-poly/30'
                      : 'border-line hover:border-ink/20'
                  )}
                >
                  <div className="text-[13.5px] font-semibold">{k.label}</div>
                  <div className="text-[11.5px] text-ink/55 mt-0.5 leading-snug">{k.desc}</div>
                </button>
              ))}
            </div>
          </Field>

          {/* Numbers */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Budget (USD)">
              <NumberInput value={budget} onChange={setBudget} step={50} min={10} prefix="$" />
            </Field>
            <Field label="Max position (USD)">
              <NumberInput value={maxPos} onChange={setMaxPos} step={25} min={1} prefix="$" />
            </Field>
            <Field label={`Min confidence · ${(minConfidence * 100).toFixed(0)}%`}>
              <input
                type="range" min="0.5" max="0.95" step="0.05"
                value={minConfidence}
                onChange={(e) => setMinConfidence(parseFloat(e.target.value))}
                className="w-full accent-poly"
              />
            </Field>
            <Field label={`Min edge · ${(minEdge * 100).toFixed(0)}%`}>
              <input
                type="range" min="0.02" max="0.4" step="0.01"
                value={minEdge}
                onChange={(e) => setMinEdge(parseFloat(e.target.value))}
                className="w-full accent-poly"
              />
            </Field>
          </div>

          {/* Categories */}
          <Field label="Categories">
            <div className="flex flex-wrap gap-1.5">
              {CATEGORY_OPTIONS.map(c => (
                <button
                  key={c}
                  onClick={() => toggleCategory(c)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors',
                    categories.includes(c) ? 'bg-ink text-white' : 'bg-ink/[0.04] text-ink/65 hover:bg-ink/[0.08]'
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          </Field>

          {/* Venues */}
          <Field label="Venues">
            <div className="flex gap-2">
              {(['polymarket', 'kalshi'] as Venue[]).map(v => (
                <button
                  key={v}
                  onClick={() => toggleVenue(v)}
                  className={cn(
                    'flex-1 p-3 rounded-lg border transition-all capitalize text-[13.5px] font-medium',
                    venues.includes(v) ? 'border-poly bg-poly/[0.06] text-poly' : 'border-line text-ink/65 hover:border-ink/20'
                  )}
                >
                  {v}
                </button>
              ))}
            </div>
          </Field>

          {/* Auto-execute */}
          <div className="p-4 rounded-xl bg-chalk/60 border border-line flex items-center justify-between">
            <div>
              <div className="text-[13.5px] font-semibold text-ink">Auto-execute</div>
              <div className="text-[11.5px] text-ink/55 mt-0.5">If off, bot only emits alerts — you confirm trades manually</div>
            </div>
            <button
              onClick={() => setAutoExec(!autoExec)}
              className={cn(
                'relative w-11 h-6 rounded-full transition-colors',
                autoExec ? 'bg-poly' : 'bg-ink/15'
              )}
            >
              <span
                className={cn(
                  'absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-sm',
                  autoExec ? 'translate-x-[22px]' : 'translate-x-0.5'
                )}
              />
            </button>
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="ghost" size="md" onClick={onClose} disabled={busy}>Cancel</Button>
        <Button variant="poly" size="md" onClick={submit} loading={busy}>
          {isEdit ? 'Save changes' : 'Create bot'} <Icon name="arrow_right" size={14} />
        </Button>
      </ModalFooter>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="font-mono text-[10.5px] uppercase tracking-wider text-ink/55 mb-2 block">{label}</label>
      {children}
    </div>
  );
}

function NumberInput({ value, onChange, step = 1, min, prefix }: { value: number; onChange: (n: number) => void; step?: number; min?: number; prefix?: string }) {
  return (
    <div className="relative">
      {prefix && <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/45 text-[13.5px]">{prefix}</span>}
      <input
        type="number"
        min={min}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className={cn('w-full h-11 pr-3 rounded-lg border border-line focus:border-poly focus:outline-none text-[14px] font-mono tabular bg-white', prefix ? 'pl-7' : 'pl-3.5')}
      />
    </div>
  );
}
