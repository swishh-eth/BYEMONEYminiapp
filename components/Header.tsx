'use client';

import { useEffect, useState } from 'react';

interface HeaderProps {
  userFid?: number;
  username?: string;
  pfpUrl?: string;
}

export default function Header({ userFid, username, pfpUrl }: HeaderProps) {
  const [userPfp, setUserPfp] = useState<string | null>(pfpUrl || null);
  const [displayName, setDisplayName] = useState<string>(username || '');

  useEffect(() => {
    if (pfpUrl) setUserPfp(pfpUrl);
    if (username) setDisplayName(username);
  }, [pfpUrl, username]);

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

  return (
    <header className="px-4 py-3 flex items-center justify-between bg-black border-b border-white/10">
      {/* Logo Tile */}
      <div className="w-10 h-10 bg-black rounded-xl border border-white/10 flex items-center justify-center">
        <img 
          src="/logo.png" 
          alt="BYEMONEY" 
          className="w-6 h-6 object-contain"
        />
      </div>
      
      {/* User Profile */}
      {(userPfp || displayName) ? (
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
      ) : (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          <span className="text-xs text-white/60 font-medium">LIVE</span>
        </div>
      )}
    </header>
  );
}