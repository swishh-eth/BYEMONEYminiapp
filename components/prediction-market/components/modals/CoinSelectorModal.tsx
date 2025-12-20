'use client';

import { useEffect, useState } from 'react';
import { MarketType, CoinOption } from '../../types';
import { AVAILABLE_COINS } from '../../constants';

interface CoinSelectorModalProps {
  isOpen: boolean;
  activeMarket: MarketType;
  onClose: () => void;
  onSelect: (market: MarketType) => void;
}

export function CoinSelectorModal({ isOpen, activeMarket, onClose, onSelect }: CoinSelectorModalProps) {
  const [mounted, setMounted] = useState(false);
  const [closing, setClosing] = useState(false);

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
        className={`relative w-full max-w-md bg-gradient-to-t from-black via-black/95 to-transparent pt-20 pb-8 px-4 rounded-t-3xl transition-all duration-500 ${mounted && !closing ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-full'}`}
        style={{ transitionTimingFunction: closing ? 'ease-in' : 'cubic-bezier(0.22, 1, 0.36, 1)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center mb-6">
          <h3 className="text-xl font-bold text-white mb-1">Select Market</h3>
          <p className="text-sm text-white/40">Choose a coin to predict</p>
        </div>

        <div className="flex gap-4 px-4 justify-center">
          {AVAILABLE_COINS.map((coin, index) => (
            <button
              key={coin.symbol}
              onClick={() => {
                if (coin.active) {
                  onSelect(coin.symbol as MarketType);
                  handleClose();
                }
              }}
              style={{ animationDelay: `${index * 50}ms` }}
              className={`flex-1 max-w-[160px] rounded-2xl p-5 transition-all animate-pop-in ${
                coin.symbol === activeMarket
                  ? 'bg-white text-black'
                  : 'bg-white/10 border border-white/20 hover:bg-white/20'
              }`}
            >
              <div className="flex flex-col items-center gap-3">
                <div className={`relative w-16 h-16 rounded-full overflow-hidden flex items-center justify-center ${coin.symbol === activeMarket ? 'bg-black/10' : 'bg-white/10'}`}>
                  <img src={coin.icon} alt={coin.symbol} className="w-full h-full object-cover scale-125" />
                </div>
                <p className={`font-bold text-base ${coin.symbol === activeMarket ? 'text-black' : 'text-white'}`}>
                  {coin.symbol === 'ETH' ? 'ETHEREUM' : coin.symbol}
                </p>
              </div>
            </button>
          ))}
        </div>

        <p className="text-center text-white/20 text-[10px] mt-4 uppercase tracking-wider">tap anywhere above to close</p>
      </div>
    </div>
  );
}
