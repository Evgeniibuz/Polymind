'use client';

import { forwardRef, ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type Variant = 'poly' | 'ink' | 'ghost' | 'outline';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
}

const variantClass: Record<Variant, string> = {
  poly: 'btn-poly',
  ink: 'btn-ink',
  ghost: 'btn-ghost',
  outline: 'btn-outline',
};

const sizeClass: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-[13px]',
  md: 'h-11 px-5 text-[14px]',
  lg: 'h-13 px-7 text-[15px]',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'ink', size = 'md', loading, disabled, fullWidth, className, children, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-full font-medium select-none whitespace-nowrap',
        variantClass[variant],
        sizeClass[size],
        fullWidth && 'w-full',
        loading && 'cursor-wait',
        className
      )}
      style={size === 'lg' ? { height: '52px' } : undefined}
      {...rest}
    >
      {loading ? (
        <span className="inline-block w-3.5 h-3.5 border-2 border-current border-r-transparent rounded-full animate-spin" />
      ) : null}
      {children}
    </button>
  );
});
