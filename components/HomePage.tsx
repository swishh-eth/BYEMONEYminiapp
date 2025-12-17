'use client';

import { useState, useEffect } from 'react';

// Types for props from parent
interface PredictionData {
  marketId: number;
  timeRemaining: number; // seconds
  totalPool: number; // ETH
  upPool: number;
  downPool: number;
  ethPrice: number; // USD
  recentWins: Array<{
    username: string;
    pfp: string;
    amount: number; // ETH
    direction: 'up' | 'down';
  }>;
}

interface HomePageProps {
  predictionData?: PredictionData;
  onNavigate?: (index: number) => void;
}

// Available markets for carousel
const MARKETS = [
  { 
    symbol: 'ETH', 
    name: 'Ethereum', 
    icon: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
    active: true 
  },
  { 
    symbol: 'BYEMONEY', 
    name: '$BYEMONEY', 
    icon: '/splash.png',
    active: false 
  },
  { 
    symbol: 'CLANKER', 
    name: 'Clanker', 
    icon: 'https://assets.coingecko.com/coins/images/51880/standard/clanker.jpg',
    active: false 
  },
];

// Haptic feedback helper
const triggerHaptic = async (type: 'light' | 'medium' | 'heavy') => {
  try {
    const { sdk } = await import('@farcaster/miniapp-sdk');
    sdk.haptics.impactOccurred(type);
  } catch {}
};

// Click sound helper
const playClick = () => {
  try {
    const audio = new Audio('/click.mp3');
    audio.volume = 0.3;
    audio.play().catch(() => {});
  } catch {}
};

export default function HomePage({ predictionData, onNavigate }: HomePageProps) {
  const [currentMarketIndex, setCurrentMarketIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Auto-rotate markets every 4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentMarketIndex((prev) => (prev + 1) % MARKETS.length);
        setIsTransitioning(false);
      }, 300);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const currentMarket = MARKETS[currentMarketIndex];

  // Format time remaining
  const formatTime = (seconds: number) => {
    if (!seconds || seconds <= 0) return '0h 0m';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  // Calculate percentages
  const upPercent = predictionData && predictionData.totalPool > 0 
    ? (predictionData.upPool / predictionData.totalPool) * 100 
    : 50;
  const downPercent = 100 - upPercent;

  const handleBetClick = () => {
    playClick();
    triggerHaptic('medium');
    onNavigate?.(0); // Navigate to predictions page
  };

  return (
    <div className="flex flex-col h-full p-4 pt-16 gap-2 overflow-y-auto scrollbar-hide">
      
      {/* Market Carousel Tile */}
      <div className="relative bg-white/[0.03] border border-white/[0.08] rounded-2xl p-3 overflow-hidden animate-fade-in">
        <div className="absolute inset-0 opacity-[0.03]" 
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
            backgroundSize: '20px 20px',
          }}
        />
        
        {/* Market indicators */}
        <div className="absolute top-2.5 right-2.5 flex gap-1">
          {MARKETS.map((_, i) => (
            <div 
              key={i} 
              className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                i === currentMarketIndex ? 'bg-white' : 'bg-white/20'
              }`}
            />
          ))}
        </div>

        <div className={`relative transition-all duration-300 ${isTransitioning ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'}`}>
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-10 h-10 rounded-xl overflow-hidden ${!currentMarket.active && 'opacity-40 grayscale'}`}>
              <img 
                src={currentMarket.icon} 
                alt={currentMarket.symbol}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base">{currentMarket.symbol}</span>
                {!currentMarket.active && (
                  <span className="text-[8px] px-1.5 py-0.5 rounded bg-white/10 text-white/40 uppercase">Coming Soon</span>
                )}
              </div>
              <span className="text-[11px] text-white/40">{currentMarket.name}</span>
            </div>
          </div>

          {currentMarket.active && predictionData ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[9px] text-white/40 uppercase tracking-wider">ETH Price</p>
                <p className="text-lg font-bold">${predictionData.ethPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
              <div className="text-right">
                <p className="text-[9px] text-white/40 uppercase tracking-wider">Market</p>
                <p className="text-xs text-white/60">Prediction</p>
              </div>
            </div>
          ) : !currentMarket.active ? (
            <div className="flex items-center justify-center py-1">
              <div className="flex items-center gap-2 text-white/30">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span className="text-xs">Market not yet available</span>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Live Round Tile */}
      <div className="relative bg-white/[0.03] border border-white/[0.08] rounded-2xl p-3 overflow-hidden animate-fade-in" style={{ animationDelay: '50ms' }}>
        <div className="absolute inset-0 opacity-[0.03]" 
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
            backgroundSize: '20px 20px',
          }}
        />
        <div className="relative">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-[9px] text-white/40 uppercase tracking-wider">Live Round</span>
            </div>
            <span className="text-[11px] text-white/60">
              #{predictionData?.marketId || '--'}
            </span>
          </div>

          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xl font-bold">{formatTime(predictionData?.timeRemaining || 0)}</p>
              <p className="text-[9px] text-white/40">remaining</p>
            </div>
            <div className="text-right">
              <p className="text-base font-bold">{predictionData?.totalPool.toFixed(4) || '0.0000'} ETH</p>
              <p className="text-[9px] text-white/40">in pool</p>
            </div>
          </div>

          {/* Pool Bar */}
          <div className="mb-3">
            <div className="relative h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div 
                className="absolute left-0 top-0 h-full bg-white transition-all duration-700"
                style={{ width: `${upPercent}%` }}
              />
              <div 
                className="absolute right-0 top-0 h-full bg-red-500 transition-all duration-700"
                style={{ width: `${downPercent}%` }}
              />
            </div>
            <div className="flex justify-between mt-1.5 text-[11px]">
              <div className="flex items-center gap-1">
                <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                  <path d="M5 15l7-7 7 7" />
                </svg>
                <span className="text-white font-medium">{upPercent.toFixed(0)}%</span>
                <span className="text-white/30">PUMP</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-white/30">DUMP</span>
                <span className="text-red-400 font-medium">{downPercent.toFixed(0)}%</span>
                <svg className="w-2.5 h-2.5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                  <path d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {/* CTA Button */}
          <button
            onClick={handleBetClick}
            className="w-full py-2.5 rounded-xl font-bold text-sm bg-white text-black transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
          >
            Place Your Bet
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
        </div>
      </div>

      {/* Recent Wins Tile */}
      <div className="relative bg-white/[0.03] border border-white/[0.08] rounded-2xl p-3 overflow-hidden animate-fade-in" style={{ animationDelay: '100ms' }}>
        <div className="absolute inset-0 opacity-[0.03]" 
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
            backgroundSize: '20px 20px',
          }}
        />
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            {/* Trophy SVG icon */}
            <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C13.1 2 14 2.9 14 4V5H16C16.5 5 17 5.2 17.4 5.6C17.8 6 18 6.5 18 7V8C18 9.1 17.6 10.1 16.8 10.8C16.3 11.3 15.7 11.6 15 11.8V12C15 13.1 14.1 14 13 14H11C9.9 14 9 13.1 9 12V11.8C8.3 11.6 7.7 11.3 7.2 10.8C6.4 10.1 6 9.1 6 8V7C6 6.5 6.2 6 6.6 5.6C7 5.2 7.5 5 8 5H10V4C10 2.9 10.9 2 12 2ZM8 7V8C8 8.5 8.2 9 8.6 9.4C9 9.8 9.5 10 10 10V7H8ZM14 7V10C14.5 10 15 9.8 15.4 9.4C15.8 9 16 8.5 16 8V7H14ZM11 16H13V18H16V20H8V18H11V16Z"/>
            </svg>
            <span className="text-[9px] text-white/40 uppercase tracking-wider">Recent Wins</span>
          </div>

          {predictionData?.recentWins && predictionData.recentWins.length > 0 ? (
            <div className="space-y-1.5">
              {predictionData.recentWins.slice(0, 3).map((win, i) => (
                <div 
                  key={i}
                  className="flex items-center justify-between bg-white/[0.03] rounded-lg p-2"
                >
                  <div className="flex items-center gap-2">
                    <img 
                      src={win.pfp || `https://api.dicebear.com/7.x/shapes/svg?seed=${win.username}`}
                      alt={win.username}
                      className="w-6 h-6 rounded-full bg-white/10"
                    />
                    <span className="text-xs text-white/80">@{win.username}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-green-400">+{win.amount.toFixed(4)}</span>
                    <span className="text-[9px] text-white/40">ETH</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-3 text-white/30 text-xs">
              <p>No recent wins yet</p>
              <p className="text-[10px] mt-0.5">Be the first to win!</p>
            </div>
          )}
        </div>
      </div>

      {/* Spacer */}
      <div className="flex-grow min-h-2" />

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-2 animate-fade-in" style={{ animationDelay: '150ms' }}>
        <button
          onClick={() => {
            playClick();
            triggerHaptic('light');
            window.open('https://dexscreener.com/base/0xa12a532b0b7024b1d01ae66a3b8ba3c30eb8f5ef', '_blank');
          }}
          className="flex items-center justify-center gap-2 bg-white/[0.03] border border-white/[0.08] rounded-2xl py-2.5 text-xs text-white/60 hover:text-white hover:bg-white/[0.06] transition-all active:scale-95"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path d="M3 13h4v8H3v-8zm7-10h4v18h-4V3zm7 5h4v13h-4V8z" />
          </svg>
          Chart
        </button>
        <button
          onClick={async () => {
            playClick();
            triggerHaptic('medium');
            try {
              const { sdk } = await import('@farcaster/miniapp-sdk');
              await sdk.actions.viewToken({ token: `eip155:8453/erc20:0xb33ff54b9f7242ef1593d2c9bcd8f9df46c77935` });
            } catch {
              window.open('https://dexscreener.com/base/0xa12a532b0b7024b1d01ae66a3b8ba3c30eb8f5ef', '_blank');
            }
          }}
          className="flex items-center justify-center gap-2 bg-gradient-to-r from-red-500 to-rose-500 rounded-2xl py-2.5 text-xs font-semibold text-white shadow-lg shadow-red-500/20 transition-all hover:scale-[1.02] active:scale-95"
        >
          Buy $BYEMONEY
        </button>
      </div>

      <style jsx>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.4s ease-out forwards;
          opacity: 0;
        }
      `}</style>
    </div>
  );
}