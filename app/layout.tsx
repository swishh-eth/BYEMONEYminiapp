import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '$BYEMONEY - Price Prediction Game',
  description: 'Predict crypto prices and burn your favorite coins with BYEMONEY. Say goodbye to your money.',
  
  // OpenGraph
  openGraph: {
    title: '$BYEMONEY - Price Prediction Game',
    description: 'Predict crypto prices and burn your favorite coins with BYEMONEY. Say goodbye to your money.',
    url: 'https://byemoney.vercel.app',
    siteName: 'BYEMONEY',
    images: [
      {
        url: 'https://byemoney.vercel.app/og-image.png',
        width: 1200,
        height: 630,
        alt: 'BYEMONEY Price Prediction Game',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  
  // Twitter/X
  twitter: {
    card: 'summary_large_image',
    title: '$BYEMONEY - Price Prediction Game',
    description: 'Predict crypto prices and burn your favorite coins with BYEMONEY. Say goodbye to your money.',
    images: ['https://byemoney.vercel.app/og-image.png'],
  },
  
  // Farcaster Frame
  other: {
    'fc:frame': 'vNext',
    'fc:frame:image': 'https://byemoney.vercel.app/og-image.png',
    'fc:frame:image:aspect_ratio': '1.91:1',
    'fc:frame:button:1': 'Launch App',
    'fc:frame:button:1:action': 'launch_frame',
    'fc:frame:button:1:target': 'https://byemoney.vercel.app',
    'of:version': 'vNext',
    'of:image': 'https://byemoney.vercel.app/og-image.png',
    'of:button:1': 'Launch App',
    'of:button:1:action': 'launch_frame',
    'of:button:1:target': 'https://byemoney.vercel.app',
  },
  
  // Icons
  icons: {
    icon: '/icon.png',
    apple: '/apple-icon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-black text-white min-h-screen">
        {children}
      </body>
    </html>
  );
}