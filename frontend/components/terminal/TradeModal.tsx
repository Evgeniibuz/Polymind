'use client';

import { useState, useEffect } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { positions } from '@/lib/api';
import { toast } from '@/components/ui/Toast';
import { fmtPrice, fmtUsd, fmtPct, cn } from '@/lib/utils';
import type { SignalWithMarket, MarketSummary, PositionSide } from '@/types/api';

interface Props {
  open: boolean;
  onClose: () => void;
  signal?: SignalWithMarket | null;
  market?: MarketSummary | null;
}

export function TradeModal({ open, onClose, signal, market: marketProp }: Props) {
  const market = marketProp || signal?.market || null;
  const suggested: PositionSide = signal?.direction === 'buy_no' ? 'no' : 'yes';
  const [side, setSide] = useState<PositionSide>(suggested);
  const [size, setSize] = useState<number>(100);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setSide(signal?.direction === 'buy_no' ? 'no' : 'yes');
      setSize(100);
    }
  }, [open, signal?.id]);

  if (!market) return null;

  const price = parseFloat(side === 'yes' ? market.yes_price : market.no_price);
  const shares = price > 0 ? size / price : 0;
  const payoutIfWin = shares; // 1.00 per share on win
  const profitIfWin = payoutIfWin - size;

  async function submit() {
    if (!market) return;
    if (size < 1) {
      toast.error('Size must be at least $1');
      return;
    }
    setBusy(true);
    try {
      await positions.open({ market_id: market.id, side, shares });
      toast.success(`Position opened · ${side.toUpperCase()} ${fmtUsd(size)}`);
      onClose();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to open position');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} size="md">
      <ModalHeader title="Open position" subtitle={market.venue.toUpperCase()} />
      <ModalBody>
        <div className="mb-5">
          <div className="text-[15px] font-medium text-ink leading-snug">{market.question}</div>
          {signal && (
            <div className="mt-3 p-3 rounded-lg bg-poly/[0.06] border border-poly/[0.18] text-[12.5px] text-ink/80 leading-relaxed">
              <div className="font-mono text-[10px] uppercase tracking-wider text-poly mb-1">▸ Signal reasoning</div>
              {signal.reasoning}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 mb-5">
          <button
            onClick={() => setSide('yes')}
            className={cn(
              'p-4 rounded-xl border text-left transition-all',
              side === 'yes'
                ? 'border-poly bg-poly/[0.06] ring-2 ring-poly/30'
                : 'border-line hover:border-ink/20'
            )}
          >
            <div className="font-mono text-[10px] uppercase tracking-wider text-ink/45 mb-1">YES</div>
            <div className="text-[20px] font-semibold tabular text-poly">{fmtPrice(market.yes_price)}</div>
          </button>
          <button
            onClick={() => setSide('no')}
            className={cn(
              'p-4 rounded-xl border text-left transition-all',
              side === 'no'
                ? 'border-ink bg-ink/[0.04] ring-2 ring-ink/20'
                : 'border-line hover:border-ink/20'
            )}
          >
            <div className="font-mono text-[10px] uppercase tracking-wider text-ink/45 mb-1">NO</div>
            <div className="text-[20px] font-semibold tabular text-ink">{fmtPrice(market.no_price)}</div>
          </button>
        </div>

        <div className="mb-4">
          <label className="font-mono text-[10.5px] uppercase tracking-wider text-ink/55 mb-2 block">
            Size (USD)
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/45">$</span>
            <input
              type="number"
              min="1"
              step="1"
              value={size}
              onChange={(e) => setSize(parseFloat(e.target.value) || 0)}
              className="w-full h-11 pl-7 pr-3 rounded-lg border border-line focus:border-poly focus:outline-none text-[15px] font-mono tabular bg-white"
            />
          </div>
          <div className="flex items-center gap-1.5 mt-2">
            {[25, 100, 500, 1000].map(v => (
              <button
                key={v}
                onClick={() => setSize(v)}
                className="px-2.5 py-1 rounded-md bg-ink/[0.04] hover:bg-ink/[0.08] font-mono text-[11px] text-ink/65"
              >
                ${v}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl bg-chalk/60 border border-line p-4 space-y-2">
          <Row label="Shares" value={shares.toFixed(2)} mono />
          <Row label="Payout if win" value={fmtUsd(payoutIfWin)} mono />
          <Row label="Profit if win" value={fmtUsd(profitIfWin, { sign: true })} mono positive />
          <Row label="Loss if wrong" value={fmtUsd(-size)} mono negative />
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="ghost" size="md" onClick={onClose} disabled={busy}>Cancel</Button>
        <Button variant="poly" size="md" onClick={submit} loading={busy}>
          Open {side.toUpperCase()} position <Icon name="arrow_right" size={14} />
        </Button>
      </ModalFooter>
    </Modal>
  );
}

function Row({ label, value, mono, positive, negative }: { label: string; value: string; mono?: boolean; positive?: boolean; negative?: boolean }) {
  return (
    <div className="flex items-center justify-between text-[13px]">
      <span className="text-ink/60">{label}</span>
      <span className={cn(mono && 'font-mono tabular', positive && 'text-positive font-semibold', negative && 'text-negative', !positive && !negative && 'text-ink font-medium')}>
        {value}
      </span>
    </div>
  );
}
