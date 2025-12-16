import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '$BYEMONEY - Price Prediction Game',
  description: 'Predict crypto prices and burn your favorite coins with BYEMONEY. Say goodbye to your money.',
  
  openGraph: {
    title: 'BYEMONEY - Price Prediction Game',
    description: 'Predict crypto prices and burn your favorite coins with BYEMONEY. Say goodbye to your money.',
    url: 'https://byemoney.vercel.app',
    siteName: 'BYEMONEY',
    images: [
      {
        url: 'https://byemoney.vercel.app/og-image.png',
        width: 1200,
        height: 630,
      },
    ],
    type: 'website',
  },
  
  twitter: {
    card: 'summary_large_image',
    title: 'BYEMONEY - Price Prediction Game',
    description: 'Predict crypto prices and burn your favorite coins with BYEMONEY.',
    images: ['https://byemoney.vercel.app/og-image.png'],
  },
  
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
      <head>
        {/* Farcaster Frame - using property attribute */}
        <meta property="fc:frame" content="vNext" />
        <meta property="fc:frame:image" content="https://byemoney.vercel.app/og-image.png" />
        <meta property="fc:frame:image:aspect_ratio" content="1.91:1" />
        <meta property="fc:frame:button:1" content="Launch App" />
        <meta property="fc:frame:button:1:action" content="launch_frame" />
        <meta property="fc:frame:button:1:target" content="https://byemoney.vercel.app" />
      </head>
      <body className="bg-black text-white min-h-screen">
        {children}
      </body>
    </html>
  );
}