'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Modal, ModalBody } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { PolymindMark } from '@/components/brand/Logo';
import { connectPhantom, isPhantomAvailable } from '@/lib/phantom';
import { auth } from '@/lib/api';
import { toast } from '@/components/ui/Toast';

interface Props {
  open: boolean;
  onClose: () => void;
}

const PHANTOM_ENABLED = process.env.NEXT_PUBLIC_PHANTOM_ENABLED !== 'false';
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

export function AuthModal({ open, onClose }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<'phantom' | 'google' | null>(null);

  // load google identity script once
  useEffect(() => {
    if (!open || !GOOGLE_CLIENT_ID) return;
    if (document.getElementById('gsi-script')) return;
    const s = document.createElement('script');
    s.id = 'gsi-script';
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.defer = true;
    document.head.appendChild(s);
  }, [open]);

  async function handlePhantom() {
    setBusy('phantom');
    try {
      await connectPhantom();
      toast.success('Connected via Phantom');
      onClose();
      router.push('/terminal');
    } catch (e: any) {
      toast.error(e?.message || 'Phantom connection failed');
    } finally {
      setBusy(null);
    }
  }

  async function handleGoogle() {
    if (!GOOGLE_CLIENT_ID) {
      toast.error('Google client id not configured');
      return;
    }
    if (!window.google?.accounts?.id) {
      toast.error('Google sign-in not loaded yet — try again');
      return;
    }
    setBusy('google');
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: async (response: any) => {
        try {
          await auth.googleVerify(response.credential);
          toast.success('Signed in with Google');
          onClose();
          router.push('/terminal');
        } catch (e: any) {
          toast.error(e?.message || 'Google sign-in failed');
        } finally {
          setBusy(null);
        }
      },
    });
    window.google.accounts.id.prompt();
  }

  return (
    <Modal open={open} onClose={onClose} size="sm" className="!max-w-[440px]">
      <ModalBody className="!px-8 !py-8">
        <div className="flex flex-col items-center text-center">
          <PolymindMark size={44} />
          <h2 className="mt-5 text-[22px] font-semibold tracking-tightest">Sign in to Polymind</h2>
          <p className="mt-1.5 text-[13.5px] text-ink/55 max-w-[300px]">
            Continue with a wallet or email to access the terminal.
          </p>

          <div className="mt-7 w-full flex flex-col gap-2.5">
            {PHANTOM_ENABLED && (
              <Button
                variant="ink"
                size="lg"
                fullWidth
                onClick={handlePhantom}
                loading={busy === 'phantom'}
              >
                <Icon name="wallet" size={16} />
                {isPhantomAvailable() ? 'Continue with Phantom' : 'Install Phantom'}
              </Button>
            )}

            <Button
              variant="outline"
              size="lg"
              fullWidth
              onClick={handleGoogle}
              loading={busy === 'google'}
              disabled={!GOOGLE_CLIENT_ID}
            >
              <Icon name="google" size={16} />
              Continue with Google
            </Button>
          </div>

          <p className="mt-6 text-[11px] text-ink/40 max-w-[280px] leading-relaxed">
            By continuing you agree that prediction-market trading involves substantial risk of loss.
          </p>
        </div>
      </ModalBody>
    </Modal>
  );
}
