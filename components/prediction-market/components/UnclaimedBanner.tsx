'use client';

import { MarketType } from '../types';

interface UnclaimedBannerProps {
  totalUnclaimed: number;
  unclaimedCount: number;
  isEthMarket: boolean;
  onClick: () => void;
}

export function UnclaimedBanner({ totalUnclaimed, unclaimedCount, isEthMarket, onClick }: UnclaimedBannerProps) {
  if (totalUnclaimed <= 0) return null;

  return (
    <button
      onClick={onClick}
      className="bg-gradient-to-r from-white/10 to-white/5 border border-white/20 rounded-xl p-4 hover:from-white/15 hover:to-white/10 transition-all animate-fade-in w-full text-left"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Claim Your Winnings</p>
            <p className="text-xs text-white/50">{unclaimedCount} unclaimed round{unclaimedCount > 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="text-right">
          {isEthMarket ? (
            <>
              <p className="text-lg font-bold text-white">{totalUnclaimed.toFixed(4)}</p>
              <p className="text-[10px] text-white/40">ETH</p>
            </>
          ) : (
            <>
              <p className="text-lg font-bold text-white">{totalUnclaimed.toFixed(1)}M</p>
              <p className="text-[10px] text-white/40">BYEMONEY</p>
            </>
          )}
        </div>
      </div>
    </button>
  );
}
