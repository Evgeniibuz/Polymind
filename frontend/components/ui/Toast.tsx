'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Icon } from './Icon';

type ToastKind = 'success' | 'error' | 'info';
interface Toast { id: number; kind: ToastKind; message: string; }

let _id = 0;
const listeners = new Set<(t: Toast[]) => void>();
let queue: Toast[] = [];

export const toast = {
  success: (msg: string) => push('success', msg),
  error: (msg: string) => push('error', msg),
  info: (msg: string) => push('info', msg),
};

function push(kind: ToastKind, message: string) {
  const t: Toast = { id: ++_id, kind, message };
  queue = [...queue, t];
  listeners.forEach(l => l(queue));
  setTimeout(() => {
    queue = queue.filter(x => x.id !== t.id);
    listeners.forEach(l => l(queue));
  }, 4500);
}

export function ToastHost() {
  const [items, setItems] = useState<Toast[]>([]);
  useEffect(() => {
    listeners.add(setItems);
    return () => { listeners.delete(setItems); };
  }, []);
  return (
    <div className="fixed bottom-6 right-6 z-[300] flex flex-col gap-2 pointer-events-none">
      {items.map(t => (
        <div
          key={t.id}
          className={cn(
            'animate-tick pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border bg-white shadow-card max-w-sm text-[13.5px]',
            t.kind === 'success' && 'border-positive/30',
            t.kind === 'error' && 'border-negative/30',
            t.kind === 'info' && 'border-line'
          )}
        >
          <div className={cn(
            'w-6 h-6 rounded-full flex items-center justify-center shrink-0',
            t.kind === 'success' && 'bg-positive/10 text-positive',
            t.kind === 'error' && 'bg-negative/10 text-negative',
            t.kind === 'info' && 'bg-poly/10 text-poly'
          )}>
            <Icon name={t.kind === 'success' ? 'check' : t.kind === 'error' ? 'close' : 'sparkle'} size={12} />
          </div>
          <span className="text-ink/85 leading-snug">{t.message}</span>
        </div>
      ))}
    </div>
  );
}
