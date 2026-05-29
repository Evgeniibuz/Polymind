'use client';

import { useState } from 'react';
import { Nav } from '@/components/landing/Nav';
import { Hero } from '@/components/landing/Hero';
import { Engine } from '@/components/landing/Engine';
import { Product } from '@/components/landing/Product';
import { Bots } from '@/components/landing/Bots';
import { Pricing } from '@/components/landing/Pricing';
import { FinalCTA, Footer } from '@/components/landing/Footer';
import { AuthModal } from '@/components/landing/AuthModal';

export default function HomePage() {
  const [authOpen, setAuthOpen] = useState(false);
  const open = () => setAuthOpen(true);

  return (
    <main className="relative min-h-screen bg-bone text-ink">
      <Nav onOpenAuth={open} />
      <Hero onCta={open} />
      <Product />
      <Engine />
      <Bots onCta={open} />
      <Pricing onCta={open} />
      <FinalCTA onCta={open} />
      <Footer />
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </main>
  );
}
