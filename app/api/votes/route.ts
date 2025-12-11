import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

function getCurrentPeriod(): string {
  const now = new Date();
  const resetHour = 12;
  
  if (now.getUTCHours() < resetHour) {
    now.setUTCDate(now.getUTCDate() - 1);
  }
  
  return now.toISOString().split('T')[0];
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  const fid = searchParams.get('fid');
  
  if (!token) {
    return NextResponse.json({ error: 'Token required' }, { status: 400 });
  }

  const period = getCurrentPeriod();

  try {
    // Get vote counts
    const { data: votes, error } = await supabase
      .from('votes')
      .select('vote')
      .eq('token', token.toLowerCase())
      .eq('period', period);

    if (error) throw error;

    const bullish = votes?.filter(v => v.vote === 'bullish').length || 0;
    const bearish = votes?.filter(v => v.vote === 'bearish').length || 0;

    // Check if user already voted
    let userVote = null;
    if (fid) {
      const { data: userVoteData } = await supabase
        .from('votes')
        .select('vote')
        .eq('token', token.toLowerCase())
        .eq('period', period)
        .eq('fid', parseInt(fid))
        .single();
      
      userVote = userVoteData?.vote || null;
    }

    // Get recent votes
    const { data: recentVotes } = await supabase
      .from('votes')
      .select('username, vote, created_at')
      .eq('token', token.toLowerCase())
      .eq('period', period)
      .order('created_at', { ascending: false })
      .limit(20);

    return NextResponse.json({
      bullish,
      bearish,
      userVote,
      period,
      recentVotes: recentVotes || [],
    });
  } catch (error) {
    console.error('Error fetching votes:', error);
    return NextResponse.json({ bullish: 0, bearish: 0, userVote: null, recentVotes: [] });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, vote, fid, username } = body;

    if (!token || !vote || !fid) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (vote !== 'bullish' && vote !== 'bearish') {
      return NextResponse.json({ error: 'Invalid vote' }, { status: 400 });
    }

    const period = getCurrentPeriod();

    // Check if user already voted this period
    const { data: existing } = await supabase
      .from('votes')
      .select('id')
      .eq('token', token.toLowerCase())
      .eq('period', period)
      .eq('fid', fid)
      .single();

    if (existing) {
      return NextResponse.json({ error: 'Already voted today' }, { status: 400 });
    }

    // Insert vote
    const { error } = await supabase
      .from('votes')
      .insert({
        token: token.toLowerCase(),
        vote,
        fid,
        username: username || null,
        period,
        created_at: new Date().toISOString(),
      });

    if (error) throw error;

    // Get updated counts
    const { data: votes } = await supabase
      .from('votes')
      .select('vote')
      .eq('token', token.toLowerCase())
      .eq('period', period);

    const bullish = votes?.filter(v => v.vote === 'bullish').length || 0;
    const bearish = votes?.filter(v => v.vote === 'bearish').length || 0;

    return NextResponse.json({ bullish, bearish, success: true });
  } catch (error) {
    console.error('Error submitting vote:', error);
    return NextResponse.json({ error: 'Failed to submit vote' }, { status: 500 });
  }
}