'use client';

import { TOKEN, SOCIALS } from '@/lib/constants';
import { useState } from 'react';

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
      {/* Hero Card */}
      <div className="bg-black border border-white/10 rounded-xl p-5 text-center">
        <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-red-500 flex items-center justify-center">
          <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
        </div>
        <h2 className="font-bold text-2xl text-red-500">
          ${TOKEN.symbol}
        </h2>
        <p className="text-white/50 text-sm mt-1">
          Say Goodbye to Your Money
        </p>
      </div>
      
      {/* Contract Address */}
      <div className="bg-black border border-white/10 rounded-xl p-3">
        <p className="text-[10px] text-white/40 mb-2">Contract Address</p>
        <div className="flex items-center gap-2">
          <code className="flex-1 text-[11px] text-white/70 bg-white/5 rounded-lg p-2.5 font-mono overflow-hidden text-ellipsis">
            {TOKEN.address}
          </code>
          <button
            onClick={copyAddress}
            className={`px-3 py-2.5 rounded-lg font-medium text-xs transition-all duration-200 ${
              copied 
                ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                : 'bg-red-500/20 text-red-500 border border-red-500/30 hover:bg-red-500/30'
            }`}
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>
      
      {/* Token Info Grid */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-black border border-white/10 rounded-xl p-3">
          <p className="text-[10px] text-white/40 mb-1">Network</p>
          <p className="font-semibold text-white text-sm flex items-center gap-2">
            <span className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center text-[8px]">B</span>
            Base
          </p>
        </div>
        
        <div className="bg-black border border-white/10 rounded-xl p-3">
          <p className="text-[10px] text-white/40 mb-1">Chain ID</p>
          <p className="font-semibold text-white text-sm">{TOKEN.chainId}</p>
        </div>
        
        <div className="bg-black border border-white/10 rounded-xl p-3">
          <p className="text-[10px] text-white/40 mb-1">Decimals</p>
          <p className="font-semibold text-white text-sm">{TOKEN.decimals}</p>
        </div>
        
        <div className="bg-black border border-white/10 rounded-xl p-3">
          <p className="text-[10px] text-white/40 mb-1">Type</p>
          <p className="font-semibold text-white text-sm">ERC-20</p>
        </div>
      </div>
      
      {/* View on Basescan Button */}
      <a
        href={SOCIALS.basescan}
        target="_blank"
        rel="noopener noreferrer"
        className="bg-black border border-white/10 rounded-xl p-3 text-center text-sm text-white/70 hover:text-white hover:border-white/20 transition-colors"
      >
        View on Basescan →
      </a>
      
      {/* Disclaimer */}
      <p className="text-[10px] text-white/30 text-center px-2">
        Always DYOR. Crypto is volatile. Only invest what you can afford to lose.
      </p>
    </div>
  );
}
