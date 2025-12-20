'use client';

import { formatEther } from 'viem';
import { MarketType, UserPosition, TxState } from '../types';
import {
  calculatePoolPercentages,
  calculateMultiplier,
  formatPoolAmount,
  calculateByemoneyUsdValue,
} from '../utils';
import { BASE_TICKET_PRICE_ETH, HOUSE_FEE } from '../constants';

interface PoolCardProps {
  activeMarket: MarketType;
  upPool: number;
  downPool: number;
  userPosition: UserPosition | null;
  ethPriceUsd: number;
  byemoney1mValueUsd: number;
  showUsdValues: boolean;
  canClaim: boolean;
  canRefund: boolean;
  txState: TxState;
  onToggleUsd: () => void;
  onClaim: () => void;
  // For multiplier calculation with selection
  selectedDirection: 'up' | 'down' | null;
  ticketCount: number;
  className?: string;
}

export function PoolCard({
  activeMarket,
  upPool,
  downPool,
  userPosition,
  ethPriceUsd,
  byemoney1mValueUsd,
  showUsdValues,
  canClaim,
  canRefund,
  txState,
  onToggleUsd,
  onClaim,
  selectedDirection,
  ticketCount,
  className = '',
}: PoolCardProps) {
  const isEthMarket = activeMarket === 'ETH';
  const totalPool = upPool + downPool;
  const { upPercent, downPercent } = calculatePoolPercentages(upPool, downPool);

  // Calculate ticket cost
  const oneTicketCost = isEthMarket ? BASE_TICKET_PRICE_ETH : 1000000; // 1M BYEMONEY
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

  const previewUpMultiplier = calculateMultiplier(previewUpPool, previewUpPool + downPool);
  const previewDownMultiplier = calculateMultiplier(previewDownPool, upPool + previewDownPool);

  const displayUpMultiplier = selectedDirection === 'up' ? realUpMultiplier : previewUpMultiplier;
  const displayDownMultiplier = selectedDirection === 'down' ? realDownMultiplier : previewDownMultiplier;

  const userUpTickets = userPosition ? Number(userPosition.up) : 0;
  const userDownTickets = userPosition ? Number(userPosition.down) : 0;
  const userTotalTickets = userUpTickets + userDownTickets;

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
                {formatPoolAmount(totalPool, false)}
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
            <svg
              className="w-3 h-3 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={3}
            >
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
            <svg
              className="w-3 h-3 text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={3}
            >
              <path d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      {/* User Position */}
      {userTotalTickets > 0 && (
        <div className="mt-3 pt-3 border-t border-white/5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] text-white/40 uppercase">Your Position</p>
            {(canClaim || canRefund) && (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  onClaim();
                }}
                className="bg-gradient-to-r from-white to-white text-black text-[10px] font-bold px-3 py-1 rounded disabled:opacity-50 hover:scale-105 transition-transform cursor-pointer"
              >
                {txState === 'claiming' ? '...' : canRefund ? 'Refund' : 'Claim'}
              </span>
            )}
          </div>
          <div className="space-y-1.5">
            {userUpTickets > 0 && (
              <PositionRow
                direction="up"
                tickets={userUpTickets}
                totalPool={totalPool}
                directionPool={upPool}
                isEthMarket={isEthMarket}
                showUsdValues={showUsdValues}
                ethPriceUsd={ethPriceUsd}
                byemoney1mValueUsd={byemoney1mValueUsd}
              />
            )}
            {userDownTickets > 0 && (
              <PositionRow
                direction="down"
                tickets={userDownTickets}
                totalPool={totalPool}
                directionPool={downPool}
                isEthMarket={isEthMarket}
                showUsdValues={showUsdValues}
                ethPriceUsd={ethPriceUsd}
                byemoney1mValueUsd={byemoney1mValueUsd}
              />
            )}
          </div>
        </div>
      )}
    </button>
  );
}

interface PositionRowProps {
  direction: 'up' | 'down';
  tickets: number;
  totalPool: number;
  directionPool: number;
  isEthMarket: boolean;
  showUsdValues: boolean;
  ethPriceUsd: number;
  byemoney1mValueUsd: number;
}

function PositionRow({
  direction,
  tickets,
  totalPool,
  directionPool,
  isEthMarket,
  showUsdValues,
  ethPriceUsd,
  byemoney1mValueUsd,
}: PositionRowProps) {
  const isUp = direction === 'up';
  const potentialWin = (totalPool * 0.95 / directionPool) * tickets;

  return (
    <div
      className={`flex items-center justify-between rounded-lg px-3 py-2 ${
        isUp ? 'bg-white/5' : 'bg-red-500/10'
      }`}
    >
      <div className="flex items-center gap-2">
        <svg
          className={`w-4 h-4 ${isUp ? 'text-white' : 'text-red-400'}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={2.5}
        >
          <path d={isUp ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
        </svg>
        <span className={`text-xs ${isUp ? 'text-white' : 'text-red-400'}`}>
          {tickets} ticket{tickets > 1 ? 's' : ''}
        </span>
      </div>
      <div className="text-right">
        <span className="text-xs text-white/40">to win </span>
        {isEthMarket ? (
          showUsdValues ? (
            <span className={`text-xs font-bold ${isUp ? 'text-white' : 'text-red-400'}`}>
              ${(potentialWin * BASE_TICKET_PRICE_ETH * ethPriceUsd).toFixed(2)}
            </span>
          ) : (
            <span className={`text-xs font-bold ${isUp ? 'text-white' : 'text-red-400'}`}>
              {(potentialWin * BASE_TICKET_PRICE_ETH).toFixed(4)} ETH
            </span>
          )
        ) : showUsdValues ? (
          <span className={`text-xs font-bold ${isUp ? 'text-white' : 'text-red-400'}`}>
            ${(potentialWin * byemoney1mValueUsd).toFixed(2)}
          </span>
        ) : (
          <span className={`text-xs font-bold ${isUp ? 'text-white' : 'text-red-400'}`}>
            {potentialWin.toFixed(1)}M BYEMONEY
          </span>
        )}
      </div>
    </div>
  );
}
