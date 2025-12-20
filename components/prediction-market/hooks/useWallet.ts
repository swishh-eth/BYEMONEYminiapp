'use client';

import { useState, useEffect, useCallback } from 'react';
import { formatEther } from 'viem';
import { publicClient } from '../client';
import { BYEMONEY_TOKEN_ADDRESS, ERC20_ABI } from '../constants';

interface UseWalletReturn {
  walletAddress: `0x${string}` | null;
  ethBalance: string;
  byemoneyBalance: bigint;
  sdk: any;
  isLoading: boolean;
  connectWallet: () => Promise<void>;
  refetchBalance: () => Promise<void>;
}

export function useWallet(): UseWalletReturn {
  const [walletAddress, setWalletAddress] = useState<`0x${string}` | null>(null);
  const [ethBalance, setEthBalance] = useState<string>('0');
  const [byemoneyBalance, setByemoneyBalance] = useState<bigint>(0n);
  const [sdk, setSdk] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize SDK
  useEffect(() => {
    const initSDK = async () => {
      try {
        const { sdk: farcasterSdk } = await import('@farcaster/miniapp-sdk');
        setSdk(farcasterSdk);

        try {
          const accounts = (await farcasterSdk.wallet.ethProvider.request({
            method: 'eth_accounts',
          })) as string[];
          if (accounts?.[0]) {
            setWalletAddress(accounts[0] as `0x${string}`);
          }
        } catch {}
      } catch (error) {
        console.log('SDK init error:', error);
      } finally {
        setIsLoading(false);
      }
    };
    initSDK();
  }, []);

  const fetchBalance = useCallback(async () => {
    if (!walletAddress) return;
    try {
      const [balance, tokenBalance] = await Promise.all([
        publicClient.getBalance({ address: walletAddress }),
        publicClient.readContract({
          address: BYEMONEY_TOKEN_ADDRESS,
          abi: ERC20_ABI,
          functionName: 'balanceOf',
          args: [walletAddress],
        }),
      ]);
      setEthBalance(formatEther(balance));
      setByemoneyBalance(tokenBalance);
    } catch (error) {
      console.error('Failed to fetch balance:', error);
    }
  }, [walletAddress]);

  // Fetch balance on mount and interval
  useEffect(() => {
    fetchBalance();
    const interval = setInterval(fetchBalance, 60000);
    return () => clearInterval(interval);
  }, [fetchBalance]);

  const connectWallet = async () => {
    if (!sdk) return;
    try {
      const accounts = await sdk.wallet.ethProvider.request({
        method: 'eth_requestAccounts',
      });
      if (accounts?.[0]) {
        setWalletAddress(accounts[0] as `0x${string}`);
      }
    } catch (error) {
      console.error('Failed to connect:', error);
    }
  };

  return {
    walletAddress,
    ethBalance,
    byemoneyBalance,
    sdk,
    isLoading,
    connectWallet,
    refetchBalance: fetchBalance,
  };
}
