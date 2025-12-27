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

const ETH_CONTRACT_ADDRESS = '0x473BaD200A9830f7bFF3d947f20B2a21C06Da126' as const;
const TICKET_PRICE_ETH = 0.001;
const TICKET_PRICE_BYEMONEY = 1000000; // 1M BYEMONEY per ticket

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
    market?: 'ETH' | 'BYEMONEY';
  }>;
}

interface UnclaimedData {
  amount: number;
  count: number;
  isEthMarket: boolean;
}

export type MarketType = 'ETH' | 'BYEMONEY';

export default function App() {
  const [activeIndex, setActiveIndex] = useState(1); // Start on HomePage
  const [selectedMarket, setSelectedMarket] = useState<MarketType>('ETH');
  const [userFid, setUserFid] = useState<number | undefined>();
  const [username, setUsername] = useState<string | undefined>();
  const [pfpUrl, setPfpUrl] = useState<string | undefined>();
  const [walletAddress, setWalletAddress] = useState<`0x${string}` | null>(null);
  const [sdk, setSdk] = useState<any>(null);
  const [predictionData, setPredictionData] = useState<PredictionData | undefined>();
  const [unclaimedData, setUnclaimedData] = useState<UnclaimedData>({ amount: 0, count: 0, isEthMarket: true });
  const [showHistoryModal, setShowHistoryModal] = useState(false);

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
        // Fetch both ETH and BYEMONEY bets
        const [ethBetsResult, byemoneyBetsResult] = await Promise.all([
          supabase
            .from('prediction_bets')
            .select('market_id, direction, tickets, wallet_address, fid, timestamp')
            .order('timestamp', { ascending: false })
            .limit(20),
          supabase
            .from('byemoney_bets')
            .select('market_id, direction, tickets, wallet_address, fid, timestamp')
            .order('timestamp', { ascending: false })
            .limit(20),
        ]);

        const ethBets = ethBetsResult.data || [];
        const byemoneyBets = byemoneyBetsResult.data || [];

        // Get all unique fids from both
        const allFids = [...new Set([
          ...ethBets.map(b => b.fid),
          ...byemoneyBets.map(b => b.fid),
        ].filter(Boolean))];

        // Fetch user info
        let userMap = new Map<number, { username: string; pfp_url: string }>();
        if (allFids.length > 0) {
          const { data: users } = await supabase
            .from('prediction_users')
            .select('fid, username, pfp_url')
            .in('fid', allFids);
          
          users?.forEach(u => userMap.set(u.fid, u));
        }

        // Format ETH bets
        const formattedEthBets = ethBets.map(bet => {
          const userData = userMap.get(bet.fid);
          return {
            username: userData?.username || 'anon',
            pfp: userData?.pfp_url || `https://api.dicebear.com/7.x/shapes/svg?seed=${bet.fid}`,
            amount: bet.tickets * TICKET_PRICE_ETH,
            direction: bet.direction as 'up' | 'down',
            market: 'ETH' as const,
            timestamp: bet.timestamp,
          };
        });

        // Format BYEMONEY bets
        const formattedByemoneyBets = byemoneyBets.map(bet => {
          const userData = userMap.get(bet.fid);
          return {
            username: userData?.username || 'anon',
            pfp: userData?.pfp_url || `https://api.dicebear.com/7.x/shapes/svg?seed=${bet.fid}`,
            amount: bet.tickets * TICKET_PRICE_BYEMONEY,
            direction: bet.direction as 'up' | 'down',
            market: 'BYEMONEY' as const,
            timestamp: bet.timestamp,
          };
        });

        // Combine and sort by timestamp (newest first)
        const allBets = [...formattedEthBets, ...formattedByemoneyBets];
        allBets.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        // Take top 20 most recent
        recentWins = allBets.slice(0, 20).map(({ timestamp, ...rest }) => rest);

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
        const { sdk: farcasterSdk } = await import('@farcaster/miniapp-sdk');
        await farcasterSdk.actions.ready();
        setSdk(farcasterSdk);
        
        const context = await farcasterSdk.context;
        if (context?.user) {
          setUserFid(context.user.fid);
          setUsername(context.user.username);
          setPfpUrl(context.user.pfpUrl);
        }

        // Get wallet address
        try {
          const accounts = await farcasterSdk.wallet.ethProvider.request({
            method: 'eth_requestAccounts',
          }) as string[] | null;
          if (accounts && accounts.length > 0) {
            setWalletAddress(accounts[0] as `0x${string}`);
          }
        } catch (walletError) {
          console.log('Wallet not connected:', walletError);
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
        unclaimedAmount={unclaimedData.amount}
        unclaimedCount={unclaimedData.count}
        isEthMarket={unclaimedData.isEthMarket}
        onClaimClick={() => setShowHistoryModal(true)}
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
            onUnclaimedUpdate={setUnclaimedData}
            selectedMarket={selectedMarket}
            showHistoryModal={showHistoryModal}
            onHistoryModalClose={() => setShowHistoryModal(false)}
          />
        )}
        {activeIndex === 1 && (
          <HomePage 
            predictionData={predictionData}
            onNavigate={setActiveIndex}
            walletAddress={walletAddress}
            sdk={sdk}
          />
        )}
        {activeIndex === 2 && <InfoPage />}
      </main>
      
      <BottomNav activeIndex={activeIndex} onNavigate={setActiveIndex} />
    </div>
  );
}