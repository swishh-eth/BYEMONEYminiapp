'use client';

import { TOKEN } from '@/lib/constants';

interface HeaderProps {
  user?: {
    fid: number;
    username?: string;
    displayName?: string;
    pfpUrl?: string;
  } | null;
}

export default function Header({ user }: HeaderProps) {
  return (
    <header className="flex-shrink-0 px-3 py-2 flex items-center justify-between bg-black border-b border-white/10">
      {/* Logo */}
      <h1 className="font-bold text-xl text-red-500">${TOKEN.symbol}</h1>
      
      {/* User Profile or Live indicator */}
      {user ? (
        <div className="flex items-center gap-2">
          <div className="text-right">
            <p className="text-xs text-white font-medium">{user.displayName || user.username}</p>
            <p className="text-[9px] text-white/40">@{user.username}</p>
          </div>
          {user.pfpUrl ? (
            <img 
              src={user.pfpUrl} 
              alt="Profile" 
              className="w-8 h-8 rounded-full border border-white/20"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
              <svg className="w-4 h-4 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
              </svg>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-1.5 px-2 py-1 bg-white/5 rounded-full border border-white/10">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
          </span>
          <span className="text-[9px] text-white/50 font-medium">LIVE</span>
        </div>
      )}
    </header>
  );
}