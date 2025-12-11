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
  links: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  ),
};

export default function BottomNav({ activeIndex, onNavigate }: BottomNavProps) {
  return (
    <nav className="bg-black border-t border-white/10">
      <div className="flex justify-around items-center py-2 px-4">
        {PAGES.map((page, index) => (
          <button
            key={page.id}
            onClick={() => onNavigate(index)}
            className={`flex flex-col items-center gap-1 py-1.5 px-5 rounded-lg transition-all duration-200 ${
              activeIndex === index 
                ? 'text-red-500' 
                : 'text-white/40 hover:text-white/60'
            }`}
          >
            {Icons[page.id as keyof typeof Icons]}
            <span className="text-[10px] font-medium">
              {page.label}
            </span>
          </button>
        ))}
      </div>
    </nav>
  );
}
