'use client';

import { TOKEN } from '@/lib/constants';

export default function Header() {
  return (
    <header className="px-4 py-3 flex items-center justify-between bg-black border-b border-white/10">
      {/* Logo */}
      <h1 className="font-bold text-xl text-red-500">
        ${TOKEN.symbol}
      </h1>
      
      {/* Live indicator */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
        </span>
        <span className="text-xs text-white/60 font-medium">LIVE</span>
      </div>
    </header>
  );
}