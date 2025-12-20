'use client';

import { useState, useEffect, useCallback } from 'react';
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
  refetch: () => Promise<void>;
}

export function useUserPosition(
  walletAddress: `0x${string}` | null,
  marketId: bigint | undefined,
  activeMarket: MarketType
): UseUserPositionReturn {
  const [userPosition, setUserPosition] = useState<UserPosition | null>(null);

  const fetchUserPosition = useCallback(async () => {
    if (!walletAddress || !marketId || marketId === 0n) return;

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
    }
  }, [walletAddress, marketId, activeMarket]);

  useEffect(() => {
    fetchUserPosition();
  }, [fetchUserPosition]);

  // Reset position when market changes
  useEffect(() => {
    setUserPosition(null);
    fetchUserPosition();
  }, [marketId]);

  return {
    userPosition,
    refetch: fetchUserPosition,
  };
}
