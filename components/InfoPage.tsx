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
  const [copied, setCopied] = useState(false);
  const [muted, setMuted] = useState(true);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [helpModalMounted, setHelpModalMounted] = useState(false);
  const [helpModalClosing, setHelpModalClosing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = 0.3;
    }
  }, [videoLoaded]);
  
  const copyAddress = async () => {
    playClick();
    triggerHaptic('medium');
    try {
      await navigator.clipboard.writeText(TOKEN.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

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

  const openHelpModal = () => {
    playClick();
    triggerHaptic('medium');
    setShowHelpModal(true);
    setTimeout(() => setHelpModalMounted(true), 10);
  };

  const closeHelpModal = () => {
    setHelpModalClosing(true);
    setTimeout(() => {
      setShowHelpModal(false);
      setHelpModalMounted(false);
      setHelpModalClosing(false);
    }, 400);
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto scrollbar-hide p-4 pt-20 gap-3">
      {/* Video Card - matches homepage banner height */}
      <div 
        className="relative bg-white/[0.03] border border-white/[0.08] rounded-2xl overflow-hidden animate-fade-in"
        style={{ height: '180px' }}
      >
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
        
        {/* Sound Toggle - Bottom Right */}
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

      {/* Token Info Card */}
      <div className="relative bg-white/[0.03] border border-white/[0.08] rounded-2xl p-4 overflow-hidden animate-fade-in" style={{ animationDelay: '50ms' }}>
        <div className="absolute inset-0 opacity-[0.03]" 
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
            backgroundSize: '20px 20px',
          }}
        />
        <div className="relative">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl overflow-hidden bg-white/5 flex-shrink-0">
            <img src="/byemoney.png" alt="BYEMONEY" className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-white">$BYEMONEY</h2>
            <p className="text-xs text-white/40">Base Network · ERC-20</p>
          </div>
        </div>

        {/* Contract Address */}
        <div className="mb-4">
          <p className="text-[10px] text-white/40 uppercase tracking-wider mb-2">Contract Address</p>
          <button 
            onClick={copyAddress}
            className="w-full flex items-center gap-2 bg-black/30 hover:bg-black/50 border border-white/5 rounded-xl px-3 py-2.5 transition-all active:scale-[0.99] group"
          >
            <code className="flex-1 text-[11px] text-white/50 font-mono truncate text-left group-hover:text-white/70 transition-colors">
              {TOKEN.address}
            </code>
            <div className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-all ${
              copied ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-white/40 group-hover:bg-white/10 group-hover:text-white/60'
            }`}>
              {copied ? (
                <>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-[10px] font-medium">Copied</span>
                </>
              ) : (
                <>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span className="text-[10px] font-medium">Copy</span>
                </>
              )}
            </div>
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-black/20 rounded-xl p-2.5 text-center">
            <p className="text-[9px] text-white/30 uppercase tracking-wider">Chain</p>
            <p className="text-sm font-bold text-white mt-0.5">Base</p>
          </div>
          <div className="bg-black/20 rounded-xl p-2.5 text-center">
            <p className="text-[9px] text-white/30 uppercase tracking-wider">Chain ID</p>
            <p className="text-sm font-bold text-white mt-0.5">{TOKEN.chainId}</p>
          </div>
          <div className="bg-black/20 rounded-xl p-2.5 text-center">
            <p className="text-[9px] text-white/30 uppercase tracking-wider">Type</p>
            <p className="text-sm font-bold text-white mt-0.5">ERC-20</p>
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
        className="relative overflow-hidden bg-white rounded-2xl py-4 text-center font-bold text-black transition-all hover:scale-[1.02] active:scale-[0.98] animate-fade-in group"
        style={{ animationDelay: '150ms' }}
      >
        <span className="relative z-10 flex items-center justify-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          GET $BYEMONEY
        </span>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
      </button>

      {/* How It Works Button */}
      <button 
        onClick={openHelpModal}
        className="relative overflow-hidden bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] rounded-2xl py-3.5 text-center font-medium text-white/60 hover:text-white/80 transition-all active:scale-[0.98] animate-fade-in"
        style={{ animationDelay: '175ms' }}
      >
        <span className="flex items-center justify-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          How It Works
        </span>
      </button>

      {/* Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={closeHelpModal}>
          <div className={`absolute inset-0 bg-black/70 backdrop-blur-xl transition-opacity duration-500 ease-out ${helpModalMounted && !helpModalClosing ? 'opacity-100' : 'opacity-0'}`} />
          <div 
            className={`relative w-full max-w-md max-h-[85vh] bg-gradient-to-t from-black via-black/98 to-black/95 rounded-t-3xl pb-8 overflow-hidden transition-all duration-500 ${helpModalMounted && !helpModalClosing ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-full'}`}
            style={{ transitionTimingFunction: helpModalClosing ? 'ease-in' : 'cubic-bezier(0.22, 1, 0.36, 1)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>

            <div className="px-5 overflow-y-auto max-h-[calc(85vh-60px)] scrollbar-hide">
              {/* Header */}
              <div className="text-center mb-6">
                <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                  <svg className="w-7 h-7 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-white">How It Works</h2>
                <p className="text-sm text-white/40 mt-1">Learn how to play predictions</p>
              </div>

              {/* Sections */}
              <div className="space-y-4">
                {/* Section 1: The Game */}
                <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-white">1</span>
                    </div>
                    <h3 className="font-semibold text-white">The Game</h3>
                  </div>
                  <p className="text-sm text-white/60 leading-relaxed">
                    Predict whether ETH or BYEMONEY price will go <span className="text-white font-medium">PUMP</span> (up) or <span className="text-red-400 font-medium">DUMP</span> (down) by the end of each round. Rounds last 24 hours and reset daily.
                  </p>
                </div>

                {/* Section 2: Placing Bets */}
                <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-white">2</span>
                    </div>
                    <h3 className="font-semibold text-white">Placing Bets</h3>
                  </div>
                  <p className="text-sm text-white/60 leading-relaxed">
                    Buy tickets to bet on your prediction. ETH market uses <span className="text-white font-medium">0.001 ETH</span> per ticket. BYEMONEY market uses <span className="text-white font-medium">1M BYEMONEY</span> per ticket. You can bet on both directions in the same round!
                  </p>
                </div>

                {/* Section 3: Winning */}
                <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-white">3</span>
                    </div>
                    <h3 className="font-semibold text-white">Winning & Payouts</h3>
                  </div>
                  <p className="text-sm text-white/60 leading-relaxed">
                    If you're right, you win a share of the losing pool! Your payout depends on how many tickets you have vs. other winners. A <span className="text-white font-medium">5% fee</span> is taken from the pool.
                  </p>
                </div>

                {/* Section 4: Claiming */}
                <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-white">4</span>
                    </div>
                    <h3 className="font-semibold text-white">Claiming Winnings</h3>
                  </div>
                  <p className="text-sm text-white/60 leading-relaxed">
                    After a round ends, tap the <span className="text-white font-medium">Claim button</span> in the top-left of the predictions page. Your winnings will be sent directly to your wallet. Don't forget to claim!
                  </p>
                </div>

                {/* Section 5: Tips */}
                <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <h3 className="font-semibold text-white">Pro Tips</h3>
                  </div>
                  <ul className="text-sm text-white/60 space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="text-white/30 mt-1">•</span>
                      <span>Betting closes 1 hour before round ends</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-white/30 mt-1">•</span>
                      <span>Check the pool ratio - underdog bets pay more!</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-white/30 mt-1">•</span>
                      <span>Tap your profile picture for a surprise 🎉</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-6 text-center">
                <p className="text-[10px] text-white/30 uppercase tracking-wider">Tap anywhere to close</p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Disclaimer */}
      <p className="text-[9px] text-white/20 text-center pb-2 animate-fade-in" style={{ animationDelay: '200ms' }}>
        DYOR · Crypto is volatile · Only invest what you can afford to lose
      </p>

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