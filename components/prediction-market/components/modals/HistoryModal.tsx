'use client';

import { useEffect, useState, useRef } from 'react';
import { MarketType, UnclaimedMarket, HistoryItem, TxState } from '../../types';
import { BASE_TICKET_PRICE_ETH } from '../../constants';

interface ConfettiPiece {
  id: number;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  velocityX: number;
  velocityY: number;
  rotationSpeed: number;
}

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
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const prevTxState = useRef(txState);
  const isEthMarket = activeMarket === 'ETH';
  const ethPrice = currentPriceUsd > 0 ? currentPriceUsd : 2900;

  useEffect(() => {
    if (isOpen) {
      setMounted(false);
      const timer = setTimeout(() => setMounted(true), 20);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Trigger confetti on claim success
  useEffect(() => {
    if (prevTxState.current === 'claiming' && txState === 'success') {
      triggerConfetti();
      triggerCelebrationHaptics();
    }
    prevTxState.current = txState;
  }, [txState]);

  const triggerConfetti = () => {
    const pieces: ConfettiPiece[] = [];
    const numPieces = 30;
    
    for (let i = 0; i < numPieces; i++) {
      pieces.push({
        id: i,
        x: 50 + (Math.random() - 0.5) * 20, // Start near center
        y: 40 + (Math.random() - 0.5) * 10,
        rotation: Math.random() * 360,
        scale: 0.5 + Math.random() * 0.5,
        velocityX: (Math.random() - 0.5) * 15,
        velocityY: -8 - Math.random() * 8, // Shoot upward
        rotationSpeed: (Math.random() - 0.5) * 20,
      });
    }
    
    setConfetti(pieces);
    setShowConfetti(true);
    
    // Clear confetti after animation
    setTimeout(() => {
      setShowConfetti(false);
      setConfetti([]);
    }, 2500);
  };

  const triggerCelebrationHaptics = async () => {
    try {
      const { sdk } = await import('@farcaster/miniapp-sdk');
      // Multiple haptic bursts for celebration
      sdk.haptics.impactOccurred('heavy');
      setTimeout(() => sdk.haptics.impactOccurred('medium'), 100);
      setTimeout(() => sdk.haptics.impactOccurred('heavy'), 200);
      setTimeout(() => sdk.haptics.notificationOccurred('success'), 350);
      setTimeout(() => sdk.haptics.impactOccurred('medium'), 500);
      setTimeout(() => sdk.haptics.impactOccurred('light'), 650);
    } catch {}
  };

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
                      className="bg-white hover:bg-white/90 text-black text-[10px] font-bold rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center"
                      style={{ width: '60px', height: '32px' }}
                    >
                      {claimingMarketId === m.marketId ? (
                        <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                      ) : (
                        'Claim'
                      )}
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
              
              // Format bet amount based on market
              const betAmountDisplay = isEthMarket 
                ? `${(item.tickets * BASE_TICKET_PRICE_ETH).toFixed(4)} ETH`
                : `${item.tickets}M BYEMONEY`;
              const betAmountUsd = isEthMarket 
                ? `$${(item.tickets * BASE_TICKET_PRICE_ETH * ethPrice).toFixed(2)}`
                : '';
              
              // Format winnings based on market
              const winningsDisplay = isEthMarket
                ? `+${item.winnings.toFixed(4)} ETH`
                : `+${(item.winnings / 1000000).toFixed(1)}M`;
              const winningsUsd = isEthMarket && item.winnings > 0
                ? `($${(item.winnings * ethPrice).toFixed(2)})`
                : '';
              
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
                          {item.tickets}x · {betAmountDisplay} {betAmountUsd && `· ${betAmountUsd}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {item.claimed && item.winnings > 0 && (
                        <span className="text-[9px] text-green-400/70 font-medium">Claimed</span>
                      )}
                      {item.status === 0 ? (
                        <span className="text-[10px] text-white font-medium">Active</span>
                      ) : item.status === 2 ? (
                        <span className="text-[10px] text-orange-400 font-medium">Cancelled</span>
                      ) : isWin ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] text-white/50">Won</span>
                          <span className="text-[10px] font-bold text-white">{winningsDisplay}</span>
                          {winningsUsd && <span className="text-[9px] text-white/40">{winningsUsd}</span>}
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

      {/* Confetti */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-[60] overflow-hidden">
          {confetti.map((piece) => (
            <div
              key={piece.id}
              className="absolute animate-confetti-fall"
              style={{
                left: `${piece.x}%`,
                top: `${piece.y}%`,
                transform: `rotate(${piece.rotation}deg) scale(${piece.scale})`,
                '--velocity-x': piece.velocityX,
                '--velocity-y': piece.velocityY,
                '--rotation-speed': piece.rotationSpeed,
              } as React.CSSProperties}
            >
              <img 
                src="/confetti.png" 
                alt="" 
                className="w-6 h-6 object-contain"
              />
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        @keyframes confetti-fall {
          0% {
            transform: translate(0, 0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translate(calc(var(--velocity-x) * 20px), calc(100vh + var(--velocity-y) * -50px)) rotate(calc(var(--rotation-speed) * 20deg));
            opacity: 0;
          }
        }
        .animate-confetti-fall {
          animation: confetti-fall 2.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
        }
      `}</style>
    </div>
  );
}