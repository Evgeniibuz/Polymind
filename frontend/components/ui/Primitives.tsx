'use client';

import { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { Icon } from './Icon';
import { Button } from './Button';

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('card', className)} {...rest} />;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} />;
}

interface EmptyStateProps {
  icon?: React.ComponentProps<typeof Icon>['name'];
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  className?: string;
}

export function EmptyState({ icon = 'sparkle', title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center py-16 px-6', className)}>
      <div className="w-12 h-12 rounded-2xl bg-ink/[0.04] border border-ink/[0.06] flex items-center justify-center mb-4 text-ink/40">
        <Icon name={icon} size={20} />
      </div>
      <h3 className="text-[17px] font-semibold text-ink mb-1.5">{title}</h3>
      {description && <p className="text-[13.5px] text-ink/55 max-w-sm leading-relaxed">{description}</p>}
      {action && (
        <Button variant="ink" size="sm" className="mt-5" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}

interface ErrorStateProps {
  error: unknown;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({ error, onRetry, className }: ErrorStateProps) {
  const msg = error instanceof Error ? error.message : 'Something went wrong';
  return (
    <div className={cn('flex flex-col items-center justify-center text-center py-12 px-6', className)}>
      <div className="w-11 h-11 rounded-2xl bg-negative/8 border border-negative/15 flex items-center justify-center mb-3 text-negative">
        <Icon name="close" size={18} />
      </div>
      <h3 className="text-[15.5px] font-semibold text-ink mb-1">Couldn't load this</h3>
      <p className="text-[12.5px] text-ink/55 max-w-sm font-mono">{msg}</p>
      {onRetry && (
        <Button variant="ghost" size="sm" className="mt-4" onClick={onRetry}>
          <Icon name="arrow_right" size={13} /> Retry
        </Button>
      )}
    </div>
  );
}

interface BadgeProps {
  variant?: 'default' | 'poly' | 'positive' | 'negative';
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant = 'default', children, className }: BadgeProps) {
  const v = {
    default: 'tag',
    poly: 'tag tag-poly',
    positive: 'tag tag-positive',
    negative: 'tag tag-negative',
  }[variant];
  return <span className={cn(v, className)}>{children}</span>;
}
