'use client';

import { TOKEN, DEXSCREENER } from '@/lib/constants';
import { useState, useEffect } from 'react';

interface PriceData {
  priceUsd: string;
  priceChange24h: number;
  volume24h: number;
  liquidity: number;
  marketCap: number;
}

export default function HomePage() {
  const [priceData, setPriceData] = useState<PriceData | null>(null);
  const [timeframe, setTimeframe] = useState<'1D' | '1W' | '1M' | '1Y'>('1W');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const res = await fetch(DEXSCREENER.apiUrl);
        if (res.ok) {
          const data = await res.json();
          if (data.pairs && data.pairs.length > 0) {
            const pair = data.pairs[0];
            setPriceData({
              priceUsd: pair.priceUsd || '0',
              priceChange24h: pair.priceChange?.h24 || 0,
              volume24h: pair.volume?.h24 || 0,
              liquidity: pair.liquidity?.usd || 0,
              marketCap: pair.marketCap || pair.fdv || 0,
            });
          }
        }
      } catch (err) {
        console.error('Failed to fetch price:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPrice();
    const interval = setInterval(fetchPrice, 30000); // Update every 30s
    return () => clearInterval(interval);
  }, []);

  const formatPrice = (price: string) => {
    const num = parseFloat(price);
    if (num < 0.00001) return `$${num.toExponential(2)}`;
    if (num < 0.01) return `$${num.toFixed(6)}`;
    if (num < 1) return `$${num.toFixed(4)}`;
    return `$${num.toFixed(2)}`;
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `$${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `$${(num / 1000).toFixed(2)}K`;
    return `$${num.toFixed(2)}`;
  };

  const isPositive = priceData ? priceData.priceChange24h >= 0 : true;

  return (
    <div className="flex flex-col h-full p-3 gap-3">
      {/* Price Header */}
      <div className="bg-black border border-white/10 rounded-xl p-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-white/40">Price</span>
          <span className="text-[10px] text-white/40">Holding Value</span>
        </div>
        
        <div className="flex items-baseline gap-3">
          <span className={`font-bold text-2xl ${isPositive ? 'text-white' : 'text-red-500'}`}>
            {loading ? '...' : priceData ? formatPrice(priceData.priceUsd) : '$0.00'}
          </span>
          {priceData && (
            <span className={`text-sm font-semibold ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
              {isPositive ? '+' : ''}{priceData.priceChange24h.toFixed(2)}%
            </span>
          )}
        </div>
      </div>

      {/* Chart */}
      <div className="flex-1 bg-black border border-white/10 rounded-xl overflow-hidden min-h-0">
        <iframe
          src={DEXSCREENER.embedUrl}
          className="w-full h-full"
          title="Price Chart"
          allow="clipboard-write"
          loading="lazy"
        />
      </div>

      {/* Timeframe Selector */}
      <div className="flex gap-2 justify-center">
        {(['1D', '1W', '1M', '1Y'] as const).map((tf) => (
          <button
            key={tf}
            onClick={() => setTimeframe(tf)}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
              timeframe === tf
                ? 'bg-white/10 text-white'
                : 'text-white/40 hover:text-white/60'
            }`}
          >
            {tf}
          </button>
        ))}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-black border border-white/10 rounded-xl p-2.5 text-center">
          <p className="text-[9px] text-white/40">Volume 24h</p>
          <p className="font-semibold text-white text-xs mt-0.5">
            {loading ? '...' : priceData ? formatNumber(priceData.volume24h) : '$0'}
          </p>
        </div>
        <div className="bg-black border border-white/10 rounded-xl p-2.5 text-center">
          <p className="text-[9px] text-white/40">Liquidity</p>
          <p className="font-semibold text-white text-xs mt-0.5">
            {loading ? '...' : priceData ? formatNumber(priceData.liquidity) : '$0'}
          </p>
        </div>
        <div className="bg-black border border-white/10 rounded-xl p-2.5 text-center">
          <p className="text-[9px] text-white/40">MCap</p>
          <p className="font-semibold text-white text-xs mt-0.5">
            {loading ? '...' : priceData ? formatNumber(priceData.marketCap) : '$0'}
          </p>
        </div>
      </div>
    </div>
  );
}
