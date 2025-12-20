'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPublicClient, http, formatEther } from 'viem';
import { base } from 'viem/chains';
import { createClient } from '@supabase/supabase-js';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import HomePage from '@/components/HomePage';
import { PredictionMarket } from '@/components/prediction-market';
import InfoPage from '@/components/InfoPage';

const ETH_CONTRACT_ADDRESS = '0x0625E29C2A71A834482bFc6b4cc012ACeee62DA4' as const;
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
  const [activeIndex, setActiveIndex] = useState(1); // Start on HomePage
  const [selectedMarket, setSelectedMarket] = useState<MarketType>('ETH');
  const [userFid, setUserFid] = useState<number | undefined>();
  const [username, setUsername] = useState<string | undefined>();
  const [pfpUrl, setPfpUrl] = useState<string | undefined>();
  const [predictionData, setPredictionData] = useState<PredictionData | undefined>();

  const fetchBasicMarketData = useCallback(async () => {
    try {
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
      const timeRemaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
      const ethPrice = price ? Number(price) / 1e8 : 0;

      let recentWins: PredictionData['recentWins'] = [];
      
      try {
        const { data: bets } = await supabase
          .from('prediction_bets')
          .select('market_id, direction, tickets, wallet_address, fid')
          .eq('market_id', marketId)
          .order('timestamp', { ascending: false })
          .limit(50);

        if (bets && bets.length > 0) {
          const fids = [...new Set(bets.map(b => b.fid).filter(Boolean))];
          const { data: users } = await supabase
            .from('prediction_users')
            .select('fid, username, pfp_url')
            .in('fid', fids);
          
          const userMap = new Map<number, { username: string; pfp_url: string }>();
          users?.forEach(u => userMap.set(u.fid, u));

          recentWins = bets.map(bet => {
            const userData = userMap.get(bet.fid);
            return {
              username: userData?.username || 'anon',
              pfp: userData?.pfp_url || `https://api.dicebear.com/7.x/shapes/svg?seed=${bet.fid}`,
              amount: bet.tickets * TICKET_PRICE_ETH,
              direction: bet.direction as 'up' | 'down',
            };
          });
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
      } catch (error) {
        console.log('Running in standalone mode');
      }
    };
    initSDK();
    fetchBasicMarketData();
    const interval = setInterval(fetchBasicMarketData, 30000);
    return () => clearInterval(interval);
  }, [fetchBasicMarketData]);

  useEffect(() => {
    const timer = setInterval(() => {
      setPredictionData(prev => {
        if (!prev || prev.timeRemaining <= 0) return prev;
        return { ...prev, timeRemaining: prev.timeRemaining - 1 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handlePredictionDataUpdate = (data: PredictionData) => {
    setPredictionData(prev => ({
      ...data,
      recentWins: prev?.recentWins || [],
    }));
  };

  return (
    <div className="h-full flex flex-col bg-black">
      <Header 
        userFid={userFid} 
        username={username} 
        pfpUrl={pfpUrl}
        activePageIndex={activeIndex}
      />
      
      <main className="flex-1 overflow-hidden">
        {activeIndex === 0 && (
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
            onMarketChange={setSelectedMarket}
            selectedMarket={selectedMarket}
          />
        )}
        {activeIndex === 1 && (
          <HomePage 
            predictionData={predictionData}
            onNavigate={setActiveIndex}
          />
        )}
        {activeIndex === 2 && <InfoPage />}
      </main>
      
      <BottomNav activeIndex={activeIndex} onNavigate={setActiveIndex} />
    </div>
  );
}