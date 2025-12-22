'use client';

import { useState, useEffect, useCallback } from 'react';
import { formatEther } from 'viem';
import { publicClient } from '../client';
import {
  ETH_CONTRACT_ADDRESS,
  BYEMONEY_CONTRACT_ADDRESS,
  ETH_CONTRACT_ABI,
  BYEMONEY_CONTRACT_ABI,
} from '../constants';
import type { MarketData, MarketType, TimeLeft } from '../types';

interface UseMarketDataReturn {
  marketData: MarketData | null;
  marketDataSource: MarketType;
  currentPrice: bigint | null;
  ethPriceUsd: number;
  isBettingOpen: boolean;
  isMarketSwitching: boolean;
  timeLeft: TimeLeft;
  refetch: () => Promise<void>;
}

export function useMarketData(
  activeMarket: MarketType,
  initialData?: { ethPrice: number; timeRemaining: number }
): UseMarketDataReturn {
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [marketDataSource, setMarketDataSource] = useState<MarketType>(activeMarket);
  const [currentPrice, setCurrentPrice] = useState<bigint | null>(() => {
    if (initialData?.ethPrice) {
      return BigInt(Math.floor(initialData.ethPrice * 1e8));
    }
    return null;
  });
  const [ethPriceFromChainlink, setEthPriceFromChainlink] = useState<bigint | null>(null);
  const [isBettingOpen, setIsBettingOpen] = useState(true);
  const [isMarketSwitching, setIsMarketSwitching] = useState(false);
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() => {
    if (initialData?.timeRemaining) {
      const seconds = initialData.timeRemaining;
      return {
        hours: Math.floor(seconds / 3600),
        minutes: Math.floor((seconds % 3600) / 60),
        seconds: seconds % 60,
      };
    }
    return { hours: 0, minutes: 0, seconds: 0 };
  });

  const fetchMarketData = useCallback(async () => {
    try {
      const contractAddress = activeMarket === 'ETH' ? ETH_CONTRACT_ADDRESS : BYEMONEY_CONTRACT_ADDRESS;
      const contractAbi = activeMarket === 'ETH' ? ETH_CONTRACT_ABI : BYEMONEY_CONTRACT_ABI;

      const [market, price, betting, ethPrice] = await Promise.all([
        publicClient.readContract({
          address: contractAddress,
          abi: contractAbi,
          functionName: 'getCurrentMarket',
          args: [],
        } as any),
        publicClient.readContract({
          address: contractAddress,
          abi: contractAbi,
          functionName: 'getPrice',
          args: [],
        } as any) as Promise<bigint>,
        publicClient.readContract({
          address: contractAddress,
          abi: contractAbi,
          functionName: 'isBettingOpen',
          args: [],
        } as any) as Promise<boolean>,
        publicClient.readContract({
          address: ETH_CONTRACT_ADDRESS,
          abi: ETH_CONTRACT_ABI,
          functionName: 'getPrice',
          args: [],
        } as any) as Promise<bigint>,
      ]);

      setMarketData({
        id: (market as any)[0],
        startPrice: (market as any)[1],
        endPrice: (market as any)[2],
        startTime: (market as any)[3],
        endTime: (market as any)[4],
        upPool: (market as any)[5],
        downPool: (market as any)[6],
        status: (market as any)[7],
        result: (market as any)[8],
        totalTickets: (market as any)[9],
      });
      setMarketDataSource(activeMarket);
      setIsMarketSwitching(false);

      if (price && price > 0n) {
        setCurrentPrice(price);
      }
      if (ethPrice && ethPrice > 0n) {
        setEthPriceFromChainlink(ethPrice);
      }
      setIsBettingOpen(betting);
    } catch (error) {
      console.error('[fetchMarketData] Failed to fetch market:', activeMarket, error);
    }
  }, [activeMarket]);

  // Handle market switching
  useEffect(() => {
    if (marketDataSource !== activeMarket) {
      setIsMarketSwitching(true);
    }
  }, [activeMarket, marketDataSource]);

  // Fetch market data on mount and interval
  useEffect(() => {
    fetchMarketData();
    const interval = setInterval(fetchMarketData, 10000);
    return () => clearInterval(interval);
  }, [fetchMarketData]);

  // Update timer
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

  const ethPriceUsd = ethPriceFromChainlink ? Number(ethPriceFromChainlink) / 1e8 : 2960;

  return {
    marketData,
    marketDataSource,
    currentPrice,
    ethPriceUsd,
    isBettingOpen,
    isMarketSwitching,
    timeLeft,
    refetch: fetchMarketData,
  };
}
