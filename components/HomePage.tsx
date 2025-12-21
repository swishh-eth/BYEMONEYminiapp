'use client';

import { useState, useEffect } from 'react';
import { createPublicClient, http, formatEther } from 'viem';
import { base } from 'viem/chains';

// Contract addresses
const ETH_CONTRACT_ADDRESS = '0x0625E29C2A71A834482bFc6b4cc012ACeee62DA4' as `0x${string}`;
const BYEMONEY_CONTRACT_ADDRESS = '0x8BD1Ce1E83CA48F33610EdCb9Dc531D0dA23bb55' as `0x${string}`;

// ABIs for fetching data
const MARKET_ABI = [
  {
    name: 'getCurrentMarket',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      { name: 'id', type: 'uint256' },
      { name: 'startPrice', type: 'uint256' },
      { name: 'endPrice', type: 'uint256' },
      { name: 'startTime', type: 'uint256' },
      { name: 'endTime', type: 'uint256' },
      { name: 'upPool', type: 'uint256' },
      { name: 'downPool', type: 'uint256' },
      { name: 'status', type: 'uint8' },
      { name: 'result', type: 'uint8' },
      { name: 'totalTickets', type: 'uint256' },
    ],
  },
  {
    name: 'getPrice',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

const publicClient = createPublicClient({
  chain: base,
  transport: http('https://base-mainnet.g.alchemy.com/v2/jKHNMnfb18wYA1HfaHxo5'),
});

// Types for props from parent
interface PredictionData {
  marketId: number;
  timeRemaining: number;
  totalPool: number;
  upPool: number;
  downPool: number;
  ethPrice: number;
  recentWins: Array<{
    username: string;
    pfp: string;
    amount: number;
    direction: 'up' | 'down';
    market?: 'ETH' | 'BYEMONEY';
  }>;
}

interface HomePageProps {
  predictionData?: PredictionData;
  onNavigate?: (index: number) => void;
}

// Available markets for carousel (ETH and BYEMONEY only)
const MARKETS = [
  { symbol: 'ETH', name: 'Ethereum', icon: '/eth.png' },
  { symbol: 'BYEMONEY', name: '$BYEMONEY', icon: '/byemoney.png' },
];

// Banner images for carousel - cycles through adspot files
const BANNER_IMAGES = [
  '/adspot1.png',
  '/adspot2.png',
  '/adspot3.png',
  '/adspot4.gif',
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
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [betScrollIndex, setBetScrollIndex] = useState(0);
  const [showBuyOptions, setShowBuyOptions] = useState(false);
  const [showDailyClaim, setShowDailyClaim] = useState(false);
  const [dailyClaimMounted, setDailyClaimMounted] = useState(false);
  const [dailyClaimClosing, setDailyClaimClosing] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  
  // BYEMONEY market data
  const [byemoneyData, setByemoneyData] = useState<{
    marketId: number;
    timeRemaining: number;
    totalPool: number;
    upPool: number;
    downPool: number;
    priceUsd: number;
  } | null>(null);

  // Check if data is loaded
  useEffect(() => {
    const hasEthData = predictionData && predictionData.ethPrice > 0;
    const hasByemoneyData = byemoneyData && byemoneyData.priceUsd > 0;
    if (hasEthData || hasByemoneyData) {
      // Small delay to ensure smooth transition
      setTimeout(() => setDataLoaded(true), 300);
    }
  }, [predictionData, byemoneyData]);

  // Fetch BYEMONEY market data
  useEffect(() => {
    const fetchByemoneyData = async () => {
      try {
        const [market, priceInEth, ethPrice] = await Promise.all([
          publicClient.readContract({
            address: BYEMONEY_CONTRACT_ADDRESS,
            abi: MARKET_ABI,
            functionName: 'getCurrentMarket',
            args: [],
          } as any),
          publicClient.readContract({
            address: BYEMONEY_CONTRACT_ADDRESS,
            abi: MARKET_ABI,
            functionName: 'getPrice',
            args: [],
          } as any) as Promise<bigint>,
          publicClient.readContract({
            address: ETH_CONTRACT_ADDRESS,
            abi: MARKET_ABI,
            functionName: 'getPrice',
            args: [],
          } as any) as Promise<bigint>,
        ]);

        const endTime = Number((market as any)[4]) * 1000;
        const timeRemaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
        const upPool = Number(formatEther((market as any)[5]));
        const downPool = Number(formatEther((market as any)[6]));
        
        const ethPriceUsd = Number(ethPrice) / 1e8;
        const Q96 = 2 ** 96;
        const sqrtPriceX96 = Number(priceInEth);
        const sqrtPrice = sqrtPriceX96 / Q96;
        const byemoneyPerWeth = sqrtPrice * sqrtPrice;
        const wethPer1mByemoney = 1_000_000 / byemoneyPerWeth;
        const priceUsd = wethPer1mByemoney * ethPriceUsd;

        setByemoneyData({
          marketId: Number((market as any)[0]),
          timeRemaining,
          totalPool: upPool + downPool,
          upPool,
          downPool,
          priceUsd,
        });
      } catch (error) {
        console.error('Failed to fetch BYEMONEY data:', error);
      }
    };

    fetchByemoneyData();
    const interval = setInterval(fetchByemoneyData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Handle Daily Claim modal
  const openDailyClaim = () => {
    playClick();
    triggerHaptic('medium');
    setShowDailyClaim(true);
    setTimeout(() => setDailyClaimMounted(true), 10);
  };

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
      }, 350);
      setTimeout(() => {
        setIsTransitioning(false);
      }, 400);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Auto-rotate banners in sync with markets (4 seconds)
  useEffect(() => {
    if (BANNER_IMAGES.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentBannerIndex((prev) => (prev + 1) % BANNER_IMAGES.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Auto-rotate bets
  useEffect(() => {
    const bets = predictionData?.recentWins || [];
    if (bets.length === 0) return;
    const interval = setInterval(() => {
      setBetScrollIndex((prev) => prev + 1);
    }, 4000);
    return () => clearInterval(interval);
  }, [predictionData?.recentWins]);

  const currentMarket = MARKETS[currentMarketIndex];

  // Calculate percentages
  const getMarketPercentages = () => {
    if (currentMarket.symbol === 'ETH' && predictionData && predictionData.totalPool > 0) {
      const up = (predictionData.upPool / predictionData.totalPool) * 100;
      return { upPercent: up, downPercent: 100 - up };
    } else if (currentMarket.symbol === 'BYEMONEY' && byemoneyData && byemoneyData.totalPool > 0) {
      const up = (byemoneyData.upPool / byemoneyData.totalPool) * 100;
      return { upPercent: up, downPercent: 100 - up };
    }
    return { upPercent: 50, downPercent: 50 };
  };
  
  const { upPercent, downPercent } = getMarketPercentages();

  const handleBetClick = () => {
    playClick();
    triggerHaptic('medium');
    onNavigate?.(0);
  };

  const handleBuyToken = async (token: 'ETH' | 'BYEMONEY') => {
    playClick();
    triggerHaptic('heavy');
    try {
      const { sdk } = await import('@farcaster/miniapp-sdk');
      if (token === 'BYEMONEY') {
        // BYEMONEY token address
        await sdk.actions.viewToken({ token: `eip155:8453/erc20:0xA12A532B0B7024b1D01Ae66a3b8cF77366c7dB07` });
      } else {
        // Native ETH on Base
        await sdk.actions.viewToken({ token: `eip155:8453/slip44:60` });
      }
    } catch {
      // Fallback to DexScreener
      const url = token === 'BYEMONEY' 
        ? 'https://dexscreener.com/base/0xA12A532B0B7024b1D01Ae66a3b8cF77366c7dB07'
        : 'https://dexscreener.com/base/eth';
      window.open(url, '_blank');
    }
    // Hide buy options after selection
    setTimeout(() => setShowBuyOptions(false), 500);
  };

  // Auto-hide buy options after 10 seconds
  useEffect(() => {
    if (!showBuyOptions) return;
    const timeout = setTimeout(() => {
      setShowBuyOptions(false);
    }, 10000);
    return () => clearTimeout(timeout);
  }, [showBuyOptions]);

  return (
    <div className="flex flex-col h-full p-4 pt-20 overflow-y-auto scrollbar-hide">
      {/* Main content area */}
      <div className="flex-1 flex flex-col gap-3">
        
        {/* Banner Image Carousel */}
        <div className="relative bg-white/[0.03] border border-white/[0.08] rounded-2xl overflow-hidden animate-fade-in" style={{ height: '180px' }}>
          {BANNER_IMAGES.map((src, i) => (
            <img 
              key={src}
              src={src} 
              alt="Banner"
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${i === currentBannerIndex ? 'opacity-100' : 'opacity-0'}`}
            />
          ))}
        </div>

        {/* Chart & Daily Claim / Buy Options Buttons */}
        <div className="grid grid-cols-2 gap-3 animate-fade-in" style={{ animationDelay: '15ms' }}>
          {!showBuyOptions ? (
            <>
              <button
                onClick={() => {
                  playClick();
                  triggerHaptic('light');
                  setShowBuyOptions(true);
                }}
                className="flex items-center justify-center gap-2 bg-white/[0.03] border border-white/[0.08] rounded-xl p-3 text-xs font-medium text-white/70 transition-all hover:bg-white/[0.06] active:scale-95"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path d="M3 13h4v8H3v-8zm7-10h4v18h-4V3zm7 5h4v13h-4V8z" />
                </svg>
                Chart
              </button>
              <button
                onClick={openDailyClaim}
                className="flex items-center justify-center gap-2 bg-white/[0.03] border border-white/[0.08] rounded-xl p-3 text-xs font-medium text-white/70 transition-all hover:bg-white/[0.06] active:scale-95"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Daily Claim
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => handleBuyToken('ETH')}
                className="flex items-center justify-center gap-2 bg-white/[0.03] border border-white/[0.08] rounded-xl p-3 text-xs font-medium text-white/70 transition-all hover:bg-white/[0.06] active:scale-95 animate-fade-in"
              >
                <img src="/eth.png" alt="ETH" className="w-4 h-4 rounded-full" />
                ETH
              </button>
              <button
                onClick={() => handleBuyToken('BYEMONEY')}
                className="flex items-center justify-center gap-2 bg-white/[0.03] border border-white/[0.08] rounded-xl p-3 text-xs font-medium text-white/70 transition-all hover:bg-white/[0.06] active:scale-95 animate-fade-in"
              >
                <img src="/byemoney.png" alt="BYEMONEY" className="w-4 h-4 rounded-full" />
                BYEMONEY
              </button>
            </>
          )}
        </div>

        {/* Recent Bets Tile */}
        <div className="relative bg-white/[0.03] border border-white/[0.08] rounded-2xl p-3 overflow-hidden animate-fade-in" style={{ animationDelay: '25ms', minHeight: '140px' }}>
          <div className="absolute inset-0 opacity-[0.03]" 
            style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
              backgroundSize: '20px 20px',
            }}
          />
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-[9px] text-white/40 uppercase tracking-wider">Recent Bets</span>
            </div>

            {/* Loading State */}
            {!dataLoaded ? (
              <div className="h-[108px] flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" />
              </div>
            ) : predictionData?.recentWins && predictionData.recentWins.length > 0 ? (() => {
              const bets = predictionData.recentWins;
              const betsLength = bets.length;
              // Create enough copies for seamless scrolling (5 copies = plenty of buffer)
              const extendedBets = [...bets, ...bets, ...bets, ...bets, ...bets];
              // Use modulo on extended length to keep scrolling forever
              const scrollOffset = betScrollIndex % betsLength;
              // Start from the middle copy so we have room to scroll both ways
              const baseOffset = betsLength * 2;
              
              return (
                <div className="relative h-[108px] overflow-hidden">
                  <div 
                    className="transition-transform duration-700 ease-in-out"
                    style={{ transform: `translateY(-${(baseOffset + scrollOffset) * 36}px)` }}
                  >
                    {extendedBets.map((bet, i) => {
                      // Calculate position relative to current view
                      const currentTop = baseOffset + scrollOffset;
                      const visualPos = i - currentTop;
                      const isMiddle = visualPos === 1;
                      const distanceFromMiddle = Math.abs(visualPos - 1);
                      const opacity = isMiddle ? 1 : distanceFromMiddle === 1 ? 0.5 : distanceFromMiddle === 2 ? 0.2 : 0;
                      const isByemoney = bet.market === 'BYEMONEY';
                      
                      // Format amount based on market
                      const amountDisplay = isByemoney 
                        ? `${bet.amount >= 1000000 ? `${(bet.amount / 1000000).toFixed(0)}M` : bet.amount >= 1000 ? `${(bet.amount / 1000).toFixed(0)}K` : bet.amount.toFixed(0)} BYE`
                        : `${bet.amount.toFixed(3)} ETH`;
                      
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
                              className="rounded-full bg-white/10"
                              style={{
                                width: isMiddle ? '28px' : '20px',
                                height: isMiddle ? '28px' : '20px',
                                transition: 'width 0.7s, height 0.7s'
                              }}
                            />
                            <span 
                              className="text-white"
                              style={{
                                fontSize: isMiddle ? '14px' : '12px',
                                fontWeight: isMiddle ? 500 : 400,
                              }}
                            >@{bet.username}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span 
                              className={`font-bold ${bet.direction === 'up' ? 'text-white' : 'text-red-400'}`}
                              style={{ fontSize: isMiddle ? '14px' : '12px' }}
                            >
                              {amountDisplay}
                            </span>
                            <div 
                              className={`rounded flex items-center justify-center ${bet.direction === 'up' ? 'bg-white/20' : 'bg-red-500/20'}`}
                              style={{
                                width: isMiddle ? '20px' : '16px',
                                height: isMiddle ? '20px' : '16px',
                              }}
                            >
                              <svg 
                                className={bet.direction === 'up' ? 'text-white' : 'text-red-400'} 
                                style={{ width: isMiddle ? '12px' : '10px', height: isMiddle ? '12px' : '10px' }}
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
              <div className="h-[108px] flex flex-col items-center justify-center text-white/30 text-xs">
                <p>No recent bets yet</p>
                <p className="text-[10px] mt-0.5">Be the first to bet!</p>
              </div>
            )}
          </div>
        </div>

        {/* Compact Market Tile - Same style as PriceCard */}
        <button
          onClick={handleBetClick}
          className="relative bg-white/[0.03] border border-white/[0.08] rounded-2xl p-3 text-left hover:bg-white/[0.05] transition-all active:scale-[0.99] animate-fade-in"
          style={{ animationDelay: '50ms' }}
        >
          <div className="absolute inset-0 opacity-[0.03] rounded-2xl" 
            style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
              backgroundSize: '20px 20px',
            }}
          />
          
          <div 
            className={`relative ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}
            style={{ transition: 'opacity 0.35s ease-in-out' }}
          >
            {/* Loading State */}
            {!dataLoaded ? (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" />
              </div>
            ) : (
              <>
            {/* Header row */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full overflow-hidden bg-white/10">
                  <img src={currentMarket.icon} alt={currentMarket.symbol} className="w-full h-full object-cover scale-125" />
                </div>
                <span className="text-xs text-white/40 uppercase">{currentMarket.symbol}</span>
                <svg className="w-2 h-2 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                  <path d="M19 9l-7 7-7-7" />
                </svg>
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-white/5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                  <span className="text-[8px] text-white/40">LIVE</span>
                </div>
              </div>
              <div className="flex gap-1">
                {MARKETS.map((_, i) => (
                  <div key={i} className={`w-1.5 h-1.5 rounded-full ${i === currentMarketIndex ? 'bg-white' : 'bg-white/20'}`} />
                ))}
              </div>
            </div>

            {/* Price and Pool row */}
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-2xl font-bold">
                  {currentMarket.symbol === 'ETH' && predictionData 
                    ? `$${predictionData.ethPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : currentMarket.symbol === 'BYEMONEY' && byemoneyData
                    ? `$${byemoneyData.priceUsd.toFixed(3)}`
                    : '$---'
                  }
                </p>
                {/* Time remaining */}
                <p className="text-[10px] text-white/40">
                  {(() => {
                    const seconds = currentMarket.symbol === 'ETH' 
                      ? predictionData?.timeRemaining 
                      : byemoneyData?.timeRemaining;
                    if (!seconds || seconds <= 0) return '0h 0m left';
                    const hours = Math.floor(seconds / 3600);
                    const minutes = Math.floor((seconds % 3600) / 60);
                    return `${hours}h ${minutes}m left`;
                  })()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold">
                  {currentMarket.symbol === 'ETH' 
                    ? `${predictionData?.totalPool.toFixed(4) || '0'} ETH`
                    : `${byemoneyData?.totalPool ? (byemoneyData.totalPool >= 1000000 ? `${(byemoneyData.totalPool / 1000000).toFixed(1)}M` : byemoneyData.totalPool >= 1000 ? `${(byemoneyData.totalPool / 1000).toFixed(1)}K` : byemoneyData.totalPool.toFixed(0)) : '0'}`
                  }
                </p>
                <p className="text-[9px] text-white/40">in pool</p>
              </div>
            </div>

            {/* Pool Bar */}
            <div className="mb-3">
              <div className="relative h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div className="absolute left-0 top-0 h-full bg-white transition-all duration-700" style={{ width: `${upPercent}%` }} />
                <div className="absolute right-0 top-0 h-full bg-red-500 transition-all duration-700" style={{ width: `${downPercent}%` }} />
              </div>
              <div className="flex justify-between mt-1 text-[10px]">
                <div className="flex items-center gap-1">
                  <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                    <path d="M5 15l7-7 7 7" />
                  </svg>
                  <span className="font-medium text-white">{upPercent.toFixed(0)}%</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="font-medium text-red-400">{downPercent.toFixed(0)}%</span>
                  <svg className="w-2.5 h-2.5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                    <path d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Place Bet Button */}
            <div className="w-full py-2 rounded-xl font-bold text-sm bg-white text-black flex items-center justify-center gap-2">
              Place Your Bet
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </div>
              </>
            )}
          </div>
        </button>
      </div>

      {/* Daily Claim Modal */}
      {showDailyClaim && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={closeDailyClaim}>
          <div className={`absolute inset-0 bg-black/70 backdrop-blur-xl transition-opacity duration-500 ease-out ${dailyClaimMounted && !dailyClaimClosing ? 'opacity-100' : 'opacity-0'}`} />
          <div 
            className={`relative w-full max-w-md max-h-[80vh] bg-gradient-to-t from-black via-black/95 to-transparent rounded-t-3xl pb-6 px-4 overflow-hidden transition-all duration-500 ${dailyClaimMounted && !dailyClaimClosing ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-full'}`}
            style={{ transitionTimingFunction: dailyClaimClosing ? 'ease-in' : 'cubic-bezier(0.22, 1, 0.36, 1)' }}
            onClick={(e) => e.stopPropagation()}
          >
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

            <div className="mt-2">
              <button disabled className="w-full py-3 rounded-xl font-bold text-sm bg-white/10 text-white/30 flex items-center justify-center gap-2 cursor-not-allowed">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Claim $BYEMONEY
              </button>
              <p className="text-center text-white/30 text-[10px] mt-2 uppercase tracking-wider">Coming Soon</p>
            </div>
            
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