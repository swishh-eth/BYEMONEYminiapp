'use client';

import { formatEther } from 'viem';
import { MarketType, TxState, Direction } from '../types';
import { BASE_TICKET_PRICE_ETH, BASE_TICKET_PRICE_BYEMONEY, HOUSE_FEE } from '../constants';
import { formatByemoneyBalance } from '../utils';

interface BettingControlsProps {
  activeMarket: MarketType;
  selectedDirection: Direction | null;
  ticketCount: number;
  ethBalance: string;
  byemoneyBalance: bigint;
  upPool: number;
  downPool: number;
  txState: TxState;
  errorMsg: string;
  isNewRound: boolean;
  ticketSectionClosing: boolean;
  onDirectionClick: (direction: Direction) => void;
  onTicketChange: (count: number) => void;
  onBuy: () => void;
}

export function BettingControls({
  activeMarket,
  selectedDirection,
  ticketCount,
  ethBalance,
  byemoneyBalance,
  upPool,
  downPool,
  txState,
  errorMsg,
  isNewRound,
  ticketSectionClosing,
  onDirectionClick,
  onTicketChange,
  onBuy,
}: BettingControlsProps) {
  const isEthMarket = activeMarket === 'ETH';
  const tokenSymbol = isEthMarket ? 'ETH' : 'BYEMONEY';

  const totalCostEth = ticketCount * BASE_TICKET_PRICE_ETH;
  const totalCostByemoney = BASE_TICKET_PRICE_BYEMONEY * BigInt(ticketCount);
  const totalCostDisplay = isEthMarket ? totalCostEth.toFixed(3) : `${ticketCount}M`;

  const hasEnoughBalance = isEthMarket
    ? Number(ethBalance) >= totalCostEth
    : byemoneyBalance >= totalCostByemoney;

  const selectedCost = isEthMarket ? totalCostEth : Number(formatEther(totalCostByemoney));
  const selectedUpPool = upPool + (selectedDirection === 'up' ? selectedCost : 0);
  const selectedDownPool = downPool + (selectedDirection === 'down' ? selectedCost : 0);
  const selectedTotalPool = selectedUpPool + selectedDownPool;
  const selectedPoolAfterFee = selectedTotalPool * (1 - HOUSE_FEE);

  const realUpMultiplier = selectedUpPool > 0 ? selectedPoolAfterFee / selectedUpPool : 1.9;
  const realDownMultiplier = selectedDownPool > 0 ? selectedPoolAfterFee / selectedDownPool : 1.9;

  const potentialWinnings = selectedDirection === 'up'
    ? selectedCost * realUpMultiplier
    : selectedDirection === 'down'
    ? selectedCost * realDownMultiplier
    : 0;

  const oneTicketCost = isEthMarket ? BASE_TICKET_PRICE_ETH : Number(formatEther(BASE_TICKET_PRICE_BYEMONEY));
  const previewUpPool = upPool + oneTicketCost;
  const previewDownPool = downPool + oneTicketCost;
  const previewUpMultiplier = previewUpPool > 0 ? ((previewUpPool + downPool) * (1 - HOUSE_FEE)) / previewUpPool : 1.9;
  const previewDownMultiplier = previewDownPool > 0 ? ((upPool + previewDownPool) * (1 - HOUSE_FEE)) / previewDownPool : 1.9;

  const displayUpMultiplier = selectedDirection === 'up' ? realUpMultiplier : previewUpMultiplier;
  const displayDownMultiplier = selectedDirection === 'down' ? realDownMultiplier : previewDownMultiplier;

  return (
    <div className="flex flex-col gap-3 animate-fade-in" style={{ animationDelay: '200ms' }}>
      {isNewRound && (
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4 text-center">
          <h3 className="text-lg font-bold text-white mb-1">New Round Starting</h3>
          <p className="text-sm text-white/50 mb-4">Be the first to bet and start the next 24h prediction round!</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => onDirectionClick('up')}
          className={`rounded-xl p-4 transition-all hover:scale-[1.02] active:scale-[0.98] ${
            selectedDirection === 'up'
              ? 'bg-white text-black ring-2 ring-white ring-offset-2 ring-offset-black'
              : 'bg-white/[0.03] border border-white/[0.08] hover:border-white/50'
          }`}
        >
          <div className="flex flex-col items-center gap-2">
            <svg className={`w-8 h-8 ${selectedDirection === 'up' ? 'text-black' : 'text-white'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path d="M5 15l7-7 7 7" />
            </svg>
            <span className="font-bold text-sm">PUMP</span>
            {!isNewRound && <span className={`text-[10px] ${selectedDirection === 'up' ? 'text-black/60' : 'text-white/40'}`}>{displayUpMultiplier.toFixed(2)}x</span>}
          </div>
        </button>

        <button
          onClick={() => onDirectionClick('down')}
          className={`rounded-xl p-4 transition-all hover:scale-[1.02] active:scale-[0.98] ${
            selectedDirection === 'down'
              ? 'bg-red-500 text-white ring-2 ring-red-400 ring-offset-2 ring-offset-black'
              : 'bg-white/[0.03] border border-white/[0.08] hover:border-red-500/50'
          }`}
        >
          <div className="flex flex-col items-center gap-2">
            <svg className={`w-8 h-8 ${selectedDirection === 'down' ? 'text-white' : 'text-red-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path d="M19 9l-7 7-7-7" />
            </svg>
            <span className="font-bold text-sm">DUMP</span>
            {!isNewRound && <span className={`text-[10px] ${selectedDirection === 'down' ? 'text-white/70' : 'text-white/40'}`}>{displayDownMultiplier.toFixed(2)}x</span>}
          </div>
        </button>
      </div>

      {(selectedDirection || ticketSectionClosing) && (
        <div className={`flex flex-col gap-3 overflow-hidden ${ticketSectionClosing ? 'animate-slide-out' : 'animate-slide-in'}`}>
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] text-white/40 uppercase">Tickets</p>
              <p className="text-[10px] text-white/40">
                Bal: <span className={hasEnoughBalance ? 'text-white' : 'text-red-400'}>
                  {isEthMarket ? `${Number(ethBalance).toFixed(4)} ETH` : `${formatByemoneyBalance(byemoneyBalance)} BYEMONEY`}
                </span>
              </p>
            </div>

            {isNewRound ? (
              <div className="flex items-center justify-center gap-1">
                {[-10, -5, -1].map((delta) => (
                  <button key={delta} onClick={() => onTicketChange(Math.max(1, ticketCount + delta))} className="w-10 h-10 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-xs font-medium transition-all active:scale-95">
                    {delta}
                  </button>
                ))}
                <div className="w-20 text-center px-2">
                  <p className="text-2xl font-bold">{ticketCount}</p>
                  <p className="text-[9px] text-white/40">{totalCostDisplay} {tokenSymbol}</p>
                </div>
                {[1, 5, 10].map((delta) => (
                  <button key={delta} onClick={() => onTicketChange(ticketCount + delta)} className="w-10 h-10 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-xs font-medium transition-all active:scale-95">
                    +{delta}
                  </button>
                ))}
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <button onClick={() => onTicketChange(Math.max(1, ticketCount - 1))} className="w-10 h-10 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-lg transition-all active:scale-95">−</button>
                  <div className="flex-1 text-center">
                    <input type="number" value={ticketCount} onChange={(e) => onTicketChange(Math.max(1, parseInt(e.target.value) || 1))} className="w-full bg-transparent text-center text-2xl font-bold outline-none" min={1} />
                    <p className="text-[10px] text-white/40">{totalCostDisplay} {tokenSymbol}</p>
                  </div>
                  <button onClick={() => onTicketChange(ticketCount + 1)} className="w-10 h-10 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-lg transition-all active:scale-95">+</button>
                </div>
                <div className="flex gap-2 mt-3">
                  {[1, 5, 10, 25].map((n) => (
                    <button key={n} onClick={() => onTicketChange(n)} className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-95 ${ticketCount === n ? 'bg-white/15 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}>{n}</button>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-white/5 flex justify-between">
                  <span className="text-xs text-white/40">Potential Win</span>
                  <span className={`text-sm font-bold ${selectedDirection === 'up' ? 'text-white' : 'text-red-400'}`}>
                    {isEthMarket ? potentialWinnings.toFixed(4) : potentialWinnings.toFixed(0)} {tokenSymbol}
                  </span>
                </div>
              </>
            )}
          </div>

          <button
            onClick={onBuy}
            disabled={txState !== 'idle' || !hasEnoughBalance}
            className={`w-full py-4 rounded-xl font-bold transition-all hover:scale-[1.02] active:scale-[0.98] ${
              selectedDirection === 'up'
                ? 'bg-gradient-to-r from-white to-white text-black shadow-lg shadow-white/20'
                : 'bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-lg shadow-red-500/20'
            } disabled:opacity-50 disabled:hover:scale-100`}
          >
            {txState === 'buying' ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                {!isEthMarket ? 'Approving...' : isNewRound ? 'Starting Round...' : 'Confirming...'}
              </span>
            ) : txState === 'success' ? (isNewRound ? '✓ Round Started!' : '✓ Done!') :
               txState === 'error' ? (errorMsg || 'Failed') :
               !hasEnoughBalance ? 'Insufficient Balance' :
               isNewRound ? `Start Round & Bet ${totalCostDisplay} ${tokenSymbol}` : `Bet ${totalCostDisplay} ${tokenSymbol}`}
          </button>
        </div>
      )}
    </div>
  );
}
