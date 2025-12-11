'use client';

import { useState, useEffect } from 'react';
import { TOKEN } from '@/lib/constants';

interface VotePageProps {
  userFid?: number;
  username?: string;
}

interface VoteStats {
  bullish: number;
  bearish: number;
  userVote: 'bullish' | 'bearish' | null;
  resetsAt: string;
}

export default function VotePage({ userFid, username }: VotePageProps) {
  const [stats, setStats] = useState<VoteStats>({
    bullish: 0,
    bearish: 0,
    userVote: null,
    resetsAt: '',
  });
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');

  // Calculate time until next reset (12pm UTC)
  useEffect(() => {
    const updateTimeLeft = () => {
      const now = new Date();
      const reset = new Date(now);
      reset.setUTCHours(12, 0, 0, 0);
      
      if (now >= reset) {
        reset.setUTCDate(reset.getUTCDate() + 1);
      }
      
      const diff = reset.getTime() - now.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      setTimeLeft(`${hours}h ${minutes}m`);
    };

    updateTimeLeft();
    const interval = setInterval(updateTimeLeft, 60000);
    return () => clearInterval(interval);
  }, []);

  // Fetch current vote stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const params = new URLSearchParams({ token: TOKEN.address });
        if (userFid) params.append('fid', userFid.toString());
        
        const res = await fetch(`/api/votes?${params}`);
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (err) {
        console.error('Failed to fetch votes:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [userFid]);

  const handleVote = async (vote: 'bullish' | 'bearish') => {
    if (!userFid || voting || stats.userVote) return;
    
    setVoting(true);
    try {
      const res = await fetch('/api/votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: TOKEN.address,
          vote,
          fid: userFid,
          username,
        }),
      });
      
      if (res.ok) {
        const data = await res.json();
        setStats(prev => ({
          ...prev,
          ...data,
          userVote: vote,
        }));
      }
    } catch (err) {
      console.error('Failed to vote:', err);
    } finally {
      setVoting(false);
    }
  };

  const totalVotes = stats.bullish + stats.bearish;
  const bullishPercent = totalVotes > 0 ? (stats.bullish / totalVotes) * 100 : 50;
  const bearishPercent = totalVotes > 0 ? (stats.bearish / totalVotes) * 100 : 50;

  return (
    <div className="flex flex-col h-full p-3 gap-3">
      {/* Header */}
      <div className="text-center py-2">
        <h2 className="font-bold text-lg text-white">Sentiment Vote</h2>
        <p className="text-[10px] text-white/40">How are you feeling about ${TOKEN.symbol}?</p>
      </div>

      {/* Timer */}
      <div className="bg-black border border-white/10 rounded-xl p-3 text-center">
        <p className="text-[10px] text-white/40">Resets in</p>
        <p className="font-bold text-white text-lg">{timeLeft}</p>
        <p className="text-[9px] text-white/30">Daily reset at 12:00 UTC</p>
      </div>

      {/* Vote Results Bar */}
      <div className="bg-black border border-white/10 rounded-xl p-4">
        <div className="flex justify-between text-xs mb-2">
          <span className="text-green-500 font-semibold">{bullishPercent.toFixed(1)}% Bullish</span>
          <span className="text-red-500 font-semibold">{bearishPercent.toFixed(1)}% Bearish</span>
        </div>
        
        <div className="h-3 bg-white/10 rounded-full overflow-hidden flex">
          <div 
            className="bg-green-500 transition-all duration-500"
            style={{ width: `${bullishPercent}%` }}
          />
          <div 
            className="bg-red-500 transition-all duration-500"
            style={{ width: `${bearishPercent}%` }}
          />
        </div>
        
        <div className="flex justify-between text-[10px] text-white/40 mt-2">
          <span>{stats.bullish} votes</span>
          <span>{stats.bearish} votes</span>
        </div>
      </div>

      {/* Vote Buttons */}
      <div className="flex-1 flex flex-col gap-3">
        {!userFid ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-white/50 text-sm text-center">
              Open in Farcaster to vote
            </p>
          </div>
        ) : stats.userVote ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="text-white/50 text-sm">You voted</p>
              <p className={`font-bold text-xl ${stats.userVote === 'bullish' ? 'text-green-500' : 'text-red-500'}`}>
                {stats.userVote === 'bullish' ? '↑ Bullish' : '↓ Bearish'}
              </p>
              <p className="text-[10px] text-white/30 mt-2">Come back tomorrow to vote again!</p>
            </div>
          </div>
        ) : (
          <>
            <button
              onClick={() => handleVote('bullish')}
              disabled={voting}
              className="flex-1 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 rounded-xl flex flex-col items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path d="M5 15l7-7 7 7" />
              </svg>
              <span className="font-bold text-green-500 text-lg">Bullish</span>
            </button>
            
            <button
              onClick={() => handleVote('bearish')}
              disabled={voting}
              className="flex-1 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-xl flex flex-col items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path d="M19 9l-7 7-7-7" />
              </svg>
              <span className="font-bold text-red-500 text-lg">Bearish</span>
            </button>
          </>
        )}
      </div>

      {/* User info */}
      {username && (
        <p className="text-[9px] text-white/30 text-center">
          Voting as @{username}
        </p>
      )}
    </div>
  );
}