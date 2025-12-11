'use client';

import { TOKEN, SOCIALS, DEXSCREENER } from '@/lib/constants';
import { useState, useEffect, useRef } from 'react';

const links = [
  { id: 'dexscreener', name: 'DexScreener', url: DEXSCREENER.tokenUrl },
  { id: 'basescan', name: 'Basescan', url: SOCIALS.basescan },
  { id: 'farcaster', name: 'Farcaster', url: SOCIALS.farcaster, inApp: true },
  { id: 'telegram', name: 'Telegram', url: SOCIALS.telegram },
];

export default function InfoPage() {
  const [copied, setCopied] = useState(false);
  const [sdk, setSdk] = useState(null);
  const [muted, setMuted] = useState(true);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const videoRef = useRef(null);
  
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

  useEffect(function() {
    if (videoRef.current) {
      videoRef.current.volume = 0.3;
    }
  }, [videoLoaded]);
  
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

  async function handleBuyClick() {
    if (sdk) {
      try {
        await sdk.actions.viewToken({
          token: {
            address: TOKEN.address,
            chainId: 'eip155:8453',
          },
        });
      } catch (err) {
        console.error('View token failed:', err);
        window.open("https://app.uniswap.org/swap?outputCurrency=" + TOKEN.address + "&chain=base", '_blank');
      }
    } else {
      window.open("https://app.uniswap.org/swap?outputCurrency=" + TOKEN.address + "&chain=base", '_blank');
    }
  }

  function toggleMute() {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setMuted(!muted);
    }
  }

  function handleVideoLoaded() {
    setVideoLoaded(true);
  }

  var copyBtnClass = copied 
    ? "px-3 py-2 rounded-lg font-medium text-xs bg-white/20 text-white"
    : "px-3 py-2 rounded-lg font-medium text-xs bg-red-500/20 text-red-500";

  return (
    <div className="flex flex-col h-full overflow-y-auto p-3 gap-3">
      {/* Video Header */}
      <div className="bg-black border border-white/10 rounded-xl overflow-hidden h-32 relative">
        <video
          ref={videoRef}
          autoPlay
          loop
          muted={muted}
          playsInline
          onCanPlay={handleVideoLoaded}
          className="w-full h-full object-cover transition-opacity duration-700"
          style={{ 
            objectPosition: 'center center',
            opacity: videoLoaded ? 1 : 0
          }}
        >
          <source src="/video.mp4" type="video/mp4" />
        </video>
        
        {/* Mute Toggle Button */}
        <button
          onClick={toggleMute}
          className="absolute bottom-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
        >
          {muted ? (
            <svg className="w-4 h-4 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              <path d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              <path d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728" />
            </svg>
          )}
        </button>
      </div>
      
      {/* Contract Address */}
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
      
      {/* Buy Button */}
      <button 
        onClick={handleBuyClick}
        className="bg-red-500 rounded-xl p-3 text-center font-bold text-white text-sm"
      >
        Buy $BYEMONEY
      </button>
      
      {/* Disclaimer */}
      <p className="text-[9px] text-white/30 text-center">
        DYOR. Crypto is volatile. Only invest what you can afford to lose.
      </p>
    </div>
  );
}