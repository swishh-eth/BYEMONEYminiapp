'use client';

import { TOKEN, SOCIALS, DEXSCREENER } from '@/lib/constants';
import { useState, useEffect, useRef } from 'react';

const links = [
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

  return (
    <div className="flex flex-col h-full p-4 pt-20 overflow-hidden">
      {/* Main content area */}
      <div className="flex-1 flex flex-col gap-3">

        {/* How It Works Tile */}
        <div className="relative bg-white/[0.03] border border-white/[0.08] rounded-2xl overflow-hidden animate-fade-in">
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
            style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
              backgroundSize: '20px 20px',
            }}
          />
          <div className="relative p-4 pb-3">
            {/* Header */}
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1.5 h-1.5 rounded-full bg-white/40" />
              <span className="text-[10px] text-white/40 uppercase tracking-wider">How It Works</span>
            </div>

            {/* Content */}
            <div className="space-y-3">
              {/* Section 1 */}
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-white/70">1</span>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white mb-1">Predict the Price</h3>
                  <p className="text-xs text-white/50 leading-relaxed">
                    Will ETH or BYEMONEY go <span className="text-white font-medium">PUMP</span> or <span className="text-red-400 font-medium">DUMP</span>? Each round lasts 24 hours.
                  </p>
                </div>
              </div>

              {/* Section 2 */}
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-white/70">2</span>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white mb-1">Place Your Bet</h3>
                  <p className="text-xs text-white/50 leading-relaxed">
                    Buy tickets: <span className="text-white font-medium">0.001 ETH</span> or <span className="text-white font-medium">1M BYEMONEY</span> each. More tickets = bigger share of the pool.
                  </p>
                </div>
              </div>

              {/* Section 3 */}
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-white/70">3</span>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white mb-1">Win & Collect</h3>
                  <p className="text-xs text-white/50 leading-relaxed">
                    Winners split the losing pool (5% fee). Tap <span className="text-white font-medium">Claim</span> to collect your winnings!
                  </p>
                </div>
              </div>

              {/* Section 4 - Round timing */}
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white mb-1">Round Schedule</h3>
                  <p className="text-xs text-white/50 leading-relaxed">
                    Rounds reset daily at <span className="text-white font-medium">9 PM EST</span>. Betting locks <span className="text-white font-medium">1 hour</span> before each round ends.
                  </p>
                </div>
              </div>

              {/* Section 5 - Fee breakdown */}
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-white/70">?</span>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white mb-1">Fee Breakdown</h3>
                  <p className="text-xs text-white/50 leading-relaxed">
                    2.5% seeds the next round, 2% burns <span className="text-white font-medium">$BYEMONEY</span> forever, 0.5% goes to <span className="text-white font-medium">Daily Claims</span>.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-3 gap-3 animate-fade-in" style={{ animationDelay: '50ms' }}>
          {links.map((link) => (
            <button
              key={link.id}
              onClick={() => handleLinkClick(link)}
              className="relative flex flex-col items-center justify-center gap-2 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] hover:border-white/[0.15] rounded-xl py-4 text-white/40 hover:text-white/70 transition-all active:scale-95 overflow-hidden"
            >
              <div className="absolute inset-0 opacity-[0.03]" 
                style={{
                  backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
                  backgroundSize: '20px 20px',
                }}
              />
              <div className="relative flex flex-col items-center gap-2">
                <LinkIcon type={link.icon} />
                <span className="text-[11px] font-medium">{link.name}</span>
              </div>
            </button>
          ))}
        </div>
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