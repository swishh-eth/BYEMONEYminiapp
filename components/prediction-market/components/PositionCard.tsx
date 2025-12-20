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
  onOpenHistory: () => void;
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
  onOpenHistory,
  className = '',
}: PositionCardProps) {
  const isEthMarket = activeMarket === 'ETH';
  const totalPool = upPool + downPool;

  const userUpTickets = userPosition ? Number(userPosition.up) : 0;
  const userDownTickets = userPosition ? Number(userPosition.down) : 0;
  const userTotalTickets = userUpTickets + userDownTickets;
  const hasPosition = userTotalTickets > 0;
  const hasBothPositions = userUpTickets > 0 && userDownTickets > 0;

  // Calculate potential wins
  const upPotentialWin = upPool > 0 ? (totalPool * (1 - HOUSE_FEE) / upPool) * userUpTickets : 0;
  const downPotentialWin = downPool > 0 ? (totalPool * (1 - HOUSE_FEE) / downPool) * userDownTickets : 0;

  const formatWin = (win: number, isUp: boolean) => {
    if (isEthMarket) {
      return showUsdValues 
        ? `$${(win * BASE_TICKET_PRICE_ETH * ethPriceUsd).toFixed(2)}`
        : `${(win * BASE_TICKET_PRICE_ETH).toFixed(4)} ETH`;
    }
    return showUsdValues 
      ? `$${(win * byemoney1mValueUsd).toFixed(2)}`
      : `${win.toFixed(1)}M`;
  };

  return (
    <button
      onClick={onOpenHistory}
      className={`bg-white/[0.03] border border-white/[0.08] rounded-xl p-3 text-left w-full active:scale-[0.99] transition-transform ${className}`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <p className="text-[10px] text-white/40 uppercase tracking-wider">Your Position</p>
          <span className="text-[8px] text-white/20 px-1.5 py-0.5 rounded bg-white/5">
            tap for history
          </span>
        </div>
        {(canClaim || canRefund) && (
          <span
            onClick={(e) => { e.stopPropagation(); onClaim(); }}
            className="bg-gradient-to-r from-white to-white text-black text-[10px] font-bold px-3 py-1 rounded-lg disabled:opacity-50 hover:scale-105 transition-transform cursor-pointer"
          >
            {txState === 'claiming' ? '...' : canRefund ? 'Refund' : 'Claim'}
          </span>
        )}
      </div>

      {!hasPosition ? (
        // No position state
        <div className="flex items-center justify-center rounded-lg px-3 h-[44px] bg-white/[0.02] border border-dashed border-white/10">
          <p className="text-sm text-white/30">No active bet this round</p>
        </div>
      ) : hasBothPositions ? (
        // Side by side layout for both positions
        <div className="flex gap-2 h-[44px]">
          <div className="flex-1 flex items-center justify-between bg-white/5 rounded-lg px-2.5">
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded bg-white/10 flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path d="M5 15l7-7 7 7" />
                </svg>
              </div>
              <span className="text-xs text-white font-medium">{userUpTickets}</span>
            </div>
            <div className="text-right">
              <p className="text-[9px] text-white/40">Win</p>
              <p className="text-xs font-bold text-white">{formatWin(upPotentialWin, true)}</p>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-between bg-red-500/10 rounded-lg px-2.5">
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded bg-red-500/20 flex items-center justify-center">
                <svg className="w-3 h-3 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              <span className="text-xs text-red-400 font-medium">{userDownTickets}</span>
            </div>
            <div className="text-right">
              <p className="text-[9px] text-white/40">Win</p>
              <p className="text-xs font-bold text-red-400">{formatWin(downPotentialWin, false)}</p>
            </div>
          </div>
        </div>
      ) : (
        // Single position layout
        <div className={`flex items-center justify-between rounded-lg px-3 h-[44px] ${userUpTickets > 0 ? 'bg-white/5' : 'bg-red-500/10'}`}>
          <div className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${userUpTickets > 0 ? 'bg-white/10' : 'bg-red-500/20'}`}>
              <svg
                className={`w-3.5 h-3.5 ${userUpTickets > 0 ? 'text-white' : 'text-red-400'}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2.5}
              >
                <path d={userUpTickets > 0 ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
              </svg>
            </div>
            <span className={`text-sm font-medium ${userUpTickets > 0 ? 'text-white' : 'text-red-400'}`}>
              {userUpTickets > 0 ? userUpTickets : userDownTickets} ticket{(userUpTickets > 0 ? userUpTickets : userDownTickets) > 1 ? 's' : ''}
            </span>
            <span className="text-xs text-white/30">{userUpTickets > 0 ? 'PUMP' : 'DUMP'}</span>
          </div>
          <div className="text-right">
            <p className="text-[9px] text-white/40">Potential win</p>
            <p className={`text-sm font-bold ${userUpTickets > 0 ? 'text-white' : 'text-red-400'}`}>
              {formatWin(userUpTickets > 0 ? upPotentialWin : downPotentialWin, userUpTickets > 0)}
            </p>
          </div>
        </div>
      )}
    </button>
  );
}
