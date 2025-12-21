'use client';

import { TOKEN, SOCIALS, DEXSCREENER } from '@/lib/constants';
import { useState, useEffect, useRef } from 'react';

const links = [
  { id: 'dexscreener', name: 'Chart', url: DEXSCREENER.tokenUrl, icon: 'chart' },
  { id: 'basescan', name: 'Contract', url: SOCIALS.basescan, icon: 'scan' },
  { id: 'farcaster', name: 'Farcaster', url: SOCIALS.farcaster, inApp: true, icon: 'cast' },
  { id: 'telegram', name: 'Telegram', url: SOCIALS.telegram, icon: 'send' },
];

// Haptic feedback helper
const triggerHaptic = async (type: 'light' | 'medium' | 'heavy') => {
  try {
    const { sdk } = await import('@farcaster/miniapp-sdk');
    sdk.haptics.impactOccurred(type);
  } catch {}
};

// Click sound helper
const playClick = () => {
  try {
    const audio = new Audio('/click.mp3');
    audio.volume = 0.3;
    audio.play().catch(() => {});
  } catch {}
};

const LinkIcon = ({ type }: { type: string }) => {
  switch (type) {
    case 'chart':
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path d="M3 3v18h18" />
          <path d="M18 17V9M13 17V5M8 17v-3" />
        </svg>
      );
    case 'scan':
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          <path d="M9 12l2 2 4-4" />
        </svg>
      );
    case 'cast':
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98M21 5a2 2 0 11-4 0 2 2 0 014 0zM7 12a2 2 0 11-4 0 2 2 0 014 0zM21 19a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      );
    case 'send':
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
        </svg>
      );
    default:
      return null;
  }
};

export default function InfoPage() {
  const [muted, setMuted] = useState(true);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = 0.3;
    }
  }, [videoLoaded]);

  const handleLinkClick = async (link: typeof links[0]) => {
    playClick();
    triggerHaptic('light');
    if (link.inApp) {
      try {
        const { sdk } = await import('@farcaster/miniapp-sdk');
        await sdk.actions.openUrl({ url: link.url });
      } catch {
        window.open(link.url, '_blank');
      }
    } else {
      window.open(link.url, '_blank');
    }
  };

  const handleBuyClick = async () => {
    playClick();
    triggerHaptic('heavy');
    try {
      const { sdk } = await import('@farcaster/miniapp-sdk');
      await sdk.actions.viewToken({ token: `eip155:8453/erc20:${TOKEN.address}` });
    } catch {
      window.open(DEXSCREENER.tokenUrl, '_blank');
    }
  };

  const toggleMute = () => {
    playClick();
    triggerHaptic('light');
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setMuted(!muted);
    }
  };

  return (
    <div className="flex flex-col h-full p-4 pt-20 overflow-hidden">
      {/* Main content area */}
      <div className="flex-1 flex flex-col gap-3">
        
        {/* Video Card - matches homepage banner exactly */}
        <div className="relative bg-white/[0.03] border border-white/[0.08] rounded-2xl overflow-hidden animate-fade-in" style={{ height: '180px' }}>
          <div className="absolute inset-0 opacity-[0.03]" 
            style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
              backgroundSize: '20px 20px',
            }}
          />
          <video
            ref={videoRef}
            autoPlay
            loop
            muted={muted}
            playsInline
            onCanPlay={() => setVideoLoaded(true)}
            className="absolute inset-0 w-full h-full object-cover"
            style={{ opacity: videoLoaded ? 1 : 0, transition: 'opacity 0.5s' }}
          >
            <source src="/video.mp4" type="video/mp4" />
          </video>
          
          {/* Loading state */}
          {!videoLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/[0.02]">
              <div className="w-8 h-8 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" />
            </div>
          )}
          
          {/* Sound Toggle */}
          <button
            onClick={toggleMute}
            className="absolute bottom-3 right-3 w-9 h-9 bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center transition-all active:scale-90 hover:bg-black/80"
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

        {/* How It Works Tile */}
        <div className="relative bg-white/[0.03] border border-white/[0.08] rounded-2xl overflow-hidden animate-fade-in flex-1" style={{ animationDelay: '50ms' }}>
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
            style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
              backgroundSize: '20px 20px',
            }}
          />
          <div className="relative h-full p-4">
            {/* Header */}
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1.5 h-1.5 rounded-full bg-white/40" />
              <span className="text-[10px] text-white/40 uppercase tracking-wider">How It Works</span>
            </div>

            {/* Content */}
            <div className="space-y-3">
              {/* Section 1 */}
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-white/70">1</span>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white mb-0.5">Predict the Price</h3>
                  <p className="text-[11px] text-white/50 leading-relaxed">
                    Will ETH or BYEMONEY go <span className="text-white">PUMP</span> or <span className="text-red-400">DUMP</span>? Rounds last 24 hours.
                  </p>
                </div>
              </div>

              {/* Section 2 */}
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-white/70">2</span>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white mb-0.5">Place Your Bet</h3>
                  <p className="text-[11px] text-white/50 leading-relaxed">
                    Buy tickets: <span className="text-white">0.001 ETH</span> or <span className="text-white">1M BYEMONEY</span> each.
                  </p>
                </div>
              </div>

              {/* Section 3 */}
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-white/70">3</span>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white mb-0.5">Win & Collect</h3>
                  <p className="text-[11px] text-white/50 leading-relaxed">
                    Winners split the losing pool (5% fee). Tap <span className="text-white">Claim</span> to collect!
                  </p>
                </div>
              </div>

              {/* Section 4 - Fee breakdown */}
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-white/70">?</span>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white mb-0.5">Fee Breakdown</h3>
                  <p className="text-[11px] text-white/50 leading-relaxed">
                    2.5% funds the next round, 2.5% burns <span className="text-white">$BYEMONEY</span> forever.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-4 gap-2 animate-fade-in" style={{ animationDelay: '100ms' }}>
          {links.map((link) => (
            <button
              key={link.id}
              onClick={() => handleLinkClick(link)}
              className="relative flex flex-col items-center justify-center gap-1.5 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] hover:border-white/[0.15] rounded-xl py-3 text-white/40 hover:text-white/70 transition-all active:scale-95 overflow-hidden"
            >
              <div className="absolute inset-0 opacity-[0.03]" 
                style={{
                  backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
                  backgroundSize: '20px 20px',
                }}
              />
              <div className="relative flex flex-col items-center gap-1.5">
                <LinkIcon type={link.icon} />
                <span className="text-[10px] font-medium">{link.name}</span>
              </div>
            </button>
          ))}
        </div>
        
        {/* Buy Button */}
        <button 
          onClick={handleBuyClick}
          className="bg-white rounded-2xl py-4 text-center font-bold text-black transition-all hover:scale-[1.02] active:scale-[0.98] animate-fade-in"
          style={{ animationDelay: '150ms' }}
        >
          GET $BYEMONEY
        </button>
      </div>

      <style jsx>{`
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