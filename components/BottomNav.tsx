'use client';

import { PAGES } from '@/lib/constants';

interface BottomNavProps {
  activeIndex: number;
  onNavigate: (index: number) => void;
}

// SVG Icons - matches PAGES order: vote, home, info
const Icons: Record<string, JSX.Element> = {
  vote: (
    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path d="M5 15l7-7 7 7" />
    </svg>
  ),
  home: (
    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path d="M3 3v18h18" />
      <path d="M18 17V9M13 17V5M8 17v-3" />
    </svg>
  ),
  info: (
    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <circle cx="12" cy="8" r="0.5" fill="currentColor" />
    </svg>
  ),
};

const triggerHaptic = async (type: 'light' | 'medium' | 'heavy' | 'error' | 'success') => {
  try {
    const { sdk } = await import('@farcaster/miniapp-sdk');
    sdk.haptics.impactOccurred(type === 'error' ? 'heavy' : type === 'success' ? 'medium' : type);
  } catch {
    // Haptics not available
  }
};

export default function BottomNav({ activeIndex, onNavigate }: BottomNavProps) {
  const handlePress = (index: number) => {
    triggerHaptic('light');
    onNavigate(index);
  };

  return (
    <nav className="flex-shrink-0 relative">
      {/* Fade gradient overlay - smoother */}
      <div className="absolute inset-x-0 -top-12 h-12 bg-gradient-to-t from-black via-black/60 to-transparent pointer-events-none" />
      
      <div className="bg-black flex justify-around items-center py-2 px-4">
        {PAGES.map((page, index) => {
          const isActive = activeIndex === index;
          return (
            <button
              key={page.id}
              onClick={() => handlePress(index)}
              className={`p-2 transition-all duration-200 ${
                isActive 
                  ? 'text-white scale-110' 
                  : 'text-red-500 hover:text-red-400 scale-100'
              }`}
            >
              {Icons[page.id]}
            </button>
          );
        })}
      </div>
    </nav>
  );
}