'use client';

import { useState, useEffect } from 'react';
import { createPublicClient, http, formatEther, encodeFunctionData } from 'viem';
import { base } from 'viem/chains';

// Contract addresses
const ETH_CONTRACT_ADDRESS = '0x69035b4a9B45daDa3411a158762Ca30BfADC6045' as `0x${string}`;
const BYEMONEY_CONTRACT_ADDRESS = '0x42BE4b56af6A0a249180A44EC704dedb7E2d5BED' as `0x${string}`;
const DAILY_CLAIM_ADDRESS = '0xAc32305008af0B1A9Bdb2587c10FFA3908d0AFc4' as `0x${string}`;

const MARKET_ABI = [
  { name: 'getCurrentMarket', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: 'id', type: 'uint256' }, { name: 'startPrice', type: 'uint256' }, { name: 'endPrice', type: 'uint256' }, { name: 'startTime', type: 'uint256' }, { name: 'endTime', type: 'uint256' }, { name: 'upPool', type: 'uint256' }, { name: 'downPool', type: 'uint256' }, { name: 'status', type: 'uint8' }, { name: 'result', type: 'uint8' }, { name: 'totalTickets', type: 'uint256' }] },
  { name: 'getPrice', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
] as const;

const DAILY_CLAIM_ABI = [
  { name: 'getCurrentDay', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'getTimeUntilNextDay', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'getUnclaimedDays', type: 'function', stateMutability: 'view', inputs: [{ name: 'user', type: 'address' }], outputs: [{ name: 'unclaimedDays', type: 'uint256[]' }, { name: 'ethRewards', type: 'uint256[]' }, { name: 'byemoneyRewards', type: 'uint256[]' }] },
  { name: 'getUserDayInfo', type: 'function', stateMutability: 'view', inputs: [{ name: 'day', type: 'uint256' }, { name: 'user', type: 'address' }], outputs: [{ name: 'ticketsEth', type: 'uint256' }, { name: 'ticketsByemoney', type: 'uint256' }, { name: 'ethClaimed', type: 'bool' }, { name: 'byemoneyClaimed', type: 'bool' }] },
  { name: 'getTodayInfo', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: 'day', type: 'uint256' }, { name: 'secondsRemaining', type: 'uint256' }, { name: 'currentEthBalance', type: 'uint256' }, { name: 'currentByemoneyBalance', type: 'uint256' }, { name: 'totalTicketsEthToday', type: 'uint256' }, { name: 'totalTicketsByemoneyToday', type: 'uint256' }] },
  { name: 'claimMultipleDays', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'dayList', type: 'uint256[]' }], outputs: [] },
] as const;

const publicClient = createPublicClient({ chain: base, transport: http('https://base-mainnet.g.alchemy.com/v2/jKHNMnfb18wYA1HfaHxo5') });

interface PredictionData {
  marketId: number;
  timeRemaining: number;
  totalPool: number;
  upPool: number;
  downPool: number;
  ethPrice: number;
  recentWins: Array<{ username: string; pfp: string; amount: number; direction: 'up' | 'down'; market?: 'ETH' | 'BYEMONEY'; }>;
}

interface HomePageProps {
  predictionData?: PredictionData;
  onNavigate?: (index: number) => void;
  walletAddress?: `0x${string}` | null;
  sdk?: any;
}

const MARKETS = [
  { symbol: 'ETH', name: 'Ethereum', icon: '/eth.png' },
  { symbol: 'BYEMONEY', name: '$BYEMONEY', icon: '/byemoney.png' },
];

const BANNER_IMAGES = ['/adspot1.png', '/adspot2.png', '/adspot3.png', '/adspot4.gif'];

const triggerHaptic = async (type: 'light' | 'medium' | 'heavy') => {
  try { const { sdk } = await import('@farcaster/miniapp-sdk'); sdk.haptics.impactOccurred(type); } catch {}
};

const playClick = () => {
  try { const audio = new Audio('/click.mp3'); audio.volume = 0.3; audio.play().catch(() => {}); } catch {}
};

interface UnclaimedReward { day: number; ethReward: bigint; byemoneyReward: bigint; }

export default function HomePage({ predictionData, onNavigate, walletAddress, sdk }: HomePageProps) {
  const [currentMarketIndex, setCurrentMarketIndex] = useState(0);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [betScrollIndex, setBetScrollIndex] = useState(0);
  const [showBuyOptions, setShowBuyOptions] = useState(false);
  const [buyButtonsTransitioning, setBuyButtonsTransitioning] = useState(false);
  const [showDailyClaim, setShowDailyClaim] = useState(false);
  const [dailyClaimMounted, setDailyClaimMounted] = useState(false);
  const [dailyClaimClosing, setDailyClaimClosing] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  
  const [unclaimedRewards, setUnclaimedRewards] = useState<UnclaimedReward[]>([]);
  const [todayTicketsEth, setTodayTicketsEth] = useState(0n);
  const [todayTicketsByemoney, setTodayTicketsByemoney] = useState(0n);
  const [timeUntilNextDay, setTimeUntilNextDay] = useState(0);
  const [claimLoading, setClaimLoading] = useState(false);
  const [claimSuccess, setClaimSuccess] = useState(false);
  const [claimError, setClaimError] = useState('');
  const [dailyClaimDataLoading, setDailyClaimDataLoading] = useState(false);
  
  const [byemoneyData, setByemoneyData] = useState<{ marketId: number; timeRemaining: number; totalPool: number; upPool: number; downPool: number; priceUsd: number; } | null>(null);

  useEffect(() => {
    const hasEthData = predictionData && predictionData.ethPrice > 0;
    const hasByemoneyData = byemoneyData && byemoneyData.priceUsd > 0;
    if (hasEthData || hasByemoneyData) setTimeout(() => setDataLoaded(true), 300);
  }, [predictionData, byemoneyData]);

  useEffect(() => {
    const fetchByemoneyData = async () => {
      try {
        const [market, priceInEth, ethPrice] = await Promise.all([
          publicClient.readContract({ address: BYEMONEY_CONTRACT_ADDRESS, abi: MARKET_ABI, functionName: 'getCurrentMarket' }),
          publicClient.readContract({ address: BYEMONEY_CONTRACT_ADDRESS, abi: MARKET_ABI, functionName: 'getPrice' }),
          publicClient.readContract({ address: ETH_CONTRACT_ADDRESS, abi: MARKET_ABI, functionName: 'getPrice' }),
        ]);
        const endTime = Number(market[4]) * 1000;
        const timeRemaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
        const upPool = Number(formatEther(market[5]));
        const downPool = Number(formatEther(market[6]));
        const ethPriceUsd = Number(ethPrice) / 1e8;
        const Q96 = 2 ** 96;
        const sqrtPriceX96 = Number(priceInEth);
        const sqrtPrice = sqrtPriceX96 / Q96;
        const byemoneyPerWeth = sqrtPrice * sqrtPrice;
        const wethPer1mByemoney = 1_000_000 / byemoneyPerWeth;
        const priceUsd = wethPer1mByemoney * ethPriceUsd;
        setByemoneyData({ marketId: Number(market[0]), timeRemaining, totalPool: upPool + downPool, upPool, downPool, priceUsd });
      } catch (error) { console.error('Failed to fetch BYEMONEY data:', error); }
    };
    fetchByemoneyData();
    const interval = setInterval(fetchByemoneyData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchDailyClaimData = async () => {
    if (!walletAddress) return;
    setDailyClaimDataLoading(true);
    try {
      const [unclaimedData, todayInfo, currentDay] = await Promise.all([
        publicClient.readContract({ address: DAILY_CLAIM_ADDRESS, abi: DAILY_CLAIM_ABI, functionName: 'getUnclaimedDays', args: [walletAddress] }),
        publicClient.readContract({ address: DAILY_CLAIM_ADDRESS, abi: DAILY_CLAIM_ABI, functionName: 'getTodayInfo' }),
        publicClient.readContract({ address: DAILY_CLAIM_ADDRESS, abi: DAILY_CLAIM_ABI, functionName: 'getCurrentDay' }),
      ]);
      const [days, ethRewards, byemoneyRewards] = unclaimedData;
      const rewards: UnclaimedReward[] = [];
      for (let i = 0; i < days.length; i++) {
        if (ethRewards[i] > 0n || byemoneyRewards[i] > 0n) rewards.push({ day: Number(days[i]), ethReward: ethRewards[i], byemoneyReward: byemoneyRewards[i] });
      }
      setUnclaimedRewards(rewards);
      try {
        const userDayInfo = await publicClient.readContract({ address: DAILY_CLAIM_ADDRESS, abi: DAILY_CLAIM_ABI, functionName: 'getUserDayInfo', args: [currentDay, walletAddress] });
        setTodayTicketsEth(userDayInfo[0]);
        setTodayTicketsByemoney(userDayInfo[1]);
      } catch { setTodayTicketsEth(0n); setTodayTicketsByemoney(0n); }
      setTimeUntilNextDay(Number(todayInfo[1]));
    } catch (error) { console.error('Failed to fetch daily claim data:', error); }
    finally { setDailyClaimDataLoading(false); }
  };

  const openDailyClaim = () => {
    playClick(); triggerHaptic('medium');
    setShowDailyClaim(true); setClaimSuccess(false); setClaimError('');
    setTimeout(() => setDailyClaimMounted(true), 10);
    fetchDailyClaimData();
  };

  const closeDailyClaim = () => {
    setDailyClaimClosing(true);
    setTimeout(() => { setShowDailyClaim(false); setDailyClaimMounted(false); setDailyClaimClosing(false); }, 500);
  };

  const handleClaim = async () => {
    if (!walletAddress || !sdk || unclaimedRewards.length === 0) return;
    setClaimLoading(true); setClaimError(''); triggerHaptic('medium');
    try {
      const daysToClaim = unclaimedRewards.map(r => BigInt(r.day));
      const data = encodeFunctionData({ abi: DAILY_CLAIM_ABI, functionName: 'claimMultipleDays', args: [daysToClaim] });
      const txHash = await sdk.wallet.ethProvider.request({ method: 'eth_sendTransaction', params: [{ from: walletAddress, to: DAILY_CLAIM_ADDRESS, data, chainId: `0x${(8453).toString(16)}` }] });
      await publicClient.waitForTransactionReceipt({ hash: txHash });
      setClaimSuccess(true); triggerHaptic('heavy');
      setTimeout(() => fetchDailyClaimData(), 2000);
    } catch (error: any) {
      console.error('Claim failed:', error);
      setClaimError(error?.message?.includes('rejected') ? 'Transaction rejected' : 'Claim failed');
      triggerHaptic('light');
    } finally { setClaimLoading(false); }
  };

  useEffect(() => {
    if (!showDailyClaim || timeUntilNextDay <= 0) return;
    const interval = setInterval(() => setTimeUntilNextDay(prev => Math.max(0, prev - 1)), 1000);
    return () => clearInterval(interval);
  }, [showDailyClaim, timeUntilNextDay]);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => setCurrentMarketIndex((prev) => (prev + 1) % MARKETS.length), 350);
      setTimeout(() => setIsTransitioning(false), 400);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (BANNER_IMAGES.length <= 1) return;
    const interval = setInterval(() => setCurrentBannerIndex((prev) => (prev + 1) % BANNER_IMAGES.length), 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const bets = predictionData?.recentWins || [];
    if (bets.length === 0) return;
    const interval = setInterval(() => setBetScrollIndex((prev) => prev + 1), 4000);
    return () => clearInterval(interval);
  }, [predictionData?.recentWins]);

  const currentMarket = MARKETS[currentMarketIndex];
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

  const handleBetClick = () => { playClick(); triggerHaptic('medium'); onNavigate?.(0); };

  const handleBuyToken = async (token: 'ETH' | 'BYEMONEY') => {
    playClick(); triggerHaptic('heavy');
    try {
      const { sdk } = await import('@farcaster/miniapp-sdk');
      if (token === 'BYEMONEY') await sdk.actions.viewToken({ token: `eip155:8453/erc20:0xA12A532B0B7024b1D01Ae66a3b8cF77366c7dB07` });
      else await sdk.actions.viewToken({ token: `eip155:8453/erc20:0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE` });
    } catch {
      const url = token === 'BYEMONEY' ? 'https://dexscreener.com/base/0xA12A532B0B7024b1D01Ae66a3b8cF77366c7dB07' : 'https://dexscreener.com/base/eth';
      window.open(url, '_blank');
    }
    setTimeout(() => setShowBuyOptions(false), 500);
  };

  useEffect(() => {
    if (!showBuyOptions) return;
    const timeout = setTimeout(() => {
      setBuyButtonsTransitioning(true);
      setTimeout(() => { setShowBuyOptions(false); setBuyButtonsTransitioning(false); }, 300);
    }, 10000);
    return () => clearTimeout(timeout);
  }, [showBuyOptions]);

  const handleShowBuyOptions = () => {
    playClick(); triggerHaptic('light'); setBuyButtonsTransitioning(true);
    setTimeout(() => { setShowBuyOptions(true); setBuyButtonsTransitioning(false); }, 300);
  };

  const formatTimeRemaining = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}h ${minutes}m ${secs}s`;
  };

  const totalEthReward = unclaimedRewards.reduce((sum, r) => sum + r.ethReward, 0n);
  const totalByemoneyReward = unclaimedRewards.reduce((sum, r) => sum + r.byemoneyReward, 0n);
  const hasRewards = totalEthReward > 0n || totalByemoneyReward > 0n;
  const hasTodayTickets = todayTicketsEth > 0n || todayTicketsByemoney > 0n;

  return (
    <div className="flex flex-col h-full p-4 pt-20 overflow-hidden">
      <div className="flex-1 flex flex-col gap-3">
        
        {/* Banner */}
        <div className="relative bg-white/[0.03] border border-white/[0.08] rounded-2xl overflow-hidden animate-fade-in" style={{ height: '180px' }}>
          {BANNER_IMAGES.map((src, i) => (
            <img key={src} src={src} alt="Banner" className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${i === currentBannerIndex ? 'opacity-100' : 'opacity-0'}`} />
          ))}
        </div>

        {/* Buttons */}
        <div className="grid grid-cols-2 gap-3 animate-fade-in" style={{ animationDelay: '15ms' }}>
          <div className={`col-span-2 grid grid-cols-2 gap-3 transition-opacity duration-300 ${buyButtonsTransitioning ? 'opacity-0' : 'opacity-100'}`}>
          {!showBuyOptions ? (
            <>
              <button onClick={handleShowBuyOptions} className="flex items-center justify-center gap-2 bg-white/[0.03] border border-white/[0.08] rounded-xl p-3 text-xs font-medium text-white/70 transition-all hover:bg-white/[0.06] active:scale-95">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path d="M3 13h4v8H3v-8zm7-10h4v18h-4V3zm7 5h4v13h-4V8z" /></svg>
                Chart
              </button>
              <button onClick={openDailyClaim} className={`flex items-center justify-center gap-2 bg-white/[0.03] border rounded-xl p-3 text-xs font-medium transition-all hover:bg-white/[0.06] active:scale-95 ${hasRewards ? 'border-green-500/50 text-green-400' : 'border-white/[0.08] text-white/70'}`}>
                {hasRewards ? <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" /> : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                Daily Claim
              </button>
            </>
          ) : (
            <>
              <button onClick={() => handleBuyToken('ETH')} className="flex items-center justify-center gap-2 bg-white/[0.03] border border-white/[0.08] rounded-xl p-3 text-xs font-medium text-white/70 transition-all hover:bg-white/[0.06] active:scale-95">
                <img src="/eth.png" alt="ETH" className="w-4 h-4 rounded-full" />ETH
              </button>
              <button onClick={() => handleBuyToken('BYEMONEY')} className="flex items-center justify-center gap-2 bg-white/[0.03] border border-white/[0.08] rounded-xl p-3 text-xs font-medium text-white/70 transition-all hover:bg-white/[0.06] active:scale-95">
                <img src="/byemoney.png" alt="BYEMONEY" className="w-4 h-4 rounded-full" />BYEMONEY
              </button>
            </>
          )}
          </div>
        </div>

        {/* Market Tile */}
        <button onClick={handleBetClick} className="relative bg-white/[0.03] border border-white/[0.08] rounded-2xl p-3 text-left hover:bg-white/[0.05] transition-all active:scale-[0.99] animate-fade-in" style={{ animationDelay: '25ms', minHeight: '172px' }}>
          <div className="absolute inset-0 opacity-[0.03] rounded-2xl" style={{ backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`, backgroundSize: '20px 20px' }} />
          <div className={`relative h-full ${isTransitioning ? 'opacity-0' : 'opacity-100'}`} style={{ transition: 'opacity 0.35s ease-in-out' }}>
            {!dataLoaded ? (
              <div className="flex items-center justify-center h-full"><div className="w-6 h-6 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" /></div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full overflow-hidden bg-white/10"><img src={currentMarket.icon} alt={currentMarket.symbol} className="w-full h-full object-cover scale-125" /></div>
                    <span className="text-xs text-white/40 uppercase">{currentMarket.symbol}</span>
                    <svg className="w-2 h-2 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}><path d="M19 9l-7 7-7-7" /></svg>
                    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-white/5"><span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span><span className="text-[8px] text-white/40">LIVE</span></div>
                  </div>
                  <div className="flex gap-1">{MARKETS.map((_, i) => <div key={i} className={`w-1.5 h-1.5 rounded-full ${i === currentMarketIndex ? 'bg-white' : 'bg-white/20'}`} />)}</div>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-2xl font-bold">{currentMarket.symbol === 'ETH' && predictionData ? `$${predictionData.ethPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : currentMarket.symbol === 'BYEMONEY' && byemoneyData ? `$${byemoneyData.priceUsd.toFixed(3)}` : '$---'}</p>
                    <p className="text-[10px] text-white/40">{(() => { const seconds = currentMarket.symbol === 'ETH' ? predictionData?.timeRemaining : byemoneyData?.timeRemaining; if (!seconds || seconds <= 0) return '0h 0m left'; return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m left`; })()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">{currentMarket.symbol === 'ETH' ? `${predictionData?.totalPool.toFixed(4) || '0'} ETH` : `${byemoneyData?.totalPool ? (byemoneyData.totalPool >= 1000000 ? `${(byemoneyData.totalPool / 1000000).toFixed(1)}M` : byemoneyData.totalPool >= 1000 ? `${(byemoneyData.totalPool / 1000).toFixed(1)}K` : byemoneyData.totalPool.toFixed(0)) : '0'}`}</p>
                    <p className="text-[9px] text-white/40">in pool</p>
                  </div>
                </div>
                <div className="mb-3">
                  <div className="relative h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="absolute left-0 top-0 h-full bg-white transition-all duration-700" style={{ width: `${upPercent}%` }} />
                    <div className="absolute right-0 top-0 h-full bg-red-500 transition-all duration-700" style={{ width: `${downPercent}%` }} />
                  </div>
                  <div className="flex justify-between mt-1 text-[10px]">
                    <div className="flex items-center gap-1"><svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}><path d="M5 15l7-7 7 7" /></svg><span className="font-medium text-white">{upPercent.toFixed(0)}%</span></div>
                    <div className="flex items-center gap-1"><span className="font-medium text-red-400">{downPercent.toFixed(0)}%</span><svg className="w-2.5 h-2.5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}><path d="M19 9l-7 7-7-7" /></svg></div>
                  </div>
                </div>
                <div className="w-full py-2 rounded-xl font-bold text-sm bg-white text-black flex items-center justify-center gap-2">Place Your Bet<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg></div>
              </>
            )}
          </div>
        </button>

        {/* Recent Bets */}
        <div className="relative bg-white/[0.03] border border-white/[0.08] rounded-2xl p-3 overflow-hidden animate-fade-in-opacity" style={{ animationDelay: '50ms', minHeight: '156px' }}>
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`, backgroundSize: '20px 20px' }} />
          <div className="relative h-full flex flex-col">
            <div className="flex items-center gap-2 mb-2"><div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /><span className="text-[9px] text-white/40 uppercase tracking-wider">Recent Bets</span></div>
            {!dataLoaded ? (
              <div className="flex-1 flex items-center justify-center"><div className="w-6 h-6 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" /></div>
            ) : predictionData?.recentWins && predictionData.recentWins.length > 0 ? (() => {
              const bets = predictionData.recentWins;
              const betsLength = bets.length;
              const extendedBets = [...bets, ...bets, ...bets, ...bets, ...bets];
              const scrollOffset = betScrollIndex % betsLength;
              const baseOffset = betsLength * 2;
              const enableTransitions = betScrollIndex > 0;
              return (
                <div className="relative h-[108px] overflow-hidden">
                  <div className={enableTransitions ? "transition-transform duration-700 ease-in-out" : ""} style={{ transform: `translateY(-${(baseOffset + scrollOffset) * 36}px)` }}>
                    {extendedBets.map((bet, i) => {
                      const currentTop = baseOffset + scrollOffset;
                      const visualPos = i - currentTop;
                      const isMiddle = visualPos === 1;
                      const distanceFromMiddle = Math.abs(visualPos - 1);
                      const opacity = isMiddle ? 1 : distanceFromMiddle === 1 ? 0.5 : distanceFromMiddle === 2 ? 0.2 : 0;
                      const isByemoney = bet.market === 'BYEMONEY';
                      const amountDisplay = isByemoney ? `${bet.amount >= 1000000 ? `${(bet.amount / 1000000).toFixed(0)}M` : bet.amount >= 1000 ? `${(bet.amount / 1000).toFixed(0)}K` : bet.amount.toFixed(0)} BYE` : `${bet.amount.toFixed(3)} ETH`;
                      return (
                        <div key={i} className="flex items-center justify-between px-1 h-[36px]" style={{ opacity, transform: isMiddle ? 'scale(1.02)' : 'scale(1)', transition: enableTransitions ? 'opacity 0.7s ease-in-out, transform 0.7s ease-in-out' : 'none' }}>
                          <div className="flex items-center gap-2">
                            <img src={bet.pfp || `https://api.dicebear.com/7.x/shapes/svg?seed=${bet.username}`} alt={bet.username} className="rounded-full bg-white/10" style={{ width: isMiddle ? '28px' : '20px', height: isMiddle ? '28px' : '20px', transition: 'width 0.7s, height 0.7s' }} />
                            <span className="text-white" style={{ fontSize: isMiddle ? '14px' : '12px', fontWeight: isMiddle ? 500 : 400 }}>@{bet.username}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className={`font-bold ${bet.direction === 'up' ? 'text-white' : 'text-red-400'}`} style={{ fontSize: isMiddle ? '14px' : '12px' }}>{amountDisplay}</span>
                            <div className={`rounded flex items-center justify-center ${bet.direction === 'up' ? 'bg-white/20' : 'bg-red-500/20'}`} style={{ width: isMiddle ? '20px' : '16px', height: isMiddle ? '20px' : '16px' }}>
                              <svg className={bet.direction === 'up' ? 'text-white' : 'text-red-400'} style={{ width: isMiddle ? '12px' : '10px', height: isMiddle ? '12px' : '10px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}><path d={bet.direction === 'up' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} /></svg>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })() : (
              <div className="h-[108px] flex flex-col items-center justify-center text-white/30 text-xs"><p>No recent bets yet</p><p className="text-[10px] mt-0.5">Be the first to bet!</p></div>
            )}
          </div>
        </div>
      </div>

      {/* Daily Claim Modal */}
      {showDailyClaim && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={closeDailyClaim}>
          <div className={`absolute inset-0 bg-black/70 backdrop-blur-xl transition-opacity duration-500 ease-out ${dailyClaimMounted && !dailyClaimClosing ? 'opacity-100' : 'opacity-0'}`} />
          <div className={`relative w-full max-w-md max-h-[85vh] bg-gradient-to-t from-black via-black/95 to-transparent rounded-t-3xl pb-6 px-4 overflow-y-auto transition-all duration-500 ${dailyClaimMounted && !dailyClaimClosing ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-full'}`} style={{ transitionTimingFunction: dailyClaimClosing ? 'ease-in' : 'cubic-bezier(0.22, 1, 0.36, 1)' }} onClick={(e) => e.stopPropagation()}>
            <div className="pt-6 pb-4">
              <h3 className="text-lg font-bold text-white text-center">Daily Claim</h3>
              <p className="text-center text-white/40 text-xs mt-1">Next reset in {formatTimeRemaining(timeUntilNextDay)}</p>
            </div>
            
            {dailyClaimDataLoading ? (
              <div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" /></div>
            ) : !walletAddress ? (
              <div className="text-center py-8"><p className="text-white/50 text-sm">Connect your wallet to view rewards</p></div>
            ) : (
              <>
                <div className="bg-white/5 rounded-xl p-4 mb-4">
                  <p className="text-xs text-white/40 uppercase tracking-wider mb-2">Today's Tickets</p>
                  <div className="flex justify-between">
                    <div className="flex items-center gap-2"><img src="/eth.png" alt="ETH" className="w-5 h-5 rounded-full" /><span className="text-white font-medium">{todayTicketsEth.toString()} tickets</span></div>
                    <div className="flex items-center gap-2"><img src="/byemoney.png" alt="BYEMONEY" className="w-5 h-5 rounded-full" /><span className="text-white font-medium">{todayTicketsByemoney.toString()} tickets</span></div>
                  </div>
                  {!hasTodayTickets && <p className="text-white/30 text-xs mt-2">Place bets today to earn tomorrow's rewards!</p>}
                </div>

                {hasRewards ? (
                  <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-4">
                    <p className="text-xs text-green-400 uppercase tracking-wider mb-2">Claimable Rewards</p>
                    <div className="space-y-2">
                      {totalEthReward > 0n && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2"><img src="/eth.png" alt="ETH" className="w-5 h-5 rounded-full" /><span className="text-white">ETH</span></div>
                          <span className="text-green-400 font-bold">{Number(formatEther(totalEthReward)).toFixed(6)} ETH</span>
                        </div>
                      )}
                      {totalByemoneyReward > 0n && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2"><img src="/byemoney.png" alt="BYEMONEY" className="w-5 h-5 rounded-full" /><span className="text-white">BYEMONEY</span></div>
                          <span className="text-green-400 font-bold">{Number(formatEther(totalByemoneyReward)) >= 1000000 ? `${(Number(formatEther(totalByemoneyReward)) / 1000000).toFixed(2)}M` : Number(formatEther(totalByemoneyReward)) >= 1000 ? `${(Number(formatEther(totalByemoneyReward)) / 1000).toFixed(2)}K` : Number(formatEther(totalByemoneyReward)).toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                    <p className="text-white/40 text-xs mt-2">From {unclaimedRewards.length} day{unclaimedRewards.length > 1 ? 's' : ''}</p>
                  </div>
                ) : (
                  <div className="bg-white/5 rounded-xl p-4 mb-4">
                    <p className="text-white/50 text-sm text-center">No rewards to claim yet</p>
                    <p className="text-white/30 text-xs text-center mt-1">Bet today, claim tomorrow!</p>
                  </div>
                )}

                <div className="space-y-3 text-sm text-white/70 mb-4">
                  <p className="text-xs text-white/40 uppercase tracking-wider">How it works</p>
                  <div className="flex gap-3"><div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0"><span className="text-[10px] font-bold">1</span></div><p className="text-xs"><span className="text-white font-medium">Place Bets</span> - Buy tickets in any prediction market</p></div>
                  <div className="flex gap-3"><div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0"><span className="text-[10px] font-bold">2</span></div><p className="text-xs"><span className="text-white font-medium">Earn Daily</span> - Get a share of 0.5% of all market fees</p></div>
                  <div className="flex gap-3"><div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0"><span className="text-[10px] font-bold">3</span></div><p className="text-xs"><span className="text-white font-medium">Claim Daily</span> - Come back each day to claim your rewards</p></div>
                </div>

                {claimSuccess ? (
                  <div className="w-full py-3 rounded-xl font-bold text-sm bg-green-500 text-white flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path d="M5 13l4 4L19 7" /></svg>
                    Claimed!
                  </div>
                ) : claimError ? (
                  <div className="space-y-2">
                    <div className="w-full py-3 rounded-xl font-bold text-sm bg-red-500/20 text-red-400 flex items-center justify-center gap-2">{claimError}</div>
                    <button onClick={handleClaim} disabled={!hasRewards || claimLoading} className="w-full py-3 rounded-xl font-bold text-sm bg-white text-black flex items-center justify-center gap-2">Try Again</button>
                  </div>
                ) : (
                  <button onClick={handleClaim} disabled={!hasRewards || claimLoading} className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${hasRewards && !claimLoading ? 'bg-white text-black active:scale-95' : 'bg-white/10 text-white/30 cursor-not-allowed'}`}>
                    {claimLoading ? <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" /> : hasRewards ? (
                      <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>Claim Rewards</>
                    ) : (
                      <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>No Rewards Yet</>
                    )}
                  </button>
                )}
              </>
            )}
            
            <p className="text-center text-white/20 text-[10px] mt-4 uppercase tracking-wider">tap anywhere to close</p>
          </div>
        </div>
      )}

      <style jsx>{`
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fade-in 0.4s ease-out forwards; opacity: 0; }
        @keyframes fade-in-opacity { from { opacity: 0; } to { opacity: 1; } }
        .animate-fade-in-opacity { animation: fade-in-opacity 0.4s ease-out forwards; opacity: 0; }
      `}</style>
    </div>
  );
}