'use client';

import { TOKEN, SOCIALS, DEXSCREENER } from '@/lib/constants';
import { useState } from 'react';

const links = [
  { id: 'dexscreener', name: 'DexScreener', url: DEXSCREENER.tokenUrl },
  { id: 'basescan', name: 'Basescan', url: SOCIALS.basescan },
  { id: 'twitter', name: 'Twitter', url: SOCIALS.twitter },
  { id: 'telegram', name: 'Telegram', url: SOCIALS.telegram },
];

export default function InfoPage() {
  const [copied, setCopied] = useState(false);
  
  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(TOKEN.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto p-3 gap-3">
      {/* Token Header */}
      <div className="bg-black border border-white/10 rounded-xl p-4 text-center">
        <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-red-500 flex items-center justify-center">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
        </div>
        <h2 className="font-bold text-xl text-red-500">${TOKEN.symbol}</h2>
        <p className="text-white/50 text-xs mt-1">Say Goodbye to Your Money</p>
      </div>
      
      {/* Contract Address */}
      <div className="bg-black border border-white/10 rounded-xl p-3">
        <p className="text-[10px] text-white/40 mb-2">Contract Address</p>
        <div className="flex items-center gap-2">
          <code className="flex-1 text-[10px] text-white/70 bg-white/5 rounded-lg p-2 font-mono truncate">
            {TOKEN.address}
          </code>
          <button
            onClick={copyAddress}
            className={`px-3 py-2 rounded-lg font-medium text-xs transition-all ${
              copied 
                ? 'bg-green-500/20 text-green-400' 
                : 'bg-red-500/20 text-red-500 hover:bg-red-500/30'
            }`}
          >
            {copied ? '✓' : 'Copy'}
          </button>
        </div>
      </div>
      
      {/* Token Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-black border border-white/10 rounded-xl p-2.5 text-center">
          <p className="text-[9px] text-white/40">Chain</p>
          <p className="font-semibold text-white text-xs mt-0.5">Base</p>
        </div>
        <div className="bg-black border border-white/10 rounded-xl p-2.5 text-center">
          <p className="text-[9px] text-white/40">ID</p>
          <p className="font-semibold text-white text-xs mt-0.5">{TOKEN.chainId}</p>
        </div>
        <div className="bg-black border border-white/10 rounded-xl p-2.5 text-center">
          <p className="text-[9px] text-white/40">Type</p>
          <p className="font-semibold text-white text-xs mt-0.5">ERC-20</p>
        </div>
      </div>
      
      {/* Links */}
      <div className="bg-black border border-white/10 rounded-xl p-3">
        <p className="text-[10px] text-white/40 mb-2">Links</p>
        <div className="grid grid-cols-2 gap-2">
          {links.map((link) => (
            <a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white/5 hover:bg-white/10 rounded-lg p-2.5 text-center text-xs text-white/70 hover:text-white transition-colors"
            >
              {link.name}
            </a>
          ))}
        </div>
      </div>
      
      {/* Buy Button */}
      <a
        href={`https://app.uniswap.org/swap?outputCurrency=${TOKEN.address}&chain=base`}
        target="_blank"
        rel="noopener noreferrer"
        className="bg-red-500 hover:bg-red-600 rounded-xl p-3 text-center font-bold text-white text-sm transition-colors"
      >
        Buy ${TOKEN.symbol}
      </a>
      
      {/* Disclaimer */}
      <p className="text-[9px] text-white/30 text-center">
        DYOR. Crypto is volatile. Only invest what you can afford to lose.
      </p>
    </div>
  );
}
