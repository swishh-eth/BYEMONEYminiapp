'use client';

import { PAGES } from '@/lib/constants';

interface BottomNavProps {
  activeIndex: number;
  onNavigate: (index: number) => void;
}

// SVG Icons
const Icons = {
  info: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4M12 8h.01" />
    </svg>
  ),
  home: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path d="M3 3v18h18" />
      <path d="M18 17V9M13 17V5M8 17v-3" />
    </svg>
  ),
  vote: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path d="M5 15l7-7 7 7" />
    </svg>
  ),
};

export default function BottomNav({ activeIndex, onNavigate }: BottomNavProps) {
  return (
    <nav className="bg-red-500">
      <div className="flex justify-around items-center py-2 px-4">
        {PAGES.map((page, index) => {
          const isActive = activeIndex === index;
          return (
            <button
              key={page.id}
              onClick={() => onNavigate(index)}
              className={`flex flex-col items-center gap-1 py-2 px-5 rounded-xl transition-all duration-300 ${
                isActive 
                  ? 'bg-black text-white scale-110 shadow-[0_0_15px_rgba(255,255,255,0.5)]' 
                  : 'bg-black/80 text-white/50 hover:text-white/70 scale-100'
              }`}
              style={{
                boxShadow: isActive ? '0 0 20px rgba(255,255,255,0.4), 0 0 40px rgba(255,255,255,0.2)' : 'none'
              }}
            >
              {Icons[page.id as keyof typeof Icons]}
              <span className="text-[10px] font-medium">
                {page.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}