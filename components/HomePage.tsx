'use client';

import { TOKEN, DEXSCREENER } from '@/lib/constants';

export default function HomePage() {
  return (
    <div className="flex flex-col h-full p-3 gap-3">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-white text-sm">Price Chart</h2>
          <p className="text-[10px] text-white/40">Powered by DexScreener</p>
        </div>
        <a
          href={DEXSCREENER.tokenUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] text-red-500 hover:text-red-400 transition-colors"
        >
          Full Chart →
        </a>
      </div>
      
      {/* Chart Container */}
      <div className="flex-1 rounded-xl overflow-hidden bg-black border border-white/10 min-h-0">
        <iframe
          src={DEXSCREENER.embedUrl}
          className="w-full h-full"
          title="BYEMONEY Price Chart"
          allow="clipboard-write"
          loading="lazy"
        />
      </div>
      
      {/* Quick Stats Row */}
      <div className="bg-black border border-white/10 rounded-xl p-3">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-[10px] text-white/40 mb-0.5">Chain</p>
            <p className="font-semibold text-white text-sm">Base</p>
          </div>
          <div className="border-x border-white/10">
            <p className="text-[10px] text-white/40 mb-0.5">Token</p>
            <p className="font-semibold text-red-500 text-sm">${TOKEN.symbol}</p>
          </div>
          <div>
            <p className="text-[10px] text-white/40 mb-0.5">Type</p>
            <p className="font-semibold text-white text-sm">ERC-20</p>
          </div>
        </div>
      </div>
    </div>
  );
}
