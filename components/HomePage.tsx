'use client';

import { TOKEN, DEXSCREENER } from '@/lib/constants';
import { motion } from 'framer-motion';

export default function HomePage() {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col h-full"
    >
      {/* Chart Section - Takes most of the space */}
      <div className="flex-1 p-4 flex flex-col">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-display font-semibold text-white text-lg">
              Price Chart
            </h2>
            <p className="text-xs text-white/40">Powered by DexScreener</p>
          </div>
          <a
            href={DEXSCREENER.tokenUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-bye-red hover:text-bye-pink transition-colors flex items-center gap-1"
          >
            Full Chart →
          </a>
        </div>
        
        {/* Chart Container */}
        <div className="flex-1 dex-chart-container glass rounded-2xl overflow-hidden min-h-[300px] relative">
          {/* Loading shimmer */}
          <div className="absolute inset-0 bg-bye-gray animate-pulse" />
          
          {/* DexScreener Embed */}
          <iframe
            src={DEXSCREENER.embedUrl}
            className="relative z-10 w-full h-full"
            title="BYEMONEY Price Chart"
            allow="clipboard-write"
            loading="lazy"
          />
        </div>
      </div>
      
      {/* Quick Stats Row */}
      <div className="px-4 pb-4">
        <div className="glass rounded-2xl p-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-xs text-white/40 mb-1">Chain</p>
              <p className="font-display font-semibold text-white">Base</p>
            </div>
            <div className="text-center border-x border-white/10">
              <p className="text-xs text-white/40 mb-1">Token</p>
              <p className="font-display font-semibold text-gradient">${TOKEN.symbol}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-white/40 mb-1">Type</p>
              <p className="font-display font-semibold text-white">ERC-20</p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
