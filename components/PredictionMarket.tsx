'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPublicClient, http, formatEther, parseEther, encodeFunctionData } from 'viem';
import { base } from 'viem/chains';
import { createClient } from '@supabase/supabase-js';

const CONTRACT_ADDRESS = '0x0625E29C2A71A834482bFc6b4cc012ACeee62DA4' as `0x${string}`;
const TICKET_PRICE_ETH = 0.001;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
    stateMutability: 'payable',
    inputs: [{ name: 'direction', type: 'uint8' }],
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
    name: 'getPrice',
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
] as const;

const publicClient = createPublicClient({
  chain: base,
  transport: http('https://mainnet.base.org'),
});

interface PredictionMarketProps {
  userFid?: number;
  username?: string;
}

interface RecentBet {
  id: string;
  fid: number;
  username: string;
  pfp_url: string;
  direction: 'up' | 'down';
  tickets: number;
  timestamp: string;
  wallet_address: string;
  market_id: number;
  price_at_bet: number | null;
}

export default function PredictionMarket({ userFid, username }: PredictionMarketProps) {
  const [walletAddress, setWalletAddress] = useState<`0x${string}` | null>(null);
  const [ethBalance, setEthBalance] = useState<string>('0');
  const [ticketCount, setTicketCount] = useState(1);
  const [selectedDirection, setSelectedDirection] = useState<'up' | 'down' | null>(null);
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [txState, setTxState] = useState<'idle' | 'buying' | 'claiming' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [recentBets, setRecentBets] = useState<RecentBet[]>([]);
  const [userPfp, setUserPfp] = useState<string | null>(null);
  
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
  } | null>(null);
  
  const [userPosition, setUserPosition] = useState<{
    up: bigint;
    down: bigint;
    claimed: boolean;
  } | null>(null);
  
  const [currentPrice, setCurrentPrice] = useState<bigint | null>(null);
  const [isBettingOpen, setIsBettingOpen] = useState(true);
  const [sdk, setSdk] = useState<any>(null);

  useEffect(() => {
    const skipModal = localStorage.getItem('skipBetConfirm') === 'true';
    if (skipModal) setDontShowAgain(true);
  }, []);

  useEffect(() => {
    const initSDK = async () => {
      try {
        const { sdk: farcasterSdk } = await import('@farcaster/miniapp-sdk');
        setSdk(farcasterSdk);
        
        try {
          const accounts = await farcasterSdk.wallet.ethProvider.request({
            method: 'eth_accounts',
          }) as string[];
          if (accounts?.[0]) {
            setWalletAddress(accounts[0] as `0x${string}`);
          }
        } catch {
        }
      } catch (error) {
        console.log('SDK init error:', error);
      }
    };
    initSDK();
  }, []);

  useEffect(() => {
    if (userFid) {
      fetchOrCreateUser(userFid, username || '');
    }
  }, [userFid, username]);

  const fetchOrCreateUser = async (fid: number, uname: string) => {
    try {
      const { data: existing } = await supabase
        .from('prediction_users')
        .select('pfp_url')
        .eq('fid', fid)
        .single();

      if (existing?.pfp_url) {
        setUserPfp(existing.pfp_url);
        return;
      }

      const response = await fetch(`/api/user?fid=${fid}`);
      if (response.ok) {
        const userData = await response.json();
        
        await supabase.from('prediction_users').upsert({
          fid,
          username: userData.username || uname,
          pfp_url: userData.pfp_url || '',
          updated_at: new Date().toISOString(),
        });
        
        setUserPfp(userData.pfp_url);
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
    }
  };

  const fetchRecentBets = useCallback(async () => {
    if (!marketData?.id) return;
    
    try {
      console.log('Fetching bets for market:', Number(marketData.id));
      
      const { data, error } = await supabase
        .from('prediction_bets')
        .select(`
          id,
          fid,
          direction,
          tickets,
          timestamp,
          wallet_address,
          market_id,
          price_at_bet,
          prediction_users (
            username,
            pfp_url
          )
        `)
        .eq('market_id', Number(marketData.id))
        .order('timestamp', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Supabase fetch error:', error);
        return;
      }

      console.log('Fetched bets:', data);

      if (data) {
        const bets: RecentBet[] = data.map((bet: any) => ({
          id: bet.id,
          fid: bet.fid,
          username: bet.prediction_users?.username || 'anon',
          pfp_url: bet.prediction_users?.pfp_url || '',
          direction: bet.direction,
          tickets: bet.tickets,
          timestamp: bet.timestamp,
          wallet_address: bet.wallet_address,
          market_id: bet.market_id,
          price_at_bet: bet.price_at_bet,
        }));
        setRecentBets(bets);
      }
    } catch (error) {
      console.error('Failed to fetch bets:', error);
    }
  }, [marketData?.id]);

  const fetchMarketData = useCallback(async () => {
    try {
      const [market, price, betting] = await Promise.all([
        publicClient.readContract({
          address: CONTRACT_ADDRESS,
          abi: CONTRACT_ABI,
          functionName: 'getCurrentMarket',
        }),
        publicClient.readContract({
          address: CONTRACT_ADDRESS,
          abi: CONTRACT_ABI,
          functionName: 'getPrice',
        }),
        publicClient.readContract({
          address: CONTRACT_ADDRESS,
          abi: CONTRACT_ABI,
          functionName: 'isBettingOpen',
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
      setCurrentPrice(price);
      setIsBettingOpen(betting);
    } catch (error) {
      console.error('Failed to fetch market:', error);
    }
  }, []);

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

  const fetchBalance = useCallback(async () => {
    if (!walletAddress) return;
    try {
      const balance = await publicClient.getBalance({ address: walletAddress });
      setEthBalance(formatEther(balance));
    } catch (error) {
      console.error('Failed to fetch balance:', error);
    }
  }, [walletAddress]);

  useEffect(() => {
    fetchMarketData();
    const interval = setInterval(fetchMarketData, 15000);
    return () => clearInterval(interval);
  }, [fetchMarketData]);

  useEffect(() => {
    fetchUserPosition();
  }, [fetchUserPosition]);

  useEffect(() => {
    fetchBalance();
    const interval = setInterval(fetchBalance, 30000);
    return () => clearInterval(interval);
  }, [fetchBalance]);

  useEffect(() => {
    fetchRecentBets();
    const interval = setInterval(fetchRecentBets, 20000);
    return () => clearInterval(interval);
  }, [fetchRecentBets]);

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

  const connectWallet = async () => {
    if (!sdk) return;
    try {
      const accounts = await sdk.wallet.ethProvider.request({
        method: 'eth_requestAccounts',
      });
      if (accounts?.[0]) {
        setWalletAddress(accounts[0] as `0x${string}`);
      }
    } catch (error) {
      console.error('Failed to connect:', error);
    }
  };

  const handleDirectionClick = (direction: 'up' | 'down') => {
    if (selectedDirection === direction) {
      setSelectedDirection(null);
    } else {
      setSelectedDirection(direction);
    }
  };

  const handleBuyClick = () => {
    if (dontShowAgain) {
      executeBuy();
    } else {
      setShowConfirmModal(true);
    }
  };

  const handleConfirmBuy = () => {
    if (dontShowAgain) {
      localStorage.setItem('skipBetConfirm', 'true');
    }
    setShowConfirmModal(false);
    executeBuy();
  };

  const executeBuy = async () => {
    if (!walletAddress || !selectedDirection || !sdk) return;

    setTxState('buying');
    setErrorMsg('');
    
    try {
      const totalCost = parseEther((ticketCount * TICKET_PRICE_ETH).toString());
      
      const data = encodeFunctionData({
        abi: CONTRACT_ABI,
        functionName: 'buyTickets',
        args: [selectedDirection === 'up' ? 1 : 2],
      });

      const txHash = await sdk.wallet.ethProvider.request({
        method: 'eth_sendTransaction',
        params: [{
          from: walletAddress,
          to: CONTRACT_ADDRESS,
          value: `0x${totalCost.toString(16)}`,
          data,
        }],
      });

      await publicClient.waitForTransactionReceipt({ hash: txHash });

      if (userFid && marketData) {
        const betData = {
          fid: userFid,
          wallet_address: walletAddress,
          market_id: Number(marketData.id),
          direction: selectedDirection,
          tickets: ticketCount,
          tx_hash: txHash,
          price_at_bet: currentPriceUsd,
          timestamp: new Date().toISOString(),
        };
        console.log('Inserting bet:', betData);
        
        const { error: betError } = await supabase.from('prediction_bets').insert(betData);
        if (betError) {
          console.error('Failed to save bet to Supabase:', betError);
        } else {
          console.log('Bet saved to Supabase');
        }
      } else {
        console.log('Missing userFid or marketData:', { userFid, marketId: marketData?.id });
      }
      
      setTxState('success');
      fetchMarketData();
      fetchUserPosition();
      fetchBalance();
      fetchRecentBets();
      
      setTimeout(() => {
        setTxState('idle');
        setSelectedDirection(null);
        setTicketCount(1);
      }, 2500);
    } catch (error: any) {
      console.error('Buy failed:', error);
      setTxState('error');
      setErrorMsg(error?.message?.includes('rejected') ? 'Rejected' : 'Failed');
      setTimeout(() => {
        setTxState('idle');
        setErrorMsg('');
      }, 2500);
    }
  };

  const handleClaim = async () => {
    if (!walletAddress || !marketData || !sdk) return;

    setTxState('claiming');
    
    try {
      const data = encodeFunctionData({
        abi: CONTRACT_ABI,
        functionName: 'claim',
        args: [marketData.id],
      });

      const txHash = await sdk.wallet.ethProvider.request({
        method: 'eth_sendTransaction',
        params: [{
          from: walletAddress,
          to: CONTRACT_ADDRESS,
          data,
        }],
      });

      await publicClient.waitForTransactionReceipt({ hash: txHash });
      
      setTxState('success');
      fetchUserPosition();
      fetchBalance();
      
      setTimeout(() => setTxState('idle'), 2500);
    } catch (error) {
      console.error('Claim failed:', error);
      setTxState('error');
      setTimeout(() => setTxState('idle'), 2500);
    }
  };

  const upPool = marketData ? Number(formatEther(marketData.upPool)) : 0;
  const downPool = marketData ? Number(formatEther(marketData.downPool)) : 0;
  const totalPool = upPool + downPool;
  const upPercent = totalPool > 0 ? (upPool / totalPool) * 100 : 50;
  const downPercent = totalPool > 0 ? (downPool / totalPool) * 100 : 50;

  const houseFee = 0.05;
  const upMultiplier = upPool > 0 ? ((totalPool * (1 - houseFee)) / upPool) : 1.9;
  const downMultiplier = downPool > 0 ? ((totalPool * (1 - houseFee)) / downPool) : 1.9;

  const userUpTickets = userPosition ? Number(userPosition.up) : 0;
  const userDownTickets = userPosition ? Number(userPosition.down) : 0;
  const userTotalTickets = userUpTickets + userDownTickets;
  const hasClaimed = userPosition?.claimed ?? false;

  const isResolved = marketData?.status === 1;
  const isCancelled = marketData?.status === 2;
  const winningDirection = marketData?.result ?? 0;
  const hasMarket = marketData && marketData.id > 0n;

  const canClaim = isResolved && !hasClaimed && (
    (winningDirection === 1 && userUpTickets > 0) ||
    (winningDirection === 2 && userDownTickets > 0) ||
    (winningDirection === 0 && userTotalTickets > 0)
  );

  const canRefund = isCancelled && !hasClaimed && userTotalTickets > 0;

  const totalCostEth = ticketCount * TICKET_PRICE_ETH;
  
  // Calculate REAL potential winnings (pool changes when you bet)
  const newUpPool = selectedDirection === 'up' ? upPool + totalCostEth : upPool;
  const newDownPool = selectedDirection === 'down' ? downPool + totalCostEth : downPool;
  const newTotalPool = newUpPool + newDownPool;
  const poolAfterFee = newTotalPool * (1 - houseFee);
  
  const potentialWinnings = selectedDirection === 'up' 
    ? newUpPool > 0 ? (poolAfterFee * totalCostEth) / newUpPool : 0
    : selectedDirection === 'down' 
    ? newDownPool > 0 ? (poolAfterFee * totalCostEth) / newDownPool : 0
    : 0;

  const startPriceUsd = marketData ? Number(marketData.startPrice) / 1e8 : 0;
  const currentPriceUsd = currentPrice ? Number(currentPrice) / 1e8 : startPriceUsd;
  const priceChange = startPriceUsd > 0 ? ((currentPriceUsd - startPriceUsd) / startPriceUsd) * 100 : 0;

  const isLocked = hasMarket && !isResolved && !isCancelled && !isBettingOpen;

  return (
    <div className="flex flex-col h-full bg-black text-white overflow-hidden">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 opacity-[0.02]" 
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
            backgroundSize: '32px 32px',
          }}
        />
      </div>

      <div className="relative flex flex-col h-full p-4 gap-3 overflow-y-auto">
        <div className="flex items-center justify-center gap-2">
          <img 
            src="https://dd.dexscreener.com/ds-data/tokens/ethereum/0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2.png"
            alt="ETH"
            className="w-6 h-6 rounded-full"
          />
          <h1 className="text-lg font-bold tracking-tight">ETH Prediction</h1>
        </div>

        <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1">ETH/USD</p>
              <p className="text-2xl font-bold">
                ${currentPriceUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            {hasMarket && !isResolved && (
              <div className="text-right">
                <p className="text-[10px] text-white/40 mb-1">Since Start</p>
                <p className={`text-lg font-semibold ${priceChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
                </p>
              </div>
            )}
          </div>
          {hasMarket && (
            <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-white/40">
              <span>Start: ${startPriceUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                Chainlink
              </span>
            </div>
          )}
        </div>

        {hasMarket && !isResolved && !isCancelled && (
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-white/40 uppercase tracking-wider">
                {isLocked ? '🔒 Locked' : 'Ends In'}
              </p>
              <div className="flex items-center gap-1">
                <TimeBlock value={timeLeft.hours} />
                <span className="text-white/20">:</span>
                <TimeBlock value={timeLeft.minutes} />
                <span className="text-white/20">:</span>
                <TimeBlock value={timeLeft.seconds} />
              </div>
            </div>
          </div>
        )}

        {hasMarket && (
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4">
            <div className="flex justify-between items-center mb-3">
              <p className="text-[10px] text-white/40 uppercase tracking-wider">Pool</p>
              <p className="text-xs">
                <span className="text-white font-semibold">{totalPool.toFixed(4)}</span>
                <span className="text-white/40 ml-1">ETH</span>
              </p>
            </div>

            <div className="relative h-2 bg-white/5 rounded-full overflow-hidden mb-3">
              <div 
                className="absolute left-0 top-0 h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
                style={{ width: `${upPercent}%` }}
              />
              <div 
                className="absolute right-0 top-0 h-full bg-gradient-to-l from-red-500 to-red-400 transition-all duration-500"
                style={{ width: `${downPercent}%` }}
              />
            </div>

            <div className="flex justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded bg-emerald-500/20 flex items-center justify-center">
                  <svg className="w-3 h-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                    <path d="M5 15l7-7 7 7" />
                  </svg>
                </div>
                <span className="font-semibold text-emerald-400">{upPercent.toFixed(0)}%</span>
                <span className="text-white/30 text-[10px]">{upMultiplier.toFixed(2)}x</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-white/30 text-[10px]">{downMultiplier.toFixed(2)}x</span>
                <span className="font-semibold text-red-400">{downPercent.toFixed(0)}%</span>
                <div className="w-5 h-5 rounded bg-red-500/20 flex items-center justify-center">
                  <svg className="w-3 h-3 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                    <path d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {userTotalTickets > 0 && (
              <div className="mt-3 pt-3 border-t border-white/5">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] text-white/40 uppercase">Your Tickets</p>
                  <div className="flex items-center gap-2">
                    {userUpTickets > 0 && (
                      <div className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 rounded px-2 py-0.5">
                        <svg className="w-2.5 h-2.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                          <path d="M5 15l7-7 7 7" />
                        </svg>
                        <span className="text-[10px] font-semibold text-emerald-400">{userUpTickets}</span>
                      </div>
                    )}
                    {userDownTickets > 0 && (
                      <div className="flex items-center gap-1 bg-red-500/10 border border-red-500/20 rounded px-2 py-0.5">
                        <svg className="w-2.5 h-2.5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                          <path d="M19 9l-7 7-7-7" />
                        </svg>
                        <span className="text-[10px] font-semibold text-red-400">{userDownTickets}</span>
                      </div>
                    )}
                    {(canClaim || canRefund) && (
                      <button
                        onClick={handleClaim}
                        disabled={txState !== 'idle'}
                        className="bg-gradient-to-r from-emerald-500 to-green-500 text-black text-[10px] font-bold px-3 py-1 rounded disabled:opacity-50"
                      >
                        {txState === 'claiming' ? '...' : canRefund ? 'Refund' : 'Claim'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {!walletAddress ? (
          <button
            onClick={connectWallet}
            className="w-full py-4 rounded-xl bg-white/10 border border-white/20 font-semibold hover:bg-white/20 transition-colors"
          >
            Connect Wallet
          </button>
        ) : !isResolved && !isCancelled && !isLocked && (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleDirectionClick('up')}
                className={`rounded-xl p-4 transition-all ${
                  selectedDirection === 'up'
                    ? 'bg-emerald-500 text-white ring-2 ring-emerald-400 ring-offset-2 ring-offset-black'
                    : 'bg-white/[0.03] border border-white/[0.08] hover:border-emerald-500/50'
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    selectedDirection === 'up' ? 'bg-white/20' : 'bg-emerald-500/10'
                  }`}>
                    <svg className={`w-6 h-6 ${selectedDirection === 'up' ? 'text-white' : 'text-emerald-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                      <path d="M5 15l7-7 7 7" />
                    </svg>
                  </div>
                  <span className="font-bold text-sm">PUMP</span>
                  <span className={`text-[10px] ${selectedDirection === 'up' ? 'text-white/70' : 'text-white/40'}`}>
                    {upMultiplier.toFixed(2)}x
                  </span>
                </div>
              </button>

              <button
                onClick={() => handleDirectionClick('down')}
                className={`rounded-xl p-4 transition-all ${
                  selectedDirection === 'down'
                    ? 'bg-red-500 text-white ring-2 ring-red-400 ring-offset-2 ring-offset-black'
                    : 'bg-white/[0.03] border border-white/[0.08] hover:border-red-500/50'
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    selectedDirection === 'down' ? 'bg-white/20' : 'bg-red-500/10'
                  }`}>
                    <svg className={`w-6 h-6 ${selectedDirection === 'down' ? 'text-white' : 'text-red-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                      <path d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                  <span className="font-bold text-sm">DUMP</span>
                  <span className={`text-[10px] ${selectedDirection === 'down' ? 'text-white/70' : 'text-white/40'}`}>
                    {downMultiplier.toFixed(2)}x
                  </span>
                </div>
              </button>
            </div>

            {selectedDirection && (
              <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4 animate-fade-in">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] text-white/40 uppercase">Tickets</p>
                  <p className="text-[10px] text-white/40">
                    Bal: <span className="text-white">{Number(ethBalance).toFixed(4)} ETH</span>
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setTicketCount(Math.max(1, ticketCount - 1))}
                    className="w-10 h-10 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-lg"
                  >
                    −
                  </button>
                  
                  <div className="flex-1 text-center">
                    <input
                      type="number"
                      value={ticketCount}
                      onChange={(e) => setTicketCount(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full bg-transparent text-center text-2xl font-bold outline-none"
                      min={1}
                    />
                    <p className="text-[10px] text-white/40">{totalCostEth.toFixed(3)} ETH</p>
                  </div>

                  <button
                    onClick={() => setTicketCount(ticketCount + 1)}
                    className="w-10 h-10 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-lg"
                  >
                    +
                  </button>
                </div>

                <div className="flex gap-2 mt-3">
                  {[1, 5, 10, 25].map((n) => (
                    <button
                      key={n}
                      onClick={() => setTicketCount(n)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-medium ${
                        ticketCount === n ? 'bg-white/15 text-white' : 'bg-white/5 text-white/50'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>

                <div className="mt-3 pt-3 border-t border-white/5 flex justify-between">
                  <span className="text-xs text-white/40">Potential Win</span>
                  <span className={`text-sm font-bold ${selectedDirection === 'up' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {potentialWinnings.toFixed(4)} ETH
                  </span>
                </div>
              </div>
            )}

            {selectedDirection && (
              <button
                onClick={handleBuyClick}
                disabled={txState !== 'idle'}
                className={`w-full py-4 rounded-xl font-bold transition-all ${
                  selectedDirection === 'up'
                    ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-white'
                    : 'bg-gradient-to-r from-red-500 to-rose-500 text-white'
                } disabled:opacity-50`}
              >
                {txState === 'buying' ? 'Confirming...' : 
                 txState === 'success' ? '✓ Done!' :
                 txState === 'error' ? errorMsg || 'Failed' :
                 `Bet ${totalCostEth.toFixed(3)} ETH`}
              </button>
            )}
          </div>
        )}

        {recentBets.length > 0 && (
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4">
            <p className="text-[10px] text-white/40 uppercase tracking-wider mb-3">Recent Bets</p>
            <div className="space-y-2">
              {recentBets.slice(0, 5).map((bet) => (
                <div key={bet.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <img 
                      src={bet.pfp_url || `https://api.dicebear.com/7.x/shapes/svg?seed=${bet.fid}`}
                      alt={bet.username}
                      className="w-6 h-6 rounded-full bg-white/10"
                    />
                    <div className="flex flex-col">
                      <span className="text-xs text-white/70">@{bet.username}</span>
                      {bet.price_at_bet && (
                        <span className="text-[9px] text-white/30">${bet.price_at_bet.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-white/50">{bet.tickets}x</span>
                    <div className={`w-5 h-5 rounded flex items-center justify-center ${
                      bet.direction === 'up' ? 'bg-emerald-500/20' : 'bg-red-500/20'
                    }`}>
                      <svg className={`w-3 h-3 ${bet.direction === 'up' ? 'text-emerald-400' : 'text-red-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                        <path d={bet.direction === 'up' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
                      </svg>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {isResolved && (
          <div className="flex-1 flex flex-col items-center justify-center py-6">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
              winningDirection === 1 ? 'bg-emerald-500/20' : 'bg-red-500/20'
            }`}>
              {winningDirection === 1 ? (
                <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path d="M5 15l7-7 7 7" />
                </svg>
              ) : (
                <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </div>
            <p className="text-white/40 text-sm mt-3">Round Complete</p>
            <p className="text-xl font-bold">
              ETH went <span className={winningDirection === 1 ? 'text-emerald-400' : 'text-red-400'}>
                {winningDirection === 1 ? 'UP' : 'DOWN'}
              </span>
            </p>
          </div>
        )}

        {isLocked && (
          <div className="flex-1 flex flex-col items-center justify-center py-6">
            <div className="w-16 h-16 rounded-2xl bg-yellow-500/10 flex items-center justify-center">
              <span className="text-2xl">🔒</span>
            </div>
            <p className="text-white/50 text-sm mt-3">Betting Locked</p>
            <p className="text-white/30 text-xs">Waiting for resolution</p>
          </div>
        )}

        <div className="text-center pt-2">
          <p className="text-[9px] text-white/20">
            {username ? `@${username} · ` : ''}{TICKET_PRICE_ETH} ETH/ticket · 5% fee
          </p>
        </div>
      </div>

      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowConfirmModal(false)} />
          <div className="relative bg-[#111] border border-white/10 rounded-2xl p-6 max-w-sm w-full animate-scale-in">
            <div className="w-12 h-12 rounded-xl bg-yellow-500/10 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">⚠️</span>
            </div>
            
            <h3 className="text-lg font-bold text-center mb-2">Confirm Your Bet</h3>
            
            <p className="text-sm text-white/60 text-center mb-4">
              You&apos;re about to bet <span className="text-white font-semibold">{totalCostEth.toFixed(3)} ETH</span> on <span className={`font-semibold ${selectedDirection === 'up' ? 'text-emerald-400' : 'text-red-400'}`}>{selectedDirection === 'up' ? 'PUMP' : 'DUMP'}</span>
            </p>

            <div className="bg-white/5 rounded-xl p-3 mb-4">
              <p className="text-xs text-white/50 text-center">
                All sales are final. Bets cannot be refunded or reversed once placed. Only bet what you can afford to lose.
              </p>
            </div>

            <label className="flex items-center gap-3 mb-4 cursor-pointer">
              <div 
                onClick={() => setDontShowAgain(!dontShowAgain)}
                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                  dontShowAgain ? 'bg-white border-white' : 'border-white/30'
                }`}
              >
                {dontShowAgain && (
                  <svg className="w-3 h-3 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span className="text-xs text-white/50">Don&apos;t show this again</span>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="py-3 rounded-xl bg-white/5 border border-white/10 font-semibold text-sm hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmBuy}
                className={`py-3 rounded-xl font-semibold text-sm transition-colors ${
                  selectedDirection === 'up'
                    ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                    : 'bg-red-500 hover:bg-red-600 text-white'
                }`}
              >
                Confirm Bet
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scale-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
        .animate-scale-in {
          animation: scale-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}

function TimeBlock({ value }: { value: number }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded px-2 py-1 min-w-[24px] text-center">
      <span className="text-xs font-mono font-bold">{value.toString().padStart(2, '0')}</span>
    </div>
  );
}