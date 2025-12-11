'use client';

import { TOKEN, SOCIALS, DEXSCREENER } from '@/lib/constants';
import { useState, useEffect } from 'react';

const links = [
  { id: 'dexscreener', name: 'DexScreener', url: DEXSCREENER.tokenUrl },
  { id: 'basescan', name: 'Basescan', url: SOCIALS.basescan },
  { id: 'farcaster', name: 'Farcaster', url: SOCIALS.farcaster, inApp: true },
  { id: 'telegram', name: 'Telegram', url: SOCIALS.telegram },
];

export default function InfoPage() {
  const [copied, setCopied] = useState(false);
  const [sdk, setSdk] = useState(null);
  
  useEffect(function() {
    async function loadSdk() {
      try {
        const module = await import('@farcaster/miniapp-sdk');
        setSdk(module.sdk);
      } catch (err) {
        console.log('SDK not available');
      }
    }
    loadSdk();
  }, []);
  
  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(TOKEN.address);
      setCopied(true);
      setTimeout(function() { setCopied(false); }, 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }

  async function handleLinkClick(link) {
    if (link.inApp && sdk) {
      try {
        await sdk.actions.openUrl({ url: 'https://warpcast.com/thosmur' });
      } catch (err) {
        window.open(link.url, '_blank');
      }
    } else {
      window.open(link.url, '_blank');
    }
  }

  var buyUrl = "https://app.uniswap.org/swap?outputCurrency=" + TOKEN.address + "&chain=base";
  var copyBtnClass = copied 
    ? "px-3 py-2 rounded-lg font-medium text-xs bg-green-500/20 text-green-400"
    : "px-3 py-2 rounded-lg font-medium text-xs bg-red-500/20 text-red-500";

  return (
    <div className="flex flex-col h-full overflow-y-auto p-3 gap-3">
      <div className="bg-black border border-white/10 rounded-xl p-4 text-center">
        <h2 className="font-bold text-2xl text-red-500">$BYEMONEY</h2>
        <p className="text-white/50 text-xs mt-1">Say Goodbye to Your Money</p>
      </div>
      
      <div className="bg-black border border-white/10 rounded-xl p-3">
        <p className="text-[10px] text-white/40 mb-2">Contract Address</p>
        <div className="flex items-center gap-2">
          <code className="flex-1 text-[10px] text-white/70 bg-white/5 rounded-lg p-2 font-mono truncate">
            {TOKEN.address}
          </code>
          <button onClick={copyAddress} className={copyBtnClass}>
            {copied ? '✓' : 'Copy'}
          </button>
        </div>
      </div>
      
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
      
      <div className="bg-black border border-white/10 rounded-xl p-3">
        <p className="text-[10px] text-white/40 mb-2">Links</p>
        <div className="grid grid-cols-2 gap-2">
          {links.map(function(link) {
            return (
              <button
                key={link.id}
                onClick={function() { handleLinkClick(link); }}
                className="bg-white/5 hover:bg-white/10 rounded-lg p-2.5 text-center text-xs text-white/70 hover:text-white"
              >
                {link.name}
              </button>
            );
          })}
        </div>
      </div>
      
      <a href={buyUrl} target="_blank" rel="noopener noreferrer" className="bg-red-500 rounded-xl p-3 text-center font-bold text-white text-sm">
        Buy $BYEMONEY
      </a>
      
      <p className="text-[9px] text-white/30 text-center">
        DYOR. Crypto is volatile. Only invest what you can afford to lose.
      </p>
    </div>
  );
}