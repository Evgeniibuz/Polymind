import type { Metadata } from 'next';
import { Inter, Instrument_Serif, JetBrains_Mono } from 'next/font/google';
import { ToastHost } from '@/components/ui/Toast';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-inter',
  display: 'swap',
});

const instrument = Instrument_Serif({
  subsets: ['latin'],
  weight: ['400'],
  style: ['normal', 'italic'],
  variable: '--font-instrument',
  display: 'swap',
});

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-jetbrains',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Polymind — AI intelligence for prediction markets',
  description:
    'Polymind is the Bloomberg Terminal for prediction markets. AI-monitored signals, whale tracking, mispricing detection, and execution bots for Polymarket and Kalshi.',
  metadataBase: new URL('https://polymind.app'),
  openGraph: {
    title: 'Polymind — AI intelligence for prediction markets',
    description: 'AI-monitored signals, whale tracking, mispricing detection, and execution bots.',
    type: 'website',
    siteName: 'Polymind',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Polymind',
    description: 'AI intelligence for prediction markets.',
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
  },
};

export const viewport = {
  themeColor: '#FAFAF7',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover' as const,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${instrument.variable} ${jetbrains.variable}`}>
      <body className="font-sans bg-bone text-ink antialiased">
        {children}
        <ToastHost />
      </body>
    </html>
  );
}
