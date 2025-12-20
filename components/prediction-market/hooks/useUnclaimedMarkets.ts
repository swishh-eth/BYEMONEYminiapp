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
  totalUnclaimed: number;
  refetch: () => Promise<void>;
}

export function useUnclaimedMarkets(
  walletAddress: `0x${string}` | null,
  activeMarket: MarketType,
  currentMarketId?: bigint
): UseUnclaimedMarketsReturn {
  const [unclaimedMarkets, setUnclaimedMarkets] = useState<UnclaimedMarket[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const fetchUnclaimedMarkets = useCallback(async () => {
    if (!walletAddress) return;

    try {
      if (activeMarket === 'BYEMONEY') {
        await fetchByemoneyUnclaimed(walletAddress, currentMarketId, setUnclaimedMarkets, setHistory);
        return;
      }

      await fetchEthUnclaimed(walletAddress, setUnclaimedMarkets, setHistory);
    } catch (error) {
      console.error('Failed to fetch unclaimed:', error);
    }
  }, [walletAddress, activeMarket, currentMarketId]);

  useEffect(() => {
    fetchUnclaimedMarkets();
  }, [fetchUnclaimedMarkets, currentMarketId]);

  const totalUnclaimed = unclaimedMarkets.reduce((sum, m) => sum + m.estimatedWinnings, 0);

  return {
    unclaimedMarkets,
    history,
    totalUnclaimed,
    refetch: fetchUnclaimedMarkets,
  };
}

async function fetchByemoneyUnclaimed(
  walletAddress: `0x${string}`,
  currentMarketId: bigint | undefined,
  setUnclaimedMarkets: (markets: UnclaimedMarket[]) => void,
  setHistory: (items: HistoryItem[]) => void
) {
  const unclaimed: UnclaimedMarket[] = [];
  const historyItems: HistoryItem[] = [];
  const currentId = currentMarketId ? Number(currentMarketId) : 2;
  const maxCheck = Math.max(currentId + 1, 10); // Check up to current + some buffer

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

      // Skip if user has no position in this market
      if (upTickets === 0 && downTickets === 0) continue;

      // Calculate winnings
      let winnings = 0;
      if (status === 1) { // Resolved
        if (result === 0) { // Draw/cancelled
          winnings = upTickets + downTickets;
        } else if (result === 1 && upTickets > 0) { // Up won
          winnings = (totalPool * 0.95 / upPool) * upTickets;
        } else if (result === 2 && downTickets > 0) { // Down won
          winnings = (totalPool * 0.95 / downPool) * downTickets;
        }
      } else if (status === 2) { // Cancelled
        winnings = upTickets + downTickets;
      }

      // Add to history if user has any position
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
        });
      }

      // Add to unclaimed if has winnings and not claimed
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
        });
      }
    } catch (e) {
      // Market doesn't exist, stop checking
      break;
    }
  }

  // Sort history by market ID descending (newest first)
  historyItems.sort((a, b) => b.marketId - a.marketId);
  setUnclaimedMarkets(unclaimed);
  setHistory(historyItems);
}

async function fetchEthUnclaimed(
  walletAddress: `0x${string}`,
  setUnclaimedMarkets: (markets: UnclaimedMarket[]) => void,
  setHistory: (items: HistoryItem[]) => void
) {
  if (!supabase) return;

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
        });
      }
    } catch (e) {
      console.log('Error fetching market', marketId, e);
    }
  }

  historyItems.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  setUnclaimedMarkets(unclaimed);
  setHistory(historyItems);
}
