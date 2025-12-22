'use client';

import { MarketType } from '../types';
import { AVAILABLE_COINS } from '../constants';
import { formatUsdPrice, calculateByemoneyUsdValue } from '../utils';

interface PriceCardProps {
  activeMarket: MarketType;
  currentPrice: bigint | null;
  ethPriceUsd: number;
  startPrice: bigint | undefined;
  marketDataSource: MarketType;
  hasMarket: boolean;
  isResolved: boolean;
  onOpenCoinSelector: () => void;
  className?: string;
}

export function PriceCard({
  activeMarket,
  currentPrice,
  ethPriceUsd,
  startPrice,
  marketDataSource,
  hasMarket,
  isResolved,
  onOpenCoinSelector,
  className = '',
}: PriceCardProps) {
  const isEthMarket = activeMarket === 'ETH';
  const selectedCoin = AVAILABLE_COINS.find((c) => c.symbol === activeMarket) || AVAILABLE_COINS[0];

  // Check if we're switching markets (data source doesn't match active market)
  const isMarketSwitching = marketDataSource !== activeMarket;

  // Calculate prices
  const currentPriceUsd = isEthMarket ? ethPriceUsd : 0;
  const startPriceUsd = isEthMarket && startPrice ? Number(startPrice) / 1e8 : 0;

  const byemoneyRawPrice = !isEthMarket && currentPrice ? Number(currentPrice) : 0;
  const byemoneyStartPrice = !isEthMarket && startPrice ? Number(startPrice) : 0;

  const byemoney1mValueUsd = calculateByemoneyUsdValue(byemoneyRawPrice, ethPriceUsd);
  const byemoneyStartValueUsd = calculateByemoneyUsdValue(byemoneyStartPrice, ethPriceUsd);

  // Calculate price change using USD values
  const priceChange = isEthMarket
    ? startPriceUsd > 0
      ? ((ethPriceUsd - startPriceUsd) / startPriceUsd) * 100
      : 0
    : byemoneyStartValueUsd > 0
    ? ((byemoney1mValueUsd - byemoneyStartValueUsd) / byemoneyStartValueUsd) * 100
    : 0;

  // Show price data only when not switching and data is valid
  const showPriceData = !isMarketSwitching && (isEthMarket
    ? currentPriceUsd > 0
    : byemoney1mValueUsd > 0 && marketDataSource === 'BYEMONEY');

  // Show start price data only when not switching and have valid start price
  const hasValidStartPrice = !isMarketSwitching && (isEthMarket ? startPriceUsd > 0 : byemoneyStartPrice > 0);

  return (
    <button
      onClick={onOpenCoinSelector}
      className={`bg-white/[0.03] border border-white/[0.08] rounded-2xl p-4 text-left hover:bg-white/[0.05] transition-all active:scale-[0.99] w-full ${className}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-5 h-5 rounded-full overflow-hidden bg-white/10 flex items-center justify-center">
              <img
                src={selectedCoin.icon}
                alt={selectedCoin.symbol}
                className="w-full h-full object-cover scale-125"
              />
            </div>
            <p className="text-[10px] text-white/40 uppercase tracking-wider">
              {isEthMarket ? `${selectedCoin.symbol}/USD` : '1M BYEMONEY'}
            </p>
            <svg
              className="w-2.5 h-2.5 text-white/30"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={3}
            >
              <path d="M19 9l-7 7-7-7" />
            </svg>
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-white/5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
              <span className="text-[8px] text-white/40">LIVE</span>
            </div>
          </div>
          <p className="text-3xl font-bold tracking-tight">
            {showPriceData
              ? isEthMarket
                ? formatUsdPrice(currentPriceUsd)
                : `$${byemoney1mValueUsd.toFixed(3)}`
              : '$---'}
          </p>
        </div>

        {hasMarket && !isResolved && (
          <div className="text-right">
            <p className="text-[10px] text-white/40 mb-1">Since Start</p>
            <div
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg ${
                hasValidStartPrice
                  ? priceChange >= 0 ? 'bg-white/10' : 'bg-red-500/20'
                  : 'bg-white/5'
              }`}
            >
              {hasValidStartPrice ? (
                <>
                  <svg
                    className={`w-3 h-3 ${priceChange >= 0 ? 'text-white' : 'text-red-400 rotate-180'}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={3}
                  >
                    <path d="M5 15l7-7 7 7" />
                  </svg>
                  <span
                    className={`text-lg font-bold ${priceChange >= 0 ? 'text-white' : 'text-red-400'}`}
                  >
                    {`${Math.abs(priceChange).toFixed(2)}%`}
                  </span>
                </>
              ) : (
                <span className="text-lg font-bold text-white/30">--.---%</span>
              )}
            </div>
          </div>
        )}
      </div>

      {hasMarket && (
        <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-white/40">
          <span>
            Start:{' '}
            {hasValidStartPrice
              ? isEthMarket
                ? formatUsdPrice(startPriceUsd)
                : `$${byemoneyStartValueUsd.toFixed(3)}`
              : '$---'}
          </span>
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/5 text-white/60">
            <span className="text-[10px] font-medium">
              {isEthMarket ? 'Chainlink' : 'Uniswap V4'}
            </span>
          </span>
        </div>
      )}
    </button>
  );
}