'use client';

import { TimeLeft } from '../types';

interface TimerCardProps {
  timeLeft: TimeLeft;
  isLocked: boolean;
  hasMarket: boolean;
  isResolved: boolean;
  isCancelled: boolean;
  onOpenInfo: () => void;
  onOpenHistory: () => void;
}

export function TimerCard({
  timeLeft,
  isLocked,
  hasMarket,
  isResolved,
  isCancelled,
  onOpenInfo,
  onOpenHistory,
}: TimerCardProps) {
  if (!hasMarket || isResolved || isCancelled) {
    return (
      <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-3 animate-fade-in" style={{ animationDelay: '100ms' }}>
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-white/40 uppercase tracking-wider">
            {isResolved ? 'Round Ended' : isCancelled ? 'Round Cancelled' : 'No Active Round'}
          </p>
          <ActionButtons onOpenInfo={onOpenInfo} onOpenHistory={onOpenHistory} />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-3 animate-fade-in" style={{ animationDelay: '100ms' }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
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
        </div>
        <ActionButtons onOpenInfo={onOpenInfo} onOpenHistory={onOpenHistory} />
      </div>
    </div>
  );
}

function ActionButtons({ onOpenInfo, onOpenHistory }: { onOpenInfo: () => void; onOpenHistory: () => void }) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={(e) => { e.stopPropagation(); onOpenInfo(); }}
        className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all active:scale-95"
      >
        <svg className="w-4 h-4 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <circle cx="12" cy="8" r="0.5" fill="currentColor" />
        </svg>
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onOpenHistory(); }}
        className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all active:scale-95"
      >
        <svg className="w-4 h-4 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>
    </div>
  );
}
