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
  angle: number;
  speed: number;
  rotationSpeed: number;
}

interface HistoryModalProps {
  isOpen: boolean;
  activeMarket: MarketType;
  unclaimedMarkets: UnclaimedMarket[];
  history: HistoryItem[];
  totalUnclaimedEth: number;
  totalUnclaimedByemoney: number;
  currentPriceUsd: number;
  txState: TxState;
  claimingMarketId: number | null;
  claimingMarket: MarketType | null;
  onClose: () => void;
  onClaim: (marketId: number, market: MarketType, isLegacy?: boolean, contractAddress?: `0x${string}`) => void;
}

export function HistoryModal({
  isOpen,
  activeMarket,
  unclaimedMarkets,
  history,
  totalUnclaimedEth,
  totalUnclaimedByemoney,
  currentPriceUsd,
  txState,
  claimingMarketId,
  claimingMarket,
  onClose,
  onClaim,
}: HistoryModalProps) {
  const [mounted, setMounted] = useState(false);
  const [closing, setClosing] = useState(false);
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const [confettiOrigin, setConfettiOrigin] = useState({ x: 50, y: 50 });
  const prevTxState = useRef(txState);
  const claimButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
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
      // Get the button position for confetti origin
      const buttonKey = `${claimingMarket}-${claimingMarketId}`;
      const button = claimButtonRefs.current.get(buttonKey);
      if (button) {
        const rect = button.getBoundingClientRect();
        const x = ((rect.left + rect.width / 2) / window.innerWidth) * 100;
        const y = ((rect.top + rect.height / 2) / window.innerHeight) * 100;
        setConfettiOrigin({ x, y });
      }
      triggerConfetti();
      triggerCelebrationHaptics();
    }
    prevTxState.current = txState;
  }, [txState, claimingMarketId, claimingMarket]);

  const triggerConfetti = () => {
    const pieces: ConfettiPiece[] = [];
    const numPieces = 40;
    
    for (let i = 0; i < numPieces; i++) {
      // Random angle for explosion (all directions)
      const angle = (Math.PI * 2 * i) / numPieces + (Math.random() - 0.5) * 0.5;
      pieces.push({
        id: i,
        x: confettiOrigin.x,
        y: confettiOrigin.y,
        rotation: Math.random() * 360,
        scale: 0.4 + Math.random() * 0.6,
        angle,
        speed: 8 + Math.random() * 12, // Varying speeds
        rotationSpeed: (Math.random() - 0.5) * 30,
      });
    }
    
    setConfetti(pieces);
    setShowConfetti(true);
    
    setTimeout(() => {
      setShowConfetti(false);
      setConfetti([]);
    }, 2000);
  };

  const triggerCelebrationHaptics = async () => {
    try {
      const { sdk } = await import('@farcaster/miniapp-sdk');
      sdk.haptics.impactOccurred('heavy');
      setTimeout(() => sdk.haptics.impactOccurred('heavy'), 80);
      setTimeout(() => sdk.haptics.impactOccurred('medium'), 160);
      setTimeout(() => sdk.haptics.notificationOccurred('success'), 300);
      setTimeout(() => sdk.haptics.impactOccurred('medium'), 450);
      setTimeout(() => sdk.haptics.impactOccurred('light'), 550);
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

  const setButtonRef = (key: string, el: HTMLButtonElement | null) => {
    if (el) {
      claimButtonRefs.current.set(key, el);
    } else {
      claimButtonRefs.current.delete(key);
    }
  };

  if (!isOpen) return null;

  // Separate unclaimed by market
  const ethUnclaimed = unclaimedMarkets.filter(m => m.market === 'ETH');
  const byemoneyUnclaimed = unclaimedMarkets.filter(m => m.market === 'BYEMONEY');

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
          {/* ETH Unclaimed */}
          {ethUnclaimed.length > 0 && (
            <div className="bg-white/10 border border-white/20 rounded-xl p-3 mb-2">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <img src="/eth.png" alt="ETH" className="w-4 h-4 rounded-full" />
                  <p className="text-[10px] text-white/60 uppercase tracking-wider">ETH Unclaimed</p>
                </div>
                <p className="text-sm font-bold text-white">{totalUnclaimedEth.toFixed(4)} ETH</p>
              </div>
              <div className="space-y-1.5">
                {ethUnclaimed.map((m) => {
                  const buttonKey = `ETH-${m.marketId}${m.isLegacy ? '-legacy' : ''}`;
                  return (
                    <div key={buttonKey} className="flex items-center justify-between bg-black/40 rounded-lg p-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs text-white/70">Round #{m.marketId}</p>
                          {m.isLegacy && (
                            <span className="text-[8px] px-1.5 py-0.5 bg-orange-500/20 text-orange-400 rounded">OLD</span>
                          )}
                        </div>
                        <p className="text-[10px] text-white/40">
                          {m.status === 2 ? 'Cancelled' : m.result === 1 ? 'UP won' : 'DOWN won'}
                        </p>
                      </div>
                      <button
                        ref={(el) => setButtonRef(buttonKey, el)}
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          onClaim(m.marketId, 'ETH', m.isLegacy, m.contractAddress); 
                        }}
                        disabled={claimingMarketId === m.marketId && claimingMarket === 'ETH'}
                        className="bg-white hover:bg-white/90 text-black text-[10px] font-bold rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center"
                        style={{ width: '60px', height: '32px' }}
                      >
                        {claimingMarketId === m.marketId && claimingMarket === 'ETH' ? (
                          <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                        ) : (
                          'Claim'
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* BYEMONEY Unclaimed */}
          {byemoneyUnclaimed.length > 0 && (
            <div className="bg-white/10 border border-white/20 rounded-xl p-3 mb-2">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <img src="/byemoney.png" alt="BYEMONEY" className="w-4 h-4 rounded-full" />
                  <p className="text-[10px] text-white/60 uppercase tracking-wider">BYEMONEY Unclaimed</p>
                </div>
                <p className="text-sm font-bold text-white">{totalUnclaimedByemoney.toFixed(1)}M BYE</p>
              </div>
              <div className="space-y-1.5">
                {byemoneyUnclaimed.map((m) => {
                  const buttonKey = `BYEMONEY-${m.marketId}${m.isLegacy ? '-legacy' : ''}`;
                  return (
                    <div key={buttonKey} className="flex items-center justify-between bg-black/40 rounded-lg p-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs text-white/70">Round #{m.marketId}</p>
                          {m.isLegacy && (
                            <span className="text-[8px] px-1.5 py-0.5 bg-orange-500/20 text-orange-400 rounded">OLD</span>
                          )}
                        </div>
                        <p className="text-[10px] text-white/40">
                          {m.status === 2 ? 'Cancelled' : m.result === 1 ? 'UP won' : 'DOWN won'}
                        </p>
                      </div>
                      <button
                        ref={(el) => setButtonRef(buttonKey, el)}
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          onClaim(m.marketId, 'BYEMONEY', m.isLegacy, m.contractAddress); 
                        }}
                        disabled={claimingMarketId === m.marketId && claimingMarket === 'BYEMONEY'}
                        className="bg-white hover:bg-white/90 text-black text-[10px] font-bold rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center"
                        style={{ width: '60px', height: '32px' }}
                      >
                        {claimingMarketId === m.marketId && claimingMarket === 'BYEMONEY' ? (
                          <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                        ) : (
                          'Claim'
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* History Items */}
          {history.length === 0 ? (
            <div className="text-center py-8 text-white/40">
              <p className="text-sm">No betting history yet</p>
            </div>
          ) : (
            history.slice(0, 20).map((item, index) => {
              const isEthMarket = item.market === 'ETH';
              const betDate = item.timestamp ? new Date(item.timestamp) : null;
              const dayName = betDate ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][betDate.getDay()] : '';
              
              const betAmountDisplay = isEthMarket 
                ? `${(item.tickets * BASE_TICKET_PRICE_ETH).toFixed(4)} ETH`
                : `${item.tickets}M BYEMONEY`;
              const betAmountUsd = isEthMarket 
                ? `$${(item.tickets * BASE_TICKET_PRICE_ETH * ethPrice).toFixed(2)}`
                : '';
              
              // BYEMONEY winnings are already in "tickets" (millions), ETH winnings are in ETH
              const winningsDisplay = isEthMarket
                ? `+${item.winnings.toFixed(4)} ETH`
                : `+${item.winnings.toFixed(1)}M`;
              const winningsUsd = isEthMarket && item.winnings > 0
                ? `$${(item.winnings * ethPrice).toFixed(2)}`
                : '';
              
              const isWin = item.result === (item.direction === 'up' ? 1 : 2);
              const showWinnings = isWin && item.winnings > 0;

              return (
                <div
                  key={`${item.market}-${item.marketId}-${item.direction}-${item.isLegacy ? 'legacy' : 'new'}-${index}`}
                  className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-2.5 animate-fade-in"
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${item.direction === 'up' ? 'bg-white/20' : 'bg-red-500/20'}`}>
                        <svg className={`w-3.5 h-3.5 ${item.direction === 'up' ? 'text-white' : 'text-red-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                          <path d={item.direction === 'up' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
                        </svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1 flex-wrap">
                          <img 
                            src={isEthMarket ? '/eth.png' : '/byemoney.png'} 
                            alt={item.market} 
                            className="w-3 h-3 rounded-full flex-shrink-0"
                          />
                          <p className="text-[11px] font-semibold">#{item.marketId}</p>
                          <span className={`text-[8px] px-1 py-0.5 rounded ${item.direction === 'up' ? 'bg-white/10 text-white/70' : 'bg-red-500/20 text-red-400/70'}`}>
                            {item.direction === 'up' ? 'PUMP' : 'DUMP'}
                          </span>
                          {item.isLegacy && (
                            <span className="text-[8px] px-1 py-0.5 bg-orange-500/20 text-orange-400 rounded">OLD</span>
                          )}
                        </div>
                        <p className="text-[9px] text-white/40 truncate">
                          {item.tickets}x · {betAmountDisplay} {betAmountUsd && `· ${betAmountUsd}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end flex-shrink-0">
                      {item.status === 0 ? (
                        <span className="text-[10px] text-white font-medium">Active</span>
                      ) : item.status === 2 ? (
                        <span className="text-[10px] text-orange-400 font-medium">Cancelled</span>
                      ) : isWin ? (
                        <>
                          <div className="flex items-center gap-1">
                            {item.claimed && (
                              <span className="text-[9px] text-green-400/70">Claimed</span>
                            )}
                            <span className="text-[10px] font-bold text-white">{winningsDisplay}</span>
                          </div>
                          {winningsUsd && <span className="text-[9px] text-white/40">{winningsUsd}</span>}
                        </>
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

      {/* Confetti - Explosion from button */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-[60] overflow-hidden">
          {confetti.map((piece) => (
            <img
              key={piece.id}
              src="/confetti.png"
              alt=""
              className="absolute w-6 h-6 object-contain"
              style={{
                left: `${piece.x}%`,
                top: `${piece.y}%`,
                transform: `rotate(${piece.rotation}deg) scale(${piece.scale})`,
                animation: `confetti-explode-${piece.id} 2s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards`,
              }}
            />
          ))}
          <style>
            {confetti.map((piece) => `
              @keyframes confetti-explode-${piece.id} {
                0% {
                  transform: translate(0, 0) rotate(${piece.rotation}deg) scale(${piece.scale});
                  opacity: 1;
                }
                100% {
                  transform: translate(${Math.cos(piece.angle) * piece.speed * 15}px, ${Math.sin(piece.angle) * piece.speed * 15 + 200}px) rotate(${piece.rotation + piece.rotationSpeed * 10}deg) scale(${piece.scale * 0.5});
                  opacity: 0;
                }
              }
            `).join('\n')}
          </style>
        </div>
      )}
    </div>
  );
}