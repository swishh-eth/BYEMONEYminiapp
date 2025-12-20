'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { publicClient } from '../client';
import {
  ETH_CONTRACT_ADDRESS,
  BYEMONEY_CONTRACT_ADDRESS,
  ETH_CONTRACT_ABI,
  BYEMONEY_CONTRACT_ABI,
} from '../constants';
import type { UserPosition, MarketType } from '../types';

interface UseUserPositionReturn {
  userPosition: UserPosition | null;
  isLoading: boolean;
  refetch: () => Promise<void>;
}

export function useUserPosition(
  walletAddress: `0x${string}` | null,
  marketId: bigint | undefined,
  activeMarket: MarketType
): UseUserPositionReturn {
  const [userPosition, setUserPosition] = useState<UserPosition | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const lastMarketRef = useRef<string>('');

  const fetchUserPosition = useCallback(async () => {
    if (!walletAddress || !marketId || marketId === 0n) {
      setUserPosition(null);
      setIsLoading(false);
      return;
    }

    const contractAddress = activeMarket === 'ETH' ? ETH_CONTRACT_ADDRESS : BYEMONEY_CONTRACT_ADDRESS;
    const contractAbi = activeMarket === 'ETH' ? ETH_CONTRACT_ABI : BYEMONEY_CONTRACT_ABI;

    try {
      const position = await publicClient.readContract({
        address: contractAddress,
        abi: contractAbi,
        functionName: 'getPosition',
        args: [marketId, walletAddress],
      });

      setUserPosition({
        up: position[0],
        down: position[1],
        claimed: position[2],
      });
    } catch (error) {
      console.error('Failed to fetch position:', error);
      setUserPosition(null);
    } finally {
      setIsLoading(false);
    }
  }, [walletAddress, marketId, activeMarket]);

  useEffect(() => {
    fetchUserPosition();
  }, [fetchUserPosition]);

  // Reset position and set loading when market changes
  useEffect(() => {
    const marketKey = `${activeMarket}-${marketId}`;
    if (lastMarketRef.current !== marketKey) {
      lastMarketRef.current = marketKey;
      setIsLoading(true);
      setUserPosition(null);
    }
  }, [activeMarket, marketId]);

  return {
    userPosition,
    isLoading,
    refetch: fetchUserPosition,
  };
}
