'use client';

import { useState, useEffect, useCallback } from 'react';
import { formatEther } from 'viem';
import { publicClient } from '../client';
import { supabase } from '../supabase';
import {
  ETH_CONTRACT_ADDRESS,
  ETH_CONTRACT_ADDRESS_OLD,
  BYEMONEY_CONTRACT_ADDRESS,
  BYEMONEY_CONTRACT_ADDRESS_OLD,
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
      // Fetch from BOTH old and new contracts for each market
      const [ethDataNew, ethDataOld, byemoneyDataNew, byemoneyDataOld] = await Promise.all([
        fetchEthUnclaimed(walletAddress, ETH_CONTRACT_ADDRESS, false),
        fetchEthUnclaimed(walletAddress, ETH_CONTRACT_ADDRESS_OLD, true),
        fetchByemoneyUnclaimed(walletAddress, currentMarketId, BYEMONEY_CONTRACT_ADDRESS, false),
        fetchByemoneyUnclaimed(walletAddress, currentMarketId, BYEMONEY_CONTRACT_ADDRESS_OLD, true),
      ]);

      // Combine unclaimed markets from all sources
      const allUnclaimed = [
        ...ethDataNew.unclaimed,
        ...ethDataOld.unclaimed,
        ...byemoneyDataNew.unclaimed,
        ...byemoneyDataOld.unclaimed,
      ];
      
      // Combine and sort history by marketId descending
      const allHistory = [
        ...ethDataNew.history,
        ...ethDataOld.history,
        ...byemoneyDataNew.history,
        ...byemoneyDataOld.history,
      ];
      
      // Sort: new contracts first, then by marketId descending
      allHistory.sort((a, b) => {
        // Legacy items go after non-legacy
        if (a.isLegacy !== b.isLegacy) {
          return a.isLegacy ? 1 : -1;
        }
        return b.marketId - a.marketId;
      });

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
  currentMarketId: bigint | undefined,
  contractAddress: `0x${string}`,
  isLegacy: boolean
): Promise<{ unclaimed: UnclaimedMarket[]; history: HistoryItem[] }> {
  const unclaimed: UnclaimedMarket[] = [];
  const historyItems: HistoryItem[] = [];
  
  // For legacy contract, check up to market 10 (or whatever the last market was)
  // For new contract, check from 1 to current
  const currentId = currentMarketId ? Number(currentMarketId) : 2;
  const maxCheck = isLegacy ? 10 : Math.max(currentId + 1, 10);

  for (let i = 1; i <= maxCheck; i++) {
    try {
      const [position, market] = await Promise.all([
        publicClient.readContract({
          address: contractAddress,
          abi: BYEMONEY_CONTRACT_ABI,
          functionName: 'getPosition',
          args: [BigInt(i), walletAddress],
        }),
        publicClient.readContract({
          address: contractAddress,
          abi: BYEMONEY_CONTRACT_ABI,
          functionName: 'getMarket',
          args: [BigInt(i)],
        }) as Promise<any>,
      ]);

      const upTickets = Number(position[0]);
      const downTickets = Number(position[1]);
      const claimed = position[2] as boolean;
      // V3/V5 contract: getMarket returns [id, startPrice, endPrice, startTime, endTime, upPool, downPool, status, result, totalTickets]
      const status = Number(market[7]);
      const result = Number(market[8]);
      const upPool = Number(formatEther(market[5] as bigint));
      const downPool = Number(formatEther(market[6] as bigint));
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
          isLegacy,
          contractAddress,
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
          isLegacy,
          contractAddress,
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
          isLegacy,
          contractAddress,
        });
      }
    } catch (e) {
      // Market doesn't exist, stop checking
      break;
    }
  }

  historyItems.sort((a, b) => b.marketId - a.marketId);
  return { unclaimed, history: historyItems };
}

async function fetchEthUnclaimed(
  walletAddress: `0x${string}`,
  contractAddress: `0x${string}`,
  isLegacy: boolean
): Promise<{ unclaimed: UnclaimedMarket[]; history: HistoryItem[] }> {
  const unclaimed: UnclaimedMarket[] = [];
  const historyItems: HistoryItem[] = [];

  // For BOTH old and new, we scan the contract directly for positions
  // This ensures we get accurate status from the correct contract
  
  // Get current market ID to know how far to scan
  let maxMarketId = 10;
  try {
    const currentId = await publicClient.readContract({
      address: contractAddress,
      abi: ETH_CONTRACT_ABI,
      functionName: 'currentMarketId',
    });
    maxMarketId = Math.max(Number(currentId) + 1, 10);
  } catch (e) {
    // Fall back to scanning up to 10
  }

  // Get timestamps from supabase if available (for display purposes only)
  let betTimestamps: Map<string, { timestamp: string; priceAtBet: number }> = new Map();
  if (supabase) {
    const { data: bets } = await supabase
      .from('prediction_bets')
      .select('market_id, direction, timestamp, price_at_bet')
      .eq('wallet_address', walletAddress.toLowerCase())
      .order('timestamp', { ascending: false })
      .limit(100);
    
    bets?.forEach(bet => {
      const key = `${bet.market_id}-${bet.direction}`;
      if (!betTimestamps.has(key)) {
        betTimestamps.set(key, { timestamp: bet.timestamp, priceAtBet: bet.price_at_bet || 0 });
      }
    });
  }

  for (let marketId = 1; marketId <= maxMarketId; marketId++) {
    try {
      const [position, marketInfo] = await Promise.all([
        publicClient.readContract({
          address: contractAddress,
          abi: ETH_CONTRACT_ABI,
          functionName: 'getPosition',
          args: [BigInt(marketId), walletAddress],
        }),
        publicClient.readContract({
          address: contractAddress,
          abi: ETH_CONTRACT_ABI,
          functionName: 'getMarket',
          args: [BigInt(marketId)],
        }),
      ]);

      const upTickets = Number(position[0]);
      const downTickets = Number(position[1]);
      const claimed = position[2];

      if (upTickets === 0 && downTickets === 0) continue;

      const status = Number(marketInfo[7]);
      const result = Number(marketInfo[8]);
      const upPool = Number(formatEther(marketInfo[5]));
      const downPool = Number(formatEther(marketInfo[6]));
      const totalPool = upPool + downPool;

      if (upTickets > 0) {
        const upWinnings = calculateWinnings(
          upTickets, 'up', result, status, totalPool, upPool, downPool, BASE_TICKET_PRICE_ETH
        );
        const betInfo = betTimestamps.get(`${marketId}-up`);
        historyItems.push({
          marketId,
          direction: 'up',
          tickets: upTickets,
          result,
          status,
          claimed,
          winnings: upWinnings,
          timestamp: betInfo?.timestamp || '',
          priceAtBet: betInfo?.priceAtBet || 0,
          market: 'ETH',
          isLegacy,
          contractAddress,
        });
      }

      if (downTickets > 0) {
        const downWinnings = calculateWinnings(
          downTickets, 'down', result, status, totalPool, upPool, downPool, BASE_TICKET_PRICE_ETH
        );
        const betInfo = betTimestamps.get(`${marketId}-down`);
        historyItems.push({
          marketId,
          direction: 'down',
          tickets: downTickets,
          result,
          status,
          claimed,
          winnings: downWinnings,
          timestamp: betInfo?.timestamp || '',
          priceAtBet: betInfo?.priceAtBet || 0,
          market: 'ETH',
          isLegacy,
          contractAddress,
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
          isLegacy,
          contractAddress,
        });
      }
    } catch (e) {
      // Market doesn't exist, stop scanning
      break;
    }
  }

  historyItems.sort((a, b) => {
    // Sort by timestamp if available, otherwise by marketId
    if (a.timestamp && b.timestamp) {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    }
    return b.marketId - a.marketId;
  });
  
  return { unclaimed, history: historyItems };
}