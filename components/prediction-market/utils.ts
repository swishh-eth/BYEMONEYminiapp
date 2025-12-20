import { formatEther } from 'viem';
import { Q96, BYEMONEY_PRICE_CALIBRATION, HOUSE_FEE, BASE_TICKET_PRICE_ETH } from './constants';

/**
 * Convert sqrtPriceX96 to USD value for 1M BYEMONEY
 * BYEMONEY is token0, WETH is token1 in the Uniswap V4 pool
 */
export const calculateByemoneyUsdValue = (sqrtPriceX96: number, ethPriceUsd: number): number => {
  if (sqrtPriceX96 <= 0 || ethPriceUsd <= 0) return 0;
  const sqrtPrice = sqrtPriceX96 / Q96;
  const byemoneyPerWeth = sqrtPrice * sqrtPrice;
  const wethPer1mByemoney = 1_000_000 / byemoneyPerWeth;
  return wethPer1mByemoney * ethPriceUsd * BYEMONEY_PRICE_CALIBRATION;
};

/**
 * Format BYEMONEY balance for display (e.g., "1.5M", "500K")
 */
export const formatByemoneyBalance = (balance: bigint): string => {
  const num = Number(formatEther(balance));
  if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toFixed(0);
};

/**
 * Format pool amount for display
 */
export const formatPoolAmount = (pool: number, isEthMarket: boolean): string => {
  if (isEthMarket) {
    return pool.toFixed(4);
  }
  if (pool >= 1e6) return `${(pool / 1e6).toFixed(pool >= 10e6 ? 0 : 1)}M`;
  if (pool >= 1000) return `${(pool / 1000).toFixed(0)}K`;
  return pool.toFixed(0);
};

/**
 * Calculate multiplier for a given pool
 */
export const calculateMultiplier = (
  targetPool: number,
  totalPool: number
): number => {
  if (targetPool <= 0) return 1.9;
  return (totalPool * (1 - HOUSE_FEE)) / targetPool;
};

/**
 * Calculate potential winnings
 */
export const calculatePotentialWinnings = (
  tickets: number,
  direction: 'up' | 'down',
  upPool: number,
  downPool: number,
  ticketCost: number
): number => {
  const betAmount = tickets * ticketCost;
  const newUpPool = upPool + (direction === 'up' ? betAmount : 0);
  const newDownPool = downPool + (direction === 'down' ? betAmount : 0);
  const newTotal = newUpPool + newDownPool;
  const poolAfterFee = newTotal * (1 - HOUSE_FEE);
  
  const targetPool = direction === 'up' ? newUpPool : newDownPool;
  const multiplier = targetPool > 0 ? poolAfterFee / targetPool : 1.9;
  
  return betAmount * multiplier;
};

/**
 * Calculate winnings for a resolved market
 */
export const calculateWinnings = (
  tickets: number,
  direction: 'up' | 'down',
  result: number,
  status: number,
  totalPool: number,
  upPool: number,
  downPool: number,
  ticketPrice: number
): number => {
  if (status === 1) { // Resolved
    if (result === 0) { // Tie - refund
      return tickets * ticketPrice;
    } else if (result === 1 && direction === 'up') { // UP won
      const poolAfterFee = totalPool * (1 - HOUSE_FEE);
      return (poolAfterFee * tickets * ticketPrice) / upPool;
    } else if (result === 2 && direction === 'down') { // DOWN won
      const poolAfterFee = totalPool * (1 - HOUSE_FEE);
      return (poolAfterFee * tickets * ticketPrice) / downPool;
    }
  } else if (status === 2) { // Cancelled - refund
    return tickets * ticketPrice;
  }
  return 0;
};

/**
 * Format time remaining
 */
export const formatTimeRemaining = (seconds: number): string => {
  if (!seconds || seconds <= 0) return '0h 0m 0s';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours}h ${minutes}m ${secs}s`;
};

/**
 * Format USD price
 */
export const formatUsdPrice = (price: number, decimals: number = 2): string => {
  return `$${price.toLocaleString(undefined, { 
    minimumFractionDigits: decimals, 
    maximumFractionDigits: decimals 
  })}`;
};

/**
 * Calculate pool percentages
 */
export const calculatePoolPercentages = (
  upPool: number,
  downPool: number
): { upPercent: number; downPercent: number } => {
  const totalPool = upPool + downPool;
  if (totalPool <= 0.0001) {
    return { upPercent: 50, downPercent: 50 };
  }
  const upPercent = (upPool / totalPool) * 100;
  return { upPercent, downPercent: 100 - upPercent };
};
