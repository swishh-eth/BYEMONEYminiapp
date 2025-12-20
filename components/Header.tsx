'use client';

import { useEffect, useState } from 'react';

interface HeaderProps {
  userFid?: number;
  username?: string;
  pfpUrl?: string;
  onConnect?: () => void;
  activePageIndex?: number;
  // New props for unclaimed winnings
  unclaimedAmount?: number;
  unclaimedCount?: number;
  isEthMarket?: boolean;
  onClaimClick?: () => void;
}

export default function Header({ 
  userFid, 
  username, 
  pfpUrl, 
  onConnect, 
  activePageIndex = 1,
  unclaimedAmount = 0,
  unclaimedCount = 0,
  isEthMarket = true,
  onClaimClick,
}: HeaderProps) {
  const [userPfp, setUserPfp] = useState<string | null>(pfpUrl || null);
  const [displayName, setDisplayName] = useState<string>(username || '');
  const [isLoading, setIsLoading] = useState(true);
  const [showNoWinningsPopup, setShowNoWinningsPopup] = useState(false);

  // Home page is index 1 (vote=0, home=1, info=2)
  const isHomePage = activePageIndex === 1;
  const isPredictionsPage = activePageIndex === 0;
  const hasUnclaimed = unclaimedCount > 0 && unclaimedAmount > 0;

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

  const formatUnclaimedAmount = () => {
    if (isEthMarket) {
      return `${unclaimedAmount.toFixed(4)} ETH`;
    }
    if (unclaimedAmount >= 1000000) {
      return `${(unclaimedAmount / 1000000).toFixed(1)}M`;
    }
    return `${unclaimedAmount.toFixed(0)}`;
  };

  const handleClaimClick = () => {
    if (hasUnclaimed) {
      onClaimClick?.();
    } else {
      setShowNoWinningsPopup(true);
      setTimeout(() => setShowNoWinningsPopup(false), 2500);
    }
  };

  return (
    <>
      <header className="absolute top-0 left-0 right-0 z-20 pointer-events-none">
        <div 
          className="px-4 py-3 flex items-center justify-between pointer-events-auto"
          style={{
            background: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 30%, rgba(0,0,0,0.6) 60%, rgba(0,0,0,0) 100%)',
            paddingBottom: '2rem',
          }}
        >
          {/* Left side - Logo or Claim Button */}
          <div className="relative h-10">
            {/* Logo Tile - fades out on non-home pages */}
            <div 
              className={`w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden transition-all duration-500 ease-in-out ${
                isHomePage ? 'opacity-100 scale-100' : 'opacity-0 scale-95 absolute'
              }`}
            >
              <img 
                src="/splash.png" 
                alt="BYEMONEY" 
                className="w-full h-full object-cover"
              />
            </div>

            {/* Claim Winnings Button - always visible on predictions page */}
            {isPredictionsPage && (
              <button
                onClick={handleClaimClick}
                className={`flex items-center gap-2 h-10 px-3 rounded-xl border transition-all duration-500 ease-in-out active:scale-95 ${
                  hasUnclaimed 
                    ? 'bg-white border-white/80 animate-pulse-subtle' 
                    : 'bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.05]'
                }`}
              >
                <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                  hasUnclaimed ? 'bg-black/10' : 'bg-white/10'
                }`}>
                  <svg 
                    className={`w-3 h-3 ${hasUnclaimed ? 'text-black' : 'text-white/30'}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24" 
                    strokeWidth={2.5}
                  >
                    {hasUnclaimed 
                      ? <path d="M5 13l4 4L19 7" />
                      : <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    }
                  </svg>
                </div>
                <div className="flex flex-col items-start">
                  <span className={`text-[10px] font-medium leading-none ${
                    hasUnclaimed ? 'text-black/60' : 'text-white/30'
                  }`}>
                    {hasUnclaimed ? 'Claim' : 'Winnings'}
                  </span>
                  <span className={`text-xs font-bold leading-none ${
                    hasUnclaimed ? 'text-black' : 'text-white/20'
                  }`}>
                    {hasUnclaimed ? formatUnclaimedAmount() : 'None'}
                  </span>
                </div>
              </button>
            )}
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

      {/* No Winnings Popup */}
      <div 
        className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${
          showNoWinningsPopup 
            ? 'opacity-100 translate-y-0' 
            : 'opacity-0 -translate-y-2 pointer-events-none'
        }`}
      >
        <div className="bg-black/90 border border-white/10 rounded-xl px-4 py-3 shadow-xl backdrop-blur-sm">
          <p className="text-sm text-white/70 text-center">
            No round winnings to claim yet
          </p>
          <p className="text-xs text-white/40 text-center mt-1">
            Win a prediction to see rewards here
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes pulse-subtle {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.03); }
        }
        .animate-pulse-subtle {
          animation: pulse-subtle 2s ease-in-out infinite;
        }
      `}</style>
    </>
  );
}
