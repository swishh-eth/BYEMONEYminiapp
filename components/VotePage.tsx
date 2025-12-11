'use client';

import { useState, useEffect } from 'react';
import { TOKENS } from '@/lib/constants';

interface VotePageProps {
  userFid?: number;
  username?: string;
}

interface VoteStats {
  bullish: number;
  bearish: number;
  userVote: 'bullish' | 'bearish' | null;
}

interface RecentVote {
  username: string;
  vote: 'bullish' | 'bearish';
  token: string;
  created_at: string;
}

type TokenKey = keyof typeof TOKENS;

export default function VotePage({ userFid, username }: VotePageProps) {
  const [selectedToken, setSelectedToken] = useState<TokenKey>('byemoney');
  const [showTokenPicker, setShowTokenPicker] = useState(false);
  const [stats, setStats] = useState<VoteStats>({
    bullish: 0,
    bearish: 0,
    userVote: null,
  });
  const [recentVotes, setRecentVotes] = useState<RecentVote[]>([]);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');

  const token = TOKENS[selectedToken];

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

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ token: token.address });
        if (userFid) params.append('fid', userFid.toString());
        
        const res = await fetch(`/api/votes?${params}`);
        if (res.ok) {
          const data = await res.json();
          setStats({
            bullish: data.bullish || 0,
            bearish: data.bearish || 0,
            userVote: data.userVote || null,
          });
          setRecentVotes(data.recentVotes || []);
        }
      } catch (err) {
        console.error('Failed to fetch votes:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userFid, selectedToken, token.address]);

  const handleVote = async (vote: 'bullish' | 'bearish') => {
    if (!userFid || voting || stats.userVote) return;
    
    setVoting(true);
    try {
      const res = await fetch('/api/votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: token.address,
          tokenSymbol: token.symbol,
          vote,
          fid: userFid,
          username,
        }),
      });
      
      if (res.ok) {
        const data = await res.json();
        setStats(prev => ({
          ...prev,
          bullish: data.bullish,
          bearish: data.bearish,
          userVote: vote,
        }));
        setRecentVotes(prev => [{
          username: username || 'anon',
          vote,
          token: token.symbol,
          created_at: new Date().toISOString(),
        }, ...prev]);
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

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full p-3 items-center justify-center">
        <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-white/50 text-xs mt-3">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-3 gap-3">
      {/* Header */}
      <div className="text-center">
        <h2 className="font-bold text-lg text-white">How are you feeling about...</h2>
        
        {/* Token Picker Button */}
        <button 
          onClick={() => setShowTokenPicker(!showTokenPicker)}
          className="mt-2 w-full bg-black border border-red-500 hover:bg-white/5 rounded-xl px-4 py-3 text-white font-bold text-lg flex items-center justify-between"
        >
          <span>${token.symbol}</span>
          <svg className={`w-4 h-4 transition-transform ${showTokenPicker ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        {/* Token Dropdown */}
        {showTokenPicker && (
          <div className="mt-1 bg-black border border-white/10 rounded-xl overflow-hidden">
            {Object.entries(TOKENS).map(([key, t]) => (
              <button
                key={key}
                onClick={() => {
                  setSelectedToken(key as TokenKey);
                  setShowTokenPicker(false);
                }}
                className={`w-full px-4 py-3 text-left hover:bg-white/10 flex items-center justify-between ${
                  selectedToken === key ? 'bg-white/5' : ''
                }`}
              >
                <span className="font-bold text-white">${t.symbol}</span>
                {selectedToken === key && (
                  <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Timer */}
      <div className="bg-black border border-white/10 rounded-xl p-2 text-center">
        <p className="text-[10px] text-white/40">Resets in <span className="font-bold text-white">{timeLeft}</span></p>
      </div>

      {/* Vote Results Bar */}
      <div className="bg-black border border-white/10 rounded-xl p-3">
        <div className="flex justify-between text-xs mb-2">
          <span className="text-white font-semibold">{bullishPercent.toFixed(1)}% Bullish</span>
          <span className="text-red-500 font-semibold">{bearishPercent.toFixed(1)}% Bearish</span>
        </div>
        
        <div className="h-2 bg-white/10 rounded-full overflow-hidden flex">
          <div 
            className="bg-white transition-all duration-500"
            style={{ width: `${bullishPercent}%` }}
          />
          <div 
            className="bg-red-500 transition-all duration-500"
            style={{ width: `${bearishPercent}%` }}
          />
        </div>
        
        <div className="flex justify-between text-[10px] text-white/40 mt-1">
          <span>{stats.bullish} votes</span>
          <span>{stats.bearish} votes</span>
        </div>
      </div>

      {/* Vote Buttons or Status */}
      {!userFid ? (
        <div className="bg-black border border-white/10 rounded-xl p-4 text-center">
          <p className="text-white/50 text-sm">Open in Farcaster to vote</p>
        </div>
      ) : stats.userVote ? (
        <div className="bg-black border border-white/10 rounded-xl p-4 text-center">
          <p className="text-white/50 text-xs">You voted</p>
          <p className={`font-bold text-lg ${stats.userVote === 'bullish' ? 'text-white' : 'text-red-500'}`}>
            {stats.userVote === 'bullish' ? '↑ Bullish' : '↓ Bearish'}
          </p>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            onClick={() => handleVote('bullish')}
            disabled={voting}
            className="flex-1 bg-white/10 hover:bg-white/20 border border-white/30 rounded-xl py-4 flex flex-col items-center justify-center gap-1 transition-colors disabled:opacity-50"
          >
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path d="M5 15l7-7 7 7" />
            </svg>
            <span className="font-bold text-white">Bullish</span>
          </button>
          
          <button
            onClick={() => handleVote('bearish')}
            disabled={voting}
            className="flex-1 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-xl py-4 flex flex-col items-center justify-center gap-1 transition-colors disabled:opacity-50"
          >
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path d="M19 9l-7 7-7-7" />
            </svg>
            <span className="font-bold text-red-500">Bearish</span>
          </button>
        </div>
      )}

      {/* Recent Votes */}
      <div className="flex-1 bg-black border border-white/10 rounded-xl overflow-hidden flex flex-col min-h-0">
        <div className="px-3 py-2 border-b border-white/10">
          <p className="text-xs text-white/50 font-medium">Recent Votes</p>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {recentVotes.length === 0 ? (
            <div className="p-4 text-center text-white/30 text-xs">
              No votes yet today
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {recentVotes.map((vote, i) => (
                <div key={i} className="px-3 py-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      vote.vote === 'bullish' ? 'bg-white/20' : 'bg-red-500/20'
                    }`}>
                      {vote.vote === 'bullish' ? (
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                          <path d="M5 15l7-7 7 7" />
                        </svg>
                      ) : (
                        <svg className="w-3 h-3 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                          <path d="M19 9l-7 7-7-7" />
                        </svg>
                      )}
                    </div>
                    <span className="text-xs text-white/70">
                      @{vote.username || 'anon'} <span className="text-white/40">on ${vote.token}</span>
                    </span>
                  </div>
                  <span className="text-[10px] text-white/30">{formatTime(vote.created_at)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {username && (
        <p className="text-[9px] text-white/30 text-center">
          Voting as @{username}
        </p>
      )}
    </div>
  );
}