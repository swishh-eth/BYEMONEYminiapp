'use client';

import { TOKEN } from '@/lib/constants';
import { PAGES } from '@/lib/constants';
import { useState, useEffect } from 'react';

interface HeaderProps {
  activeIndex?: number;
  onNavigate?: (index: number) => void;
}

// SVG Icons for menu - order matches PAGES: vote, home, info
const Icons: Record<string, JSX.Element> = {
  vote: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path d="M5 15l7-7 7 7" />
    </svg>
  ),
  home: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path d="M3 3v18h18" />
      <path d="M18 17V9M13 17V5M8 17v-3" />
    </svg>
  ),
  info: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4M12 8h.01" />
    </svg>
  ),
};

export default function Header({ activeIndex = 0, onNavigate }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 768);
    };
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  const handleNavigate = (index: number) => {
    if (onNavigate) {
      onNavigate(index);
    }
    setMenuOpen(false);
  };

  return (
    <header className="relative z-50 px-4 py-3 flex items-center justify-between bg-black border-b border-white/10">
      <div className="flex items-center gap-3">
        {/* Hamburger Menu - Desktop Only */}
        <button 
          onClick={() => setMenuOpen(!menuOpen)}
          className="hidden md:flex flex-col justify-center items-center w-8 h-8 gap-1.5"
        >
          <span className={`block w-5 h-0.5 bg-white transition-all duration-300 ${menuOpen ? 'rotate-45 translate-y-2' : ''}`} />
          <span className={`block w-5 h-0.5 bg-white transition-all duration-300 ${menuOpen ? 'opacity-0' : ''}`} />
          <span className={`block w-5 h-0.5 bg-white transition-all duration-300 ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
        </button>

        {/* Logo */}
        <h1 className="font-bold text-xl text-red-500">
          ${TOKEN.symbol}
        </h1>
      </div>
      
      {/* Live indicator */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
        </span>
        <span className="text-xs text-white/60 font-medium">LIVE</span>
      </div>

      {/* Desktop Dropdown Menu */}
      {menuOpen && isDesktop && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40"
            onClick={() => setMenuOpen(false)}
          />
          
          {/* Menu */}
          <div className="absolute top-full left-4 mt-2 bg-black border border-white/10 rounded-xl overflow-hidden shadow-xl z-50 min-w-[200px]">
            {PAGES.map((page, index) => (
              <button
                key={page.id}
                onClick={() => handleNavigate(index)}
                className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-colors ${
                  activeIndex === index 
                    ? 'bg-red-500/20 text-red-500' 
                    : 'text-white/70 hover:bg-white/5 hover:text-white'
                }`}
              >
                {Icons[page.id]}
                <span className="font-medium">{page.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </header>
  );
}