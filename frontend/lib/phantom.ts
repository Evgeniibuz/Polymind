'use client';

import { auth } from '@/lib/api';

declare global {
  interface Window {
    solana?: {
      isPhantom?: boolean;
      publicKey?: { toString(): string };
      connect: (opts?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: { toString(): string } }>;
      disconnect: () => Promise<void>;
      signMessage: (message: Uint8Array, encoding: 'utf8') => Promise<{ signature: Uint8Array }>;
    };
    google?: any;
  }
}

export function isPhantomAvailable(): boolean {
  return typeof window !== 'undefined' && !!window.solana?.isPhantom;
}

export async function connectPhantom(): Promise<{ wallet: string; user: any }> {
  if (!isPhantomAvailable()) {
    window.open('https://phantom.app/', '_blank', 'noopener,noreferrer');
    throw new Error('Phantom wallet not detected — please install it');
  }
  const sol = window.solana!;
  const conn = await sol.connect();
  const wallet = conn.publicKey.toString();

  // 1) get nonce from backend
  const { message } = await auth.phantomNonce(wallet);

  // 2) sign nonce
  const encoded = new TextEncoder().encode(message);
  const { signature } = await sol.signMessage(encoded, 'utf8');

  // base58 encode signature
  const sigB58 = bs58encode(signature);

  // 3) verify + receive tokens
  const tok = await auth.phantomVerify(wallet, sigB58, message);
  return { wallet, user: tok.user };
}

// minimal base58 encoder (bitcoin alphabet) — used only here
const ALPHA = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function bs58encode(bytes: Uint8Array): string {
  if (bytes.length === 0) return '';
  const digits = [0];
  for (let i = 0; i < bytes.length; i++) {
    let carry = bytes[i];
    for (let j = 0; j < digits.length; j++) {
      carry += digits[j] << 8;
      digits[j] = carry % 58;
      carry = (carry / 58) | 0;
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = (carry / 58) | 0;
    }
  }
  let leading = 0;
  for (let i = 0; i < bytes.length && bytes[i] === 0; i++) leading++;
  return '1'.repeat(leading) + digits.reverse().map(d => ALPHA[d]).join('');
}
