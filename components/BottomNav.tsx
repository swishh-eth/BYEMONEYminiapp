'use client';

import { PAGES } from '@/lib/constants';

interface BottomNavProps {
  activeIndex: number;
  onNavigate: (index: number) => void;
}

// SVG Icons - matches PAGES order: vote, home, info
const Icons: Record<string, (active: boolean) => JSX.Element> = {
  vote: (active) => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={active ? 2.5 : 2}>
      <path d="M5 15l7-7 7 7" />
    </svg>
  ),
  home: (active) => (
    <svg className="w-6 h-6" viewBox="0 0 24 24" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round" fill="none" stroke="currentColor">
      <path d="M3 10.5L12 3l9 7.5" />
      <path d="M5 10v10a1 1 0 001 1h12a1 1 0 001-1V10" />
      <path d="M9 21v-6h6v6" />
    </svg>
  ),
  info: (active) => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
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
      {/* Fade gradient overlay */}
      <div className="absolute inset-x-0 -top-8 h-8 bg-gradient-to-t from-black via-black/60 to-transparent pointer-events-none" />
      
      {/* Background */}
      <div className="absolute inset-0 bg-black" />
      
      <div className="relative flex justify-around items-center py-2 px-4">
        {PAGES.map((page, index) => {
          const isActive = activeIndex === index;
          return (
            <button
              key={page.id}
              onClick={() => handlePress(index)}
              className="relative flex flex-col items-center p-2 transition-all duration-300 ease-out active:scale-90"
            >
              {/* Icon */}
              <div className={`relative transition-all duration-300 ${
                isActive 
                  ? 'text-white scale-110' 
                  : 'text-white/40 hover:text-white/60 scale-100'
              }`}>
                {Icons[page.id](isActive)}
              </div>
            </button>
          );
        })}
      </div>
      
      {/* Safe area padding for phones with home indicator */}
      <div className="h-safe-area-inset-bottom bg-black" />
    </nav>
  );
}
