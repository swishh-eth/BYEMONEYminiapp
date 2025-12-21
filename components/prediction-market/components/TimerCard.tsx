'use client';

import { useState } from 'react';
import { TimeLeft } from '../types';

interface TimerCardProps {
  timeLeft: TimeLeft;
  isLocked: boolean;
  hasMarket: boolean;
  isResolved: boolean;
  isCancelled: boolean;
  onOpenInfo: () => void;
  className?: string;
}

export function TimerCard({
  timeLeft,
  isLocked,
  hasMarket,
  isResolved,
  isCancelled,
  onOpenInfo,
  className = '',
}: TimerCardProps) {
  const [showBetaPopup, setShowBetaPopup] = useState(false);

  const handleShare = () => {
    setShowBetaPopup(true);
    setTimeout(() => setShowBetaPopup(false), 2500);
  };

  if (!hasMarket || isResolved || isCancelled) {
    return (
      <div className={`flex gap-3 ${className}`}>
        {/* Timer tile */}
        <div className="flex-1 bg-white/[0.03] border border-white/[0.08] rounded-xl p-3">
          <p className="text-[10px] text-white/40 uppercase tracking-wider">
            {isResolved ? 'Round Ended' : isCancelled ? 'Round Cancelled' : 'No Active Round'}
          </p>
        </div>
        {/* Buttons tile */}
        <ActionButtons onOpenInfo={onOpenInfo} onShare={handleShare} />
        {/* Beta Popup */}
        <BetaPopup show={showBetaPopup} />
      </div>
    );
  }

  // Check if timer is at 0 (resolving state)
  const isResolving = timeLeft.hours === 0 && timeLeft.minutes === 0 && timeLeft.seconds === 0;

  return (
    <>
      <div className={`flex gap-3 ${className}`}>
        {/* Timer tile */}
        <div className="flex-1 bg-white/[0.03] border border-white/[0.08] rounded-xl p-3">
          {isResolving ? (
            <>
              <div className="flex items-center gap-1.5 mb-1">
                <div className="w-3 h-3 border border-white/20 border-t-white/60 rounded-full animate-spin" />
                <p className="text-[10px] uppercase tracking-wider text-white/40">
                  Resolving
                </p>
              </div>
              <p className="text-xl font-bold text-white/50">
                Please wait...
              </p>
            </>
          ) : (
            <>
              <div className="flex items-center gap-1.5 mb-1">
                {isLocked && (
                  <svg className="w-3 h-3 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                )}
                <p className="text-[10px] uppercase tracking-wider text-white/40">
                  {isLocked ? 'Locked' : 'Ends In'}
                </p>
              </div>
              <p className="text-xl font-bold">
                {timeLeft.hours}h {timeLeft.minutes}m {timeLeft.seconds}s
              </p>
            </>
          )}
        </div>
        {/* Buttons tile */}
        <ActionButtons onOpenInfo={onOpenInfo} onShare={handleShare} />
      </div>
      {/* Beta Popup */}
      <BetaPopup show={showBetaPopup} />
    </>
  );
}

function ActionButtons({ onOpenInfo, onShare }: { onOpenInfo: () => void; onShare: () => void }) {
  return (
    <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-2 flex items-center gap-2">
      {/* Share button */}
      <button
        onClick={(e) => { e.stopPropagation(); onShare(); }}
        className="w-10 h-10 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all active:scale-95"
      >
        <svg className="w-4 h-4 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
          <polyline points="16 6 12 2 8 6" />
          <line x1="12" y1="2" x2="12" y2="15" />
        </svg>
      </button>
      {/* Info button */}
      <button
        onClick={(e) => { e.stopPropagation(); onOpenInfo(); }}
        className="w-10 h-10 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all active:scale-95"
      >
        <svg className="w-4 h-4 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <circle cx="12" cy="8" r="0.5" fill="currentColor" />
        </svg>
      </button>
    </div>
  );
}

function BetaPopup({ show }: { show: boolean }) {
  return (
    <div 
      className={`fixed inset-0 z-50 flex items-start justify-center pt-20 transition-all duration-300 ${
        show ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
    >
      {/* Backdrop */}
      <div className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
        show ? 'opacity-100' : 'opacity-0'
      }`} />
      
      {/* Popup */}
      <div className={`relative bg-black/90 border border-white/10 rounded-xl px-5 py-4 shadow-xl transition-all duration-300 ${
        show ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-4 scale-95'
      }`}>
        <p className="text-sm text-white/70 text-center">
          BYEMONEY Predictions is still in beta
        </p>
      </div>
    </div>
  );
}