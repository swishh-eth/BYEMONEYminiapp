'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPublicClient, http, formatEther, parseEther, encodeFunctionData } from 'viem';
import { base } from 'viem/chains';
import { createClient } from '@supabase/supabase-js';

const CONTRACT_ADDRESS = '0x0625E29C2A71A834482bFc6b4cc012ACeee62DA4' as `0x${string}`;
const BASE_TICKET_PRICE_ETH = 0.001;
const LOCK_PERIOD_SECONDS = 60 * 60; // 1 hour before end = locked
const SURGE_PERIOD_SECONDS = 12 * 60 * 60; // Last 12 hours = double price
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

const AVAILABLE_COINS = [
  { symbol: 'ETH', name: 'Ethereum', icon: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png', active: true },
  { symbol: 'BYEMONEY', name: 'ByeMoney', icon: '/logo.png', active: true },
  { symbol: 'CLANKER', name: 'Clanker', icon: '/clanker.png', active: false },
];

type MarketType = 'ETH' | 'BYEMONEY';

interface PredictionMarketProps {
  userFid?: number;
  username?: string;
  initialData?: {
    marketId: number;
    timeRemaining: number;
    totalPool: number;
    upPool: number;
    downPool: number;
    ethPrice: number;
  };
  onDataUpdate?: (data: {
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
    }>;
  }) => void;
  onMarketChange?: (market: MarketType) => void;
  selectedMarket?: MarketType;
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

export default function PredictionMarket({ userFid, username, initialData, onDataUpdate, onMarketChange, selectedMarket = 'ETH' }: PredictionMarketProps) {
  const [walletAddress, setWalletAddress] = useState<`0x${string}` | null>(null);
  const [ethBalance, setEthBalance] = useState<string>('0');
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
  
  // Calculate ticket price based on surge period (must be early for use in callbacks)
  const timeRemainingSecondsEarly = timeLeft.hours * 3600 + timeLeft.minutes * 60 + timeLeft.seconds;
  const isInSurgePeriodEarly = timeRemainingSecondsEarly > 0 && timeRemainingSecondsEarly <= SURGE_PERIOD_SECONDS;
  const TICKET_PRICE_ETH = isInSurgePeriodEarly ? BASE_TICKET_PRICE_ETH * 2 : BASE_TICKET_PRICE_ETH;
  
  const [txState, setTxState] = useState<'idle' | 'buying' | 'claiming' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [recentBets, setRecentBets] = useState<RecentBet[]>([]);
  const [userPfp, setUserPfp] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [historyClosing, setHistoryClosing] = useState(false);
  const [historyMounted, setHistoryMounted] = useState(false);
  const [showUsdValues, setShowUsdValues] = useState(false);
  const [unclaimedMarkets, setUnclaimedMarkets] = useState<UnclaimedMarket[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const [claimingMarketId, setClaimingMarketId] = useState<number | null>(null);
  const [showCoinSelector, setShowCoinSelector] = useState(false);
  const [coinSelectorClosing, setCoinSelectorClosing] = useState(false);
  const [coinSelectorMounted, setCoinSelectorMounted] = useState(false);
  const [selectedCoinIndex, setSelectedCoinIndex] = useState(0);
  const [pageReady, setPageReady] = useState(!!initialData); // Ready immediately if we have initial data
  const [showInfo, setShowInfo] = useState(false);
  const [infoClosing, setInfoClosing] = useState(false);
  const [infoMounted, setInfoMounted] = useState(false);
  const [ticketSectionClosing, setTicketSectionClosing] = useState(false);
  
  const ticketSectionRef = useRef<HTMLDivElement>(null);
  const mainContainerRef = useRef<HTMLDivElement>(null);
  const buyButtonRef = useRef<HTMLButtonElement>(null);
  const directionButtonsRef = useRef<HTMLDivElement>(null);
  
  const closeCoinSelector = () => {
    setCoinSelectorMounted(false);
    setCoinSelectorClosing(true);
    setTimeout(() => {
      setShowCoinSelector(false);
      setCoinSelectorClosing(false);
    }, 400);
  };

  const closeHistory = () => {
    setHistoryMounted(false);
    setHistoryClosing(true);
    setTimeout(() => {
      setShowHistory(false);
      setHistoryClosing(false);
    }, 400);
  };

  const closeInfo = () => {
    setInfoMounted(false);
    setInfoClosing(true);
    setTimeout(() => {
      setShowInfo(false);
      setInfoClosing(false);
    }, 400);
  };

  // Handle mounting animations
  useEffect(() => {
    if (showCoinSelector) {
      // Reset and trigger animation
      setCoinSelectorMounted(false);
      const timer = setTimeout(() => {
        setCoinSelectorMounted(true);
      }, 20);
      return () => clearTimeout(timer);
    }
  }, [showCoinSelector]);

  useEffect(() => {
    if (showHistory) {
      // Reset and trigger animation
      setHistoryMounted(false);
      const timer = setTimeout(() => {
        setHistoryMounted(true);
      }, 20);
      return () => clearTimeout(timer);
    }
  }, [showHistory]);

  useEffect(() => {
    if (showInfo) {
      // Reset and trigger animation
      setInfoMounted(false);
      const timer = setTimeout(() => {
        setInfoMounted(true);
      }, 20);
      return () => clearTimeout(timer);
    }
  }, [showInfo]);
  
  // Safe access to selected coin
  const selectedCoin = AVAILABLE_COINS[selectedCoinIndex] || AVAILABLE_COINS[0];
  
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
  
  const [currentPrice, setCurrentPrice] = useState<bigint | null>(() => {
    if (initialData?.ethPrice) {
      return BigInt(Math.floor(initialData.ethPrice * 1e8));
    }
    return null;
  });
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
      // Only set pageReady if not already set from initialData
      if (!initialData) {
        setTimeout(() => setPageReady(true), 50);
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
      // Get user's bet history from Supabase - limit to last 10 markets
      const { data: bets } = await supabase
        .from('prediction_bets')
        .select('market_id, direction, tickets, price_at_bet, timestamp')
        .eq('wallet_address', walletAddress.toLowerCase())
        .order('timestamp', { ascending: false })
        .limit(50);

      if (!bets || bets.length === 0) {
        setHistory([]);
        setUnclaimedMarkets([]);
        return;
      }

      // Get unique market IDs - limit to last 5 to avoid rate limits
      const marketIds = [...new Set(bets.map(b => b.market_id))].slice(0, 5);
      
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

          // Find bets for this market
          const userBets = bets.filter(b => b.market_id === marketId);
          
          // Group by direction
          const upBets = userBets.filter(b => b.direction === 'up');
          const downBets = userBets.filter(b => b.direction === 'down');

          // Calculate winnings per direction
          const calculateWinnings = (tickets: number, direction: 'up' | 'down') => {
            if (status === 1) { // Resolved
              if (result === 0) { // Tie - refund
                return tickets * BASE_TICKET_PRICE_ETH;
              } else if (result === 1 && direction === 'up') { // UP won
                const poolAfterFee = totalPool * 0.95;
                return (poolAfterFee * tickets * BASE_TICKET_PRICE_ETH) / upPool;
              } else if (result === 2 && direction === 'down') { // DOWN won
                const poolAfterFee = totalPool * 0.95;
                return (poolAfterFee * tickets * BASE_TICKET_PRICE_ETH) / downPool;
              }
            } else if (status === 2) { // Cancelled - refund
              return tickets * BASE_TICKET_PRICE_ETH;
            }
            return 0;
          };

          // Add UP bets to history
          if (upBets.length > 0) {
            const totalUpTickets = upBets.reduce((sum, b) => sum + b.tickets, 0);
            const upWinnings = calculateWinnings(totalUpTickets, 'up');
            historyItems.push({
              marketId,
              direction: 'up',
              tickets: totalUpTickets,
              result,
              status,
              claimed,
              winnings: upWinnings,
              timestamp: upBets[0]?.timestamp || '',
              priceAtBet: upBets[0]?.price_at_bet || 0,
            });
          }

          // Add DOWN bets to history
          if (downBets.length > 0) {
            const totalDownTickets = downBets.reduce((sum, b) => sum + b.tickets, 0);
            const downWinnings = calculateWinnings(totalDownTickets, 'down');
            historyItems.push({
              marketId,
              direction: 'down',
              tickets: totalDownTickets,
              result,
              status,
              claimed,
              winnings: downWinnings,
              timestamp: downBets[0]?.timestamp || '',
              priceAtBet: downBets[0]?.price_at_bet || 0,
            });
          }

          // Calculate total winnings for unclaimed check
          const totalWinnings = calculateWinnings(upTickets, 'up') + calculateWinnings(downTickets, 'down');

          // Check if unclaimed and has winnings
          if (!claimed && totalWinnings > 0 && status !== 0) {
            unclaimed.push({
              marketId,
              upTickets,
              downTickets,
              result,
              status,
              estimatedWinnings: totalWinnings,
              upPool,
              downPool,
            });
          }
        } catch (e) {
          console.log('Error fetching market', marketId, e);
        }
      }

      // Sort by timestamp descending
      historyItems.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

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
      
      // Only update price if we got a valid value
      if (price && price > 0n) {
        setCurrentPrice(price);
      }
      setIsBettingOpen(betting);
      
    } catch (error) {
      console.error('Failed to fetch market:', error);
      // Don't reset state on error - keep existing values
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
      // Same button clicked - close with animation
      setTicketSectionClosing(true);
      
      // Smoothly scroll the container back up as the section closes
      if (mainContainerRef.current) {
        const container = mainContainerRef.current;
        const currentScroll = container.scrollTop;
        // Scroll up by roughly the height of the ticket section
        const targetScroll = Math.max(0, currentScroll - 280);
        container.scrollTo({ top: targetScroll, behavior: 'smooth' });
      }
      
      // Wait for animation to complete before removing
      setTimeout(() => {
        setSelectedDirection(null);
        setTicketSectionClosing(false);
      }, 250);
    } else if (selectedDirection && selectedDirection !== direction) {
      // Switching direction - just swap, no close animation needed
      setSelectedDirection(direction);
    } else {
      // Opening fresh
      setSelectedDirection(direction);
      // Smooth scroll down to show the ticket section after it renders
      setTimeout(() => {
        if (mainContainerRef.current) {
          const container = mainContainerRef.current;
          // Scroll down to show the ticket section and buy button
          container.scrollTo({ 
            top: container.scrollTop + 280, 
            behavior: 'smooth' 
          });
        }
      }, 100);
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
          chainId: `0x${(8453).toString(16)}`, // Base mainnet
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
  
  // Always calculate what you'd ACTUALLY get if you bet
  // For unselected buttons, show odds for 1 ticket
  const oneTicketCost = TICKET_PRICE_ETH;
  
  // Preview multiplier for UP (what you'd get betting 1 ticket on UP)
  const previewUpPool = upPool + oneTicketCost;
  const previewUpTotal = previewUpPool + downPool;
  const previewUpMultiplier = previewUpPool > 0 ? (previewUpTotal * (1 - houseFee)) / previewUpPool : 1.9;
  
  // Preview multiplier for DOWN (what you'd get betting 1 ticket on DOWN)
  const previewDownPool = downPool + oneTicketCost;
  const previewDownTotal = upPool + previewDownPool;
  const previewDownMultiplier = previewDownPool > 0 ? (previewDownTotal * (1 - houseFee)) / previewDownPool : 1.9;
  
  // When selected, recalculate with actual ticket count
  const selectedUpPool = upPool + (selectedDirection === 'up' ? totalCostEth : 0);
  const selectedDownPool = downPool + (selectedDirection === 'down' ? totalCostEth : 0);
  const selectedTotalPool = selectedUpPool + selectedDownPool;
  const selectedPoolAfterFee = selectedTotalPool * (1 - houseFee);
  
  const realUpMultiplier = selectedUpPool > 0 ? selectedPoolAfterFee / selectedUpPool : 1.9;
  const realDownMultiplier = selectedDownPool > 0 ? selectedPoolAfterFee / selectedDownPool : 1.9;
  
  // Show preview when not selected, real when selected
  const displayUpMultiplier = selectedDirection === 'up' ? realUpMultiplier : previewUpMultiplier;
  const displayDownMultiplier = selectedDirection === 'down' ? realDownMultiplier : previewDownMultiplier;
  
  const potentialWinnings = selectedDirection === 'up' 
    ? totalCostEth * realUpMultiplier
    : selectedDirection === 'down' 
    ? totalCostEth * realDownMultiplier
    : 0;

  const startPriceUsd = marketData ? Number(marketData.startPrice) / 1e8 : 0;
  const currentPriceUsd = currentPrice ? Number(currentPrice) / 1e8 : startPriceUsd || 0;
  const priceChange = startPriceUsd > 0 ? ((currentPriceUsd - startPriceUsd) / startPriceUsd) * 100 : 0;
  const hasPriceData = currentPriceUsd > 0;

  // Calculate time remaining in seconds for parent
  const timeRemainingSeconds = timeLeft.hours * 3600 + timeLeft.minutes * 60 + timeLeft.seconds;

  // Surge pricing already calculated early in component (TICKET_PRICE_ETH)
  const isInSurgePeriod = timeRemainingSeconds > 0 && timeRemainingSeconds <= SURGE_PERIOD_SECONDS;

  // Lock: last 1 hour OR contract says locked
  const isLockedByTime = timeRemainingSeconds > 0 && timeRemainingSeconds <= LOCK_PERIOD_SECONDS;
  const isLocked = hasMarket && !isResolved && !isCancelled && (isLockedByTime || !isBettingOpen);

  const totalUnclaimed = unclaimedMarkets.reduce((sum, m) => sum + m.estimatedWinnings, 0);

  // Call onDataUpdate when relevant data changes
  useEffect(() => {
    if (onDataUpdate) {
      // Get recent wins from history
      const recentWins = history
        .filter(h => h.winnings > 0 && h.status === 1)
        .slice(0, 5)
        .map(h => ({
          username: username || 'anon',
          pfp: '',
          amount: h.winnings,
          direction: h.direction,
        }));

      onDataUpdate({
        marketId: marketData ? Number(marketData.id) : 0,
        timeRemaining: timeRemainingSeconds,
        totalPool,
        upPool,
        downPool,
        ethPrice: currentPriceUsd || 2900,
        recentWins,
      });
    }
  }, [marketData?.id, timeRemainingSeconds, totalPool, upPool, downPool, currentPriceUsd, history, onDataUpdate, username]);

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

      {/* Loading Skeleton - shown briefly while SDK initializes */}
      {!pageReady ? (
        <div className="relative flex flex-col h-full p-4 pt-20 gap-3 overflow-y-auto scrollbar-hide">
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-4 h-28 animate-pulse" />
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-3 h-12 animate-pulse" />
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4 h-32 animate-pulse" />
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4 h-28 animate-pulse" />
            <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4 h-28 animate-pulse" />
          </div>
        </div>
      ) : (
        <div ref={mainContainerRef} className="relative flex flex-col h-full p-4 pt-20 gap-3 overflow-y-auto scrollbar-hide">

        {/* Unclaimed Winnings Banner */}
        {totalUnclaimed > 0 && (
          <button
            onClick={() => { setShowHistory(true); playClick(); triggerHaptic('medium'); }}
            className="bg-gradient-to-r from-white/10 to-white/5 border border-white/20 rounded-xl p-4 hover:from-white/15 hover:to-white/10 transition-all animate-fade-in"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-white">Claim Your Winnings</p>
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

        {/* Price Card - Click to select coin */}
        <button 
          onClick={() => { setShowCoinSelector(true); playClick(); triggerHaptic('light'); }}
          className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-4 text-left hover:bg-white/[0.05] transition-all active:scale-[0.99] animate-fade-in"
          style={{ animationDelay: '50ms' }}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <img 
                  src={selectedCoin.icon}
                  alt={selectedCoin.symbol}
                  className="w-4 h-4 rounded-full"
                />
                <p className="text-[10px] text-white/40 uppercase tracking-wider">{selectedCoin.symbol}/USD</p>
                <svg className="w-2.5 h-2.5 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                  <path d="M19 9l-7 7-7-7" />
                </svg>
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-white/5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                  <span className="text-[8px] text-white/40">LIVE</span>
                </div>
              </div>
              <p className="text-3xl font-bold tracking-tight">
                {currentPriceUsd > 0 
                  ? `$${currentPriceUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : '$---'
                }
              </p>
            </div>
            {hasMarket && !isResolved && startPriceUsd > 0 && (
              <div className="text-right">
                <p className="text-[10px] text-white/40 mb-1">Since Start</p>
                <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg ${
                  priceChange >= 0 ? 'bg-white/10' : 'bg-red-500/20'
                }`}>
                  <svg className={`w-3 h-3 ${priceChange >= 0 ? 'text-white' : 'text-red-400 rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                    <path d="M5 15l7-7 7 7" />
                  </svg>
                  <span className={`text-lg font-bold ${priceChange >= 0 ? 'text-white' : 'text-red-400'}`}>
                    {Math.abs(priceChange).toFixed(2)}%
                  </span>
                </div>
              </div>
            )}
          </div>
          {hasMarket && startPriceUsd > 0 && (
            <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-white/40">
              <span>Start: ${startPriceUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/5 text-white/60">
                <span className="text-[10px] font-medium">Chainlink</span>
              </span>
            </div>
          )}
        </button>

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

        {/* Timer with Info & History */}
        {hasMarket && !isResolved && !isCancelled && (
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-3 animate-fade-in" style={{ animationDelay: '100ms' }}>
            <div className="flex items-center justify-between">
              {/* Left: Timer */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  {isLocked ? (
                    <svg className="w-3 h-3 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  ) : isInSurgePeriod ? (
                    <svg className="w-3 h-3 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  ) : null}
                  <p className={`text-[10px] uppercase tracking-wider ${isInSurgePeriod && !isLocked ? 'text-yellow-400' : 'text-white/40'}`}>
                    {isLocked ? 'Locked' : isInSurgePeriod ? '2x Surge' : 'Ends In'}
                  </p>
                </div>
                <p className="text-xl font-bold">
                  {timeLeft.hours}h {timeLeft.minutes}m {timeLeft.seconds}s
                </p>
              </div>
              {/* Right: Info & History Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); setShowInfo(true); playClick(); triggerHaptic('light'); }}
                  className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all active:scale-95"
                >
                  <svg className="w-4 h-4 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <circle cx="12" cy="8" r="0.5" fill="currentColor" />
                  </svg>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setShowHistory(true); playClick(); triggerHaptic('light'); }}
                  className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all active:scale-95"
                >
                  <svg className="w-4 h-4 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Info & History Row - shown when no timer (resolved/cancelled/no market) */}
        {(!hasMarket || isResolved || isCancelled) && (
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-3 animate-fade-in" style={{ animationDelay: '100ms' }}>
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-white/40 uppercase tracking-wider">
                {isResolved ? 'Round Ended' : isCancelled ? 'Round Cancelled' : 'No Active Round'}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); setShowInfo(true); playClick(); triggerHaptic('light'); }}
                  className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all active:scale-95"
                >
                  <svg className="w-4 h-4 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <circle cx="12" cy="8" r="0.5" fill="currentColor" />
                  </svg>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setShowHistory(true); playClick(); triggerHaptic('light'); }}
                  className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all active:scale-95"
                >
                  <svg className="w-4 h-4 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Pool */}
        {hasMarket && (
          <button 
            onClick={() => { setShowUsdValues(!showUsdValues); playClick(); triggerHaptic('light'); }}
            className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4 animate-fade-in text-left w-full active:scale-[0.99] transition-transform" 
            style={{ animationDelay: '150ms' }}
          >
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <p className="text-[10px] text-white/40 uppercase tracking-wider">Pool</p>
                <span className="text-[8px] text-white/20 px-1.5 py-0.5 rounded bg-white/5">tap to switch</span>
              </div>
              <p className="text-xs">
                {showUsdValues ? (
                  <>
                    <span className="text-white font-semibold">${(totalPool * (currentPriceUsd > 0 ? currentPriceUsd : 2900)).toFixed(2)}</span>
                    <span className="text-white/40 ml-1">USD</span>
                  </>
                ) : (
                  <>
                    <span className="text-white font-semibold">{totalPool.toFixed(4)}</span>
                    <span className="text-white/40 ml-1">ETH</span>
                  </>
                )}
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
                <span className="text-white/30 text-[10px]">{displayUpMultiplier.toFixed(2)}x</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-white/30 text-[10px]">{displayDownMultiplier.toFixed(2)}x</span>
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
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] text-white/40 uppercase">Your Position</p>
                  {(canClaim || canRefund) && (
                    <span
                      onClick={(e) => { e.stopPropagation(); handleClaim(); }}
                      className="bg-gradient-to-r from-white to-white text-black text-[10px] font-bold px-3 py-1 rounded disabled:opacity-50 hover:scale-105 transition-transform cursor-pointer"
                    >
                      {txState === 'claiming' ? '...' : canRefund ? 'Refund' : 'Claim'}
                    </span>
                  )}
                </div>
                <div className="space-y-1.5">
                  {userUpTickets > 0 && (
                    <div className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                          <path d="M5 15l7-7 7 7" />
                        </svg>
                        <span className="text-xs text-white">{userUpTickets} ticket{userUpTickets > 1 ? 's' : ''}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-white/40">to win </span>
                        {showUsdValues ? (
                          <span className="text-xs font-bold text-white">
                            ${(((totalPool * 0.95 / upPool) * userUpTickets * TICKET_PRICE_ETH) * (currentPriceUsd > 0 ? currentPriceUsd : 2900)).toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-white">
                            {((totalPool * 0.95 / upPool) * userUpTickets * TICKET_PRICE_ETH).toFixed(4)} ETH
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  {userDownTickets > 0 && (
                    <div className="flex items-center justify-between bg-red-500/10 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                          <path d="M19 9l-7 7-7-7" />
                        </svg>
                        <span className="text-xs text-red-400">{userDownTickets} ticket{userDownTickets > 1 ? 's' : ''}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-white/40">to win </span>
                        {showUsdValues ? (
                          <span className="text-xs font-bold text-red-400">
                            ${(((totalPool * 0.95 / downPool) * userDownTickets * TICKET_PRICE_ETH) * (currentPriceUsd > 0 ? currentPriceUsd : 2900)).toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-red-400">
                            {((totalPool * 0.95 / downPool) * userDownTickets * TICKET_PRICE_ETH).toFixed(4)} ETH
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </button>
        )}

        {/* Betting Section */}
        {!walletAddress ? (
          <button
            onClick={connectWallet}
            className="w-full py-4 rounded-xl bg-white/10 border border-white/20 font-semibold hover:bg-white/20 transition-all hover:scale-[1.02] active:scale-[0.98] animate-fade-in"
            style={{ animationDelay: '200ms' }}
          >
            Connect Wallet
          </button>
        ) : (!hasMarket || isResolved || isCancelled) ? (
          <div className="flex flex-col gap-3 animate-fade-in" style={{ animationDelay: '200ms' }}>
            <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4 text-center">
              <h3 className="text-lg font-bold text-white mb-1">New Round Starting</h3>
              <p className="text-sm text-white/50 mb-4">Be the first to bet and start the next 24h prediction round!</p>
            </div>
            
            <div ref={directionButtonsRef} className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleDirectionClick('up')}
                className={`rounded-xl p-4 transition-all hover:scale-[1.02] active:scale-[0.98] ${
                  selectedDirection === 'up'
                    ? 'bg-white text-black ring-2 ring-white ring-offset-2 ring-offset-black'
                    : 'bg-white/[0.03] border border-white/[0.08] hover:border-white/50'
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  <svg className={`w-8 h-8 ${selectedDirection === 'up' ? 'text-black' : 'text-white'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path d="M5 15l7-7 7 7" />
                  </svg>
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
                  <svg className={`w-8 h-8 ${selectedDirection === 'down' ? 'text-white' : 'text-red-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path d="M19 9l-7 7-7-7" />
                  </svg>
                  <span className="font-bold text-sm">DUMP</span>
                </div>
              </button>
            </div>

            {/* Ticket Section + Buy Button - animate together */}
            {(selectedDirection || ticketSectionClosing) && (
              <div className={`flex flex-col gap-3 overflow-hidden ${ticketSectionClosing ? 'animate-slide-out' : 'animate-slide-in'}`}>
                <div ref={ticketSectionRef} className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] text-white/40 uppercase">Tickets</p>
                    <p className="text-[10px] text-white/40">
                      Bal: <span className="text-white">{Number(ethBalance).toFixed(4)} ETH</span>
                    </p>
                  </div>

                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={() => { setTicketCount(Math.max(1, ticketCount - 10)); playClick(); triggerHaptic('light'); }}
                      className="w-10 h-10 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-xs font-medium transition-all active:scale-95"
                    >
                      -10
                    </button>
                    <button
                      onClick={() => { setTicketCount(Math.max(1, ticketCount - 5)); playClick(); triggerHaptic('light'); }}
                      className="w-9 h-10 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-xs font-medium transition-all active:scale-95"
                    >
                      -5
                    </button>
                    <button
                      onClick={() => { setTicketCount(Math.max(1, ticketCount - 1)); playClick(); triggerHaptic('light'); }}
                      className="w-8 h-10 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-sm transition-all active:scale-95"
                    >
                      −
                    </button>
                    
                    <div className="w-16 text-center px-2">
                      <p className="text-2xl font-bold">{ticketCount}</p>
                      <p className="text-[9px] text-white/40">{(ticketCount * TICKET_PRICE_ETH).toFixed(3)} ETH</p>
                    </div>

                    <button
                      onClick={() => { setTicketCount(ticketCount + 1); playClick(); triggerHaptic('light'); }}
                      className="w-8 h-10 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-sm transition-all active:scale-95"
                    >
                      +
                    </button>
                    <button
                      onClick={() => { setTicketCount(ticketCount + 5); playClick(); triggerHaptic('light'); }}
                      className="w-9 h-10 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-xs font-medium transition-all active:scale-95"
                    >
                      +5
                    </button>
                    <button
                      onClick={() => { setTicketCount(ticketCount + 10); playClick(); triggerHaptic('light'); }}
                      className="w-10 h-10 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-xs font-medium transition-all active:scale-95"
                    >
                      +10
                    </button>
                  </div>
                </div>

                <button
                  ref={buyButtonRef}
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
              </div>
            )}
          </div>
        ) : !isLocked ? (
          <div className="flex flex-col gap-3 animate-fade-in" style={{ animationDelay: '200ms' }}>
            <div ref={directionButtonsRef} className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleDirectionClick('up')}
                className={`rounded-xl p-4 transition-all hover:scale-[1.02] active:scale-[0.98] ${
                  selectedDirection === 'up'
                    ? 'bg-white text-black ring-2 ring-white ring-offset-2 ring-offset-black'
                    : 'bg-white/[0.03] border border-white/[0.08] hover:border-white/50'
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  <svg className={`w-8 h-8 ${selectedDirection === 'up' ? 'text-black' : 'text-white'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path d="M5 15l7-7 7 7" />
                  </svg>
                  <span className="font-bold text-sm">PUMP</span>
                  <span className={`text-[10px] ${selectedDirection === 'up' ? 'text-black/60' : 'text-white/40'}`}>
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
                  <svg className={`w-8 h-8 ${selectedDirection === 'down' ? 'text-white' : 'text-red-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path d="M19 9l-7 7-7-7" />
                  </svg>
                  <span className="font-bold text-sm">DUMP</span>
                  <span className={`text-[10px] ${selectedDirection === 'down' ? 'text-white/70' : 'text-white/40'}`}>
                    {displayDownMultiplier.toFixed(2)}x
                  </span>
                </div>
              </button>
            </div>

            {/* Ticket Section + Buy Button - animate together */}
            {(selectedDirection || ticketSectionClosing) && (
              <div className={`flex flex-col gap-3 overflow-hidden ${ticketSectionClosing ? 'animate-slide-out' : 'animate-slide-in'}`}>
                <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4">
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
              </div>
            )}
          </div>
        ) : null}

        {/* Locked State - Above Recent Bets */}
        {isLocked && (
          <div className="flex flex-col items-center justify-center py-6 bg-white/[0.03] border border-white/[0.08] rounded-xl animate-fade-in" style={{ animationDelay: '200ms' }}>
            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
              <svg className="w-7 h-7 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <p className="text-white/50 text-sm mt-3">Betting Locked</p>
            <p className="text-white/30 text-xs">{isLockedByTime ? 'Final hour - no new bets' : 'Waiting for resolution'}</p>
          </div>
        )}

        {/* Footer */}
        <div className="text-center pt-2">
          <p className="text-[9px] text-black">
            {username ? `@${username} · ` : ''}{TICKET_PRICE_ETH} ETH/ticket{isInSurgePeriod ? ' (2x surge)' : ''} · 5% fee
          </p>
        </div>
      </div>
      )}

      {/* Info Modal */}
      {showInfo && (
        <div 
          className="fixed inset-0 z-50 flex items-end justify-center"
          onClick={closeInfo}
        >
          {/* Backdrop - combined dark + blur layer */}
          <div 
            className={`absolute inset-0 bg-black/70 backdrop-blur-xl transition-opacity duration-500 ease-out ${
              infoMounted && !infoClosing ? 'opacity-100' : 'opacity-0'
            }`}
          />
          {/* Content panel */}
          <div 
            className={`relative w-full max-w-md max-h-[80vh] bg-gradient-to-t from-black via-black/95 to-transparent rounded-t-3xl pb-6 px-4 overflow-hidden transition-all duration-500 ${
              infoMounted && !infoClosing
                ? 'opacity-100 translate-y-0' 
                : 'opacity-0 translate-y-full'
            }`}
            style={{ transitionTimingFunction: infoClosing ? 'ease-in' : 'cubic-bezier(0.22, 1, 0.36, 1)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="pt-6 pb-4">
              <h3 className="text-lg font-bold text-white text-center">How It Works</h3>
            </div>
            
            <div className="overflow-y-auto max-h-[calc(80vh-120px)] space-y-4 text-sm text-white/70 pb-2 scrollbar-hide">
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold">1</span>
                </div>
                <p><span className="text-white font-medium">Predict</span> - Choose PUMP (price up) or DUMP (price down) before the round ends</p>
              </div>
              
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold">2</span>
                </div>
                <p><span className="text-white font-medium">Bet</span> - Buy tickets at 0.001 ETH each. More tickets = bigger potential win</p>
              </div>
              
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold">3</span>
                </div>
                <p><span className="text-white font-medium">Wait</span> - Each round lasts 24 hours. Price is checked via Chainlink oracle</p>
              </div>
              
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold">4</span>
                </div>
                <p><span className="text-white font-medium">Win</span> - If you predicted correctly, claim your share of the losing pool!</p>
              </div>
              
              <div className="mt-2 p-3 bg-white/5 rounded-xl text-xs">
                <p className="text-white/50">
                  <span className="text-red-400">5% fee</span> is taken from the pool. Winnings are split proportionally based on your tickets.
                </p>
              </div>
            </div>
            
            {/* Close hint */}
            <p className="text-center text-white/20 text-[10px] mt-3 uppercase tracking-wider">tap anywhere above to close</p>
          </div>
        </div>
      )}

      {/* Coin Selector Modal */}
      {showCoinSelector && (
        <div 
          className="fixed inset-0 z-50 flex items-end justify-center"
          onClick={closeCoinSelector}
        >
          {/* Backdrop - combined dark + blur layer */}
          <div 
            className={`absolute inset-0 bg-black/70 backdrop-blur-xl transition-opacity duration-500 ease-out ${
              coinSelectorMounted && !coinSelectorClosing ? 'opacity-100' : 'opacity-0'
            }`}
          />
          {/* Content panel */}
          <div 
            className={`relative w-full max-w-md bg-gradient-to-t from-black via-black/95 to-transparent pt-20 pb-8 px-4 rounded-t-3xl transition-all duration-500 ${
              coinSelectorMounted && !coinSelectorClosing
                ? 'opacity-100 translate-y-0' 
                : 'opacity-0 translate-y-full'
            }`}
            style={{ transitionTimingFunction: coinSelectorClosing ? 'ease-in' : 'cubic-bezier(0.22, 1, 0.36, 1)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-white mb-1">Select Market</h3>
              <p className="text-sm text-white/40">Choose a coin to predict</p>
            </div>
            
            {/* Coin Carousel */}
            <div className="flex gap-3 overflow-x-auto pb-4 px-2 snap-x snap-mandatory scrollbar-hide justify-center">
              {AVAILABLE_COINS.map((coin, index) => (
                <button
                  key={coin.symbol}
                  onClick={() => {
                    if (coin.active) {
                      if (coin.symbol === 'BYEMONEY' && onMarketChange) {
                        onMarketChange('BYEMONEY');
                        closeCoinSelector();
                        playClick();
                        triggerHaptic('medium');
                      } else if (coin.symbol === 'ETH') {
                        setSelectedCoinIndex(index);
                        if (onMarketChange) onMarketChange('ETH');
                        closeCoinSelector();
                        playClick();
                        triggerHaptic('medium');
                      }
                    } else {
                      triggerHaptic('error');
                    }
                  }}
                  style={{ animationDelay: `${index * 50}ms` }}
                  className={`flex-shrink-0 snap-center w-24 rounded-xl p-3 transition-all animate-pop-in ${
                    coin.active 
                      ? selectedCoinIndex === index
                        ? 'bg-white text-black'
                        : 'bg-white/10 border border-white/20 hover:bg-white/20'
                      : 'bg-white/5 border border-white/10 opacity-50'
                  }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <div className={`relative w-10 h-10 rounded-full overflow-hidden ${
                      !coin.active && 'grayscale'
                    }`}>
                      <img 
                        src={coin.icon} 
                        alt={coin.symbol}
                        className="w-full h-full object-cover"
                      />
                      {!coin.active && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <svg className="w-4 h-4 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="text-center">
                      <p className={`font-bold text-xs ${
                        coin.active && selectedCoinIndex === index ? 'text-black' : 'text-white'
                      }`}>{coin.symbol}</p>
                      <p className={`text-[9px] ${
                        coin.active 
                          ? selectedCoinIndex === index ? 'text-black/60' : 'text-white/40'
                          : 'text-white/30'
                      }`}>
                        {coin.active ? coin.name : 'Coming Soon'}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            
            {/* Close hint */}
            <p className="text-center text-white/20 text-[10px] mt-4 uppercase tracking-wider">tap anywhere above to close</p>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistory && (
        <div 
          className="fixed inset-0 z-50 flex items-end justify-center"
          onClick={closeHistory}
        >
          {/* Backdrop - combined dark + blur layer */}
          <div 
            className={`absolute inset-0 bg-black/70 backdrop-blur-xl transition-opacity duration-500 ease-out ${
              historyMounted && !historyClosing ? 'opacity-100' : 'opacity-0'
            }`}
          />
          {/* Content panel */}
          <div 
            className={`relative w-full max-w-md max-h-[70vh] bg-gradient-to-t from-black via-black/95 to-transparent rounded-t-3xl pb-6 px-4 overflow-hidden transition-all duration-500 ${
              historyMounted && !historyClosing
                ? 'opacity-100 translate-y-0' 
                : 'opacity-0 translate-y-full'
            }`}
            style={{ transitionTimingFunction: historyClosing ? 'ease-in' : 'cubic-bezier(0.22, 1, 0.36, 1)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="pt-6 pb-3">
              <h3 className="text-lg font-bold text-white text-center">Betting History</h3>
            </div>
            
            <div className="overflow-y-auto max-h-[calc(70vh-100px)] space-y-2 pb-2 scrollbar-hide">
              {/* Unclaimed Winnings */}
              {unclaimedMarkets.length > 0 && (
                <div className="bg-white/10 border border-white/20 rounded-xl p-3 mb-2">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] text-white/60 uppercase tracking-wider">Unclaimed</p>
                    <p className="text-sm font-bold text-white">{totalUnclaimed.toFixed(4)} ETH</p>
                  </div>
                  <div className="space-y-1.5">
                    {unclaimedMarkets.map((m) => (
                      <div key={m.marketId} className="flex items-center justify-between bg-black/40 rounded-lg p-2">
                        <div>
                          <p className="text-xs text-white/70">Round #{m.marketId}</p>
                          <p className="text-[10px] text-white/40">
                            {m.status === 2 ? 'Cancelled' : m.result === 1 ? 'UP won' : 'DOWN won'}
                          </p>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleClaim(m.marketId); }}
                          disabled={claimingMarketId === m.marketId}
                          className="bg-white hover:bg-white/90 text-black text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all disabled:opacity-50 whitespace-nowrap"
                        >
                          {claimingMarketId === m.marketId ? '...' : `Claim`}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* History Items - Last 7 */}
              {history.length === 0 ? (
                <div className="text-center py-8 text-white/40">
                  <p className="text-sm">No betting history yet</p>
                </div>
              ) : (
                history.slice(0, 7).map((item, index) => {
                  const betDate = item.timestamp ? new Date(item.timestamp) : null;
                  const dayName = betDate ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][betDate.getDay()] : '';
                  const ethPrice = currentPriceUsd > 0 ? currentPriceUsd : 2900;
                  const betAmountEth = (item.tickets * TICKET_PRICE_ETH).toFixed(4);
                  const betAmountUsd = (item.tickets * TICKET_PRICE_ETH * ethPrice).toFixed(2);
                  const winningsEth = item.winnings > 0 ? item.winnings.toFixed(4) : '0';
                  const winningsUsd = item.winnings > 0 ? (item.winnings * ethPrice).toFixed(2) : '0';
                  const isWin = item.result === (item.direction === 'up' ? 1 : 2);
                  
                  return (
                    <div 
                      key={`${item.marketId}-${item.direction}-${index}`} 
                      className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-2.5 animate-fade-in"
                      style={{ animationDelay: `${index * 30}ms` }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            item.direction === 'up' ? 'bg-white/20' : 'bg-red-500/20'
                          }`}>
                            <svg className={`w-3.5 h-3.5 ${item.direction === 'up' ? 'text-white' : 'text-red-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                              <path d={item.direction === 'up' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
                            </svg>
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-[11px] font-semibold">#{item.marketId}</p>
                              <span className={`text-[8px] px-1 py-0.5 rounded ${
                                item.direction === 'up' ? 'bg-white/10 text-white/70' : 'bg-red-500/20 text-red-400/70'
                              }`}>
                                {item.direction === 'up' ? 'PUMP' : 'DUMP'}
                              </span>
                              {dayName && <span className="text-[8px] text-white/30">{dayName}</span>}
                            </div>
                            <p className="text-[9px] text-white/40">
                              {item.tickets}x · {betAmountEth} ETH · ${betAmountUsd}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {item.status === 0 ? (
                            <span className="text-[10px] text-white font-medium">Active</span>
                          ) : item.status === 2 ? (
                            <span className="text-[10px] text-orange-400 font-medium">Cancelled</span>
                          ) : isWin ? (
                            <div className="flex items-center gap-1.5">
                              <span className="text-[9px] text-white/50">Won</span>
                              <span className="text-[10px] font-bold text-white">+{winningsEth} ETH</span>
                              <span className="text-[9px] text-white/40">(${winningsUsd})</span>
                            </div>
                          ) : item.result === 0 ? (
                            <span className="text-[10px] text-white/40 font-medium">Tie</span>
                          ) : (
                            <span className="text-[10px] text-red-400 font-medium">Lost</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            
            {/* Close hint */}
            <p className="text-center text-white/20 text-[10px] mt-3 uppercase tracking-wider">tap anywhere above to close</p>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowConfirmModal(false)} />
          <div className={`relative border rounded-2xl p-6 max-w-sm w-full animate-scale-in ${
            selectedDirection === 'up' 
              ? 'bg-white border-white/20' 
              : 'bg-red-500 border-red-400/20'
          }`}>
            <div className="w-14 h-14 rounded-xl overflow-hidden mx-auto mb-4">
              <img 
                src={selectedDirection === 'up' ? '/splash.png' : '/logo.png'} 
                alt="BYEMONEY" 
                className="w-full h-full object-cover" 
              />
            </div>
            
            <h3 className={`text-lg font-bold text-center mb-2 ${selectedDirection === 'up' ? 'text-black' : 'text-white'}`}>Confirm Your Bet</h3>
            
            <p className={`text-sm text-center mb-4 ${selectedDirection === 'up' ? 'text-black/60' : 'text-white/80'}`}>
              You&apos;re about to bet <span className={`font-semibold ${selectedDirection === 'up' ? 'text-black' : 'text-white'}`}>{totalCostEth.toFixed(3)} ETH</span> on <span className="font-semibold">{selectedDirection === 'up' ? 'PUMP' : 'DUMP'}</span>
            </p>

            <div className={`rounded-xl p-3 mb-4 ${selectedDirection === 'up' ? 'bg-black/5' : 'bg-black/20'}`}>
              <p className={`text-xs text-center ${selectedDirection === 'up' ? 'text-black/50' : 'text-white/70'}`}>
                All sales are final. Bets cannot be refunded or reversed once placed. Only bet what you can afford to lose.
              </p>
            </div>

            <label className="flex items-center gap-3 mb-4 cursor-pointer">
              <div 
                onClick={() => { setDontShowAgain(!dontShowAgain); playClick(); }}
                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                  dontShowAgain 
                    ? selectedDirection === 'up' ? 'bg-black border-black' : 'bg-white border-white'
                    : selectedDirection === 'up' ? 'border-black/30' : 'border-white/30'
                }`}
              >
                {dontShowAgain && (
                  <svg className={`w-3 h-3 ${selectedDirection === 'up' ? 'text-white' : 'text-red-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span className={`text-xs ${selectedDirection === 'up' ? 'text-black/50' : 'text-white/70'}`}>Don&apos;t show this again</span>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => { setShowConfirmModal(false); playClick(); }}
                className={`py-3 rounded-xl font-semibold text-sm transition-all active:scale-95 ${
                  selectedDirection === 'up'
                    ? 'bg-black/10 border border-black/20 text-black hover:bg-black/20'
                    : 'bg-white/10 border border-white/20 text-white hover:bg-white/20'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmBuy}
                className={`py-3 rounded-xl font-semibold text-sm transition-all active:scale-95 ${
                  selectedDirection === 'up'
                    ? 'bg-black hover:bg-black/80 text-white'
                    : 'bg-white hover:bg-white/90 text-red-500'
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
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scale-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(100%); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes blur-in {
          from { backdrop-filter: blur(0px); -webkit-backdrop-filter: blur(0px); }
          to { backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); }
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
        @keyframes glow {
          0%, 100% { box-shadow: 0 0 20px rgba(255,255,255,0.1); }
          50% { box-shadow: 0 0 40px rgba(255,255,255,0.2); }
        }
        .animate-fade-in {
          animation: fade-in 0.4s ease-out both;
        }
        .animate-blur-in {
          animation: blur-in 0.3s ease-out forwards;
        }
        .animate-fade-out {
          animation: fade-out 0.3s ease-out forwards;
        }
        @keyframes fade-out {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        .animate-scale-in {
          animation: scale-in 0.2s ease-out;
        }
        .animate-slide-up {
          animation: slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .animate-slide-in {
          animation: slide-in 0.35s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        @keyframes slide-in {
          from { opacity: 0; transform: translateY(-15px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-out {
          animation: slide-out 0.25s ease-in forwards;
        }
        @keyframes slide-out {
          from { opacity: 1; transform: translateY(0); }
          to { opacity: 0; transform: translateY(-15px); }
        }
        .animate-slide-down {
          animation: slide-down 0.3s ease-in forwards;
        }
        @keyframes slide-down {
          from { opacity: 1; transform: translateY(0); }
          to { opacity: 0; transform: translateY(100%); }
        }
        .animate-pop-in {
          animation: pop-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          opacity: 0;
          transform: scale(0.8);
        }
        @keyframes pop-in {
          from { opacity: 0; transform: scale(0.8); }
          to { opacity: 1; transform: scale(1); }
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
        .animate-glow {
          animation: glow 2s ease-in-out infinite;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .animate-number {
          font-variant-numeric: tabular-nums;
        }
      `}</style>
    </div>
  );
}