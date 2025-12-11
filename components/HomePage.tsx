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

      const chart = createChart(chartContainerRef.current!, {
        layout: {
          background: { type: ColorType.Solid, color: 'transparent' },
          textColor: 'rgba(255, 255, 255, 0.5)',
        },
        grid: {
          vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
          horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
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
          borderColor: 'rgba(255, 255, 255, 0.1)',
          scaleMargins: { top: 0.1, bottom: 0.1 },
        },
        timeScale: {
          borderColor: 'rgba(255, 255, 255, 0.1)',
          timeVisible: true,
          secondsVisible: false,
        },
        handleScale: { mouseWheel: true, pinch: true },
        handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false },
        localization: {
          priceFormatter: (price: number) => '$' + price.toFixed(3),
        },
      });

      const candlestickSeries = chart.addCandlestickSeries({
        upColor: '#ffffff',
        downColor: '#ef4444',
        borderUpColor: '#ffffff',
        borderDownColor: '#ef4444',
        wickUpColor: '#ffffff',
        wickDownColor: '#ef4444',
        priceFormat: {
          type: 'price',
          precision: 3,
          minMove: 0.001,
        },
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
      handleResize();

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
          case '30d':
            url = `https://api.geckoterminal.com/api/v2/networks/base/pools/${priceData.pairAddress}/ohlcv/day?aggregate=1&limit=30`;
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
    { id: '30d', label: '30D' },
  ];

  return (
    <div className="flex flex-col h-full p-3 gap-3">
      {/* Price Header */}
      <div className="bg-black border border-white/10 rounded-xl p-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-white/40">100,000 ${TOKEN.symbol}</span>
          <span className="text-[10px] text-white/40">24h Change</span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="font-bold text-2xl text-white">
            {loading ? '...' : getValue100000()}
          </span>
          {priceData && (
            <span className={`text-lg font-bold ${isPositive ? 'text-white' : 'text-red-500'}`}>
              {isPositive ? '+' : ''}{priceData.priceChange24h.toFixed(2)}%
            </span>
          )}
        </div>
      </div>

      {/* Timeframe Selector */}
      <div className="flex gap-2">
        {timeframes.map((tf) => (
          <button
            key={tf.id}
            onClick={() => setTimeframe(tf.id)}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
              timeframe === tf.id
                ? 'bg-red-500 text-white'
                : 'bg-white/5 text-white/50 hover:bg-white/10'
            }`}
          >
            {tf.label}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="flex-1 bg-black border border-white/10 rounded-xl overflow-hidden min-h-0 flex flex-col">
        <div ref={chartContainerRef} className="flex-1 p-2" />
        <p className="text-[9px] text-white/30 text-center pb-2">
          Prices shown are for 100,000 ${TOKEN.symbol}
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-black border border-white/10 rounded-xl p-3 text-center">
          <p className="text-[9px] text-white/40 mb-1">Volume 24h</p>
          <p className="font-bold text-white text-sm">
            {loading ? '...' : priceData ? formatNumber(priceData.volume24h) : '$0'}
          </p>
        </div>
        <div className="bg-black border border-white/10 rounded-xl p-3 text-center">
          <p className="text-[9px] text-white/40 mb-1">Liquidity</p>
          <p className="font-bold text-white text-sm">
            {loading ? '...' : priceData ? formatNumber(priceData.liquidity) : '$0'}
          </p>
        </div>
        <div className="bg-black border border-white/10 rounded-xl p-3 text-center">
          <p className="text-[9px] text-white/40 mb-1">Market Cap</p>
          <p className="font-bold text-white text-sm">
            {loading ? '...' : priceData ? formatNumber(priceData.marketCap) : '$0'}
          </p>
        </div>
      </div>
    </div>
  );
}