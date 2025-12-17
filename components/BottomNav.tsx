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
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
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
              className="relative flex flex-col items-center gap-1 p-2 transition-all duration-300 ease-out active:scale-90"
            >
              {/* Glow effect behind active icon */}
              {isActive && (
                <div className="absolute inset-0 rounded-xl bg-white/5 blur-md" />
              )}
              
              {/* Icon */}
              <div className={`relative transition-all duration-300 ${
                isActive 
                  ? 'text-white scale-110' 
                  : 'text-white/40 hover:text-white/60 scale-100'
              }`}>
                {Icons[page.id](isActive)}
              </div>
              
              {/* Active indicator dot */}
              <div className={`h-1 w-1 rounded-full transition-all duration-300 ${
                isActive 
                  ? 'bg-white scale-100 opacity-100' 
                  : 'bg-transparent scale-0 opacity-0'
              }`} />
            </button>
          );
        })}
      </div>
      
      {/* Safe area padding for phones with home indicator */}
      <div className="h-safe-area-inset-bottom bg-black" />
    </nav>
  );
}