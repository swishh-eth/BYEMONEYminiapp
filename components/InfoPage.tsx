'use client';

import { TOKEN, SOCIALS, DEXSCREENER } from '@/lib/constants';
import { useState, useEffect, useRef } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';

const links = [
  { id: 'dexscreener', name: 'DexScreener', url: DEXSCREENER.tokenUrl, icon: 'chart' },
  { id: 'basescan', name: 'Basescan', url: SOCIALS.basescan, icon: 'scan' },
  { id: 'farcaster', name: 'Farcaster', url: SOCIALS.farcaster, inApp: true, icon: 'cast' },
  { id: 'telegram', name: 'Telegram', url: SOCIALS.telegram, icon: 'send' },
];

const LinkIcon = ({ type }: { type: string }) => {
  switch (type) {
    case 'chart':
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path d="M3 3v18h18" />
          <path d="M18 17V9M13 17V5M8 17v-3" />
        </svg>
      );
    case 'scan':
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          <path d="M9 12l2 2 4-4" />
        </svg>
      );
    case 'cast':
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98M21 5a2 2 0 11-4 0 2 2 0 014 0zM7 12a2 2 0 11-4 0 2 2 0 014 0zM21 19a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      );
    case 'send':
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
        </svg>
      );
    default:
      return null;
  }
};

export default function InfoPage() {
  const [copied, setCopied] = useState(false);
  const [muted, setMuted] = useState(true);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = 0.3;
    }
  }, [videoLoaded]);
  
  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(TOKEN.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleLinkClick = async (link: typeof links[0]) => {
    if (link.inApp) {
      try {
        await sdk.actions.openUrl({ url: link.url });
      } catch (err) {
        window.open(link.url, '_blank');
      }
    } else {
      window.open(link.url, '_blank');
    }
  };

  const handleBuyClick = async () => {
    try {
      await sdk.actions.viewToken({ token: `eip155:8453/erc20:${TOKEN.address}` });
    } catch (err) {
      console.error('View token failed:', err);
      window.open(DEXSCREENER.tokenUrl, '_blank');
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setMuted(!muted);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto scrollbar-hide p-4 gap-3">
      {/* Video Header */}
      <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl overflow-hidden aspect-video relative">
        <video
          ref={videoRef}
          autoPlay
          loop
          muted={muted}
          playsInline
          onCanPlay={() => setVideoLoaded(true)}
          className="w-full h-full object-cover transition-opacity duration-500"
          style={{ opacity: videoLoaded ? 1 : 0 }}
        >
          <source src="/video.mp4" type="video/mp4" />
        </video>
        
        {/* Loading state */}
        {!videoLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/5">
            <div className="w-8 h-8 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
          </div>
        )}
        
        {/* Mute Toggle */}
        <button
          onClick={toggleMute}
          className="absolute bottom-3 right-3 p-2 bg-black/60 hover:bg-black/80 rounded-full transition-all backdrop-blur-sm"
        >
          {muted ? (
            <svg className="w-4 h-4 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              <path d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              <path d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728" />
            </svg>
          )}
        </button>
      </div>
      
      {/* Contract Address */}
      <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-4">
        <p className="text-[10px] text-white/40 uppercase tracking-wider mb-3">Contract Address</p>
        <div className="flex items-center gap-2">
          <code className="flex-1 text-xs text-white/60 bg-white/5 rounded-xl px-3 py-2.5 font-mono truncate border border-white/5">
            {TOKEN.address}
          </code>
          <button 
            onClick={copyAddress} 
            className={`px-4 py-2.5 rounded-xl font-medium text-xs transition-all ${
              copied 
                ? 'bg-white/20 text-white' 
                : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
            }`}
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>
      
      {/* Token Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-3 text-center">
          <p className="text-[9px] text-white/40 uppercase tracking-wider">Chain</p>
          <p className="font-bold text-white text-sm mt-1">Base</p>
        </div>
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-3 text-center">
          <p className="text-[9px] text-white/40 uppercase tracking-wider">ID</p>
          <p className="font-bold text-white text-sm mt-1">{TOKEN.chainId}</p>
        </div>
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-3 text-center">
          <p className="text-[9px] text-white/40 uppercase tracking-wider">Type</p>
          <p className="font-bold text-white text-sm mt-1">ERC-20</p>
        </div>
      </div>
      
      {/* Links */}
      <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-4">
        <p className="text-[10px] text-white/40 uppercase tracking-wider mb-3">Links</p>
        <div className="grid grid-cols-2 gap-2">
          {links.map((link) => (
            <button
              key={link.id}
              onClick={() => handleLinkClick(link)}
              className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 rounded-xl py-3 text-sm text-white/70 hover:text-white transition-all"
            >
              <LinkIcon type={link.icon} />
              <span>{link.name}</span>
            </button>
          ))}
        </div>
      </div>
      
      {/* Buy Button */}
      <button 
        onClick={handleBuyClick}
        className="bg-gradient-to-r from-red-500 to-rose-500 rounded-2xl py-4 text-center font-bold text-white shadow-lg shadow-red-500/20 hover:shadow-red-500/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
      >
        Buy $BYEMONEY
      </button>
      
      {/* Disclaimer */}
      <p className="text-[9px] text-white/30 text-center pb-2">
        DYOR. Crypto is volatile. Only invest what you can afford to lose.
      </p>

      <style jsx>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}