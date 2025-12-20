'use client';

import { useEffect, useState } from 'react';
import { MarketType } from '../../types';
import { BASE_TICKET_PRICE_ETH } from '../../constants';
import { formatUsdPrice, calculateByemoneyUsdValue } from '../../utils';

interface InfoModalProps {
  isOpen: boolean;
  activeMarket: MarketType;
  marketId?: bigint;
  startPriceUsd: number;
  currentPriceUsd: number;
  byemoneyStartValueUsd: number;
  byemoney1mValueUsd: number;
  hasMarket: boolean;
  onClose: () => void;
}

export function InfoModal({
  isOpen,
  activeMarket,
  marketId,
  startPriceUsd,
  currentPriceUsd,
  byemoneyStartValueUsd,
  byemoney1mValueUsd,
  hasMarket,
  onClose,
}: InfoModalProps) {
  const [mounted, setMounted] = useState(false);
  const [closing, setClosing] = useState(false);
  const isEthMarket = activeMarket === 'ETH';

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
        className={`relative w-full max-w-md max-h-[80vh] bg-gradient-to-t from-black via-black/95 to-transparent rounded-t-3xl pb-6 px-4 overflow-hidden transition-all duration-500 ${mounted && !closing ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-full'}`}
        style={{ transitionTimingFunction: closing ? 'ease-in' : 'cubic-bezier(0.22, 1, 0.36, 1)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pt-6 pb-4">
          <h3 className="text-lg font-bold text-white text-center">How It Works</h3>
        </div>

        <div className="overflow-y-auto max-h-[calc(80vh-120px)] space-y-4 text-sm text-white/70 pb-2 scrollbar-hide">
          {hasMarket && (
            <div className="p-3 bg-white/5 rounded-xl mb-2">
              <div className="flex justify-between text-xs mb-2">
                <span className="text-white/50">Round #{marketId ? Number(marketId) : '--'}</span>
                <span className="text-white/50">{isEthMarket ? 'ETH/USD' : 'BYEMONEY'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <div>
                  <p className="text-white/40 text-[10px]">Start Price</p>
                  <p className="text-white font-medium">
                    {isEthMarket ? formatUsdPrice(startPriceUsd) : `$${byemoneyStartValueUsd.toFixed(3)}`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-white/40 text-[10px]">Current Price</p>
                  <p className="text-white font-medium">
                    {isEthMarket ? formatUsdPrice(currentPriceUsd) : `$${byemoney1mValueUsd.toFixed(3)}`}
                  </p>
                </div>
              </div>
            </div>
          )}

          <Step number={1} title="Predict" description="Choose PUMP (price up) or DUMP (price down) before the round ends" />
          <Step number={2} title="Bet" description={`Buy tickets at ${isEthMarket ? '0.001 ETH' : '1M BYEMONEY'} each. More tickets = bigger potential win`} />
          <Step number={3} title="Wait" description={`Each round lasts 24 hours. Price is checked via ${isEthMarket ? 'Chainlink' : 'Uniswap V4'} oracle`} />
          <Step number={4} title="Win" description="If you predicted correctly, claim your share of the losing pool!" />

          <div className="mt-2 p-3 bg-white/5 rounded-xl text-xs">
            <p className="text-white/50">
              <span className="text-red-400">5% fee</span> is taken from the pool. Winnings are split proportionally based on your tickets.
            </p>
          </div>
        </div>

        <p className="text-center text-white/20 text-[10px] mt-3 uppercase tracking-wider">tap anywhere above to close</p>
      </div>
    </div>
  );
}

function Step({ number, title, description }: { number: number; title: string; description: string }) {
  return (
    <div className="flex gap-3">
      <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
        <span className="text-xs font-bold">{number}</span>
      </div>
      <p>
        <span className="text-white font-medium">{title}</span> - {description}
      </p>
    </div>
  );
}
