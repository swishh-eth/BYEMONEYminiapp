'use client';

import { MarketType } from '../types';
import { calculatePoolPercentages } from '../utils';
import { HOUSE_FEE } from '../constants';

interface PoolCardProps {
  activeMarket: MarketType;
  upPool: number;
  downPool: number;
  ethPriceUsd: number;
  byemoney1mValueUsd: number;
  showUsdValues: boolean;
  onToggleUsd: () => void;
  selectedDirection: 'up' | 'down' | null;
  ticketCount: number;
  className?: string;
}

export function PoolCard({
  activeMarket,
  upPool,
  downPool,
  ethPriceUsd,
  byemoney1mValueUsd,
  showUsdValues,
  onToggleUsd,
  selectedDirection,
  ticketCount,
  className = '',
}: PoolCardProps) {
  const isEthMarket = activeMarket === 'ETH';
  const totalPool = upPool + downPool;
  const { upPercent, downPercent } = calculatePoolPercentages(upPool, downPool);

  // Calculate ticket cost
  const oneTicketCost = isEthMarket ? 0.001 : 1000000;
  const selectedCost = oneTicketCost * ticketCount;

  // Calculate multipliers accounting for selection
  const previewUpPool = upPool + oneTicketCost;
  const previewDownPool = downPool + oneTicketCost;
  
  const selectedUpPool = upPool + (selectedDirection === 'up' ? selectedCost : 0);
  const selectedDownPool = downPool + (selectedDirection === 'down' ? selectedCost : 0);
  const selectedTotalPool = selectedUpPool + selectedDownPool;
  const selectedPoolAfterFee = selectedTotalPool * (1 - HOUSE_FEE);

  const realUpMultiplier = selectedUpPool > 0 ? selectedPoolAfterFee / selectedUpPool : 1.9;
  const realDownMultiplier = selectedDownPool > 0 ? selectedPoolAfterFee / selectedDownPool : 1.9;

  const previewUpMultiplier = previewUpPool > 0 ? ((previewUpPool + downPool) * (1 - HOUSE_FEE)) / previewUpPool : 1.9;
  const previewDownMultiplier = previewDownPool > 0 ? ((upPool + previewDownPool) * (1 - HOUSE_FEE)) / previewDownPool : 1.9;

  const displayUpMultiplier = selectedDirection === 'up' ? realUpMultiplier : previewUpMultiplier;
  const displayDownMultiplier = selectedDirection === 'down' ? realDownMultiplier : previewDownMultiplier;

  return (
    <button
      onClick={onToggleUsd}
      className={`bg-white/[0.03] border border-white/[0.08] rounded-xl p-4 text-left w-full active:scale-[0.99] transition-transform ${className}`}
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <p className="text-[10px] text-white/40 uppercase tracking-wider">Pool</p>
          <span className="text-[8px] text-white/20 px-1.5 py-0.5 rounded bg-white/5">
            tap to switch
          </span>
        </div>
        <p className="text-xs">
          {isEthMarket ? (
            showUsdValues ? (
              <>
                <span className="text-white font-semibold">
                  ${(totalPool * ethPriceUsd).toFixed(2)}
                </span>
                <span className="text-white/40 ml-1">USD</span>
              </>
            ) : (
              <>
                <span className="text-white font-semibold">{totalPool.toFixed(4)}</span>
                <span className="text-white/40 ml-1">ETH</span>
              </>
            )
          ) : showUsdValues ? (
            <>
              <span className="text-white font-semibold">
                ${((totalPool / 1e6) * byemoney1mValueUsd).toFixed(2)}
              </span>
              <span className="text-white/40 ml-1">USD</span>
            </>
          ) : (
            <>
              <span className="text-white font-semibold">
                {totalPool >= 1e6 ? `${(totalPool / 1e6).toFixed(1)}M` : totalPool >= 1000 ? `${(totalPool / 1000).toFixed(0)}K` : totalPool.toFixed(0)}
              </span>
              <span className="text-white/40 ml-1">BYEMONEY</span>
            </>
          )}
        </p>
      </div>

      {/* Pool Bar */}
      <div className="relative h-2 bg-white/5 rounded-full overflow-hidden mb-3">
        <div
          className="absolute left-0 top-0 h-full bg-gradient-to-r from-white to-white transition-all duration-700 ease-out"
          style={{ width: `${upPercent}%` }}
        />
        <div
          className="absolute right-0 top-0 h-full bg-gradient-to-l from-red-500 to-red-400 transition-all duration-700 ease-out"
          style={{ width: `${downPercent}%` }}
        />
      </div>

      {/* Percentages */}
      <div className="flex justify-between text-xs">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-white/20 flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
              <path d="M5 15l7-7 7 7" />
            </svg>
          </div>
          <span className="font-semibold text-white">{upPercent.toFixed(0)}%</span>
          <span className="text-white/30 text-[10px]">{displayUpMultiplier.toFixed(2)}x</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-white/30 text-[10px]">{displayDownMultiplier.toFixed(2)}x</span>
          <span className="font-semibold text-red-400">{downPercent.toFixed(0)}%</span>
          <div className="w-5 h-5 rounded bg-red-500/20 flex items-center justify-center">
            <svg className="w-3 h-3 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
              <path d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>
    </button>
  );
}
