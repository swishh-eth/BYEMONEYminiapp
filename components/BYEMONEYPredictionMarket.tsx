'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPublicClient, http, formatEther, parseEther, encodeFunctionData } from 'viem';
import { base } from 'viem/chains';
import { createClient } from '@supabase/supabase-js';

// BYEMONEY Market Contract
const CONTRACT_ADDRESS = '0xc5dBe9571B10d76020556b8De77287b04fE8ef3d' as `0x${string}`;
const BYEMONEY_TOKEN = '0xA12A532B0B7024b1D01Ae66a3b8cF77366c7dB07' as `0x${string}`;
const BASE_TICKET_PRICE = 1000n * 10n**18n; // 1000 BYEMONEY per ticket
const LOCK_PERIOD_SECONDS = 60 * 60; // 1 hour before end = locked

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = SUPABASE_URL && SUPABASE_ANON_KEY 
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

const CONTRACT_ABI = [
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
    name: 'getPosition',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'marketId', type: 'uint256' },
      { name: 'user', type: 'address' },
    ],
    outputs: [
      { name: 'up', type: 'uint256' },
      { name: 'down', type: 'uint256' },
      { name: 'claimed', type: 'bool' },
    ],
  },
  {
    name: 'buyTickets',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'direction', type: 'uint8' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'claim',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'marketId', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'getPriceInEth',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'isBettingOpen',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'config',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      { name: 'ticketPrice', type: 'uint256' },
      { name: 'roundDuration', type: 'uint256' },
      { name: 'bettingCutoff', type: 'uint256' },
      { name: 'feeBps', type: 'uint256' },
      { name: 'paused', type: 'bool' },
    ],
  },
] as const;

const ERC20_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
] as const;

const publicClient = createPublicClient({
  chain: base,
  transport: http('https://base-mainnet.g.alchemy.com/v2/jKHNMnfb18wYA1HfaHxo5'),
});

type MarketType = 'ETH' | 'BYEMONEY';

interface BYEMONEYPredictionMarketProps {
  userFid?: number;
  username?: string;
  initialData?: {
    marketId: number;
    timeRemaining: number;
    totalPool: number;
    upPool: number;
    downPool: number;
    tokenPrice: number;
  };
  onDataUpdate?: (data: {
    marketId: number;
    timeRemaining: number;
    totalPool: number;
    upPool: number;
    downPool: number;
    tokenPrice: number;
  }) => void;
  onMarketChange?: (market: MarketType) => void;
}

export default function BYEMONEYPredictionMarket({ userFid, username, initialData, onDataUpdate, onMarketChange }: BYEMONEYPredictionMarketProps) {
  const [walletAddress, setWalletAddress] = useState<`0x${string}` | null>(null);
  const [tokenBalance, setTokenBalance] = useState<bigint>(0n);
  const [ticketCount, setTicketCount] = useState(1);
  const [selectedDirection, setSelectedDirection] = useState<'up' | 'down' | null>(null);
  const [timeLeft, setTimeLeft] = useState(() => {
    if (initialData?.timeRemaining) {
      const seconds = initialData.timeRemaining;
      return {
        hours: Math.floor(seconds / 3600),
        minutes: Math.floor((seconds % 3600) / 60),
        seconds: seconds % 60
      };
    }
    return { hours: 0, minutes: 0, seconds: 0 };
  });
  const [txState, setTxState] = useState<'idle' | 'approving' | 'buying' | 'claiming' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [marketData, setMarketData] = useState<{
    id: bigint;
    startPrice: bigint;
    endPrice: bigint;
    startTime: bigint;
    endTime: bigint;
    upPool: bigint;
    downPool: bigint;
    status: number;
    result: number;
    totalTickets: bigint;
  } | null>(initialData ? {
    id: BigInt(initialData.marketId),
    startPrice: 0n,
    endPrice: 0n,
    startTime: 0n,
    endTime: 0n,
    upPool: BigInt(Math.floor(initialData.upPool * 1e18)),
    downPool: BigInt(Math.floor(initialData.downPool * 1e18)),
    status: 0,
    result: 0,
    totalTickets: 0n,
  } : null);
  const [userPosition, setUserPosition] = useState<{ up: bigint; down: bigint; claimed: boolean } | null>(null);
  const [currentPrice, setCurrentPrice] = useState<bigint>(0n);
  const [isBettingOpen, setIsBettingOpen] = useState(true);
  const [ticketPrice, setTicketPrice] = useState<bigint>(BASE_TICKET_PRICE);
  const [ticketSectionClosing, setTicketSectionClosing] = useState(false);
  const [sdk, setSdk] = useState<any>(null);
  const mainContainerRef = useRef<HTMLDivElement>(null);

  // Sound effects
  const playClick = () => {
    try {
      const audio = new Audio('/click.mp3');
      audio.volume = 0.3;
      audio.play().catch(() => {});
    } catch {}
  };

  const triggerHaptic = (type: 'light' | 'medium' | 'heavy') => {
    try {
      if (sdk?.actions?.hapticFeedback) {
        sdk.actions.hapticFeedback(type === 'light' ? 'impact' : type === 'medium' ? 'notification' : 'selection');
      }
    } catch {}
  };

  // Initialize Farcaster SDK
  useEffect(() => {
    const initSdk = async () => {
      try {
        const { sdk: farcasterSdk } = await import('@farcaster/miniapp-sdk');
        const context = await farcasterSdk.context;
        if (context?.client?.clientFid) {
          setSdk(farcasterSdk);
          await farcasterSdk.actions.ready();
        }
      } catch (e) {
        console.log('Not in Farcaster context');
      }
    };
    initSdk();

    // Check localStorage for skip confirmation preference
    if (typeof window !== 'undefined') {
      const skip = localStorage.getItem('skipBetConfirmBYEMONEY');
      if (skip === 'true') setDontShowAgain(true);
    }
  }, []);

  // Fetch market data
  const fetchMarketData = useCallback(async () => {
    try {
      const [market, price, betting, config] = await Promise.all([
        publicClient.readContract({
          address: CONTRACT_ADDRESS,
          abi: CONTRACT_ABI,
          functionName: 'getCurrentMarket',
        }),
        publicClient.readContract({
          address: CONTRACT_ADDRESS,
          abi: CONTRACT_ABI,
          functionName: 'getPriceInEth',
        }).catch(() => 0n),
        publicClient.readContract({
          address: CONTRACT_ADDRESS,
          abi: CONTRACT_ABI,
          functionName: 'isBettingOpen',
        }),
        publicClient.readContract({
          address: CONTRACT_ADDRESS,
          abi: CONTRACT_ABI,
          functionName: 'config',
        }),
      ]);

      setMarketData({
        id: market[0],
        startPrice: market[1],
        endPrice: market[2],
        startTime: market[3],
        endTime: market[4],
        upPool: market[5],
        downPool: market[6],
        status: market[7],
        result: market[8],
        totalTickets: market[9],
      });

      if (price && price > 0n) {
        setCurrentPrice(price);
      }
      setIsBettingOpen(betting);
      setTicketPrice(config[0]);

    } catch (error) {
      console.error('Failed to fetch BYEMONEY market:', error);
    }
  }, []);

  // Fetch user position
  const fetchUserPosition = useCallback(async () => {
    if (!walletAddress || !marketData || marketData.id === 0n) return;

    try {
      const position = await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'getPosition',
        args: [marketData.id, walletAddress],
      });

      setUserPosition({
        up: position[0],
        down: position[1],
        claimed: position[2],
      });
    } catch (error) {
      console.error('Failed to fetch position:', error);
    }
  }, [walletAddress, marketData?.id]);

  // Fetch token balance
  const fetchBalance = useCallback(async () => {
    if (!walletAddress) return;
    try {
      const balance = await publicClient.readContract({
        address: BYEMONEY_TOKEN,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [walletAddress],
      });
      setTokenBalance(balance);
    } catch (error) {
      console.error('Failed to fetch token balance:', error);
    }
  }, [walletAddress]);

  useEffect(() => {
    fetchMarketData();
    const interval = setInterval(fetchMarketData, 30000);
    return () => clearInterval(interval);
  }, [fetchMarketData]);

  useEffect(() => {
    fetchUserPosition();
  }, [fetchUserPosition]);

  useEffect(() => {
    fetchBalance();
    const interval = setInterval(fetchBalance, 60000);
    return () => clearInterval(interval);
  }, [fetchBalance]);

  // Timer
  useEffect(() => {
    if (!marketData || marketData.id === 0n || marketData.status !== 0) return;

    const endTime = Number(marketData.endTime) * 1000;

    const updateTimer = () => {
      const now = Date.now();
      const diff = Math.max(0, endTime - now);

      setTimeLeft({
        hours: Math.floor(diff / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [marketData]);

  // Connect wallet
  const connectWallet = async () => {
    if (!sdk) return;
    playClick();
    triggerHaptic('light');
    try {
      const accounts = await sdk.wallet.ethProvider.request({
        method: 'eth_requestAccounts',
      });
      if (accounts[0]) {
        setWalletAddress(accounts[0] as `0x${string}`);
      }
    } catch (error) {
      console.error('Failed to connect:', error);
    }
  };

  // Handle direction selection
  const handleDirectionSelect = (direction: 'up' | 'down') => {
    playClick();
    triggerHaptic('light');
    
    if (selectedDirection === direction) {
      setTicketSectionClosing(true);
      setTimeout(() => {
        if (mainContainerRef.current) {
          mainContainerRef.current.scrollTo({ top: mainContainerRef.current.scrollTop - 280, behavior: 'smooth' });
        }
      }, 50);
      setTimeout(() => {
        setSelectedDirection(null);
        setTicketSectionClosing(false);
      }, 250);
    } else if (selectedDirection && selectedDirection !== direction) {
      setSelectedDirection(direction);
    } else {
      setSelectedDirection(direction);
      setTimeout(() => {
        if (mainContainerRef.current) {
          mainContainerRef.current.scrollTo({ top: mainContainerRef.current.scrollTop + 280, behavior: 'smooth' });
        }
      }, 100);
    }
  };

  // Buy click handler
  const handleBuyClick = () => {
    playClick();
    triggerHaptic('medium');
    if (dontShowAgain) {
      executeBuy();
    } else {
      setShowConfirmModal(true);
    }
  };

  const handleConfirmBuy = () => {
    playClick();
    if (dontShowAgain) {
      localStorage.setItem('skipBetConfirmBYEMONEY', 'true');
    }
    setShowConfirmModal(false);
    executeBuy();
  };

  // Execute buy with approval flow
  const executeBuy = async () => {
    if (!walletAddress || !selectedDirection || !sdk) return;

    setTxState('approving');
    setErrorMsg('');

    try {
      const totalCost = ticketPrice * BigInt(ticketCount);

      // Check current allowance
      const currentAllowance = await publicClient.readContract({
        address: BYEMONEY_TOKEN,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [walletAddress, CONTRACT_ADDRESS],
      });

      // If allowance insufficient, request exact approval
      if (currentAllowance < totalCost) {
        const approveData = encodeFunctionData({
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [CONTRACT_ADDRESS, totalCost], // Exact amount only
        });

        const approveTxHash = await sdk.wallet.ethProvider.request({
          method: 'eth_sendTransaction',
          params: [{
            from: walletAddress,
            to: BYEMONEY_TOKEN,
            data: approveData,
            chainId: `0x${(8453).toString(16)}`,
          }],
        });

        await publicClient.waitForTransactionReceipt({ hash: approveTxHash });
      }

      // Now buy tickets
      setTxState('buying');

      const buyData = encodeFunctionData({
        abi: CONTRACT_ABI,
        functionName: 'buyTickets',
        args: [selectedDirection === 'up' ? 1 : 2, totalCost],
      });

      const buyTxHash = await sdk.wallet.ethProvider.request({
        method: 'eth_sendTransaction',
        params: [{
          from: walletAddress,
          to: CONTRACT_ADDRESS,
          data: buyData,
          chainId: `0x${(8453).toString(16)}`,
        }],
      });

      await publicClient.waitForTransactionReceipt({ hash: buyTxHash });

      // Log bet to Supabase
      if (userFid && marketData && supabase) {
        try {
          await supabase.from('byemoney_bets').insert({
            fid: userFid,
            wallet_address: walletAddress,
            market_id: Number(marketData.id),
            direction: selectedDirection,
            tickets: ticketCount,
            amount: formatEther(totalCost),
          });
        } catch (e) {
          console.log('Failed to log bet:', e);
        }
      }

      setTxState('success');
      playClick();
      triggerHaptic('heavy');

      // Refresh data
      setTimeout(() => {
        fetchMarketData();
        fetchUserPosition();
        fetchBalance();
        setTxState('idle');
        setSelectedDirection(null);
        setTicketCount(1);
      }, 2000);

    } catch (error: any) {
      console.error('Transaction failed:', error);
      setTxState('error');
      setErrorMsg(error.shortMessage || error.message || 'Transaction failed');
      setTimeout(() => setTxState('idle'), 3000);
    }
  };

  // Claim winnings
  const handleClaim = async (marketId: bigint) => {
    if (!walletAddress || !sdk) return;

    setTxState('claiming');
    setErrorMsg('');

    try {
      const data = encodeFunctionData({
        abi: CONTRACT_ABI,
        functionName: 'claim',
        args: [marketId],
      });

      const txHash = await sdk.wallet.ethProvider.request({
        method: 'eth_sendTransaction',
        params: [{
          from: walletAddress,
          to: CONTRACT_ADDRESS,
          data,
          chainId: `0x${(8453).toString(16)}`,
        }],
      });

      await publicClient.waitForTransactionReceipt({ hash: txHash });

      setTxState('success');
      triggerHaptic('heavy');

      setTimeout(() => {
        fetchUserPosition();
        fetchBalance();
        setTxState('idle');
      }, 2000);

    } catch (error: any) {
      console.error('Claim failed:', error);
      setTxState('error');
      setErrorMsg(error.shortMessage || error.message || 'Claim failed');
      setTimeout(() => setTxState('idle'), 3000);
    }
  };

  // Format token amount
  const formatTokenAmount = (amount: bigint): string => {
    const num = Number(formatEther(amount));
    if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toFixed(0);
  };

  // Calculate ticket price in tokens
  const ticketPriceFormatted = Number(formatEther(ticketPrice));
  const totalCost = ticketPrice * BigInt(ticketCount);
  const totalCostFormatted = Number(formatEther(totalCost));
  const hasEnoughBalance = tokenBalance >= totalCost;

  // Calculate time until betting closes
  const timeUntilLock = marketData 
    ? Math.max(0, Number(marketData.endTime) - LOCK_PERIOD_SECONDS - Math.floor(Date.now() / 1000))
    : 0;
  const bettingLocked = timeUntilLock <= 0;

  // Pool percentages
  const totalPool = marketData ? Number(formatEther(marketData.upPool + marketData.downPool)) : 0;
  const upPercent = totalPool > 0 ? (Number(formatEther(marketData?.upPool || 0n)) / totalPool * 100) : 50;
  const downPercent = 100 - upPercent;

  // Price display
  const priceDisplay = currentPrice > 0n 
    ? `${(Number(formatEther(currentPrice)) * 1e9).toFixed(6)} ETH`
    : 'Loading...';

  return (
    <div 
      ref={mainContainerRef}
      className="min-h-screen bg-black text-white overflow-y-auto pb-24 pt-20"
      style={{ scrollBehavior: 'smooth' }}
    >
      <div className="px-4 space-y-4">
        {/* Header with Market Switcher */}
        <div className="text-center">
          <button 
            onClick={() => {
              playClick();
              triggerHaptic('light');
              if (onMarketChange) onMarketChange('ETH');
            }}
            className="flex items-center justify-center gap-2 mb-1 mx-auto hover:opacity-80 transition-opacity"
          >
            <img src="/logo.png" alt="BYEMONEY" className="w-8 h-8 rounded-full" />
            <h1 className="text-2xl font-bold">BYEMONEY</h1>
            <svg className="w-4 h-4 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
            </svg>
          </button>
          <p className="text-white/60 text-sm">Predict if BYEMONEY goes up or down</p>
        </div>

        {/* Price Display */}
        <div className="bg-white/5 rounded-2xl p-4 text-center">
          <p className="text-white/60 text-xs mb-1">Current Price</p>
          <p className="text-2xl font-bold font-mono">{priceDisplay}</p>
        </div>

        {/* Timer */}
        <div className="bg-white/5 rounded-2xl p-4 text-center">
          <p className="text-white/60 text-xs mb-1">Round Ends In</p>
          <p className="text-3xl font-bold font-mono">
            {timeLeft.hours}h {timeLeft.minutes}m {timeLeft.seconds}s
          </p>
          {bettingLocked && (
            <p className="text-yellow-400 text-xs mt-2">⚠️ Betting locked for this round</p>
          )}
        </div>

        {/* Pool Display */}
        <div className="bg-white/5 rounded-2xl p-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-green-400">PUMP {upPercent.toFixed(0)}%</span>
            <span className="text-white/60">{formatTokenAmount(marketData?.upPool || 0n)} + {formatTokenAmount(marketData?.downPool || 0n)} BYEMONEY</span>
            <span className="text-red-400">DUMP {downPercent.toFixed(0)}%</span>
          </div>
          <div className="h-3 bg-white/10 rounded-full overflow-hidden flex">
            <div 
              className="h-full bg-gradient-to-r from-green-500 to-green-400 transition-all duration-500"
              style={{ width: `${upPercent}%` }}
            />
            <div 
              className="h-full bg-gradient-to-r from-red-400 to-red-500 transition-all duration-500"
              style={{ width: `${downPercent}%` }}
            />
          </div>
        </div>

        {/* Direction Buttons */}
        {!walletAddress ? (
          <button
            onClick={connectWallet}
            className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl font-bold text-lg"
          >
            Connect Wallet to Bet
          </button>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleDirectionSelect('up')}
              disabled={bettingLocked || !isBettingOpen}
              className={`py-4 rounded-2xl font-bold text-lg transition-all ${
                selectedDirection === 'up'
                  ? 'bg-green-500 scale-105'
                  : 'bg-white/10 hover:bg-white/20'
              } ${(bettingLocked || !isBettingOpen) ? 'opacity-50' : ''}`}
            >
              🚀 PUMP
            </button>
            <button
              onClick={() => handleDirectionSelect('down')}
              disabled={bettingLocked || !isBettingOpen}
              className={`py-4 rounded-2xl font-bold text-lg transition-all ${
                selectedDirection === 'down'
                  ? 'bg-red-500 scale-105'
                  : 'bg-white/10 hover:bg-white/20'
              } ${(bettingLocked || !isBettingOpen) ? 'opacity-50' : ''}`}
            >
              💀 DUMP
            </button>
          </div>
        )}

        {/* Ticket Selection */}
        {selectedDirection && !ticketSectionClosing && (
          <div className="bg-white/5 rounded-2xl p-4 space-y-4 animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between">
              <span className="text-white/60">Tickets</span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setTicketCount(Math.max(1, ticketCount - 1))}
                  className="w-10 h-10 rounded-full bg-white/10 font-bold text-xl"
                >
                  -
                </button>
                <span className="text-2xl font-bold w-12 text-center">{ticketCount}</span>
                <button
                  onClick={() => setTicketCount(ticketCount + 1)}
                  className="w-10 h-10 rounded-full bg-white/10 font-bold text-xl"
                >
                  +
                </button>
              </div>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-white/60">Cost</span>
              <span className="font-bold">{formatTokenAmount(totalCost)} BYEMONEY</span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-white/60">Price per Ticket</span>
              <span className="text-white/40">{formatTokenAmount(ticketPrice)} BYEMONEY</span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-white/60">Your Balance</span>
              <span className={`font-bold ${hasEnoughBalance ? 'text-green-400' : 'text-red-400'}`}>
                {formatTokenAmount(tokenBalance)} BYEMONEY
              </span>
            </div>

            <button
              onClick={handleBuyClick}
              disabled={!hasEnoughBalance || txState !== 'idle'}
              className={`w-full py-4 rounded-2xl font-bold text-lg transition-all ${
                hasEnoughBalance && txState === 'idle'
                  ? selectedDirection === 'up'
                    ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                    : 'bg-gradient-to-r from-red-500 to-rose-500'
                  : 'bg-white/20 opacity-50'
              }`}
            >
              {txState === 'approving' ? 'Approving...' :
               txState === 'buying' ? 'Buying...' :
               txState === 'success' ? '✓ Success!' :
               txState === 'error' ? 'Failed' :
               !hasEnoughBalance ? 'Insufficient Balance' :
               `Buy ${ticketCount} Ticket${ticketCount > 1 ? 's' : ''}`}
            </button>

            {errorMsg && (
              <p className="text-red-400 text-sm text-center">{errorMsg}</p>
            )}
          </div>
        )}

        {/* User Position */}
        {userPosition && (userPosition.up > 0n || userPosition.down > 0n) && (
          <div className="bg-white/5 rounded-2xl p-4">
            <h3 className="text-white/60 text-sm mb-2">Your Position</h3>
            <div className="flex justify-between">
              {userPosition.up > 0n && (
                <div className="text-green-400">
                  🚀 {Number(userPosition.up)} PUMP tickets
                </div>
              )}
              {userPosition.down > 0n && (
                <div className="text-red-400">
                  💀 {Number(userPosition.down)} DUMP tickets
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Confirm Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 rounded-2xl p-6 max-w-sm w-full space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full overflow-hidden">
                <img src="/logo.png" alt="" className="w-full h-full object-cover" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Confirm Bet</h3>
                <p className="text-white/60 text-sm">
                  {ticketCount} ticket{ticketCount > 1 ? 's' : ''} on {selectedDirection?.toUpperCase()}
                </p>
              </div>
            </div>

            <div className="bg-white/5 rounded-xl p-3">
              <div className="flex justify-between text-sm">
                <span className="text-white/60">Total Cost</span>
                <span className="font-bold">{formatTokenAmount(totalCost)} BYEMONEY</span>
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                className="rounded"
              />
              <span className="text-white/60">Don't show this again</span>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="py-3 rounded-xl bg-white/10 font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmBuy}
                className={`py-3 rounded-xl font-bold ${
                  selectedDirection === 'up'
                    ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                    : 'bg-gradient-to-r from-red-500 to-rose-500'
                }`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}