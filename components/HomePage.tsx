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
    icon: '/eth.png',
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
    icon: '/clanker.png',
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
  const [burnCount, setBurnCount] = useState(1034262); // Starting value, will fetch real value later
  const [betScrollIndex, setBetScrollIndex] = useState(0);
  const [showDailyClaim, setShowDailyClaim] = useState(false);
  const [dailyClaimMounted, setDailyClaimMounted] = useState(false);
  const [dailyClaimClosing, setDailyClaimClosing] = useState(false);

  // Handle Daily Claim modal open
  const openDailyClaim = () => {
    playClick();
    triggerHaptic('medium');
    setShowDailyClaim(true);
    setTimeout(() => setDailyClaimMounted(true), 10);
  };

  // Handle Daily Claim modal close
  const closeDailyClaim = () => {
    setDailyClaimClosing(true);
    setTimeout(() => {
      setShowDailyClaim(false);
      setDailyClaimMounted(false);
      setDailyClaimClosing(false);
    }, 500);
  };

  // Auto-rotate markets every 4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentMarketIndex((prev) => (prev + 1) % MARKETS.length);
        setIsTransitioning(false);
      }, 700); // Match the 700ms animation duration
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Auto-rotate bets in sync with markets
  useEffect(() => {
    const bets = predictionData?.recentWins || [];
    if (bets.length === 0) return;
    
    const interval = setInterval(() => {
      setBetScrollIndex((prev) => prev + 1);
    }, 4000);
    return () => clearInterval(interval);
  }, [predictionData?.recentWins]);

  // Animated burn counter - ticks up slowly throughout the day
  useEffect(() => {
    // Calculate how much to increment per tick to spread ~50k burns across 24 hours
    // 50000 / 24 hours / 60 min / 60 sec * tick interval
    const tickInterval = 150; // ms between ticks
    const dailyBurns = 50000; // approximate daily burn amount
    const ticksPerDay = (24 * 60 * 60 * 1000) / tickInterval;
    const incrementPerTick = dailyBurns / ticksPerDay;
    
    // Add some randomness to make it feel organic
    const interval = setInterval(() => {
      setBurnCount(prev => {
        const randomMultiplier = 0.5 + Math.random() * 1.5; // 0.5x to 2x
        const increment = Math.floor(incrementPerTick * randomMultiplier);
        return prev + Math.max(1, increment);
      });
    }, tickInterval + Math.random() * 100); // Vary timing slightly
    
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

  // Format burn count with commas
  const formatBurnCount = (count: number) => {
    return count.toLocaleString();
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
    <div className="flex flex-col h-full p-4 pt-20 gap-2 overflow-y-auto scrollbar-hide">
      
      {/* Burn Counter Tile */}
      <div className="relative bg-white/[0.03] border border-white/[0.08] rounded-2xl p-3 overflow-hidden animate-fade-in">
        <div className="absolute inset-0 opacity-[0.03]" 
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
            backgroundSize: '20px 20px',
          }}
        />
        <div className="relative flex items-center justify-between">
          <span className="text-xs text-white/60 uppercase tracking-wider">$BYEMONEY Burned</span>
          <span className="text-lg font-bold text-red-500 tabular-nums">
            {formatBurnCount(burnCount)}
          </span>
        </div>
      </div>

      {/* Quick Actions - Chart & Daily Claim */}
      <div className="grid grid-cols-2 gap-2 animate-fade-in" style={{ animationDelay: '25ms' }}>
        <button
          onClick={async () => {
            playClick();
            triggerHaptic('light');
            const chartUrl = 'https://dexscreener.com/base/0x26d915a941c399b81d6cd47aa5d19beed86662164587b38635455a4dc5edb213';
            try {
              const { sdk } = await import('@farcaster/miniapp-sdk');
              await sdk.actions.openUrl({ url: chartUrl });
            } catch {
              window.open(chartUrl, '_blank');
            }
          }}
          className="flex items-center justify-center gap-2 bg-white rounded-2xl p-3 text-xs font-bold text-black transition-all hover:scale-[1.02] active:scale-95"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path d="M3 13h4v8H3v-8zm7-10h4v18h-4V3zm7 5h4v13h-4V8z" />
          </svg>
          Chart
        </button>
        <button
          onClick={openDailyClaim}
          className="flex items-center justify-center gap-2 bg-white rounded-2xl p-3 text-xs font-bold text-black transition-all hover:scale-[1.02] active:scale-95"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Daily Claim
        </button>
      </div>

      {/* Combined Market + Live Round Tile */}
      <div className="relative bg-white/[0.03] border border-white/[0.08] rounded-2xl p-3 overflow-hidden animate-fade-in" style={{ animationDelay: '50ms' }}>
        <div className="absolute inset-0 opacity-[0.03]" 
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
            backgroundSize: '20px 20px',
          }}
        />
        
        <div className={`relative transition-all duration-700 ease-in-out ${isTransitioning ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'}`}>
          {/* Market Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
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
            {/* Market indicators */}
            <div className="flex gap-1">
              {MARKETS.map((_, i) => (
                <div 
                  key={i} 
                  className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                    i === currentMarketIndex ? 'bg-white' : 'bg-white/20'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Price Row */}
          <div className={`flex items-center justify-between mb-3 ${!currentMarket.active && 'opacity-30'}`}>
            <div>
              <p className={`text-[9px] uppercase tracking-wider ${currentMarket.active ? 'text-white/40' : 'text-white/20'}`}>
                {currentMarket.symbol} Price
              </p>
              <p className="text-lg font-bold">
                {currentMarket.active && predictionData 
                  ? `$${predictionData.ethPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : '$---.--'
                }
              </p>
            </div>
            <div className="text-right">
              <p className={`text-[9px] uppercase tracking-wider ${currentMarket.active ? 'text-white/40' : 'text-white/20'}`}>
                Round
              </p>
              <p className="text-lg font-bold">
                {currentMarket.active ? `#${predictionData?.marketId || '--'}` : '#--'}
              </p>
            </div>
          </div>

          {/* Live Round Info */}
          <div className={`flex items-center justify-between mb-3 ${!currentMarket.active && 'opacity-30'}`}>
            <div className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full ${currentMarket.active ? 'bg-green-400 animate-pulse' : 'bg-white/20'}`} />
              <span className={`text-[9px] uppercase tracking-wider ${currentMarket.active ? 'text-white/40' : 'text-white/20'}`}>
                {currentMarket.active ? 'Live Round' : 'Coming Soon'}
              </span>
            </div>
          </div>

          <div className={`flex items-center justify-between mb-3 ${!currentMarket.active && 'opacity-30'}`}>
            <div>
              <p className="text-xl font-bold">
                {currentMarket.active ? formatTime(predictionData?.timeRemaining || 0) : '--h --m'}
              </p>
              <p className={`text-[9px] ${currentMarket.active ? 'text-white/40' : 'text-white/20'}`}>remaining</p>
            </div>
            <div className="text-right">
              <p className="text-base font-bold">
                {currentMarket.active ? `${predictionData?.totalPool.toFixed(4) || '0.0000'} ETH` : '0.0000 ETH'}
              </p>
              <p className={`text-[9px] ${currentMarket.active ? 'text-white/40' : 'text-white/20'}`}>in pool</p>
            </div>
          </div>

          {/* Pool Bar */}
          <div className={`mb-3 ${!currentMarket.active && 'opacity-30'}`}>
            <div className="relative h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div 
                className={`absolute left-0 top-0 h-full transition-all duration-700 ${currentMarket.active ? 'bg-white' : 'bg-white/30'}`}
                style={{ width: currentMarket.active ? `${upPercent}%` : '50%' }}
              />
              <div 
                className={`absolute right-0 top-0 h-full transition-all duration-700 ${currentMarket.active ? 'bg-red-500' : 'bg-white/20'}`}
                style={{ width: currentMarket.active ? `${downPercent}%` : '50%' }}
              />
            </div>
            <div className="flex justify-between mt-1.5 text-[11px]">
              <div className="flex items-center gap-1">
                <svg className={`w-2.5 h-2.5 ${currentMarket.active ? 'text-white' : 'text-white/30'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                  <path d="M5 15l7-7 7 7" />
                </svg>
                <span className={`font-medium ${currentMarket.active ? 'text-white' : 'text-white/30'}`}>
                  {currentMarket.active ? `${upPercent.toFixed(0)}%` : '--%'}
                </span>
                <span className={currentMarket.active ? 'text-white/30' : 'text-white/20'}>PUMP</span>
              </div>
              <div className="flex items-center gap-1">
                <span className={currentMarket.active ? 'text-white/30' : 'text-white/20'}>DUMP</span>
                <span className={`font-medium ${currentMarket.active ? 'text-red-400' : 'text-white/30'}`}>
                  {currentMarket.active ? `${downPercent.toFixed(0)}%` : '--%'}
                </span>
                <svg className={`w-2.5 h-2.5 ${currentMarket.active ? 'text-red-400' : 'text-white/30'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                  <path d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {/* CTA Button */}
          {currentMarket.active ? (
            <button
              onClick={handleBetClick}
              className="w-full py-2.5 rounded-xl font-bold text-sm bg-white text-black transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
            >
              Place Your Bet
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
          ) : (
            <div className="w-full py-2.5 rounded-xl font-bold text-sm bg-white/10 text-white/30 flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Coming Soon
            </div>
          )}
        </div>
      </div>

      {/* Recent Bets Tile */}
      <div className="relative bg-white/[0.03] border border-white/[0.08] rounded-2xl p-3 overflow-hidden animate-fade-in" style={{ animationDelay: '100ms' }}>
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
              <span className="text-[9px] text-white/40 uppercase tracking-wider">Recent Bets</span>
            </div>
          </div>

          {predictionData?.recentWins && predictionData.recentWins.length > 0 ? (() => {
            const bets = predictionData.recentWins;
            const betsLength = bets.length;
            // Create extended list for smooth infinite scroll
            const extendedBets = [...bets, ...bets, ...bets];
            const scrollOffset = betScrollIndex % betsLength;
            
            return (
              <div className="relative h-[108px] overflow-hidden">
                <div 
                  className="transition-transform duration-700 ease-in-out"
                  style={{ 
                    transform: `translateY(-${scrollOffset * 36}px)`,
                  }}
                >
                  {extendedBets.map((bet, i) => {
                    // Calculate visual position relative to current scroll
                    const visualPos = i - scrollOffset;
                    // Middle is at position 1 (second visible item)
                    const distanceFromMiddle = Math.abs(visualPos - 1);
                    const isMiddle = visualPos === 1;
                    const opacity = isMiddle ? 1 : distanceFromMiddle === 1 ? 0.5 : 0.2;
                    
                    return (
                      <div 
                        key={i}
                        className="flex items-center justify-between px-1 h-[36px]"
                        style={{ 
                          opacity,
                          transform: isMiddle ? 'scale(1.02)' : 'scale(1)',
                          transition: 'opacity 0.7s ease-in-out, transform 0.7s ease-in-out'
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <img 
                            src={bet.pfp || `https://api.dicebear.com/7.x/shapes/svg?seed=${bet.username}`}
                            alt={bet.username}
                            className="rounded-full bg-white/10 w-6 h-6"
                            style={{
                              width: isMiddle ? '28px' : '20px',
                              height: isMiddle ? '28px' : '20px',
                              transition: 'width 0.7s ease-in-out, height 0.7s ease-in-out'
                            }}
                          />
                          <span 
                            className="text-white"
                            style={{
                              fontSize: isMiddle ? '14px' : '12px',
                              fontWeight: isMiddle ? 500 : 400,
                              transition: 'font-size 0.7s ease-in-out'
                            }}
                          >@{bet.username}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span 
                            className={`font-bold ${bet.direction === 'up' ? 'text-white' : 'text-red-400'}`}
                            style={{
                              fontSize: isMiddle ? '14px' : '12px',
                              transition: 'font-size 0.7s ease-in-out'
                            }}
                          >
                            {bet.amount.toFixed(3)} ETH
                          </span>
                          <div 
                            className={`rounded flex items-center justify-center ${bet.direction === 'up' ? 'bg-white/20' : 'bg-red-500/20'}`}
                            style={{
                              width: isMiddle ? '20px' : '16px',
                              height: isMiddle ? '20px' : '16px',
                              transition: 'width 0.7s ease-in-out, height 0.7s ease-in-out'
                            }}
                          >
                            <svg 
                              className={`${bet.direction === 'up' ? 'text-white' : 'text-red-400'}`} 
                              style={{
                                width: isMiddle ? '12px' : '10px',
                                height: isMiddle ? '12px' : '10px',
                              }}
                              fill="none" 
                              stroke="currentColor" 
                              viewBox="0 0 24 24" 
                              strokeWidth={3}
                            >
                              <path d={bet.direction === 'up' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
                            </svg>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })() : (
            <div className="text-center py-3 text-white/30 text-xs">
              <p>No recent bets yet</p>
              <p className="text-[10px] mt-0.5">Be the first to bet!</p>
            </div>
          )}
        </div>
      </div>

      {/* Daily Claim Modal */}
      {showDailyClaim && (
        <div 
          className="fixed inset-0 z-50 flex items-end justify-center"
          onClick={closeDailyClaim}
        >
          {/* Backdrop */}
          <div 
            className={`absolute inset-0 bg-black/70 backdrop-blur-xl transition-opacity duration-500 ease-out ${
              dailyClaimMounted && !dailyClaimClosing ? 'opacity-100' : 'opacity-0'
            }`}
          />
          {/* Content panel */}
          <div 
            className={`relative w-full max-w-md max-h-[80vh] bg-gradient-to-t from-black via-black/95 to-transparent rounded-t-3xl pb-6 px-4 overflow-hidden transition-all duration-500 ${
              dailyClaimMounted && !dailyClaimClosing
                ? 'opacity-100 translate-y-0' 
                : 'opacity-0 translate-y-full'
            }`}
            style={{ transitionTimingFunction: dailyClaimClosing ? 'ease-in' : 'cubic-bezier(0.22, 1, 0.36, 1)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="pt-6 pb-4">
              <h3 className="text-lg font-bold text-white text-center">Daily Claim</h3>
            </div>
            
            <div className="space-y-4 text-sm text-white/70 pb-4">
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold">1</span>
                </div>
                <p><span className="text-white font-medium">Place a Bet</span> - Purchase at least 1 ticket in any daily prediction round to become eligible</p>
              </div>
              
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold">2</span>
                </div>
                <p><span className="text-white font-medium">Come Back Daily</span> - Return each day to claim your share of the daily $BYEMONEY rewards</p>
              </div>
              
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold">3</span>
                </div>
                <p><span className="text-white font-medium">Earn More</span> - The more tickets you buy, the larger your daily claim becomes</p>
              </div>
              
              <div className="mt-4 p-3 bg-white/5 rounded-xl text-xs">
                <p className="text-white/50">
                  <span className="text-red-400">Note:</span> You must have an active bet in the current or previous round to be eligible for daily claims.
                </p>
              </div>
            </div>

            {/* Claim Button - Locked */}
            <div className="mt-2">
              <button
                disabled
                className="w-full py-3 rounded-xl font-bold text-sm bg-white/10 text-white/30 flex items-center justify-center gap-2 cursor-not-allowed"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Claim $BYEMONEY
              </button>
              <p className="text-center text-white/30 text-[10px] mt-2 uppercase tracking-wider">Coming Soon</p>
            </div>
            
            {/* Close hint */}
            <p className="text-center text-white/20 text-[10px] mt-4 uppercase tracking-wider">tap anywhere to close</p>
          </div>
        </div>
      )}

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