'use client';

import { useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Icon } from './Icon';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Modal({ open, onClose, children, size = 'md', className }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  const w = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl' }[size];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} />
      <div className={cn('relative w-full bg-white rounded-2xl shadow-card border border-line animate-scale-in overflow-hidden', w, className)}>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full hover:bg-ink/[0.06] flex items-center justify-center text-ink/55 hover:text-ink transition-colors z-10"
          aria-label="Close"
        >
          <Icon name="close" size={16} />
        </button>
        {children}
      </div>
    </div>
  );
}

export function ModalHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="px-7 pt-7 pb-5 border-b border-line">
      <h2 className="text-[20px] font-semibold tracking-tightest text-ink">{title}</h2>
      {subtitle && <p className="text-[13px] text-ink/55 mt-1">{subtitle}</p>}
    </div>
  );
}

export function ModalBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('px-7 py-6', className)}>{children}</div>;
}

export function ModalFooter({ children }: { children: React.ReactNode }) {
  return <div className="px-7 py-5 border-t border-line bg-chalk/40 flex items-center justify-end gap-3">{children}</div>;
}
