'use client';

import { MarketType, UserPosition, TxState } from '../types';
import { BASE_TICKET_PRICE_ETH, HOUSE_FEE } from '../constants';

interface PositionCardProps {
  activeMarket: MarketType;
  userPosition: UserPosition | null;
  upPool: number;
  downPool: number;
  ethPriceUsd: number;
  byemoney1mValueUsd: number;
  showUsdValues: boolean;
  canClaim: boolean;
  canRefund: boolean;
  txState: TxState;
  onClaim: () => void;
  className?: string;
}

export function PositionCard({
  activeMarket,
  userPosition,
  upPool,
  downPool,
  ethPriceUsd,
  byemoney1mValueUsd,
  showUsdValues,
  canClaim,
  canRefund,
  txState,
  onClaim,
  className = '',
}: PositionCardProps) {
  const isEthMarket = activeMarket === 'ETH';
  const totalPool = upPool + downPool;

  const userUpTickets = userPosition ? Number(userPosition.up) : 0;
  const userDownTickets = userPosition ? Number(userPosition.down) : 0;
  const userTotalTickets = userUpTickets + userDownTickets;

  if (userTotalTickets === 0) return null;

  return (
    <div className={`bg-white/[0.03] border border-white/[0.08] rounded-xl p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] text-white/40 uppercase tracking-wider">Your Position</p>
        {(canClaim || canRefund) && (
          <button
            onClick={onClaim}
            disabled={txState === 'claiming'}
            className="bg-gradient-to-r from-white to-white text-black text-[10px] font-bold px-3 py-1.5 rounded-lg disabled:opacity-50 hover:scale-105 transition-transform"
          >
            {txState === 'claiming' ? '...' : canRefund ? 'Refund' : 'Claim'}
          </button>
        )}
      </div>

      <div className="space-y-2">
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
  const potentialWin = directionPool > 0 ? (totalPool * (1 - HOUSE_FEE) / directionPool) * tickets : 0;

  return (
    <div
      className={`flex items-center justify-between rounded-lg px-3 py-2.5 ${
        isUp ? 'bg-white/5' : 'bg-red-500/10'
      }`}
    >
      <div className="flex items-center gap-2">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isUp ? 'bg-white/10' : 'bg-red-500/20'}`}>
          <svg
            className={`w-4 h-4 ${isUp ? 'text-white' : 'text-red-400'}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2.5}
          >
            <path d={isUp ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
          </svg>
        </div>
        <div>
          <span className={`text-sm font-medium ${isUp ? 'text-white' : 'text-red-400'}`}>
            {tickets} ticket{tickets > 1 ? 's' : ''}
          </span>
          <span className="text-xs text-white/30 ml-2">{isUp ? 'PUMP' : 'DUMP'}</span>
        </div>
      </div>
      <div className="text-right">
        <p className="text-[10px] text-white/40">Potential win</p>
        {isEthMarket ? (
          showUsdValues ? (
            <p className={`text-sm font-bold ${isUp ? 'text-white' : 'text-red-400'}`}>
              ${(potentialWin * BASE_TICKET_PRICE_ETH * ethPriceUsd).toFixed(2)}
            </p>
          ) : (
            <p className={`text-sm font-bold ${isUp ? 'text-white' : 'text-red-400'}`}>
              {(potentialWin * BASE_TICKET_PRICE_ETH).toFixed(4)} ETH
            </p>
          )
        ) : showUsdValues ? (
          <p className={`text-sm font-bold ${isUp ? 'text-white' : 'text-red-400'}`}>
            ${(potentialWin * byemoney1mValueUsd).toFixed(2)}
          </p>
        ) : (
          <p className={`text-sm font-bold ${isUp ? 'text-white' : 'text-red-400'}`}>
            {potentialWin.toFixed(1)}M
          </p>
        )}
      </div>
    </div>
  );
}
