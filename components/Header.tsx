'use client';

import { useEffect, useState } from 'react';

interface HeaderProps {
  userFid?: number;
  username?: string;
  pfpUrl?: string;
  onConnect?: () => void;
  activePageIndex?: number;
}

export default function Header({ userFid, username, pfpUrl, onConnect, activePageIndex = 1 }: HeaderProps) {
  const [userPfp, setUserPfp] = useState<string | null>(pfpUrl || null);
  const [displayName, setDisplayName] = useState<string>(username || '');
  const [isLoading, setIsLoading] = useState(true);

  // Home page is index 1 (vote=0, home=1, info=2)
  const isHomePage = activePageIndex === 1;

  useEffect(() => {
    if (pfpUrl) setUserPfp(pfpUrl);
    if (username) setDisplayName(username);
    if (userFid || username || pfpUrl) {
      setIsLoading(false);
    }
  }, [pfpUrl, username, userFid]);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (userFid && !userPfp) {
      fetch(`/api/user?fid=${userFid}`)
        .then(res => res.json())
        .then(data => {
          if (data.pfp_url) setUserPfp(data.pfp_url);
          if (data.username) setDisplayName(data.username);
        })
        .catch(() => {});
    }
  }, [userFid, userPfp]);

  const isConnected = userFid || displayName || userPfp;

  return (
    <header className="absolute top-0 left-0 right-0 z-20 pointer-events-none">
      <div 
        className="px-4 py-3 flex items-center justify-between pointer-events-auto"
        style={{
          background: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 30%, rgba(0,0,0,0.6) 60%, rgba(0,0,0,0) 100%)',
          paddingBottom: '2rem',
        }}
      >
        {/* Logo Tile - fades out on non-home pages */}
        <div 
          className={`w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden transition-opacity duration-300 ${
            isHomePage ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <img 
            src="/splash.png" 
            alt="BYEMONEY" 
            className="w-full h-full object-cover"
          />
        </div>
        
        {/* User Profile or Connect */}
        {isConnected ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-white/60 font-medium">
              @{displayName}
            </span>
            <img 
              src={userPfp || `https://api.dicebear.com/7.x/shapes/svg?seed=${userFid}`}
              alt={displayName}
              className="w-8 h-8 rounded-full ring-2 ring-white/20"
            />
          </div>
        ) : isLoading ? (
          <div className="w-8 h-8 rounded-full bg-white/5 animate-pulse" />
        ) : (
          <button 
            onClick={onConnect}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <span className="text-sm text-white/60 font-medium">
              Connect
            </span>
            <div className="w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center">
              <span className="text-white/40 text-lg font-bold">?</span>
            </div>
          </button>
        )}
      </div>
    </header>
  );
}