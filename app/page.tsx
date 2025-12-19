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
import BYEMONEYPredictionMarket from '@/components/BYEMONEYPredictionMarket';
import InfoPage from '@/components/InfoPage';

const ETH_CONTRACT_ADDRESS = '0x0625E29C2A71A834482bFc6b4cc012ACeee62DA4' as const;
const BYEMONEY_CONTRACT_ADDRESS = '0xc5dBe9571B10d76020556b8De77287b04fE8ef3d' as const;
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

export type MarketType = 'ETH' | 'BYEMONEY';

export default function App() {
  const [activeIndex, setActiveIndex] = useState(1);
  const [selectedMarket, setSelectedMarket] = useState<MarketType>('ETH');
  const [userFid, setUserFid] = useState<number | undefined>();
  const [username, setUsername] = useState<string | undefined>();
  const [pfpUrl, setPfpUrl] = useState<string | undefined>();
  const [predictionData, setPredictionData] = useState<PredictionData | undefined>();

  // Fetch basic market data for HomePage (ETH market)
  const fetchBasicMarketData = useCallback(async () => {
    try {
      console.log('Fetching basic market data...');
      
      const [market, price] = await Promise.all([
        publicClient.readContract({
          address: ETH_CONTRACT_ADDRESS,
          abi: MARKET_ABI,
          functionName: 'getCurrentMarket',
        }),
        publicClient.readContract({
          address: ETH_CONTRACT_ADDRESS,
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

      console.log('Market ID:', marketId, 'Fetching recent wins...');

      // Fetch recent bets as social proof (not wins, just activity)
      let recentWins: Array<{ username: string; pfp: string; amount: number; direction: 'up' | 'down' }> = [];
      
      try {
        // Get recent bets from current round only
        const { data: bets, error: betsError } = await supabase
          .from('prediction_bets')
          .select('market_id, direction, tickets, wallet_address, fid')
          .eq('market_id', marketId)
          .order('timestamp', { ascending: false })
          .limit(50);

        console.log('Bets query result:', bets?.length || 0, 'bets, error:', betsError);

        if (bets && bets.length > 0) {
          // Get unique fids to fetch user data
          const fids = [...new Set(bets.map(b => b.fid).filter(Boolean))];
          console.log('Unique fids:', fids);
          
          // Fetch user data separately
          const { data: users, error: usersError } = await supabase
            .from('prediction_users')
            .select('fid, username, pfp_url')
            .in('fid', fids);
          
          console.log('Users query result:', users?.length || 0, 'users, error:', usersError);
          
          // Create a map of fid -> user data
          const userMap = new Map<number, { username: string; pfp_url: string }>();
          if (users) {
            users.forEach(u => userMap.set(u.fid, u));
          }

          // Show all recent bets from current round
          for (const bet of bets) {
            const userData = userMap.get(bet.fid);
            const username = userData?.username || 'anon';
            const pfpUrl = userData?.pfp_url || '';
            
            recentWins.push({
              username,
              pfp: pfpUrl || `https://api.dicebear.com/7.x/shapes/svg?seed=${bet.fid || username}`,
              amount: bet.tickets * TICKET_PRICE_ETH,
              direction: bet.direction as 'up' | 'down',
            });
          }
          
          console.log('Recent activity found:', recentWins.length);
        }
      } catch (error) {
        console.error('Failed to fetch recent activity:', error);
      }

      setPredictionData(prev => ({
        marketId,
        timeRemaining,
        totalPool: upPool + downPool,
        upPool,
        downPool,
        ethPrice: ethPrice > 0 ? ethPrice : prev?.ethPrice || 2900,
        recentWins: recentWins.length > 0 ? recentWins : prev?.recentWins || [],
      }));
      
      console.log('PredictionData set with', recentWins.length, 'recent wins');
    } catch (error) {
      console.error('Failed to fetch basic market data:', error);
    }
  }, []);

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

  const handleMarketChange = (market: MarketType) => {
    setSelectedMarket(market);
  };

  // Called by PredictionMarket with more detailed data
  const handlePredictionDataUpdate = (data: PredictionData) => {
    setPredictionData(prev => ({
      ...data,
      recentWins: prev?.recentWins || [],
    }));
  };

  // Render the appropriate market component
  const renderMarketComponent = () => {
    if (selectedMarket === 'BYEMONEY') {
      return (
        <BYEMONEYPredictionMarket 
          userFid={userFid} 
          username={username}
          onMarketChange={handleMarketChange}
        />
      );
    }
    
    return (
      <PredictionMarket 
        userFid={userFid} 
        username={username} 
        initialData={predictionData ? {
          marketId: predictionData.marketId,
          timeRemaining: predictionData.timeRemaining,
          totalPool: predictionData.totalPool,
          upPool: predictionData.upPool,
          downPool: predictionData.downPool,
          ethPrice: predictionData.ethPrice,
        } : undefined}
        onDataUpdate={handlePredictionDataUpdate}
        onMarketChange={handleMarketChange}
        selectedMarket={selectedMarket}
      />
    );
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
        {renderMarketComponent()}
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