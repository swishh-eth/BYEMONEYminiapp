'use client';

import { useEffect, useState } from 'react';
import { MarketType, UnclaimedMarket, HistoryItem, TxState } from '../../types';
import { BASE_TICKET_PRICE_ETH } from '../../constants';

interface HistoryModalProps {
  isOpen: boolean;
  activeMarket: MarketType;
  unclaimedMarkets: UnclaimedMarket[];
  history: HistoryItem[];
  totalUnclaimed: number;
  currentPriceUsd: number;
  txState: TxState;
  claimingMarketId: number | null;
  onClose: () => void;
  onClaim: (marketId: number) => void;
}

export function HistoryModal({
  isOpen,
  activeMarket,
  unclaimedMarkets,
  history,
  totalUnclaimed,
  currentPriceUsd,
  txState,
  claimingMarketId,
  onClose,
  onClaim,
}: HistoryModalProps) {
  const [mounted, setMounted] = useState(false);
  const [closing, setClosing] = useState(false);
  const isEthMarket = activeMarket === 'ETH';
  const ethPrice = currentPriceUsd > 0 ? currentPriceUsd : 2900;

  useEffect(() => {
    if (isOpen) {
      setMounted(false);
      const timer = setTimeout(() => setMounted(true), 20);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleClose = () => {
    setMounted(false);
    setClosing(true);
    setTimeout(() => {
      onClose();
      setClosing(false);
    }, 400);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={handleClose}>
      <div className={`absolute inset-0 bg-black/70 backdrop-blur-xl transition-opacity duration-500 ease-out ${mounted && !closing ? 'opacity-100' : 'opacity-0'}`} />
      <div
        className={`relative w-full max-w-md max-h-[70vh] bg-gradient-to-t from-black via-black/95 to-transparent rounded-t-3xl pb-6 px-4 overflow-hidden transition-all duration-500 ${mounted && !closing ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-full'}`}
        style={{ transitionTimingFunction: closing ? 'ease-in' : 'cubic-bezier(0.22, 1, 0.36, 1)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pt-6 pb-3">
          <h3 className="text-lg font-bold text-white text-center">Betting History</h3>
        </div>

        <div className="overflow-y-auto max-h-[calc(70vh-100px)] space-y-2 pb-2 scrollbar-hide">
          {/* Unclaimed Winnings */}
          {unclaimedMarkets.length > 0 && (
            <div className="bg-white/10 border border-white/20 rounded-xl p-3 mb-2">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] text-white/60 uppercase tracking-wider">Unclaimed</p>
                <p className="text-sm font-bold text-white">
                  {isEthMarket ? `${totalUnclaimed.toFixed(4)} ETH` : `${totalUnclaimed.toFixed(1)}M BYEMONEY`}
                </p>
              </div>
              <div className="space-y-1.5">
                {unclaimedMarkets.map((m) => (
                  <div key={m.marketId} className="flex items-center justify-between bg-black/40 rounded-lg p-2">
                    <div>
                      <p className="text-xs text-white/70">Round #{m.marketId}</p>
                      <p className="text-[10px] text-white/40">
                        {m.status === 2 ? 'Cancelled' : m.result === 1 ? 'UP won' : 'DOWN won'}
                      </p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); onClaim(m.marketId); }}
                      disabled={claimingMarketId === m.marketId}
                      className="bg-white hover:bg-white/90 text-black text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all disabled:opacity-50 whitespace-nowrap"
                    >
                      {claimingMarketId === m.marketId ? '...' : 'Claim'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* History Items */}
          {history.length === 0 ? (
            <div className="text-center py-8 text-white/40">
              <p className="text-sm">No betting history yet</p>
            </div>
          ) : (
            history.slice(0, 7).map((item, index) => {
              const betDate = item.timestamp ? new Date(item.timestamp) : null;
              const dayName = betDate ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][betDate.getDay()] : '';
              const betAmountEth = (item.tickets * BASE_TICKET_PRICE_ETH).toFixed(4);
              const betAmountUsd = (item.tickets * BASE_TICKET_PRICE_ETH * ethPrice).toFixed(2);
              const winningsEth = item.winnings > 0 ? item.winnings.toFixed(4) : '0';
              const winningsUsd = item.winnings > 0 ? (item.winnings * ethPrice).toFixed(2) : '0';
              const isWin = item.result === (item.direction === 'up' ? 1 : 2);

              return (
                <div
                  key={`${item.marketId}-${item.direction}-${index}`}
                  className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-2.5 animate-fade-in"
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${item.direction === 'up' ? 'bg-white/20' : 'bg-red-500/20'}`}>
                        <svg className={`w-3.5 h-3.5 ${item.direction === 'up' ? 'text-white' : 'text-red-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                          <path d={item.direction === 'up' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-[11px] font-semibold">#{item.marketId}</p>
                          <span className={`text-[8px] px-1 py-0.5 rounded ${item.direction === 'up' ? 'bg-white/10 text-white/70' : 'bg-red-500/20 text-red-400/70'}`}>
                            {item.direction === 'up' ? 'PUMP' : 'DUMP'}
                          </span>
                          {dayName && <span className="text-[8px] text-white/30">{dayName}</span>}
                        </div>
                        <p className="text-[9px] text-white/40">
                          {item.tickets}x · {betAmountEth} ETH · ${betAmountUsd}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {item.status === 0 ? (
                        <span className="text-[10px] text-white font-medium">Active</span>
                      ) : item.status === 2 ? (
                        <span className="text-[10px] text-orange-400 font-medium">Cancelled</span>
                      ) : isWin ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] text-white/50">Won</span>
                          <span className="text-[10px] font-bold text-white">+{winningsEth} ETH</span>
                          <span className="text-[9px] text-white/40">(${winningsUsd})</span>
                        </div>
                      ) : item.result === 0 ? (
                        <span className="text-[10px] text-white/40 font-medium">Tie</span>
                      ) : (
                        <span className="text-[10px] text-red-400 font-medium">Lost</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <p className="text-center text-white/20 text-[10px] mt-3 uppercase tracking-wider">tap anywhere above to close</p>
      </div>
    </div>
  );
}
