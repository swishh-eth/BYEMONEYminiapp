'use client';

import { PAGES } from '@/lib/constants';

interface BottomNavProps {
  activeIndex: number;
  onNavigate: (index: number) => void;
}

const Icons = {
  vote: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path d="M5 15l7-7 7 7" />
      <path d="M5 9l7 7 7-7" />
    </svg>
  ),
  home: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path d="M3 3v18h18" />
      <path d="M18 17V9M13 17V5M8 17v-3" />
    </svg>
  ),
  info: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  ),
};

export default function BottomNav({ activeIndex, onNavigate }: BottomNavProps) {
  return (
    <nav className="flex-shrink-0 bg-black border-t border-white/10 pb-safe">
      <div className="flex justify-around items-center py-3 px-4">
        {PAGES.map((page, index) => (
          <button
            key={page.id}
            onClick={() => onNavigate(index)}
            className={`p-2 rounded-lg transition-all duration-200 ${
              activeIndex === index 
                ? 'text-red-500' 
                : 'text-white/40 hover:text-white/60'
            }`}
          >
            {Icons[page.id as keyof typeof Icons]}
          </button>
        ))}
      </div>
    </nav>
  );
}