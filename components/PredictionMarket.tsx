'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPublicClient, http, formatEther, parseEther, encodeFunctionData } from 'viem';
import { base } from 'viem/chains';
import { createClient } from '@supabase/supabase-js';

const CONTRACT_ADDRESS = '0x0625E29C2A71A834482bFc6b4cc012ACeee62DA4' as `0x${string}`;
const TICKET_PRICE_ETH = 0.001;
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
    name: 'markets',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'marketId', type: 'uint256' }],
    outputs: [
      { name: 'id', type: 'uint256' },
      { name: 'startPrice', type: 'uint256' },
      { name: 'endPrice', type: 'uint256' },
      { name: 'startTime', type: 'uint256' },
      { name: 'endTime', type: 'uint256' },
      { name: 'upPool', type: 'uint256' },
      { name: 'downPool', type: 'uint256' },
      { name: 'totalTickets', type: 'uint256' },
      { name: 'status', type: 'uint8' },
      { name: 'result', type: 'uint8' },
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
  {
    name: 'currentMarketId',
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

interface UnclaimedMarket {
  marketId: number;
  upTickets: number;
  downTickets: number;
  result: number;
  status: number;
  estimatedWinnings: number;
  upPool: number;
  downPool: number;
}

interface HistoryItem {
  marketId: number;
  direction: 'up' | 'down';
  tickets: number;
  result: number;
  status: number;
  claimed: boolean;
  winnings: number;
  timestamp: string;
  priceAtBet: number;
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
  const [showHistory, setShowHistory] = useState(false);
  const [unclaimedMarkets, setUnclaimedMarkets] = useState<UnclaimedMarket[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const [claimingMarketId, setClaimingMarketId] = useState<number | null>(null);
  
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

  // Audio refs
  const clickSoundRef = useRef<HTMLAudioElement | null>(null);
  const successSoundRef = useRef<HTMLAudioElement | null>(null);
  const winSoundRef = useRef<HTMLAudioElement | null>(null);

  // Initialize sounds
  useEffect(() => {
    if (typeof window !== 'undefined') {
      clickSoundRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2Coverage0NDQ0NDQ0M=');
      clickSoundRef.current.volume = 0.2;
      successSoundRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2Af4');
      successSoundRef.current.volume = 0.3;
    }
  }, []);

  const playClick = () => {
    try {
      clickSoundRef.current?.play().catch(() => {});
    } catch {}
  };

  const playSuccess = () => {
    try {
      successSoundRef.current?.play().catch(() => {});
    } catch {}
  };

  const triggerHaptic = async (type: 'light' | 'medium' | 'heavy' | 'success' | 'error') => {
    try {
      if (sdk?.haptics) {
        if (type === 'success') {
          await sdk.haptics.notificationOccurred('success');
        } else if (type === 'error') {
          await sdk.haptics.notificationOccurred('error');
        } else {
          await sdk.haptics.impactOccurred(type);
        }
      }
    } catch {}
  };

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
        } catch {}
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
    if (!supabase) return;
    
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

  // Fetch unclaimed winnings from previous markets
  const fetchUnclaimedMarkets = useCallback(async () => {
    if (!walletAddress || !supabase) return;
    
    try {
      // Get user's bet history from Supabase
      const { data: bets } = await supabase
        .from('prediction_bets')
        .select('market_id, direction, tickets, price_at_bet, timestamp')
        .eq('wallet_address', walletAddress.toLowerCase())
        .order('timestamp', { ascending: false });

      if (!bets || bets.length === 0) return;

      // Get unique market IDs
      const marketIds = [...new Set(bets.map(b => b.market_id))];
      
      const unclaimed: UnclaimedMarket[] = [];
      const historyItems: HistoryItem[] = [];

      // Check each market
      for (const marketId of marketIds) {
        try {
          const [position, marketInfo] = await Promise.all([
            publicClient.readContract({
              address: CONTRACT_ADDRESS,
              abi: CONTRACT_ABI,
              functionName: 'getPosition',
              args: [BigInt(marketId), walletAddress],
            }),
            publicClient.readContract({
              address: CONTRACT_ADDRESS,
              abi: CONTRACT_ABI,
              functionName: 'markets',
              args: [BigInt(marketId)],
            }),
          ]);

          const upTickets = Number(position[0]);
          const downTickets = Number(position[1]);
          const claimed = position[2];
          
          const status = Number(marketInfo[8]);
          const result = Number(marketInfo[9]);
          const upPool = Number(formatEther(marketInfo[5]));
          const downPool = Number(formatEther(marketInfo[6]));
          const totalPool = upPool + downPool;

          // Find bet info
          const userBets = bets.filter(b => b.market_id === marketId);
          const betDirection = userBets[0]?.direction as 'up' | 'down';
          const totalTickets = userBets.reduce((sum, b) => sum + b.tickets, 0);
          const priceAtBet = userBets[0]?.price_at_bet || 0;

          // Calculate winnings
          let winnings = 0;
          if (status === 1) { // Resolved
            if (result === 0) { // Tie - refund
              winnings = totalTickets * TICKET_PRICE_ETH;
            } else if (result === 1 && upTickets > 0) { // UP won
              const poolAfterFee = totalPool * 0.95;
              winnings = (poolAfterFee * upTickets * TICKET_PRICE_ETH) / upPool;
            } else if (result === 2 && downTickets > 0) { // DOWN won
              const poolAfterFee = totalPool * 0.95;
              winnings = (poolAfterFee * downTickets * TICKET_PRICE_ETH) / downPool;
            }
          } else if (status === 2) { // Cancelled - refund
            winnings = totalTickets * TICKET_PRICE_ETH;
          }

          // Add to history
          if (totalTickets > 0) {
            historyItems.push({
              marketId,
              direction: betDirection,
              tickets: totalTickets,
              result,
              status,
              claimed,
              winnings,
              timestamp: userBets[0]?.timestamp || '',
              priceAtBet,
            });
          }

          // Check if unclaimed and has winnings
          if (!claimed && winnings > 0 && status !== 0) {
            unclaimed.push({
              marketId,
              upTickets,
              downTickets,
              result,
              status,
              estimatedWinnings: winnings,
              upPool,
              downPool,
            });
          }
        } catch (e) {
          console.log('Error fetching market', marketId, e);
        }
      }

      setUnclaimedMarkets(unclaimed);
      setHistory(historyItems);
    } catch (error) {
      console.error('Failed to fetch unclaimed:', error);
    }
  }, [walletAddress]);

  useEffect(() => {
    fetchUnclaimedMarkets();
  }, [fetchUnclaimedMarkets, marketData?.id]);

  const fetchRecentBets = useCallback(async () => {
    if (!marketData?.id || !supabase) return;
    
    try {
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

  useEffect(() => {
    fetchRecentBets();
    const interval = setInterval(fetchRecentBets, 45000);
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
    playClick();
    triggerHaptic('light');
    try {
      const accounts = await sdk.wallet.ethProvider.request({
        method: 'eth_requestAccounts',
      });
      if (accounts?.[0]) {
        setWalletAddress(accounts[0] as `0x${string}`);
        triggerHaptic('success');
      }
    } catch (error) {
      console.error('Failed to connect:', error);
      triggerHaptic('error');
    }
  };

  const handleDirectionClick = (direction: 'up' | 'down') => {
    playClick();
    triggerHaptic('light');
    if (selectedDirection === direction) {
      setSelectedDirection(null);
    } else {
      setSelectedDirection(direction);
    }
  };

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

      if (userFid && marketData && supabase) {
        try {
          const { data: existingUser } = await supabase
            .from('prediction_users')
            .select('fid')
            .eq('fid', userFid)
            .single();
          
          if (!existingUser) {
            const userResponse = await fetch(`/api/user?fid=${userFid}`);
            if (userResponse.ok) {
              const userData = await userResponse.json();
              await supabase.from('prediction_users').upsert({
                fid: userFid,
                username: userData.username || username || 'anon',
                pfp_url: userData.pfp_url || '',
                updated_at: new Date().toISOString(),
              });
            } else {
              await supabase.from('prediction_users').upsert({
                fid: userFid,
                username: username || 'anon',
                pfp_url: '',
                updated_at: new Date().toISOString(),
              });
            }
          }
        } catch (e) {
          console.log('User lookup/create error:', e);
        }

        const betData = {
          fid: userFid,
          wallet_address: walletAddress.toLowerCase(),
          market_id: Number(marketData.id),
          direction: selectedDirection,
          tickets: ticketCount,
          tx_hash: txHash,
          price_at_bet: currentPriceUsd,
          timestamp: new Date().toISOString(),
        };
        
        await supabase.from('prediction_bets').insert(betData);
      }
      
      setTxState('success');
      playSuccess();
      triggerHaptic('success');
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
      triggerHaptic('error');
      setTimeout(() => {
        setTxState('idle');
        setErrorMsg('');
      }, 2500);
    }
  };

  const handleClaim = async (marketId?: number) => {
    if (!walletAddress || !sdk) return;
    
    const claimMarketId = marketId ?? (marketData ? Number(marketData.id) : null);
    if (!claimMarketId) return;

    setClaimingMarketId(claimMarketId);
    setTxState('claiming');
    triggerHaptic('medium');
    
    try {
      const data = encodeFunctionData({
        abi: CONTRACT_ABI,
        functionName: 'claim',
        args: [BigInt(claimMarketId)],
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
      playSuccess();
      triggerHaptic('success');
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
      
      fetchUserPosition();
      fetchBalance();
      fetchUnclaimedMarkets();
      
      setTimeout(() => {
        setTxState('idle');
        setClaimingMarketId(null);
      }, 2500);
    } catch (error) {
      console.error('Claim failed:', error);
      setTxState('error');
      triggerHaptic('error');
      setTimeout(() => {
        setTxState('idle');
        setClaimingMarketId(null);
      }, 2500);
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
  
  const newUpPool = upPool + (selectedDirection === 'up' ? totalCostEth : 0);
  const newDownPool = downPool + (selectedDirection === 'down' ? totalCostEth : 0);
  const newTotalPool = newUpPool + newDownPool;
  const poolAfterFee = newTotalPool * (1 - houseFee);
  
  const realUpMultiplier = newUpPool > 0 ? poolAfterFee / newUpPool : 1.9;
  const realDownMultiplier = newDownPool > 0 ? poolAfterFee / newDownPool : 1.9;
  
  const displayUpMultiplier = selectedDirection === 'up' ? realUpMultiplier : upMultiplier;
  const displayDownMultiplier = selectedDirection === 'down' ? realDownMultiplier : downMultiplier;
  
  const potentialWinnings = selectedDirection === 'up' 
    ? totalCostEth * realUpMultiplier
    : selectedDirection === 'down' 
    ? totalCostEth * realDownMultiplier
    : 0;

  const startPriceUsd = marketData ? Number(marketData.startPrice) / 1e8 : 0;
  const currentPriceUsd = currentPrice ? Number(currentPrice) / 1e8 : startPriceUsd;
  const priceChange = startPriceUsd > 0 ? ((currentPriceUsd - startPriceUsd) / startPriceUsd) * 100 : 0;

  const isLocked = hasMarket && !isResolved && !isCancelled && !isBettingOpen;

  const totalUnclaimed = unclaimedMarkets.reduce((sum, m) => sum + m.estimatedWinnings, 0);

  // History Page
  if (showHistory) {
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
          <div className="flex items-center justify-between mb-2">
            <button 
              onClick={() => { setShowHistory(false); playClick(); triggerHaptic('light'); }}
              className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path d="M15 19l-7-7 7-7" />
              </svg>
              <span className="text-sm">Back</span>
            </button>
            <h1 className="text-lg font-bold">Betting History</h1>
            <div className="w-16" />
          </div>

          {unclaimedMarkets.length > 0 && (
            <div className="bg-gradient-to-r from-white/20 to-white/20 border border-white/30 rounded-xl p-4 animate-pulse-subtle">
              <p className="text-[10px] text-white uppercase tracking-wider mb-2">Unclaimed Winnings</p>
              <p className="text-2xl font-bold text-white">{totalUnclaimed.toFixed(4)} ETH</p>
              <div className="mt-3 space-y-2">
                {unclaimedMarkets.map((m) => (
                  <div key={m.marketId} className="flex items-center justify-between bg-black/30 rounded-lg p-3">
                    <div>
                      <p className="text-sm text-white/70">Round #{m.marketId}</p>
                      <p className="text-xs text-white/40">
                        {m.status === 2 ? 'Cancelled' : m.result === 1 ? 'UP won' : 'DOWN won'}
                      </p>
                    </div>
                    <button
                      onClick={() => handleClaim(m.marketId)}
                      disabled={claimingMarketId === m.marketId}
                      className="bg-white hover:bg-white text-black text-xs font-bold px-4 py-2 rounded-lg transition-all disabled:opacity-50"
                    >
                      {claimingMarketId === m.marketId ? 'Claiming...' : `Claim ${m.estimatedWinnings.toFixed(4)}`}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            {history.length === 0 ? (
              <div className="text-center py-12 text-white/40">
                <p>No betting history yet</p>
              </div>
            ) : (
              history.map((item) => (
                <div 
                  key={item.marketId} 
                  className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4 animate-fade-in"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        item.direction === 'up' ? 'bg-white/20' : 'bg-red-500/20'
                      }`}>
                        <svg className={`w-4 h-4 ${item.direction === 'up' ? 'text-white' : 'text-red-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                          <path d={item.direction === 'up' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Round #{item.marketId}</p>
                        <p className="text-[10px] text-white/40">{item.tickets} ticket{item.tickets > 1 ? 's' : ''} @ ${item.priceAtBet?.toFixed(2)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      {item.status === 0 ? (
                        <span className="text-xs text-yellow-400">Active</span>
                      ) : item.status === 2 ? (
                        <span className="text-xs text-orange-400">Cancelled</span>
                      ) : item.result === (item.direction === 'up' ? 1 : 2) ? (
                        <span className="text-xs text-white">Won</span>
                      ) : item.result === 0 ? (
                        <span className="text-xs text-white/40">Tie</span>
                      ) : (
                        <span className="text-xs text-red-400">Lost</span>
                      )}
                      {item.winnings > 0 && (
                        <p className={`text-sm font-bold ${item.claimed ? 'text-white/40' : 'text-white'}`}>
                          {item.claimed ? 'Claimed' : `+${item.winnings.toFixed(4)} ETH`}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-black text-white overflow-hidden">
      {/* Confetti */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                top: '-10px',
                animationDelay: `${Math.random() * 0.5}s`,
                backgroundColor: ['#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6'][Math.floor(Math.random() * 5)],
                width: '8px',
                height: '8px',
                borderRadius: Math.random() > 0.5 ? '50%' : '0',
              }}
            />
          ))}
        </div>
      )}

      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 opacity-[0.02]" 
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
            backgroundSize: '32px 32px',
          }}
        />
      </div>

      <div className="relative flex flex-col h-full p-4 gap-3 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img 
              src="https://assets.coingecko.com/coins/images/279/small/ethereum.png"
              alt="ETH"
              className="w-6 h-6 rounded-full"
            />
            <h1 className="text-lg font-bold tracking-tight">ETH Prediction</h1>
          </div>
          <button
            onClick={() => { setShowHistory(true); playClick(); triggerHaptic('light'); }}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
          >
            <svg className="w-5 h-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        </div>

        {/* Unclaimed Winnings Banner */}
        {totalUnclaimed > 0 && (
          <button
            onClick={() => { setShowHistory(true); playClick(); triggerHaptic('medium'); }}
            className="bg-gradient-to-r from-white/20 to-white/20 border border-white/30 rounded-xl p-4 animate-pulse-subtle hover:from-white/30 hover:to-white/30 transition-all"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <span className="text-xl">🎉</span>
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-white">Claim Your Winnings!</p>
                  <p className="text-xs text-white/50">{unclaimedMarkets.length} unclaimed round{unclaimedMarkets.length > 1 ? 's' : ''}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-white">{totalUnclaimed.toFixed(4)}</p>
                <p className="text-[10px] text-white/40">ETH</p>
              </div>
            </div>
          </button>
        )}

        {/* Price Card */}
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4 hover:bg-white/[0.05] transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1">ETH/USD</p>
              <p className="text-2xl font-bold animate-number">
                ${currentPriceUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            {hasMarket && !isResolved && (
              <div className="text-right">
                <p className="text-[10px] text-white/40 mb-1">Since Start</p>
                <p className={`text-lg font-semibold ${priceChange >= 0 ? 'text-white' : 'text-red-400'}`}>
                  {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
                </p>
              </div>
            )}
          </div>
          {hasMarket && (
            <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-white/40">
              <span>Start: ${startPriceUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                Chainlink
              </span>
            </div>
          )}
        </div>

        {/* Resolved State - Show after price */}
        {isResolved && (
          <div className="flex flex-col items-center justify-center py-6 animate-fade-in bg-white/[0.03] border border-white/[0.08] rounded-xl">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
              winningDirection === 1 ? 'bg-white/20' : 'bg-red-500/20'
            } animate-bounce-subtle`}>
              {winningDirection === 1 ? (
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path d="M5 15l7-7 7 7" />
                </svg>
              ) : (
                <svg className="w-7 h-7 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </div>
            <p className="text-white/40 text-sm mt-3">Round Complete</p>
            <p className="text-xl font-bold">
              ETH went <span className={winningDirection === 1 ? 'text-white' : 'text-red-400'}>
                {winningDirection === 1 ? 'UP' : 'DOWN'}
              </span>
            </p>
          </div>
        )}

        {/* Timer */}
        {hasMarket && !isResolved && !isCancelled && (
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-white/40 uppercase tracking-wider">
                {isLocked ? '🔒 Locked' : 'Ends In'}
              </p>
              <div className="flex items-center gap-1">
                <TimeBlock value={timeLeft.hours} />
                <span className="text-black animate-pulse">:</span>
                <TimeBlock value={timeLeft.minutes} />
                <span className="text-black animate-pulse">:</span>
                <TimeBlock value={timeLeft.seconds} />
              </div>
            </div>
          </div>
        )}

        {/* Pool */}
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
                className="absolute left-0 top-0 h-full bg-gradient-to-r from-white to-white transition-all duration-700 ease-out"
                style={{ width: `${upPercent}%` }}
              />
              <div 
                className="absolute right-0 top-0 h-full bg-gradient-to-l from-red-500 to-red-400 transition-all duration-700 ease-out"
                style={{ width: `${downPercent}%` }}
              />
            </div>

            <div className="flex justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded bg-white/20 flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                    <path d="M5 15l7-7 7 7" />
                  </svg>
                </div>
                <span className="font-semibold text-white">{upPercent.toFixed(0)}%</span>
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
                      <div className="flex items-center gap-1 bg-white/10 border border-white/20 rounded px-2 py-0.5">
                        <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                          <path d="M5 15l7-7 7 7" />
                        </svg>
                        <span className="text-[10px] font-semibold text-white">{userUpTickets}</span>
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
                        onClick={() => handleClaim()}
                        disabled={txState !== 'idle'}
                        className="bg-gradient-to-r from-white to-white text-black text-[10px] font-bold px-3 py-1 rounded disabled:opacity-50 hover:scale-105 transition-transform"
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

        {/* Betting Section */}
        {!walletAddress ? (
          <button
            onClick={connectWallet}
            className="w-full py-4 rounded-xl bg-white/10 border border-white/20 font-semibold hover:bg-white/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            Connect Wallet
          </button>
        ) : (!hasMarket || isResolved || isCancelled) ? (
          <div className="flex flex-col gap-3">
            <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4 text-center">
              <h3 className="text-lg font-bold text-white mb-1">New Round Starting</h3>
              <p className="text-sm text-white/50 mb-4">Be the first to bet and start the next 24h prediction round!</p>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleDirectionClick('up')}
                className={`rounded-xl p-4 transition-all hover:scale-[1.02] active:scale-[0.98] ${
                  selectedDirection === 'up'
                    ? 'bg-white text-black ring-2 ring-white ring-offset-2 ring-offset-black'
                    : 'bg-white/[0.03] border border-white/[0.08] hover:border-white/50'
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                    selectedDirection === 'up' ? 'bg-white/20 scale-110' : 'bg-white/10'
                  }`}>
                    <svg className={`w-6 h-6 ${selectedDirection === 'up' ? 'text-black' : 'text-white'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                      <path d="M5 15l7-7 7 7" />
                    </svg>
                  </div>
                  <span className="font-bold text-sm">PUMP</span>
                </div>
              </button>

              <button
                onClick={() => handleDirectionClick('down')}
                className={`rounded-xl p-4 transition-all hover:scale-[1.02] active:scale-[0.98] ${
                  selectedDirection === 'down'
                    ? 'bg-red-500 text-white ring-2 ring-red-400 ring-offset-2 ring-offset-black'
                    : 'bg-white/[0.03] border border-white/[0.08] hover:border-red-500/50'
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                    selectedDirection === 'down' ? 'bg-white/20 scale-110' : 'bg-red-500/10'
                  }`}>
                    <svg className={`w-6 h-6 ${selectedDirection === 'down' ? 'text-white' : 'text-red-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                      <path d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                  <span className="font-bold text-sm">DUMP</span>
                </div>
              </button>
            </div>

            {selectedDirection && (
              <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4 animate-slide-up">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] text-white/40 uppercase">Tickets</p>
                  <p className="text-[10px] text-white/40">
                    Bal: <span className="text-white">{Number(ethBalance).toFixed(4)} ETH</span>
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => { setTicketCount(Math.max(1, ticketCount - 1)); playClick(); triggerHaptic('light'); }}
                    className="w-10 h-10 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-lg transition-all active:scale-95"
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
                    <p className="text-[10px] text-white/40">{(ticketCount * TICKET_PRICE_ETH).toFixed(3)} ETH</p>
                  </div>

                  <button
                    onClick={() => { setTicketCount(ticketCount + 1); playClick(); triggerHaptic('light'); }}
                    className="w-10 h-10 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-lg transition-all active:scale-95"
                  >
                    +
                  </button>
                </div>

                <div className="flex gap-2 mt-3">
                  {[1, 5, 10, 25].map((n) => (
                    <button
                      key={n}
                      onClick={() => { setTicketCount(n); playClick(); triggerHaptic('light'); }}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-95 ${
                        ticketCount === n ? 'bg-white/15 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {selectedDirection && (
              <button
                onClick={handleBuyClick}
                disabled={txState !== 'idle'}
                className={`w-full py-4 rounded-xl font-bold transition-all hover:scale-[1.02] active:scale-[0.98] ${
                  selectedDirection === 'up'
                    ? 'bg-gradient-to-r from-white to-white text-black shadow-lg shadow-white/20'
                    : 'bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-lg shadow-red-500/20'
                } disabled:opacity-50 disabled:hover:scale-100`}
              >
                {txState === 'buying' ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Starting Round...
                  </span>
                ) : 
                 txState === 'success' ? '✓ Round Started!' :
                 txState === 'error' ? errorMsg || 'Failed' :
                 `Start Round & Bet ${(ticketCount * TICKET_PRICE_ETH).toFixed(3)} ETH`}
              </button>
            )}
          </div>
        ) : !isLocked ? (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleDirectionClick('up')}
                className={`rounded-xl p-4 transition-all hover:scale-[1.02] active:scale-[0.98] ${
                  selectedDirection === 'up'
                    ? 'bg-white text-black ring-2 ring-white ring-offset-2 ring-offset-black'
                    : 'bg-white/[0.03] border border-white/[0.08] hover:border-white/50'
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                    selectedDirection === 'up' ? 'bg-white/20 scale-110' : 'bg-white/10'
                  }`}>
                    <svg className={`w-6 h-6 ${selectedDirection === 'up' ? 'text-black' : 'text-white'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                      <path d="M5 15l7-7 7 7" />
                    </svg>
                  </div>
                  <span className="font-bold text-sm">PUMP</span>
                  <span className={`text-[10px] ${selectedDirection === 'up' ? 'text-white/70' : 'text-white/40'}`}>
                    {displayUpMultiplier.toFixed(2)}x
                  </span>
                </div>
              </button>

              <button
                onClick={() => handleDirectionClick('down')}
                className={`rounded-xl p-4 transition-all hover:scale-[1.02] active:scale-[0.98] ${
                  selectedDirection === 'down'
                    ? 'bg-red-500 text-white ring-2 ring-red-400 ring-offset-2 ring-offset-black'
                    : 'bg-white/[0.03] border border-white/[0.08] hover:border-red-500/50'
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                    selectedDirection === 'down' ? 'bg-white/20 scale-110' : 'bg-red-500/10'
                  }`}>
                    <svg className={`w-6 h-6 ${selectedDirection === 'down' ? 'text-white' : 'text-red-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                      <path d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                  <span className="font-bold text-sm">DUMP</span>
                  <span className={`text-[10px] ${selectedDirection === 'down' ? 'text-white/70' : 'text-white/40'}`}>
                    {displayDownMultiplier.toFixed(2)}x
                  </span>
                </div>
              </button>
            </div>

            {selectedDirection && (
              <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4 animate-slide-up">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] text-white/40 uppercase">Tickets</p>
                  <p className="text-[10px] text-white/40">
                    Bal: <span className="text-white">{Number(ethBalance).toFixed(4)} ETH</span>
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => { setTicketCount(Math.max(1, ticketCount - 1)); playClick(); triggerHaptic('light'); }}
                    className="w-10 h-10 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-lg transition-all active:scale-95"
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
                    onClick={() => { setTicketCount(ticketCount + 1); playClick(); triggerHaptic('light'); }}
                    className="w-10 h-10 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-lg transition-all active:scale-95"
                  >
                    +
                  </button>
                </div>

                <div className="flex gap-2 mt-3">
                  {[1, 5, 10, 25].map((n) => (
                    <button
                      key={n}
                      onClick={() => { setTicketCount(n); playClick(); triggerHaptic('light'); }}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-95 ${
                        ticketCount === n ? 'bg-white/15 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>

                <div className="mt-3 pt-3 border-t border-white/5 flex justify-between">
                  <span className="text-xs text-white/40">Potential Win</span>
                  <span className={`text-sm font-bold ${selectedDirection === 'up' ? 'text-white' : 'text-red-400'}`}>
                    {potentialWinnings.toFixed(4)} ETH
                  </span>
                </div>
              </div>
            )}

            {selectedDirection && (
              <button
                onClick={handleBuyClick}
                disabled={txState !== 'idle'}
                className={`w-full py-4 rounded-xl font-bold transition-all hover:scale-[1.02] active:scale-[0.98] ${
                  selectedDirection === 'up'
                    ? 'bg-gradient-to-r from-white to-white text-black shadow-lg shadow-white/20'
                    : 'bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-lg shadow-red-500/20'
                } disabled:opacity-50 disabled:hover:scale-100`}
              >
                {txState === 'buying' ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Confirming...
                  </span>
                ) : 
                 txState === 'success' ? '✓ Done!' :
                 txState === 'error' ? errorMsg || 'Failed' :
                 `Bet ${totalCostEth.toFixed(3)} ETH`}
              </button>
            )}
          </div>
        ) : null}

        {/* Recent Bets */}
        {recentBets.length > 0 && (
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4">
            <p className="text-[10px] text-white/40 uppercase tracking-wider mb-3">Recent Bets</p>
            <div className="space-y-2">
              {recentBets.slice(0, 5).map((bet, i) => (
                <div 
                  key={bet.id} 
                  className="flex items-center justify-between animate-fade-in"
                  style={{ animationDelay: `${i * 0.1}s` }}
                >
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
                      bet.direction === 'up' ? 'bg-white/20' : 'bg-red-500/20'
                    }`}>
                      <svg className={`w-3 h-3 ${bet.direction === 'up' ? 'text-white' : 'text-red-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                        <path d={bet.direction === 'up' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
                      </svg>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Locked State */}
        {isLocked && (
          <div className="flex-1 flex flex-col items-center justify-center py-6 animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-yellow-500/10 flex items-center justify-center animate-pulse">
              <span className="text-2xl">🔒</span>
            </div>
            <p className="text-white/50 text-sm mt-3">Betting Locked</p>
            <p className="text-white/30 text-xs">Waiting for resolution</p>
          </div>
        )}

        {/* Footer */}
        <div className="text-center pt-2">
          <p className="text-[9px] text-black">
            {username ? `@${username} · ` : ''}{TICKET_PRICE_ETH} ETH/ticket · 5% fee
          </p>
        </div>
      </div>

      {/* Confirm Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowConfirmModal(false)} />
          <div className="relative bg-[#111] border border-white/10 rounded-2xl p-6 max-w-sm w-full animate-scale-in">
            <div className="w-12 h-12 rounded-xl bg-yellow-500/10 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">⚠️</span>
            </div>
            
            <h3 className="text-lg font-bold text-center mb-2">Confirm Your Bet</h3>
            
            <p className="text-sm text-white/60 text-center mb-4">
              You&apos;re about to bet <span className="text-white font-semibold">{totalCostEth.toFixed(3)} ETH</span> on <span className={`font-semibold ${selectedDirection === 'up' ? 'text-white' : 'text-red-400'}`}>{selectedDirection === 'up' ? 'PUMP' : 'DUMP'}</span>
            </p>

            <div className="bg-white/5 rounded-xl p-3 mb-4">
              <p className="text-xs text-white/50 text-center">
                All sales are final. Bets cannot be refunded or reversed once placed. Only bet what you can afford to lose.
              </p>
            </div>

            <label className="flex items-center gap-3 mb-4 cursor-pointer">
              <div 
                onClick={() => { setDontShowAgain(!dontShowAgain); playClick(); }}
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
                onClick={() => { setShowConfirmModal(false); playClick(); }}
                className="py-3 rounded-xl bg-white/5 border border-white/10 font-semibold text-sm hover:bg-white/10 transition-all active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmBuy}
                className={`py-3 rounded-xl font-semibold text-sm transition-all active:scale-95 ${
                  selectedDirection === 'up'
                    ? 'bg-white hover:bg-white text-white'
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
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes confetti {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        @keyframes pulse-subtle {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out forwards;
        }
        .animate-scale-in {
          animation: scale-in 0.2s ease-out;
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
        .animate-confetti {
          animation: confetti 2s ease-out forwards;
        }
        .animate-pulse-subtle {
          animation: pulse-subtle 2s ease-in-out infinite;
        }
        .animate-bounce-subtle {
          animation: bounce-subtle 1s ease-in-out infinite;
        }
        .animate-number {
          font-variant-numeric: tabular-nums;
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