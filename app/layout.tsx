import type { Metadata } from 'next';
import './globals.css';

const appDomain = "https://byemoney.vercel.app";
const frameImageUrl = `${appDomain}/frame-image.png`;
const splashImageUrl = `${appDomain}/splash.png`;

const miniAppEmbed = {
  version: "1",
  imageUrl: frameImageUrl,
  button: {
    title: "Say Goodbye to Your Money",
    action: {
      type: "launch_miniapp" as const,
      name: "$BYEMONEY",
      url: appDomain,
      splashImageUrl,
      splashBackgroundColor: "#000000",
    },
  },
};

export const metadata: Metadata = {
  title: '$BYEMONEY - Price Prediction Game',
  description: 'Predict crypto prices and burn your favorite coins with BYEMONEY. Say goodbye to your money.',
  
  openGraph: {
    title: 'BYEMONEY - Price Prediction Game',
    description: 'Predict crypto prices and burn your favorite coins with BYEMONEY. Say goodbye to your money.',
    url: appDomain,
    images: [
      {
        url: frameImageUrl,
      },
    ],
  },
  
  twitter: {
    card: 'summary_large_image',
    title: 'BYEMONEY - Price Prediction Game',
    description: 'Predict crypto prices and burn your favorite coins with BYEMONEY.',
    images: [frameImageUrl],
  },
  
  other: {
    'fc:miniapp': JSON.stringify(miniAppEmbed),
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
      <body className="bg-black text-white min-h-screen">
        {children}
      </body>
    </html>
  );
}