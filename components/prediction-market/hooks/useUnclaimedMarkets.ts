'use client';

import { useState, useEffect, useCallback } from 'react';
import { formatEther } from 'viem';
import { publicClient } from '../client';
import { supabase } from '../supabase';
import {
  ETH_CONTRACT_ADDRESS,
  BYEMONEY_CONTRACT_ADDRESS,
  ETH_CONTRACT_ABI,
  BYEMONEY_CONTRACT_ABI,
  BASE_TICKET_PRICE_ETH,
} from '../constants';
import { calculateWinnings } from '../utils';
import type { MarketType, UnclaimedMarket, HistoryItem } from '../types';

interface UseUnclaimedMarketsReturn {
  unclaimedMarkets: UnclaimedMarket[];
  history: HistoryItem[];
  totalUnclaimedEth: number;
  totalUnclaimedByemoney: number;
  refetch: () => Promise<void>;
}

export function useUnclaimedMarkets(
  walletAddress: `0x${string}` | null,
  activeMarket: MarketType,
  currentMarketId?: bigint
): UseUnclaimedMarketsReturn {
  const [unclaimedMarkets, setUnclaimedMarkets] = useState<UnclaimedMarket[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const fetchAllUnclaimed = useCallback(async () => {
    if (!walletAddress) return;

    try {
      // Fetch BOTH markets in parallel
      const [ethData, byemoneyData] = await Promise.all([
        fetchEthUnclaimed(walletAddress),
        fetchByemoneyUnclaimed(walletAddress, currentMarketId),
      ]);

      // Combine unclaimed markets
      const allUnclaimed = [...ethData.unclaimed, ...byemoneyData.unclaimed];
      
      // Combine and sort history by marketId descending (interleaved, most recent first)
      const allHistory = [...ethData.history, ...byemoneyData.history];
      allHistory.sort((a, b) => b.marketId - a.marketId);

      setUnclaimedMarkets(allUnclaimed);
      setHistory(allHistory);
    } catch (error) {
      console.error('Failed to fetch unclaimed:', error);
    }
  }, [walletAddress, currentMarketId]);

  useEffect(() => {
    fetchAllUnclaimed();
  }, [fetchAllUnclaimed, currentMarketId]);

  const totalUnclaimedEth = unclaimedMarkets
    .filter(m => m.market === 'ETH')
    .reduce((sum, m) => sum + m.estimatedWinnings, 0);
  
  const totalUnclaimedByemoney = unclaimedMarkets
    .filter(m => m.market === 'BYEMONEY')
    .reduce((sum, m) => sum + m.estimatedWinnings, 0);

  return {
    unclaimedMarkets,
    history,
    totalUnclaimedEth,
    totalUnclaimedByemoney,
    refetch: fetchAllUnclaimed,
  };
}

async function fetchByemoneyUnclaimed(
  walletAddress: `0x${string}`,
  currentMarketId: bigint | undefined
): Promise<{ unclaimed: UnclaimedMarket[]; history: HistoryItem[] }> {
  const unclaimed: UnclaimedMarket[] = [];
  const historyItems: HistoryItem[] = [];
  const currentId = currentMarketId ? Number(currentMarketId) : 2;
  const maxCheck = Math.max(currentId + 1, 10);

  for (let i = 1; i <= maxCheck; i++) {
    try {
      const [position, market] = await Promise.all([
        publicClient.readContract({
          address: BYEMONEY_CONTRACT_ADDRESS,
          abi: BYEMONEY_CONTRACT_ABI,
          functionName: 'getPosition',
          args: [BigInt(i), walletAddress],
        }),
        publicClient.readContract({
          address: BYEMONEY_CONTRACT_ADDRESS,
          abi: BYEMONEY_CONTRACT_ABI,
          functionName: 'getMarket',
          args: [BigInt(i)],
        }) as Promise<any>,
      ]);

      const upTickets = Number(position[0]);
      const downTickets = Number(position[1]);
      const claimed = position[2] as boolean;
      const status = Number(market[8]);
      const result = Number(market[9]);
      const upPool = Number(formatEther(market[6] as bigint));
      const downPool = Number(formatEther(market[7] as bigint));
      const totalPool = upPool + downPool;

      if (upTickets === 0 && downTickets === 0) continue;

      let winnings = 0;
      if (status === 1) {
        if (result === 0) {
          winnings = upTickets + downTickets;
        } else if (result === 1 && upTickets > 0) {
          winnings = (totalPool * 0.95 / upPool) * upTickets;
        } else if (result === 2 && downTickets > 0) {
          winnings = (totalPool * 0.95 / downPool) * downTickets;
        }
      } else if (status === 2) {
        winnings = upTickets + downTickets;
      }

      if (upTickets > 0) {
        const upWinnings = status === 1 && result === 1 
          ? (totalPool * 0.95 / upPool) * upTickets 
          : status === 2 ? upTickets : 0;
        historyItems.push({
          marketId: i,
          direction: 'up',
          tickets: upTickets,
          result,
          status,
          claimed,
          winnings: upWinnings,
          timestamp: '',
          priceAtBet: 0,
          market: 'BYEMONEY',
        });
      }

      if (downTickets > 0) {
        const downWinnings = status === 1 && result === 2 
          ? (totalPool * 0.95 / downPool) * downTickets 
          : status === 2 ? downTickets : 0;
        historyItems.push({
          marketId: i,
          direction: 'down',
          tickets: downTickets,
          result,
          status,
          claimed,
          winnings: downWinnings,
          timestamp: '',
          priceAtBet: 0,
          market: 'BYEMONEY',
        });
      }

      if (!claimed && winnings > 0 && status !== 0) {
        unclaimed.push({
          marketId: i,
          upTickets,
          downTickets,
          result,
          status,
          estimatedWinnings: winnings,
          upPool,
          downPool,
          market: 'BYEMONEY',
        });
      }
    } catch (e) {
      break;
    }
  }

  historyItems.sort((a, b) => b.marketId - a.marketId);
  return { unclaimed, history: historyItems };
}

async function fetchEthUnclaimed(
  walletAddress: `0x${string}`
): Promise<{ unclaimed: UnclaimedMarket[]; history: HistoryItem[] }> {
  if (!supabase) return { unclaimed: [], history: [] };

  const { data: bets } = await supabase
    .from('prediction_bets')
    .select('market_id, direction, tickets, price_at_bet, timestamp')
    .eq('wallet_address', walletAddress.toLowerCase())
    .order('timestamp', { ascending: false })
    .limit(50);

  if (!bets || bets.length === 0) {
    return { unclaimed: [], history: [] };
  }

  const marketIds = [...new Set(bets.map((b) => b.market_id))].slice(0, 5);
  const unclaimed: UnclaimedMarket[] = [];
  const historyItems: HistoryItem[] = [];

  for (const marketId of marketIds) {
    try {
      const [position, marketInfo] = await Promise.all([
        publicClient.readContract({
          address: ETH_CONTRACT_ADDRESS,
          abi: ETH_CONTRACT_ABI,
          functionName: 'getPosition',
          args: [BigInt(marketId), walletAddress],
        }),
        publicClient.readContract({
          address: ETH_CONTRACT_ADDRESS,
          abi: ETH_CONTRACT_ABI,
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

      const userBets = bets.filter((b) => b.market_id === marketId);
      const upBets = userBets.filter((b) => b.direction === 'up');
      const downBets = userBets.filter((b) => b.direction === 'down');

      if (upBets.length > 0) {
        const totalUpTickets = upBets.reduce((sum, b) => sum + b.tickets, 0);
        const upWinnings = calculateWinnings(
          totalUpTickets, 'up', result, status, totalPool, upPool, downPool, BASE_TICKET_PRICE_ETH
        );
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
          market: 'ETH',
        });
      }

      if (downBets.length > 0) {
        const totalDownTickets = downBets.reduce((sum, b) => sum + b.tickets, 0);
        const downWinnings = calculateWinnings(
          totalDownTickets, 'down', result, status, totalPool, upPool, downPool, BASE_TICKET_PRICE_ETH
        );
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
          market: 'ETH',
        });
      }

      const totalWinnings =
        calculateWinnings(upTickets, 'up', result, status, totalPool, upPool, downPool, BASE_TICKET_PRICE_ETH) +
        calculateWinnings(downTickets, 'down', result, status, totalPool, upPool, downPool, BASE_TICKET_PRICE_ETH);

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
          market: 'ETH',
        });
      }
    } catch (e) {
      console.log('Error fetching market', marketId, e);
    }
  }

  historyItems.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return { unclaimed, history: historyItems };
}