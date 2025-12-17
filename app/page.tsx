'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPublicClient, http, formatEther } from 'viem';
import { base } from 'viem/chains';
import { createClient } from '@supabase/supabase-js';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import SwipeContainer from '@/components/SwipeContainer';
import HomePage from '@/components/HomePage';
import PredictionMarket from '@/components/PredictionMarket';
import InfoPage from '@/components/InfoPage';

const CONTRACT_ADDRESS = '0x0625E29C2A71A834482bFc6b4cc012ACeee62DA4' as const;
const TICKET_PRICE_ETH = 0.001;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

const MARKET_ABI = [
  {
    name: 'getCurrentMarket',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      { name: 'id', type: 'uint256' },
      { name: 'startPrice', type: 'int256' },
      { name: 'endPrice', type: 'int256' },
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
    outputs: [{ name: '', type: 'int256' }],
  },
  {
    name: 'markets',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'uint256' }],
    outputs: [
      { name: 'id', type: 'uint256' },
      { name: 'startPrice', type: 'int256' },
      { name: 'endPrice', type: 'int256' },
      { name: 'startTime', type: 'uint256' },
      { name: 'endTime', type: 'uint256' },
      { name: 'upPool', type: 'uint256' },
      { name: 'downPool', type: 'uint256' },
      { name: 'status', type: 'uint8' },
      { name: 'result', type: 'uint8' },
      { name: 'totalTickets', type: 'uint256' },
    ],
  },
] as const;

const publicClient = createPublicClient({
  chain: base,
  transport: http('https://base-mainnet.g.alchemy.com/v2/jKHNMnfb18wYA1HfaHxo5'),
});

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
  }>;
}

export default function App() {
  const [activeIndex, setActiveIndex] = useState(1);
  const [userFid, setUserFid] = useState<number | undefined>();
  const [username, setUsername] = useState<string | undefined>();
  const [pfpUrl, setPfpUrl] = useState<string | undefined>();
  const [predictionData, setPredictionData] = useState<PredictionData | undefined>();

  // Fetch recent wins from completed markets
  const fetchRecentWins = useCallback(async (currentMarketId: number) => {
    try {
      // Get bets from recently completed markets (last 5 markets before current)
      const { data: bets } = await supabase
        .from('prediction_bets')
        .select(`
          market_id,
          direction,
          tickets,
          wallet_address,
          prediction_users (
            username,
            pfp_url
          )
        `)
        .lt('market_id', currentMarketId)
        .gte('market_id', currentMarketId - 5)
        .order('market_id', { ascending: false })
        .limit(50);

      if (!bets || bets.length === 0) return [];

      // Get unique market IDs
      const marketIds = [...new Set(bets.map(b => b.market_id))];
      
      // Fetch market results from contract
      const wins: Array<{ username: string; pfp: string; amount: number; direction: 'up' | 'down' }> = [];
      
      for (const marketId of marketIds.slice(0, 3)) {
        try {
          const marketInfo = await publicClient.readContract({
            address: CONTRACT_ADDRESS,
            abi: MARKET_ABI,
            functionName: 'markets',
            args: [BigInt(marketId)],
          });
          
          const status = Number(marketInfo[7]);
          const result = Number(marketInfo[8]);
          const upPool = Number(formatEther(marketInfo[5]));
          const downPool = Number(formatEther(marketInfo[6]));
          const totalPool = upPool + downPool;
          
          // Only process resolved markets
          if (status !== 1) continue;
          
          // Find winning bets
          const winningDirection = result === 1 ? 'up' : result === 2 ? 'down' : null;
          if (!winningDirection) continue;
          
          const winningPool = winningDirection === 'up' ? upPool : downPool;
          const poolAfterFee = totalPool * 0.95;
          
          const marketBets = bets.filter(b => b.market_id === marketId && b.direction === winningDirection);
          
          for (const bet of marketBets) {
            const winnings = (poolAfterFee * bet.tickets * TICKET_PRICE_ETH) / winningPool;
            if (winnings > 0) {
              wins.push({
                username: (bet as any).prediction_users?.username || 'anon',
                pfp: (bet as any).prediction_users?.pfp_url || '',
                amount: winnings,
                direction: bet.direction as 'up' | 'down',
              });
            }
          }
        } catch (e) {
          console.error('Failed to fetch market', marketId, e);
        }
      }
      
      // Sort by amount and return top 5
      return wins.sort((a, b) => b.amount - a.amount).slice(0, 5);
    } catch (error) {
      console.error('Failed to fetch recent wins:', error);
      return [];
    }
  }, []);

  // Fetch basic market data for HomePage
  const fetchBasicMarketData = useCallback(async () => {
    try {
      const [market, price] = await Promise.all([
        publicClient.readContract({
          address: CONTRACT_ADDRESS,
          abi: MARKET_ABI,
          functionName: 'getCurrentMarket',
        }),
        publicClient.readContract({
          address: CONTRACT_ADDRESS,
          abi: MARKET_ABI,
          functionName: 'getPrice',
        }),
      ]);

      const marketId = Number(market[0]);
      const upPool = Number(formatEther(market[5]));
      const downPool = Number(formatEther(market[6]));
      const endTime = Number(market[4]) * 1000;
      const now = Date.now();
      const timeRemaining = Math.max(0, Math.floor((endTime - now) / 1000));
      const ethPrice = price ? Number(price) / 1e8 : 0;

      // Fetch recent wins
      const recentWins = await fetchRecentWins(marketId);

      setPredictionData(prev => ({
        marketId,
        timeRemaining,
        totalPool: upPool + downPool,
        upPool,
        downPool,
        ethPrice: ethPrice > 0 ? ethPrice : prev?.ethPrice || 2900,
        recentWins: recentWins.length > 0 ? recentWins : prev?.recentWins || [],
      }));
    } catch (error) {
      console.error('Failed to fetch basic market data:', error);
    }
  }, [fetchRecentWins]);

  useEffect(() => {
    const initSDK = async () => {
      try {
        const { sdk } = await import('@farcaster/miniapp-sdk');
        await sdk.actions.ready();
        const context = await sdk.context;
        if (context?.user) {
          setUserFid(context.user.fid);
          setUsername(context.user.username);
          setPfpUrl(context.user.pfpUrl);
        }
        console.log('Mini App SDK initialized');
      } catch (error) {
        console.log('Running in standalone mode');
      }
    };
    initSDK();
    
    // Fetch market data immediately
    fetchBasicMarketData();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchBasicMarketData, 30000);
    return () => clearInterval(interval);
  }, [fetchBasicMarketData]);

  // Update time remaining every second
  useEffect(() => {
    const timer = setInterval(() => {
      setPredictionData(prev => {
        if (!prev || prev.timeRemaining <= 0) return prev;
        return { ...prev, timeRemaining: prev.timeRemaining - 1 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleNavigate = (index: number) => {
    setActiveIndex(index);
  };

  // Called by PredictionMarket with more detailed data
  const handlePredictionDataUpdate = (data: PredictionData) => {
    // Keep our fetched recent wins if the incoming data doesn't have any
    setPredictionData(prev => ({
      ...data,
      recentWins: data.recentWins.length > 0 ? data.recentWins : prev?.recentWins || [],
    }));
  };

  return (
    <div className="h-full flex flex-col">
      <Header 
        userFid={userFid} 
        username={username} 
        pfpUrl={pfpUrl}
        activePageIndex={activeIndex}
      />
      
      <SwipeContainer activeIndex={activeIndex} onNavigate={handleNavigate}>
        <PredictionMarket 
          userFid={userFid} 
          username={username} 
          onDataUpdate={handlePredictionDataUpdate}
        />
        <HomePage 
          predictionData={predictionData}
          onNavigate={handleNavigate}
        />
        <InfoPage />
      </SwipeContainer>
      
      <BottomNav activeIndex={activeIndex} onNavigate={handleNavigate} />
    </div>
  );
}