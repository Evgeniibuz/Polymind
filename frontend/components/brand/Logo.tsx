// ===================================================================
// Polymind brand — wordmark + mark
// ────────────────────────────────────────────────────────────────────
// The mark is a pixel-tessellated "P" — distinct, memorable,
// poly-colored. Inspired by data grids + Polymarket blue.
// ===================================================================

import { cn } from '@/lib/utils';

interface MarkProps {
  size?: number;
  className?: string;
  monochrome?: boolean;
}

/* Pixel "P" mark — 8x8 grid of solid blocks */
export function PolymindMark({ size = 32, className, monochrome = false }: MarkProps) {
  const cell = size / 8;
  // 1 = filled, 0 = empty
  const grid = [
    [1, 1, 1, 1, 1, 1, 0, 0],
    [1, 1, 0, 0, 1, 1, 1, 0],
    [1, 1, 0, 0, 0, 1, 1, 0],
    [1, 1, 0, 0, 1, 1, 1, 0],
    [1, 1, 1, 1, 1, 1, 0, 0],
    [1, 1, 0, 0, 0, 0, 0, 0],
    [1, 1, 0, 0, 0, 0, 0, 0],
    [1, 1, 0, 0, 0, 0, 0, 0],
  ];

  const primary = monochrome ? 'currentColor' : '#2D9CDB';
  const accent = monochrome ? 'currentColor' : '#1B7CB8';

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={cn('shrink-0', className)}
      aria-label="Polymind"
    >
      {grid.map((row, y) =>
        row.map((c, x) => {
          if (!c) return null;
          // accent on the loop interior corner cells
          const isAccent = (y === 1 && x === 4) || (y === 3 && x === 4) || (y === 4 && x === 5);
          return (
            <rect
              key={`${x}-${y}`}
              x={x * cell}
              y={y * cell}
              width={cell}
              height={cell}
              fill={isAccent ? accent : primary}
              shapeRendering="crispEdges"
            />
          );
        })
      )}
    </svg>
  );
}

interface LogoProps {
  size?: number;
  className?: string;
  variant?: 'default' | 'mono-dark' | 'mono-light';
  showMark?: boolean;
}

export function PolymindLogo({ size = 28, className, variant = 'default', showMark = true }: LogoProps) {
  const wordmarkColor = variant === 'mono-light' ? '#FFFFFF' : '#0A0E1A';
  const monochrome = variant !== 'default';
  return (
    <div className={cn('flex items-center gap-2.5', className)} style={{ height: size }}>
      {showMark && (
        <PolymindMark size={size} monochrome={monochrome}
          className={variant === 'mono-light' ? 'text-white' : variant === 'mono-dark' ? 'text-ink' : ''}
        />
      )}
      <span
        className="font-sans font-semibold tracking-tightest"
        style={{
          color: wordmarkColor,
          fontSize: size * 0.72,
          letterSpacing: '-0.035em',
          lineHeight: 1,
        }}
      >
        Polymind
      </span>
    </div>
  );
}
