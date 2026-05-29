'use client';

import { useEffect, useState } from 'react';

/**
 * PixelMosaic — signature hero visual.
 *
 * A 32×32 grid where each cell represents a market probability.
 * Cells are colored on a YES↔NO scale (poly blue ↔ ink) and gently
 * shift over time, simulating a live "probability heatmap".
 *
 * Deterministic (seeded) so the initial frame is identical for SSR
 * and CSR, then animates client-side only.
 */

const COLS = 32;
const ROWS = 32;

// Simple mulberry32 prng — deterministic
function prng(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeInitial(seed: number): number[] {
  const r = prng(seed);
  const arr = new Array(COLS * ROWS);
  for (let i = 0; i < arr.length; i++) {
    // bias toward middle (most probabilities are 0.3–0.7 range)
    const v = (r() + r() + r()) / 3;
    arr[i] = v;
  }
  return arr;
}

// Mix between ink (0a0e1a) and poly blue (2d9cdb) with a soft fade toward white
function colorFor(v: number): string {
  // v ∈ [0, 1]. Below 0.5 → fade to chalk; above → poly intensity
  if (v < 0.18) return '#F4F4EF'; // chalk
  if (v < 0.32) return '#E5E5DF'; // line
  if (v < 0.46) return 'rgba(45, 156, 219, 0.25)';
  if (v < 0.6) return 'rgba(45, 156, 219, 0.55)';
  if (v < 0.74) return 'rgba(45, 156, 219, 0.85)';
  if (v < 0.88) return '#2D9CDB';
  return '#1B7CB8';
}

export function PixelMosaic() {
  const [grid, setGrid] = useState<number[]>(() => makeInitial(42));
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // gently mutate ~12 cells every 380ms — feels alive but never noisy
    const r = prng(Date.now() & 0xffff);
    const id = setInterval(() => {
      setGrid(prev => {
        const next = prev.slice();
        const mutations = 12;
        for (let i = 0; i < mutations; i++) {
          const idx = Math.floor(r() * next.length);
          // small drift, mostly toward mean
          const drift = (r() - 0.5) * 0.18;
          next[idx] = Math.max(0, Math.min(1, next[idx] + drift));
        }
        return next;
      });
    }, 380);
    return () => clearInterval(id);
  }, []);

  const cell = 14; // px

  return (
    <div className="relative">
      {/* ─── frame chrome ─── */}
      <div
        className="relative card overflow-hidden"
        style={{ width: cell * COLS, height: cell * ROWS, maxWidth: '100%' }}
      >
        {/* header bar */}
        <div className="absolute top-0 inset-x-0 h-8 bg-white border-b border-line flex items-center px-3 z-10">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-ink/[0.12]" />
            <span className="w-2.5 h-2.5 rounded-full bg-ink/[0.12]" />
            <span className="w-2.5 h-2.5 rounded-full bg-ink/[0.12]" />
          </div>
          <div className="flex-1 text-center font-mono text-[10px] tracking-[0.12em] uppercase text-ink/50">
            polymind ▸ probability heatmap
          </div>
          <div className="flex items-center gap-1.5">
            <span className="dot-live" />
            <span className="font-mono text-[10px] text-ink/50">LIVE</span>
          </div>
        </div>

        {/* pixel canvas */}
        <svg
          width={cell * COLS}
          height={cell * ROWS - 32}
          viewBox={`0 0 ${cell * COLS} ${cell * ROWS - 32}`}
          className="block absolute top-8 left-0"
          style={{ width: '100%' }}
        >
          {grid.map((v, i) => {
            const x = (i % COLS) * cell;
            const y = Math.floor(i / COLS) * cell;
            if (y >= cell * ROWS - 32) return null;
            return (
              <rect
                key={i}
                x={x}
                y={y}
                width={cell - 1}
                height={cell - 1}
                fill={colorFor(v)}
                shapeRendering="crispEdges"
                style={{
                  transition: mounted ? 'fill 400ms ease' : undefined,
                }}
              />
            );
          })}
        </svg>
      </div>

      {/* ─── floating label badges (premium award detail) ─── */}
      <div className="absolute top-14 -right-3 sm:-right-6 card px-3 py-2.5 animate-fade-up shadow-card"
           style={{ animationDelay: '220ms' }}>
        <div className="font-mono text-[9.5px] uppercase tracking-wider text-ink/50 mb-0.5">Signal</div>
        <div className="text-[12px] font-semibold text-ink">News break · 12h lead</div>
      </div>

      <div className="absolute top-44 -left-3 sm:-left-6 card px-3 py-2.5 animate-fade-up shadow-card"
           style={{ animationDelay: '380ms' }}>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-poly rounded-sm" />
          <div>
            <div className="font-mono text-[9.5px] uppercase tracking-wider text-ink/50">Whale</div>
            <div className="text-[12px] font-semibold text-ink tabular">+$240k YES</div>
          </div>
        </div>
      </div>
    </div>
  );
}
