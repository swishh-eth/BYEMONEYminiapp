'use client';

import { useState } from 'react';
import { parseEther, encodeFunctionData } from 'viem';
import { publicClient } from '../client';
import { supabase } from '../supabase';
import {
  ETH_CONTRACT_ADDRESS,
  BYEMONEY_CONTRACT_ADDRESS,
  BYEMONEY_TOKEN_ADDRESS,
  ETH_CONTRACT_ABI,
  BYEMONEY_CONTRACT_ABI,
  ERC20_ABI,
  BASE_TICKET_PRICE_ETH,
  BASE_TICKET_PRICE_BYEMONEY,
} from '../constants';
import type { MarketType, TxState, Direction } from '../types';

interface UseBettingReturn {
  txState: TxState;
  errorMsg: string;
  executeBuy: (
    direction: Direction,
    ticketCount: number,
    userFid?: number,
    username?: string,
    marketId?: bigint
  ) => Promise<boolean>;
  executeClaim: (marketId: number) => Promise<boolean>;
  claimingMarketId: number | null;
}

export function useBetting(
  walletAddress: `0x${string}` | null,
  activeMarket: MarketType,
  sdk: any,
  onSuccess?: () => void
): UseBettingReturn {
  const [txState, setTxState] = useState<TxState>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [claimingMarketId, setClaimingMarketId] = useState<number | null>(null);

  const executeBuy = async (
    direction: Direction,
    ticketCount: number,
    userFid?: number,
    username?: string,
    marketId?: bigint
  ): Promise<boolean> => {
    if (!walletAddress || !sdk) return false;

    setTxState('buying');
    setErrorMsg('');

    try {
      const contractAddress =
        activeMarket === 'ETH' ? ETH_CONTRACT_ADDRESS : BYEMONEY_CONTRACT_ADDRESS;

      if (activeMarket === 'ETH') {
        const totalCost = parseEther((ticketCount * BASE_TICKET_PRICE_ETH).toString());

        const data = encodeFunctionData({
          abi: ETH_CONTRACT_ABI,
          functionName: 'buyTickets',
          args: [direction === 'up' ? 1 : 2],
        });

        const txHash = await sdk.wallet.ethProvider.request({
          method: 'eth_sendTransaction',
          params: [
            {
              from: walletAddress,
              to: contractAddress,
              value: `0x${totalCost.toString(16)}`,
              data,
              chainId: `0x${(8453).toString(16)}`,
            },
          ],
        });

        await publicClient.waitForTransactionReceipt({ hash: txHash });
      } else {
        const totalCost = BASE_TICKET_PRICE_BYEMONEY * BigInt(ticketCount);

        // Check current allowance
        const currentAllowance = await publicClient.readContract({
          address: BYEMONEY_TOKEN_ADDRESS,
          abi: ERC20_ABI,
          functionName: 'allowance',
          args: [walletAddress, contractAddress],
        });

        // Approve if needed
        if (currentAllowance < totalCost) {
          const approveData = encodeFunctionData({
            abi: ERC20_ABI,
            functionName: 'approve',
            args: [contractAddress, totalCost],
          });

          const approveTxHash = await sdk.wallet.ethProvider.request({
            method: 'eth_sendTransaction',
            params: [
              {
                from: walletAddress,
                to: BYEMONEY_TOKEN_ADDRESS,
                data: approveData,
                chainId: `0x${(8453).toString(16)}`,
              },
            ],
          });

          await publicClient.waitForTransactionReceipt({ hash: approveTxHash });
        }

        // Buy tickets
        const buyData = encodeFunctionData({
          abi: BYEMONEY_CONTRACT_ABI,
          functionName: 'buyTickets',
          args: [direction === 'up' ? 1 : 2, totalCost],
        });

        const buyTxHash = await sdk.wallet.ethProvider.request({
          method: 'eth_sendTransaction',
          params: [
            {
              from: walletAddress,
              to: contractAddress,
              data: buyData,
              chainId: `0x${(8453).toString(16)}`,
            },
          ],
        });

        await publicClient.waitForTransactionReceipt({ hash: buyTxHash });
      }

      // Log to Supabase
      if (userFid && marketId && supabase) {
        await logBetToSupabase(userFid, username, walletAddress, marketId, direction, ticketCount, activeMarket);
      }

      setTxState('success');
      onSuccess?.();

      setTimeout(() => {
        setTxState('idle');
      }, 2500);

      return true;
    } catch (error: any) {
      console.error('Buy failed:', error);
      setTxState('error');
      setErrorMsg(error?.message?.includes('rejected') ? 'Rejected' : 'Failed');

      setTimeout(() => {
        setTxState('idle');
        setErrorMsg('');
      }, 2500);

      return false;
    }
  };

  const executeClaim = async (marketId: number): Promise<boolean> => {
    if (!walletAddress || !sdk) return false;

    setClaimingMarketId(marketId);
    setTxState('claiming');

    const contractAddress =
      activeMarket === 'ETH' ? ETH_CONTRACT_ADDRESS : BYEMONEY_CONTRACT_ADDRESS;
    const contractAbi = activeMarket === 'ETH' ? ETH_CONTRACT_ABI : BYEMONEY_CONTRACT_ABI;

    try {
      const data = encodeFunctionData({
        abi: contractAbi,
        functionName: 'claim',
        args: [BigInt(marketId)],
      });

      const txHash = await sdk.wallet.ethProvider.request({
        method: 'eth_sendTransaction',
        params: [
          {
            from: walletAddress,
            to: contractAddress,
            data,
          },
        ],
      });

      await publicClient.waitForTransactionReceipt({ hash: txHash });

      setTxState('success');
      onSuccess?.();

      setTimeout(() => {
        setTxState('idle');
        setClaimingMarketId(null);
      }, 2500);

      return true;
    } catch (error) {
      console.error('Claim failed:', error);
      setTxState('error');

      setTimeout(() => {
        setTxState('idle');
        setClaimingMarketId(null);
      }, 2500);

      return false;
    }
  };

  return {
    txState,
    errorMsg,
    executeBuy,
    executeClaim,
    claimingMarketId,
  };
}

async function logBetToSupabase(
  userFid: number,
  username: string | undefined,
  walletAddress: string,
  marketId: bigint,
  direction: Direction,
  ticketCount: number,
  activeMarket: MarketType
) {
  if (!supabase) return;

  try {
    // Ensure user exists
    const { data: existingUser } = await supabase
      .from('prediction_users')
      .select('fid')
      .eq('fid', userFid)
      .single();

    if (!existingUser) {
      const userResponse = await fetch(`/api/user?fid=${userFid}`);
      if (userResponse.ok) {
        const userData = await userResponse.json();
        await supabase.from('prediction_users').upsert({
          fid: userFid,
          username: userData.username || username || 'anon',
          pfp_url: userData.pfp_url || '',
          updated_at: new Date().toISOString(),
        });
      } else {
        await supabase.from('prediction_users').upsert({
          fid: userFid,
          username: username || 'anon',
          pfp_url: '',
          updated_at: new Date().toISOString(),
        });
      }
    }

    // Log bet
    const betsTable = activeMarket === 'ETH' ? 'prediction_bets' : 'byemoney_bets';
    await supabase.from(betsTable).insert({
      fid: userFid,
      wallet_address: walletAddress.toLowerCase(),
      market_id: Number(marketId),
      direction,
      tickets: ticketCount,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    console.log('Supabase logging error:', e);
  }
}
