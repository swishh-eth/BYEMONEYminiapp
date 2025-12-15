'use client';

import { useState, useEffect } from 'react';
import { formatEther, parseEther } from 'viem';
import { useAccount, useWriteContract, useReadContract, useWaitForTransactionReceipt, useBalance } from 'wagmi';
import { base } from 'viem/chains';

// ============ Config ============
// TODO: Update after deploying contract
const CONTRACT_ADDRESS = '0x0625E29C2A71A834482bFc6b4cc012ACeee62DA4' as `0x${string}`;
const TICKET_PRICE_ETH = 0.001;

// ============ Types ============
interface PredictionMarketProps {
  userFid?: number;
  username?: string;
}

// ============ Contract ABI ============
const CONTRACT_ABI = [
  {
    name: 'getCurrentMarket',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      { name: 'id', type: 'uint256' },
      { name: 'startPrice', type: 'uint256' },
      { name: 'endPrice', type: 'uint256' },
      { name: 'startTime', type: 'uint256' },
      { name: 'endTime', type: 'uint256' },
      { name: 'upPool', type: 'uint256' },
      { name: 'downPool', type: 'uint256' },
      { name: 'resolved', type: 'bool' },
      { name: 'winningDirection', type: 'uint8' },
      { name: 'totalTickets', type: 'uint256' },
    ],
  },
  {
    name: 'getUserPosition',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'marketId', type: 'uint256' },
      { name: 'user', type: 'address' },
    ],
    outputs: [
      { name: 'upTickets', type: 'uint256' },
      { name: 'downTickets', type: 'uint256' },
      { name: 'claimed', type: 'bool' },
    ],
  },
  {
    name: 'buyTickets',
    type: 'function',
    stateMutability: 'payable',
    inputs: [{ name: 'direction', type: 'uint8' }],
    outputs: [],
  },
  {
    name: 'claimWinnings',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'marketId', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'getCurrentPrice',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'isBettingOpen',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'getTimeRemaining',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

// ============ Component ============
export default function PredictionMarket({ userFid, username }: PredictionMarketProps) {
  const { address, isConnected } = useAccount();
  const [ticketCount, setTicketCount] = useState(1);
  const [selectedDirection, setSelectedDirection] = useState<'up' | 'down' | null>(null);
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [txState, setTxState] = useState<'idle' | 'buying' | 'claiming' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  // ETH Balance
  const { data: ethBalance } = useBalance({ address, chainId: base.id });

  // ============ Contract Reads ============
  const { data: marketData, refetch: refetchMarket } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getCurrentMarket',
    chainId: base.id,
  });

  const { data: currentPrice, refetch: refetchPrice } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getCurrentPrice',
    chainId: base.id,
  });

  const { data: isBettingOpen } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'isBettingOpen',
    chainId: base.id,
  });

  const { data: userPosition, refetch: refetchPosition } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getUserPosition',
    args: marketData && address ? [marketData[0], address] : undefined,
    query: { enabled: !!marketData && !!address && marketData[0] > 0n },
    chainId: base.id,
  });

  // ============ Contract Writes ============
  const { writeContract: buyTickets, data: buyTxHash, reset: resetBuy, error: buyWriteError } = useWriteContract();
  const { writeContract: claim, data: claimTxHash, reset: resetClaim } = useWriteContract();

  const { isSuccess: buySuccess, isError: buyError } = useWaitForTransactionReceipt({ 
    hash: buyTxHash,
    chainId: base.id,
  });
  const { isSuccess: claimSuccess } = useWaitForTransactionReceipt({ 
    hash: claimTxHash,
    chainId: base.id,
  });

  // ============ Effects ============

  // Handle buy success
  useEffect(() => {
    if (buySuccess) {
      setTxState('success');
      refetchMarket();
      refetchPosition();
      setTimeout(() => {
        setTxState('idle');
        setSelectedDirection(null);
        setTicketCount(1);
        resetBuy();
      }, 2500);
    }
  }, [buySuccess, refetchMarket, refetchPosition, resetBuy]);

  // Handle buy error
  useEffect(() => {
    if (buyError || buyWriteError) {
      setTxState('error');
      setErrorMsg(buyWriteError?.message?.includes('MarketLocked') 
        ? 'Betting is locked' 
        : 'Transaction failed');
      setTimeout(() => {
        setTxState('idle');
        setErrorMsg('');
        resetBuy();
      }, 3000);
    }
  }, [buyError, buyWriteError, resetBuy]);

  // Handle claim success
  useEffect(() => {
    if (claimSuccess) {
      setTxState('success');
      refetchPosition();
      setTimeout(() => {
        setTxState('idle');
        resetClaim();
      }, 2000);
    }
  }, [claimSuccess, refetchPosition, resetClaim]);

  // Countdown timer
  useEffect(() => {
    if (!marketData || marketData[0] === 0n) return;

    const endTime = Number(marketData[4]) * 1000;

    const updateTimer = () => {
      const now = Date.now();
      const diff = Math.max(0, endTime - now);
      
      setTimeLeft({
        hours: Math.floor(diff / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [marketData]);

  // Refresh data periodically
  useEffect(() => {
    const interval = setInterval(() => {
      refetchPrice();
      refetchMarket();
    }, 30000);
    return () => clearInterval(interval);
  }, [refetchPrice, refetchMarket]);

  // ============ Handlers ============
  const handleBuyTickets = async () => {
    if (!address || !selectedDirection) return;

    setTxState('buying');
    const totalCost = parseEther((ticketCount * TICKET_PRICE_ETH).toString());
    
    buyTickets({
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      functionName: 'buyTickets',
      args: [selectedDirection === 'up' ? 1 : 2],
      value: totalCost,
      chainId: base.id,
    });
  };

  const handleClaim = () => {
    if (!marketData) return;
    setTxState('claiming');
    claim({
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      functionName: 'claimWinnings',
      args: [marketData[0]],
      chainId: base.id,
    });
  };

  // ============ Calculations ============
  const upPool = marketData ? Number(formatEther(marketData[5])) : 0;
  const downPool = marketData ? Number(formatEther(marketData[6])) : 0;
  const totalPool = upPool + downPool;
  const upPercent = totalPool > 0 ? (upPool / totalPool) * 100 : 50;
  const downPercent = totalPool > 0 ? (downPool / totalPool) * 100 : 50;

  const houseFee = 0.05;
  const upMultiplier = upPool > 0 ? ((totalPool * (1 - houseFee)) / upPool) : 1.9;
  const downMultiplier = downPool > 0 ? ((totalPool * (1 - houseFee)) / downPool) : 1.9;

  const userUpTickets = userPosition ? Number(userPosition[0]) : 0;
  const userDownTickets = userPosition ? Number(userPosition[1]) : 0;
  const userTotalTickets = userUpTickets + userDownTickets;
  const hasClaimed = userPosition ? userPosition[2] : false;

  const isResolved = marketData ? marketData[7] : false;
  const winningDirection = marketData ? Number(marketData[8]) : 0;
  const hasMarket = marketData && marketData[0] > 0n;

  const canClaim = isResolved && !hasClaimed && (
    (winningDirection === 1 && userUpTickets > 0) ||
    (winningDirection === 2 && userDownTickets > 0)
  );

  const totalCostEth = ticketCount * TICKET_PRICE_ETH;
  const potentialWinnings = selectedDirection === 'up' 
    ? totalCostEth * upMultiplier 
    : selectedDirection === 'down' 
    ? totalCostEth * downMultiplier 
    : 0;

  // Chainlink returns 8 decimals for ETH/USD
  const startPriceRaw = marketData ? Number(marketData[1]) : 0;
  const startPrice = startPriceRaw / 1e8;
  const currentPriceRaw = currentPrice ? Number(currentPrice) : startPriceRaw;
  const displayPrice = currentPriceRaw / 1e8;

  const priceChange = startPrice > 0 ? ((displayPrice - startPrice) / startPrice) * 100 : 0;

  const bettingOpen = isBettingOpen ?? true;
  const isLocked = hasMarket && !isResolved && !bettingOpen;

  // ============ Render ============
  return (
    <div className="flex flex-col h-full bg-[#050505] text-white overflow-hidden font-sans">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 opacity-[0.02]" 
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
            backgroundSize: '32px 32px',
          }}
        />
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-blue-500/5 blur-[150px] rounded-full" />
      </div>

      <div className="relative flex flex-col h-full p-4 gap-3 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-600/20 border border-white/10 flex items-center justify-center">
                <span className="text-xl">◆</span>
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-[#050505]" />
            </div>
            <div>
              <h1 className="text-base font-semibold tracking-tight">ETH Prediction</h1>
              <p className="text-[10px] text-white/40">24h Price Movement · Base</p>
            </div>
          </div>
        </div>

        {/* Price Display */}
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1">ETH/USD</p>
              <p className="text-2xl font-bold tracking-tight">
                ${displayPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            {hasMarket && !isResolved && (
              <div className="text-right">
                <p className="text-[10px] text-white/40 mb-1">Since Start</p>
                <p className={`text-lg font-semibold ${priceChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
                </p>
              </div>
            )}
          </div>
          {hasMarket && (
            <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-white/40">
              <span>Start: ${startPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                Chainlink Oracle
              </span>
            </div>
          )}
        </div>

        {/* Countdown Timer */}
        {hasMarket && !isResolved && (
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <p className="text-[10px] text-white/40 uppercase tracking-wider">
                  {isLocked ? '🔒 Betting Locked' : 'Round Ends'}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <TimeBlock value={timeLeft.hours} label="H" />
                <span className="text-white/20 text-xs">:</span>
                <TimeBlock value={timeLeft.minutes} label="M" />
                <span className="text-white/20 text-xs">:</span>
                <TimeBlock value={timeLeft.seconds} label="S" />
              </div>
            </div>
          </div>
        )}

        {/* Pool Stats */}
        {hasMarket && (
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4">
            <div className="flex justify-between items-center mb-3">
              <p className="text-[10px] text-white/40 uppercase tracking-wider">Pool</p>
              <p className="text-xs">
                <span className="text-white font-semibold">{totalPool.toFixed(3)}</span>
                <span className="text-white/40 ml-1">ETH</span>
              </p>
            </div>

            {/* Pool Bar */}
            <div className="relative h-2.5 bg-white/5 rounded-full overflow-hidden mb-3">
              <div 
                className="absolute left-0 top-0 h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-700 ease-out rounded-l-full"
                style={{ width: `${upPercent}%` }}
              />
              <div 
                className="absolute right-0 top-0 h-full bg-gradient-to-l from-red-500 to-red-400 transition-all duration-700 ease-out rounded-r-full"
                style={{ width: `${downPercent}%` }}
              />
            </div>

            {/* Stats Row */}
            <div className="flex justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path d="M5 15l7-7 7 7" />
                  </svg>
                </div>
                <div>
                  <span className="font-semibold text-emerald-400">{upPercent.toFixed(0)}%</span>
                  <span className="text-white/30 ml-1.5 text-[10px]">{upMultiplier.toFixed(2)}x</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div>
                  <span className="text-white/30 mr-1.5 text-[10px]">{downMultiplier.toFixed(2)}x</span>
                  <span className="font-semibold text-red-400">{downPercent.toFixed(0)}%</span>
                </div>
                <div className="w-6 h-6 rounded-lg bg-red-500/20 flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* User Position */}
        {userTotalTickets > 0 && (
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-white/40 uppercase tracking-wider mb-2">Your Position</p>
                <div className="flex items-center gap-2">
                  {userUpTickets > 0 && (
                    <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-1.5">
                      <svg className="w-3 h-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                        <path d="M5 15l7-7 7 7" />
                      </svg>
                      <span className="text-xs font-semibold text-emerald-400">{userUpTickets}</span>
                    </div>
                  )}
                  {userDownTickets > 0 && (
                    <div className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-1.5">
                      <svg className="w-3 h-3 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                        <path d="M19 9l-7 7-7-7" />
                      </svg>
                      <span className="text-xs font-semibold text-red-400">{userDownTickets}</span>
                    </div>
                  )}
                </div>
              </div>
              {canClaim && (
                <button
                  onClick={handleClaim}
                  disabled={txState !== 'idle'}
                  className="bg-gradient-to-r from-emerald-500 to-green-500 text-black text-xs font-bold px-5 py-2.5 rounded-xl hover:opacity-90 transition-all disabled:opacity-50 shadow-lg shadow-emerald-500/20"
                >
                  {txState === 'claiming' ? (
                    <span className="flex items-center gap-2"><Spinner /> Claiming...</span>
                  ) : 'Claim Winnings'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Betting Interface */}
        {!isResolved && isConnected && !isLocked && (
          <div className="flex flex-col gap-3">
            {/* Direction Selection */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setSelectedDirection('up')}
                className={`relative overflow-hidden rounded-2xl p-5 transition-all duration-200 ${
                  selectedDirection === 'up'
                    ? 'bg-emerald-500 text-white ring-2 ring-emerald-400 ring-offset-2 ring-offset-[#050505] scale-[1.02]'
                    : 'bg-white/[0.03] border border-white/[0.08] hover:border-emerald-500/40 hover:bg-emerald-500/5'
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${
                    selectedDirection === 'up' ? 'bg-white/20' : 'bg-emerald-500/10'
                  }`}>
                    <svg className={`w-7 h-7 ${selectedDirection === 'up' ? 'text-white' : 'text-emerald-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                      <path d="M5 15l7-7 7 7" />
                    </svg>
                  </div>
                  <span className="font-bold">PUMP</span>
                  <span className={`text-[11px] ${selectedDirection === 'up' ? 'text-white/70' : 'text-white/40'}`}>
                    {upMultiplier.toFixed(2)}x payout
                  </span>
                </div>
              </button>

              <button
                onClick={() => setSelectedDirection('down')}
                className={`relative overflow-hidden rounded-2xl p-5 transition-all duration-200 ${
                  selectedDirection === 'down'
                    ? 'bg-red-500 text-white ring-2 ring-red-400 ring-offset-2 ring-offset-[#050505] scale-[1.02]'
                    : 'bg-white/[0.03] border border-white/[0.08] hover:border-red-500/40 hover:bg-red-500/5'
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${
                    selectedDirection === 'down' ? 'bg-white/20' : 'bg-red-500/10'
                  }`}>
                    <svg className={`w-7 h-7 ${selectedDirection === 'down' ? 'text-white' : 'text-red-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                      <path d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                  <span className="font-bold">DUMP</span>
                  <span className={`text-[11px] ${selectedDirection === 'down' ? 'text-white/70' : 'text-white/40'}`}>
                    {downMultiplier.toFixed(2)}x payout
                  </span>
                </div>
              </button>
            </div>

            {/* Ticket Amount */}
            {selectedDirection && (
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[10px] text-white/40 uppercase tracking-wider">Tickets</p>
                  <p className="text-[10px] text-white/40">
                    Balance: <span className="text-white font-medium">{ethBalance ? Number(ethBalance.formatted).toFixed(4) : '0'} ETH</span>
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setTicketCount(Math.max(1, ticketCount - 1))}
                    className="w-12 h-12 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-colors text-xl font-light"
                  >
                    −
                  </button>
                  
                  <div className="flex-1 text-center">
                    <input
                      type="number"
                      value={ticketCount}
                      onChange={(e) => setTicketCount(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full bg-transparent text-center text-3xl font-bold outline-none"
                      min={1}
                    />
                    <p className="text-[11px] text-white/40 mt-1">{totalCostEth.toFixed(3)} ETH</p>
                  </div>

                  <button
                    onClick={() => setTicketCount(ticketCount + 1)}
                    className="w-12 h-12 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-colors text-xl font-light"
                  >
                    +
                  </button>
                </div>

                {/* Quick Select */}
                <div className="flex gap-2 mt-4">
                  {[1, 5, 10, 25, 50].map((amount) => (
                    <button
                      key={amount}
                      onClick={() => setTicketCount(amount)}
                      className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${
                        ticketCount === amount
                          ? 'bg-white/15 text-white border border-white/20'
                          : 'bg-white/5 text-white/50 hover:bg-white/10 border border-transparent'
                      }`}
                    >
                      {amount}
                    </button>
                  ))}
                </div>

                {/* Potential Winnings */}
                <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                  <span className="text-xs text-white/40">Potential Win</span>
                  <span className={`text-base font-bold ${selectedDirection === 'up' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {potentialWinnings.toFixed(4)} ETH
                  </span>
                </div>
              </div>
            )}

            {/* Confirm Button */}
            {selectedDirection && (
              <button
                onClick={handleBuyTickets}
                disabled={txState !== 'idle'}
                className={`w-full py-4 rounded-2xl font-bold transition-all shadow-lg ${
                  selectedDirection === 'up'
                    ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-emerald-500/25 hover:shadow-emerald-500/40'
                    : 'bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-red-500/25 hover:shadow-red-500/40'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {txState === 'buying' && (
                  <span className="flex items-center justify-center gap-2">
                    <Spinner /> Placing Bet...
                  </span>
                )}
                {txState === 'success' && '✓ Bet Placed!'}
                {txState === 'error' && (errorMsg || 'Transaction Failed')}
                {txState === 'idle' && (
                  <>Bet {totalCostEth.toFixed(3)} ETH on {selectedDirection === 'up' ? 'PUMP' : 'DUMP'}</>
                )}
              </button>
            )}
          </div>
        )}

        {/* Locked State */}
        {isLocked && isConnected && (
          <div className="flex-1 flex flex-col items-center justify-center py-8">
            <div className="w-20 h-20 rounded-3xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center mb-4">
              <span className="text-3xl">🔒</span>
            </div>
            <p className="text-white/50 text-sm font-medium">Betting Locked</p>
            <p className="text-white/30 text-xs mt-1">Resolving in {timeLeft.minutes}m {timeLeft.seconds}s</p>
          </div>
        )}

        {/* Resolved State */}
        {isResolved && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 py-8">
            <div className={`w-24 h-24 rounded-3xl flex items-center justify-center ${
              winningDirection === 1 ? 'bg-emerald-500/20 border border-emerald-500/30' : 'bg-red-500/20 border border-red-500/30'
            }`}>
              {winningDirection === 1 ? (
                <svg className="w-12 h-12 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path d="M5 15l7-7 7 7" />
                </svg>
              ) : (
                <svg className="w-12 h-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </div>
            <div className="text-center">
              <p className="text-white/40 text-sm">Round Complete</p>
              <p className="text-2xl font-bold mt-1">
                ETH went{' '}
                <span className={winningDirection === 1 ? 'text-emerald-400' : 'text-red-400'}>
                  {winningDirection === 1 ? 'UP' : 'DOWN'}
                </span>
              </p>
            </div>
          </div>
        )}

        {/* No Market / First Bet State */}
        {!hasMarket && isConnected && (
          <div className="flex-1 flex flex-col items-center justify-center py-8">
            <div className="w-20 h-20 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
              <span className="text-3xl">◆</span>
            </div>
            <p className="text-white/50 text-sm font-medium">No Active Market</p>
            <p className="text-white/30 text-xs mt-1">Place the first bet to start a 24h round</p>
          </div>
        )}

        {/* Not Connected State */}
        {!isConnected && (
          <div className="flex-1 flex flex-col items-center justify-center py-8">
            <div className="w-20 h-20 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
              <svg className="w-10 h-10 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
              </svg>
            </div>
            <p className="text-white/50 text-sm font-medium">Connect Wallet</p>
            <p className="text-white/30 text-xs mt-1">to place predictions</p>
          </div>
        )}

        {/* Footer */}
        <div className="text-center pt-2 pb-1">
          <p className="text-[9px] text-white/20">
            {username ? `@${username} · ` : ''}0.001 ETH/ticket · 5% fee · Base Network
          </p>
        </div>
      </div>
    </div>
  );
}

// ============ Helper Components ============
function TimeBlock({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex items-center gap-0.5">
      <div className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 min-w-[28px] text-center">
        <span className="text-xs font-mono font-bold tabular-nums">
          {value.toString().padStart(2, '0')}
        </span>
      </div>
      <span className="text-[8px] text-white/30">{label}</span>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}