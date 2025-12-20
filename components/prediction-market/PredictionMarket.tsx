'use client';

import { useState, useEffect, useRef } from 'react';
import { formatEther } from 'viem';

// Types
import { PredictionMarketProps, MarketType, Direction } from './types';

// Constants
import { 
  AVAILABLE_COINS, 
  BASE_TICKET_PRICE_ETH, 
  BASE_TICKET_PRICE_BYEMONEY,
  LOCK_PERIOD_SECONDS 
} from './constants';

// Hooks
import { useMarketData, useWallet, useUserPosition, useBetting, useUnclaimedMarkets, useSounds } from './hooks';

// Utils
import { calculateByemoneyUsdValue, calculatePoolPercentages } from './utils';

// Components
import { PriceCard, PoolCard, PositionCard, BettingControls, TimerCard, UnclaimedBanner } from './components';
import { CoinSelectorModal, InfoModal, HistoryModal, ConfirmModal } from './components/modals';

// Styles
import { styles } from './styles';

export default function PredictionMarket({
  userFid,
  username,
  initialData,
  onDataUpdate,
  onMarketChange,
  selectedMarket = 'ETH',
}: PredictionMarketProps) {
  // Core state
  const [activeMarket, setActiveMarket] = useState<MarketType>(selectedMarket);
  const [selectedDirection, setSelectedDirection] = useState<Direction | null>(null);
  const [ticketCount, setTicketCount] = useState(1);
  const [showUsdValues, setShowUsdValues] = useState(false);
  const [pageReady, setPageReady] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);
  const [ticketSectionClosing, setTicketSectionClosing] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [hadPosition, setHadPosition] = useState(false);

  // Modal state
  const [showCoinSelector, setShowCoinSelector] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Refs
  const mainContainerRef = useRef<HTMLDivElement>(null);

  // Hooks
  const { walletAddress, ethBalance, byemoneyBalance, sdk, isLoading: walletLoading, connectWallet, refetchBalance } = useWallet();
  const { marketData, marketDataSource, currentPrice, ethPriceUsd, isBettingOpen, isMarketSwitching, timeLeft, refetch: refetchMarket } = useMarketData(activeMarket, initialData);
  const { userPosition, isLoading: positionLoading, refetch: refetchPosition } = useUserPosition(walletAddress, marketData?.id, activeMarket);
  const { unclaimedMarkets, history, totalUnclaimed, refetch: refetchUnclaimed } = useUnclaimedMarkets(walletAddress, activeMarket, marketData?.id);
  const { playClick, playSuccess, triggerHaptic } = useSounds(sdk);

  // Track if user had a position (to show skeleton placeholder during loading)
  useEffect(() => {
    if (userPosition && !positionLoading) {
      const hasPos = Number(userPosition.up) > 0 || Number(userPosition.down) > 0;
      setHadPosition(hasPos);
    }
  }, [userPosition, positionLoading]);

  const handleSuccess = () => {
    playSuccess();
    triggerHaptic('success');
    refetchMarket();
    refetchPosition();
    refetchBalance();
    refetchUnclaimed();
  };

  const { txState, errorMsg, executeBuy, executeClaim, claimingMarketId } = useBetting(walletAddress, activeMarket, sdk, handleSuccess);

  // Load skip modal preference
  useEffect(() => {
    const skipModal = localStorage.getItem('skipBetConfirm') === 'true';
    if (skipModal) setDontShowAgain(true);
  }, []);

  // Set page ready after SDK init and wallet check
  useEffect(() => {
    if (!walletLoading) {
      setPageReady(true);
      // Mark as animated after first render
      setTimeout(() => setHasAnimated(true), 500);
    }
  }, [walletLoading]);

  // Sync with parent's selected market
  useEffect(() => {
    if (selectedMarket !== activeMarket) {
      setActiveMarket(selectedMarket);
      setSelectedDirection(null);
      setTicketCount(1);
    }
  }, [selectedMarket, activeMarket]);

  // Derived state
  const isEthMarket = activeMarket === 'ETH';
  const hasValidMarketData = marketData && marketData.id > 0n && marketDataSource === activeMarket && !isMarketSwitching;
  const upPool = hasValidMarketData ? Number(formatEther(marketData.upPool)) : 0;
  const downPool = hasValidMarketData ? Number(formatEther(marketData.downPool)) : 0;
  const totalPool = upPool + downPool;

  const isResolved = hasValidMarketData && marketData?.status === 1;
  const isCancelled = hasValidMarketData && marketData?.status === 2;
  const winningDirection = marketData?.result ?? 0;
  const hasMarket = hasValidMarketData;

  // Show loading skeleton during market switch or while position is loading
  const showLoading = !pageReady || isMarketSwitching || (walletAddress && positionLoading && hasValidMarketData);

  const userUpTickets = userPosition ? Number(userPosition.up) : 0;
  const userDownTickets = userPosition ? Number(userPosition.down) : 0;
  const userTotalTickets = userUpTickets + userDownTickets;
  const hasClaimed = userPosition?.claimed ?? false;

  const canClaim = isResolved && !hasClaimed && (
    (winningDirection === 1 && userUpTickets > 0) ||
    (winningDirection === 2 && userDownTickets > 0) ||
    (winningDirection === 0 && userTotalTickets > 0)
  );
  const canRefund = isCancelled && !hasClaimed && userTotalTickets > 0;

  const timeRemainingSeconds = timeLeft.hours * 3600 + timeLeft.minutes * 60 + timeLeft.seconds;
  const isLockedByTime = timeRemainingSeconds > 0 && timeRemainingSeconds <= LOCK_PERIOD_SECONDS;
  const isLocked = hasMarket && !isResolved && !isCancelled && (isLockedByTime || !isBettingOpen);

  // Animation class - only animate on first load
  const animClass = hasAnimated ? '' : 'animate-fade-in';

  // Price calculations
  const startPriceUsd = isEthMarket && marketData ? Number(marketData.startPrice) / 1e8 : 0;
  const byemoneyRawPrice = !isEthMarket && currentPrice ? Number(currentPrice) : 0;
  const byemoneyStartPrice = !isEthMarket && marketData ? Number(marketData.startPrice) : 0;
  const byemoney1mValueUsd = calculateByemoneyUsdValue(byemoneyRawPrice, ethPriceUsd);
  const byemoneyStartValueUsd = calculateByemoneyUsdValue(byemoneyStartPrice, ethPriceUsd);

  // Cost calculations
  const totalCostEth = ticketCount * BASE_TICKET_PRICE_ETH;
  const totalCostByemoney = BASE_TICKET_PRICE_BYEMONEY * BigInt(ticketCount);
  const totalCostDisplay = isEthMarket ? totalCostEth.toFixed(3) : `${ticketCount}M`;
  const tokenSymbol = isEthMarket ? 'ETH' : 'BYEMONEY';

  // Event handlers
  const handleDirectionClick = (direction: Direction) => {
    playClick();
    triggerHaptic('light');

    if (selectedDirection === direction) {
      setTicketSectionClosing(true);
      if (mainContainerRef.current) {
        // Scroll to top when closing
        mainContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
      setTimeout(() => {
        setSelectedDirection(null);
        setTicketSectionClosing(false);
      }, 250);
    } else if (selectedDirection && selectedDirection !== direction) {
      setSelectedDirection(direction);
    } else {
      setSelectedDirection(direction);
      setTimeout(() => {
        if (mainContainerRef.current) {
          mainContainerRef.current.scrollTo({ top: mainContainerRef.current.scrollTop + 320, behavior: 'smooth' });
        }
      }, 100);
    }
  };

  const handleBuyClick = () => {
    playClick();
    triggerHaptic('medium');
    if (dontShowAgain) {
      handleExecuteBuy();
    } else {
      setShowConfirmModal(true);
    }
  };

  const handleConfirmBuy = () => {
    playClick();
    if (dontShowAgain) {
      localStorage.setItem('skipBetConfirm', 'true');
    }
    setShowConfirmModal(false);
    handleExecuteBuy();
  };

  const handleExecuteBuy = async () => {
    if (!selectedDirection) return;
    const success = await executeBuy(selectedDirection, ticketCount, userFid, username, marketData?.id);
    if (success) {
      setTimeout(() => {
        setSelectedDirection(null);
        setTicketCount(1);
      }, 2500);
    }
  };

  const handleClaim = async (marketId?: number) => {
    const id = marketId ?? (marketData ? Number(marketData.id) : null);
    if (!id) return;
    const success = await executeClaim(id);
    if (success) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    }
  };

  const handleMarketSelect = (market: MarketType) => {
    setActiveMarket(market);
    onMarketChange?.(market);
  };

  // Update parent with data
  useEffect(() => {
    if (onDataUpdate) {
      const recentWins = history
        .filter((h) => h.winnings > 0 && h.status === 1)
        .slice(0, 5)
        .map((h) => ({
          username: username || 'anon',
          pfp: '',
          amount: h.winnings,
          direction: h.direction,
        }));

      onDataUpdate({
        marketId: marketData ? Number(marketData.id) : 0,
        timeRemaining: timeRemainingSeconds,
        totalPool,
        upPool,
        downPool,
        ethPrice: ethPriceUsd,
        recentWins,
      });
    }
  }, [marketData?.id, timeRemainingSeconds, totalPool, upPool, downPool, ethPriceUsd, history]);

  return (
    <div className="flex flex-col h-full bg-black text-white overflow-hidden">
      {/* Confetti */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                top: '-10px',
                animationDelay: `${Math.random() * 0.5}s`,
                backgroundColor: ['#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6'][Math.floor(Math.random() * 5)],
                width: '8px',
                height: '8px',
                borderRadius: Math.random() > 0.5 ? '50%' : '0',
              }}
            />
          ))}
        </div>
      )}

      {/* Background pattern */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
            backgroundSize: '32px 32px',
          }}
        />
      </div>

      {/* Loading state */}
      {showLoading ? (
        <div className="relative flex flex-col h-full p-4 pt-20 gap-3 overflow-y-auto scrollbar-hide">
          {/* Price Card skeleton */}
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-4 h-[140px] animate-pulse" />
          {/* Timer Card skeleton */}
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-3 h-[52px] animate-pulse" />
          {/* Pool Card skeleton */}
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4 h-[100px] animate-pulse" />
          {/* Position Card skeleton - show if user previously had a position */}
          {hadPosition && (
            <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-3 h-[76px] animate-pulse" />
          )}
          {/* Pump/Dump buttons skeleton */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4 h-[116px] animate-pulse" />
            <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4 h-[116px] animate-pulse" />
          </div>
        </div>
      ) : (
        <div ref={mainContainerRef} className="relative flex flex-col h-full p-4 pt-20 gap-3 overflow-y-auto scrollbar-hide">
          {/* Unclaimed Banner */}
          <UnclaimedBanner
            totalUnclaimed={totalUnclaimed}
            unclaimedCount={unclaimedMarkets.length}
            isEthMarket={isEthMarket}
            onClick={() => { setShowHistory(true); playClick(); triggerHaptic('medium'); }}
          />

          {/* Price Card */}
          <PriceCard
            activeMarket={activeMarket}
            currentPrice={currentPrice}
            ethPriceUsd={ethPriceUsd}
            startPrice={marketData?.startPrice}
            marketDataSource={marketDataSource}
            hasMarket={hasMarket}
            isResolved={isResolved}
            onOpenCoinSelector={() => { setShowCoinSelector(true); playClick(); triggerHaptic('light'); }}
            className={animClass}
          />

          {/* Resolved State */}
          {isResolved && (
            <div className={`flex flex-col items-center justify-center py-6 bg-white/[0.03] border border-white/[0.08] rounded-xl ${animClass}`}>
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${winningDirection === 1 ? 'bg-white/20' : 'bg-red-500/20'} animate-bounce-subtle`}>
                <svg className={`w-7 h-7 ${winningDirection === 1 ? 'text-white' : 'text-red-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path d={winningDirection === 1 ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
                </svg>
              </div>
              <p className="text-white/40 text-sm mt-3">Round Complete</p>
              <p className="text-xl font-bold">
                {isEthMarket ? 'ETH' : 'BYEMONEY'} went{' '}
                <span className={winningDirection === 1 ? 'text-white' : 'text-red-400'}>
                  {winningDirection === 1 ? 'UP' : 'DOWN'}
                </span>
              </p>
            </div>
          )}

          {/* Timer Card */}
          <TimerCard
            timeLeft={timeLeft}
            isLocked={isLocked}
            hasMarket={hasMarket}
            isResolved={isResolved}
            isCancelled={isCancelled}
            onOpenInfo={() => { setShowInfo(true); playClick(); triggerHaptic('light'); }}
            onOpenHistory={() => { setShowHistory(true); playClick(); triggerHaptic('light'); }}
            className={animClass}
          />

          {/* Pool Card */}
          {hasMarket && (
            <PoolCard
              activeMarket={activeMarket}
              upPool={upPool}
              downPool={downPool}
              ethPriceUsd={ethPriceUsd}
              byemoney1mValueUsd={byemoney1mValueUsd}
              showUsdValues={showUsdValues}
              selectedDirection={selectedDirection}
              ticketCount={ticketCount}
              onToggleUsd={() => { setShowUsdValues(!showUsdValues); playClick(); triggerHaptic('light'); }}
              className={animClass}
            />
          )}

          {/* Position Card - no animation to prevent jump */}
          {hasMarket && userPosition && (Number(userPosition.up) > 0 || Number(userPosition.down) > 0) && (
            <PositionCard
              activeMarket={activeMarket}
              userPosition={userPosition}
              upPool={upPool}
              downPool={downPool}
              ethPriceUsd={ethPriceUsd}
              byemoney1mValueUsd={byemoney1mValueUsd}
              showUsdValues={showUsdValues}
              canClaim={canClaim}
              canRefund={canRefund}
              txState={txState}
              onClaim={() => handleClaim()}
            />
          )}

          {/* Betting Section */}
          {!walletAddress ? (
            <button
              onClick={() => { connectWallet(); playClick(); triggerHaptic('light'); }}
              className={`w-full py-4 rounded-xl bg-white/10 border border-white/20 font-semibold hover:bg-white/20 transition-all hover:scale-[1.02] active:scale-[0.98] ${animClass}`}
            >
              Connect Wallet
            </button>
          ) : isLocked ? (
            <div className={`flex flex-col items-center justify-center py-6 bg-white/[0.03] border border-white/[0.08] rounded-xl ${animClass}`}>
              <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                <svg className="w-7 h-7 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <p className="text-white/50 text-sm mt-3">Betting Locked</p>
              <p className="text-white/30 text-xs">{isLockedByTime ? 'Final hour - no new bets' : 'Waiting for resolution'}</p>
            </div>
          ) : (!hasMarket || isResolved || isCancelled) || !isLocked ? (
            <BettingControls
              activeMarket={activeMarket}
              selectedDirection={selectedDirection}
              ticketCount={ticketCount}
              ethBalance={ethBalance}
              byemoneyBalance={byemoneyBalance}
              upPool={upPool}
              downPool={downPool}
              txState={txState}
              errorMsg={errorMsg}
              isNewRound={!hasMarket || isResolved || isCancelled}
              ticketSectionClosing={ticketSectionClosing}
              onDirectionClick={handleDirectionClick}
              onTicketChange={(count) => { setTicketCount(count); playClick(); triggerHaptic('light'); }}
              onBuy={handleBuyClick}
              className={animClass}
            />
          ) : null}

          {/* Footer */}
          <div className="text-center pt-2">
            <p className="text-[9px] text-white/30">
              {username ? `@${username} · ` : ''}{isEthMarket ? `${BASE_TICKET_PRICE_ETH} ETH` : '1M BYEMONEY'}/ticket · 5% fee
            </p>
          </div>
        </div>
      )}

      {/* Modals */}
      <CoinSelectorModal
        isOpen={showCoinSelector}
        activeMarket={activeMarket}
        onClose={() => setShowCoinSelector(false)}
        onSelect={handleMarketSelect}
      />

      <InfoModal
        isOpen={showInfo}
        activeMarket={activeMarket}
        marketId={marketData?.id}
        startPriceUsd={startPriceUsd}
        currentPriceUsd={ethPriceUsd}
        byemoneyStartValueUsd={byemoneyStartValueUsd}
        byemoney1mValueUsd={byemoney1mValueUsd}
        hasMarket={hasMarket}
        onClose={() => setShowInfo(false)}
      />

      <HistoryModal
        isOpen={showHistory}
        activeMarket={activeMarket}
        unclaimedMarkets={unclaimedMarkets}
        history={history}
        totalUnclaimed={totalUnclaimed}
        currentPriceUsd={ethPriceUsd}
        txState={txState}
        claimingMarketId={claimingMarketId}
        onClose={() => setShowHistory(false)}
        onClaim={handleClaim}
      />

      <ConfirmModal
        isOpen={showConfirmModal}
        selectedDirection={selectedDirection}
        totalCostDisplay={totalCostDisplay}
        tokenSymbol={tokenSymbol}
        dontShowAgain={dontShowAgain}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmBuy}
        onToggleDontShow={() => { setDontShowAgain(!dontShowAgain); playClick(); }}
      />

      <style jsx>{styles}</style>
    </div>
  );
}
