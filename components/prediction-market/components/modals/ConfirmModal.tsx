'use client';

import { Direction, MarketType } from '../../types';

interface ConfirmModalProps {
  isOpen: boolean;
  selectedDirection: Direction | null;
  totalCostDisplay: string;
  tokenSymbol: string;
  dontShowAgain: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onToggleDontShow: () => void;
  marketType?: 'ETH' | 'BYEMONEY';
}

const CONTRACT_ADDRESSES = {
  ETH: '0xf8e98EB6e3A08eD857920b9d8283E731a360B689',
  BYEMONEY: '0x2937B3a1CA66cAe79E7230Efad2F5e801F99ade4',
};

export function ConfirmModal({
  isOpen,
  selectedDirection,
  totalCostDisplay,
  tokenSymbol,
  dontShowAgain,
  onClose,
  onConfirm,
  onToggleDontShow,
  marketType = 'ETH',
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const isUp = selectedDirection === 'up';
  const contractAddress = CONTRACT_ADDRESSES[marketType];
  const shortAddress = `${contractAddress.slice(0, 6)}...${contractAddress.slice(-4)}`;

  const handleContractClick = () => {
    window.open(`https://basescan.org/address/${contractAddress}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative border rounded-2xl p-6 max-w-sm w-full animate-scale-in ${isUp ? 'bg-white border-white/20' : 'bg-red-500 border-red-400/20'}`}>
        <div className="w-14 h-14 rounded-xl overflow-hidden mx-auto mb-4">
          <img
            src={isUp ? '/splash.png' : '/logo.png'}
            alt="BYEMONEY"
            className="w-full h-full object-cover"
          />
        </div>

        <h3 className={`text-lg font-bold text-center mb-2 ${isUp ? 'text-black' : 'text-white'}`}>
          Confirm Your Bet
        </h3>

        <p className={`text-sm text-center mb-4 ${isUp ? 'text-black/60' : 'text-white/80'}`}>
          You&apos;re about to bet{' '}
          <span className={`font-semibold ${isUp ? 'text-black' : 'text-white'}`}>
            {totalCostDisplay} {tokenSymbol}
          </span>{' '}
          on <span className="font-semibold">{isUp ? 'PUMP' : 'DUMP'}</span>
        </p>

        {/* Fee Breakdown */}
        <div className={`rounded-xl p-3 mb-3 ${isUp ? 'bg-black/5' : 'bg-black/20'}`}>
          <p className={`text-xs font-medium mb-2 ${isUp ? 'text-black/70' : 'text-white/90'}`}>
            Fee Breakdown (5% total)
          </p>
          <div className={`space-y-1 text-xs ${isUp ? 'text-black/50' : 'text-white/70'}`}>
            <div className="flex justify-between">
              <span>Next round seed</span>
              <span>2.5%</span>
            </div>
            <div className="flex justify-between">
              <span>$BYEMONEY burn</span>
              <span>2.0%</span>
            </div>
            <div className="flex justify-between">
              <span>Daily claim rewards</span>
              <span>0.5%</span>
            </div>
          </div>
        </div>

        {/* Contract Link */}
        <button
          onClick={handleContractClick}
          className={`w-full rounded-xl p-2.5 mb-3 flex items-center justify-center gap-2 transition-all active:scale-95 ${
            isUp ? 'bg-black/5 hover:bg-black/10' : 'bg-black/20 hover:bg-black/30'
          }`}
        >
          <svg className={`w-4 h-4 ${isUp ? 'text-black/50' : 'text-white/70'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            <path d="M9 12l2 2 4-4" />
          </svg>
          <span className={`text-xs ${isUp ? 'text-black/50' : 'text-white/70'}`}>
            View Contract: {shortAddress}
          </span>
          <svg className={`w-3 h-3 ${isUp ? 'text-black/40' : 'text-white/50'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </button>

        {/* Disclaimer */}
        <div className={`rounded-xl p-3 mb-4 ${isUp ? 'bg-black/5' : 'bg-black/20'}`}>
          <p className={`text-xs text-center ${isUp ? 'text-black/50' : 'text-white/70'}`}>
            All sales are final. Bets cannot be refunded or reversed once placed. Only bet what you can afford to lose.
          </p>
        </div>

        <label className="flex items-center gap-3 mb-4 cursor-pointer">
          <div
            onClick={onToggleDontShow}
            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
              dontShowAgain
                ? isUp ? 'bg-black border-black' : 'bg-white border-white'
                : isUp ? 'border-black/30' : 'border-white/30'
            }`}
          >
            {dontShowAgain && (
              <svg className={`w-3 h-3 ${isUp ? 'text-white' : 'text-red-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                <path d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
          <span className={`text-xs ${isUp ? 'text-black/50' : 'text-white/70'}`}>
            Don&apos;t show this again
          </span>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onClose}
            className={`py-3 rounded-xl font-semibold text-sm transition-all active:scale-95 ${
              isUp
                ? 'bg-black/10 border border-black/20 text-black hover:bg-black/20'
                : 'bg-white/10 border border-white/20 text-white hover:bg-white/20'
            }`}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`py-3 rounded-xl font-semibold text-sm transition-all active:scale-95 ${
              isUp
                ? 'bg-black hover:bg-black/80 text-white'
                : 'bg-white hover:bg-white/90 text-red-500'
            }`}
          >
            Confirm Bet
          </button>
        </div>
      </div>
    </div>
  );
}