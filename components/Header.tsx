'use client';

import { useEffect, useState, useRef } from 'react';

interface ConfettiPiece {
  id: number;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  angle: number;
  speed: number;
  rotationSpeed: number;
}

interface HeaderProps {
  userFid?: number;
  username?: string;
  pfpUrl?: string;
  onConnect?: () => void;
  activePageIndex?: number;
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
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const pfpRef = useRef<HTMLImageElement>(null);

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

  const triggerHaptic = async () => {
    try {
      const { sdk } = await import('@farcaster/miniapp-sdk');
      sdk.haptics.impactOccurred('light');
    } catch {}
  };

  const handlePfpClick = () => {
    if (!pfpRef.current) return;
    
    // Trigger haptic
    triggerHaptic();
    
    // Get PFP position for confetti origin
    const rect = pfpRef.current.getBoundingClientRect();
    const originX = ((rect.left + rect.width / 2) / window.innerWidth) * 100;
    const originY = ((rect.top + rect.height / 2) / window.innerHeight) * 100;
    
    // Create confetti pieces
    const pieces: ConfettiPiece[] = [];
    const numPieces = 20;
    
    for (let i = 0; i < numPieces; i++) {
      const angle = (Math.PI * 2 * i) / numPieces + (Math.random() - 0.5) * 0.5;
      pieces.push({
        id: Date.now() + i,
        x: originX,
        y: originY,
        rotation: Math.random() * 360,
        scale: 0.3 + Math.random() * 0.4,
        angle,
        speed: 5 + Math.random() * 8,
        rotationSpeed: (Math.random() - 0.5) * 25,
      });
    }
    
    setConfetti(pieces);
    setShowConfetti(true);
    
    setTimeout(() => {
      setShowConfetti(false);
      setConfetti([]);
    }, 1500);
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
          <div className="relative h-10 min-w-[100px]">
            {/* Logo Tile - fades out on non-home pages, fades in with delay */}
            <div 
              className={`absolute top-0 left-0 w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden transition-all duration-500 ${
                isHomePage ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
              }`}
              style={{ transitionDelay: isHomePage ? '300ms' : '0ms' }}
            >
              <img 
                src="/splash.png" 
                alt="BYEMONEY" 
                className="w-full h-full object-cover"
              />
            </div>

            {/* Claim Winnings Button - fades in on predictions page with delay */}
            <button
              onClick={handleClaimClick}
              className={`absolute top-0 left-0 flex items-center gap-2 h-10 px-3 rounded-xl border transition-all duration-500 active:scale-95 ${
                isPredictionsPage ? 'opacity-100 scale-100 delay-300' : 'opacity-0 scale-95 pointer-events-none'
              } ${
                hasUnclaimed 
                  ? 'bg-white border-white/80 animate-pulse-subtle' 
                  : 'bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.05]'
              }`}
              style={{ transitionDelay: isPredictionsPage ? '300ms' : '0ms' }}
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
                {hasUnclaimed ? (
                  <div className="flex flex-col items-start">
                    <span className="text-[10px] font-medium leading-none text-black/60">
                      Claim
                    </span>
                    <span className="text-xs font-bold leading-none text-black">
                      {formatUnclaimedAmount()}
                    </span>
                  </div>
                ) : (
                  <span className="text-[10px] font-medium text-white/30 uppercase tracking-wider">
                    Winnings
                  </span>
                )}
              </button>
          </div>
          
          {/* User Profile or Connect */}
          {isConnected ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-white/60 font-medium">
                @{displayName}
              </span>
              <img 
                ref={pfpRef}
                src={userPfp || `https://api.dicebear.com/7.x/shapes/svg?seed=${userFid}`}
                alt={displayName}
                className="w-8 h-8 rounded-full ring-2 ring-white/20 cursor-pointer active:scale-90 transition-transform"
                onClick={handlePfpClick}
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

      {/* PFP Confetti */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
          {confetti.map((piece) => (
            <img
              key={piece.id}
              src="/confetti.png"
              alt=""
              className="absolute w-5 h-5 object-contain"
              style={{
                left: `${piece.x}%`,
                top: `${piece.y}%`,
                transform: `rotate(${piece.rotation}deg) scale(${piece.scale})`,
                animation: `confetti-burst-${piece.id} 1.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards`,
              }}
            />
          ))}
          <style>
            {confetti.map((piece) => `
              @keyframes confetti-burst-${piece.id} {
                0% {
                  transform: translate(0, 0) rotate(${piece.rotation}deg) scale(${piece.scale});
                  opacity: 1;
                }
                100% {
                  transform: translate(${Math.cos(piece.angle) * piece.speed * 12}px, ${Math.sin(piece.angle) * piece.speed * 12 + 150}px) rotate(${piece.rotation + piece.rotationSpeed * 8}deg) scale(${piece.scale * 0.3});
                  opacity: 0;
                }
              }
            `).join('\n')}
          </style>
        </div>
      )}

      {/* No Winnings Popup with Backdrop */}
      <div 
        className={`fixed inset-0 z-50 flex items-start justify-center pt-20 transition-all duration-300 ${
          showNoWinningsPopup 
            ? 'opacity-100 pointer-events-auto' 
            : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Backdrop */}
        <div className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          showNoWinningsPopup ? 'opacity-100' : 'opacity-0'
        }`} />
        
        {/* Popup */}
        <div className={`relative bg-black/90 border border-white/10 rounded-xl px-5 py-4 shadow-xl transition-all duration-300 ${
          showNoWinningsPopup 
            ? 'opacity-100 translate-y-0 scale-100' 
            : 'opacity-0 -translate-y-4 scale-95'
        }`}>
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