'use client';

import { TOKEN } from '@/lib/constants';

export default function Header() {
  return (
    <header className="px-4 py-3 flex items-center justify-between bg-black border-b border-white/10">
      {/* Logo & Name */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-red-500 flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
        </div>
        <div>
          <h1 className="font-bold text-base text-red-500">
            ${TOKEN.symbol}
          </h1>
          <p className="text-[10px] text-white/40">on Base</p>
        </div>
      </div>
      
      {/* Live indicator */}
      <div className="flex items-center gap-2 px-2.5 py-1 bg-white/5 rounded-full border border-white/10">
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
        </span>
        <span className="text-[10px] text-white/50 font-medium">LIVE</span>
      </div>
    </header>
  );
}
