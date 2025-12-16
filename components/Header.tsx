'use client';

import { useEffect, useState } from 'react';

interface HeaderProps {
  userFid?: number;
  username?: string;
  pfpUrl?: string;
  onConnect?: () => void;
}

export default function Header({ userFid, username, pfpUrl, onConnect }: HeaderProps) {
  const [userPfp, setUserPfp] = useState<string | null>(pfpUrl || null);
  const [displayName, setDisplayName] = useState<string>(username || '');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (pfpUrl) setUserPfp(pfpUrl);
    if (username) setDisplayName(username);
    // Once we have user info, stop loading
    if (userFid || username || pfpUrl) {
      setIsLoading(false);
    }
  }, [pfpUrl, username, userFid]);

  // Give SDK time to initialize before showing Connect
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  // Fetch user data if we have fid but no pfp
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
    <header className="relative flex-shrink-0 z-10">
      <div className="px-4 py-2 flex items-center justify-between bg-black">
        {/* Logo Tile */}
        <div className="w-10 h-10 bg-black rounded-xl border border-white/10 flex items-center justify-center overflow-hidden">
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
      
      {/* Fade gradient overlay */}
      <div className="absolute inset-x-0 -bottom-4 h-6 bg-gradient-to-b from-black to-transparent pointer-events-none z-10" />
    </header>
  );
}