'use client';

import { TOKEN, DEXSCREENER } from '@/lib/constants';
import { useState, useEffect, useRef } from 'react';

interface PriceData {
  priceUsd: string;
  priceChange24h: number;
  volume24h: number;
  liquidity: number;
  marketCap: number;
  pairAddress: string;
}

const MULTIPLIER = 100000;

// Haptic feedback helper
const triggerHaptic = async (type: 'light' | 'medium' | 'heavy') => {
  try {
    const { sdk } = await import('@farcaster/miniapp-sdk');
    sdk.haptics.impactOccurred(type);
  } catch {
    // Haptics not available
  }
};

// Click sound helper
const playClick = () => {
  try {
    const audio = new Audio('/click.mp3');
    audio.volume = 0.3;
    audio.play().catch(() => {});
  } catch {}
};

export default function HomePage() {
  const [priceData, setPriceData] = useState<PriceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('24h');
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const seriesRef = useRef<any>(null);

  // Fetch price data from DexScreener
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
              pairAddress: pair.pairAddress || '',
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
    const interval = setInterval(fetchPrice, 30000);
    return () => clearInterval(interval);
  }, []);

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const initChart = async () => {
      const { createChart, ColorType, CrosshairMode } = await import('lightweight-charts');
      
      if (chartRef.current) {
        chartRef.current.remove();
      }

      const container = chartContainerRef.current!;
      
      const chart = createChart(container, {
        width: container.clientWidth,
        height: container.clientHeight,
        layout: {
          background: { type: ColorType.Solid, color: 'transparent' },
          textColor: 'rgba(255, 255, 255, 0.5)',
        },
        grid: {
          vertLines: { color: 'rgba(255, 255, 255, 0.03)' },
          horzLines: { color: 'rgba(255, 255, 255, 0.03)' },
        },
        crosshair: {
          mode: CrosshairMode.Normal,
          vertLine: {
            color: 'rgba(239, 68, 68, 0.5)',
            labelBackgroundColor: '#ef4444',
          },
          horzLine: {
            color: 'rgba(239, 68, 68, 0.5)',
            labelBackgroundColor: '#ef4444',
          },
        },
        rightPriceScale: {
          borderColor: 'rgba(255, 255, 255, 0.05)',
          scaleMargins: { top: 0.1, bottom: 0.1 },
        },
        timeScale: {
          borderColor: 'rgba(255, 255, 255, 0.05)',
          timeVisible: true,
          secondsVisible: false,
        },
        handleScale: { mouseWheel: true, pinch: true },
        handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false },
      });

      const candlestickSeries = chart.addCandlestickSeries({
        upColor: '#ffffff',
        downColor: '#ef4444',
        borderUpColor: '#ffffff',
        borderDownColor: '#ef4444',
        wickUpColor: '#ffffff',
        wickDownColor: '#ef4444',
      });

      chartRef.current = chart;
      seriesRef.current = candlestickSeries;

      const handleResize = () => {
        if (chartContainerRef.current && chartRef.current) {
          chartRef.current.applyOptions({
            width: chartContainerRef.current.clientWidth,
            height: chartContainerRef.current.clientHeight,
          });
        }
      };

      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    };

    initChart();

    return () => {
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, []);

  // Fetch real OHLCV data from GeckoTerminal
  useEffect(() => {
    if (!seriesRef.current || !priceData?.pairAddress) return;

    const fetchOHLCV = async () => {
      try {
        let url = '';
        
        switch (timeframe) {
          case '1h':
            url = `https://api.geckoterminal.com/api/v2/networks/base/pools/${priceData.pairAddress}/ohlcv/minute?aggregate=1&limit=60`;
            break;
          case '24h':
            url = `https://api.geckoterminal.com/api/v2/networks/base/pools/${priceData.pairAddress}/ohlcv/minute?aggregate=15&limit=96`;
            break;
          case '7d':
            url = `https://api.geckoterminal.com/api/v2/networks/base/pools/${priceData.pairAddress}/ohlcv/hour?aggregate=1&limit=168`;
            break;
        }
        
        const res = await fetch(url, {
          headers: { 'Accept': 'application/json' }
        });
        
        if (res.ok) {
          const data = await res.json();
          
          if (data.data?.attributes?.ohlcv_list && data.data.attributes.ohlcv_list.length > 0) {
            const ohlcvData = data.data.attributes.ohlcv_list
              .map((candle: number[]) => ({
                time: candle[0] as any,
                open: candle[1] * MULTIPLIER,
                high: candle[2] * MULTIPLIER,
                low: candle[3] * MULTIPLIER,
                close: candle[4] * MULTIPLIER,
              }))
              .sort((a: any, b: any) => a.time - b.time);

            seriesRef.current.setData(ohlcvData);
            chartRef.current?.timeScale().fitContent();
          }
        }
      } catch (err) {
        console.error('Failed to fetch OHLCV:', err);
      }
    };

    fetchOHLCV();
  }, [timeframe, priceData?.pairAddress]);

  const handleBuyClick = async () => {
    playClick();
    triggerHaptic('medium');
    try {
      const { sdk } = await import('@farcaster/miniapp-sdk');
      await sdk.actions.viewToken({ token: `eip155:8453/erc20:${TOKEN.address}` });
    } catch (err) {
      console.error('View token failed:', err);
      window.open(DEXSCREENER.tokenUrl, '_blank');
    }
  };

  const handleTimeframeClick = (tf: string) => {
    playClick();
    triggerHaptic('light');
    setTimeframe(tf);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `$${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `$${(num / 1000).toFixed(2)}K`;
    return `$${num.toFixed(2)}`;
  };

  const getValue100000 = () => {
    if (!priceData) return '$0.000';
    const price = parseFloat(priceData.priceUsd);
    const value = price * MULTIPLIER;
    return `$${value.toFixed(3)}`;
  };

  const isPositive = priceData ? priceData.priceChange24h >= 0 : true;

  const timeframes = [
    { id: '1h', label: '1H' },
    { id: '24h', label: '24H' },
    { id: '7d', label: '7D' },
  ];

  return (
    <div className="flex flex-col h-full p-4 pt-16 gap-3 overflow-y-auto scrollbar-hide">
      {/* Price Header */}
      <div className="relative bg-white/[0.03] border border-white/[0.08] rounded-2xl p-4 overflow-hidden animate-fade-in">
        <div className="absolute inset-0 opacity-[0.03]" 
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
            backgroundSize: '20px 20px',
          }}
        />
        <div className="relative">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-white/40 uppercase tracking-wider">100,000 ${TOKEN.symbol}</span>
            <span className="text-[10px] text-white/40 uppercase tracking-wider">24h Change</span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="font-bold text-2xl text-white">
              {loading ? (
                <span className="inline-block w-24 h-8 bg-white/5 rounded animate-pulse" />
              ) : getValue100000()}
            </span>
            {priceData && (
              <div className={`flex items-center gap-1 px-3 py-1.5 rounded-lg ${
                isPositive ? 'bg-white/10' : 'bg-red-500/20'
              }`}>
                <svg className={`w-3 h-3 ${isPositive ? 'text-white rotate-0' : 'text-red-400 rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                  <path d="M5 15l7-7 7 7" />
                </svg>
                <span className={`text-sm font-bold ${isPositive ? 'text-white' : 'text-red-400'}`}>
                  {Math.abs(priceData.priceChange24h).toFixed(2)}%
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Timeframe Selector + Buy Button */}
      <div className="flex gap-2 animate-fade-in" style={{ animationDelay: '50ms' }}>
        {timeframes.map((tf) => (
          <button
            key={tf.id}
            onClick={() => handleTimeframeClick(tf.id)}
            className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-95 ${
              timeframe === tf.id
                ? 'bg-white text-black'
                : 'bg-white/[0.03] border border-white/[0.08] text-white/50 hover:bg-white/[0.06]'
            }`}
          >
            {tf.label}
          </button>
        ))}
        <button
          onClick={handleBuyClick}
          className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-lg shadow-red-500/20 transition-all hover:scale-[1.02] active:scale-95"
        >
          Buy
        </button>
      </div>

      {/* Chart */}
      <div className="relative flex-1 bg-white/[0.03] border border-white/[0.08] rounded-2xl overflow-hidden flex flex-col min-h-[200px] animate-fade-in" style={{ animationDelay: '100ms' }}>
        <div className="absolute inset-0 opacity-[0.03]" 
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
            backgroundSize: '20px 20px',
          }}
        />
        <div ref={chartContainerRef} className="relative flex-1 w-full" style={{ minHeight: '200px' }} />
        <div className="relative border-t border-white/[0.05] px-3 py-2">
          <p className="text-[9px] text-white/30 text-center">
            Prices shown for 100,000 ${TOKEN.symbol}
          </p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Volume 24h', value: priceData ? formatNumber(priceData.volume24h) : '$0', delay: '150ms' },
          { label: 'Liquidity', value: priceData ? formatNumber(priceData.liquidity) : '$0', delay: '200ms' },
          { label: 'Market Cap', value: priceData ? formatNumber(priceData.marketCap) : '$0', delay: '250ms' },
        ].map((stat) => (
          <div 
            key={stat.label}
            className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-3 text-center animate-fade-in"
            style={{ animationDelay: stat.delay }}
          >
            <p className="text-[9px] text-white/40 uppercase tracking-wider mb-1">{stat.label}</p>
            <p className="font-bold text-white text-sm">
              {loading ? (
                <span className="inline-block w-12 h-4 bg-white/5 rounded animate-pulse" />
              ) : stat.value}
            </p>
          </div>
        ))}
      </div>

      <style jsx>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.4s ease-out forwards;
          opacity: 0;
        }
      `}</style>
    </div>
  );
}