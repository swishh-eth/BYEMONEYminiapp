import type { Metadata, Viewport } from 'next';
import './globals.css';
import { TOKEN, DEXSCREENER } from '@/lib/constants';

// Replace YOUR_DOMAIN with your actual Vercel domain
const DOMAIN = process.env.NEXT_PUBLIC_URL || 'https://byemoney.vercel.app';

export const metadata: Metadata = {
  title: `$${TOKEN.symbol} | Say Bye to Your Money`,
  description: `Track ${TOKEN.symbol} price, charts, and info. The ultimate token for degens.`,
  icons: {
    icon: '/icon.png',
  },
  openGraph: {
    title: `$${TOKEN.symbol}`,
    description: `Track ${TOKEN.symbol} price and charts on Base`,
    images: [`${DOMAIN}/og-image.png`],
  },
  other: {
    // Farcaster Mini App embed metadata
    'fc:miniapp': JSON.stringify({
      version: '1',
      imageUrl: `${DOMAIN}/og-image.png`,
      button: {
        title: '💸 Launch App',
        action: {
          type: 'launch_miniapp',
          name: `$${TOKEN.symbol}`,
          url: DOMAIN,
          splashImageUrl: `${DOMAIN}/splash.png`,
          splashBackgroundColor: '#0A0A0F',
        },
      },
    }),
    // Legacy frame support
    'fc:frame': JSON.stringify({
      version: '1',
      imageUrl: `${DOMAIN}/og-image.png`,
      button: {
        title: '💸 Launch App',
        action: {
          type: 'launch_frame',
          name: `$${TOKEN.symbol}`,
          url: DOMAIN,
          splashImageUrl: `${DOMAIN}/splash.png`,
          splashBackgroundColor: '#0A0A0F',
        },
      },
    }),
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0A0A0F',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="noise-bg">
        <div className="desktop-container h-screen flex flex-col relative overflow-hidden">
          {children}
        </div>
      </body>
    </html>
  );
}
