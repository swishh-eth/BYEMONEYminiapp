-- Run this in your Supabase SQL editor to create the votes table

CREATE TABLE votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  token VARCHAR(42) NOT NULL,           -- Token contract address
  vote VARCHAR(10) NOT NULL,            -- 'bullish' or 'bearish'
  fid INTEGER NOT NULL,                 -- Farcaster user ID
  address VARCHAR(42),                  -- User's wallet address
  username VARCHAR(100),                -- Farcaster username
  period DATE NOT NULL,                 -- Vote period (YYYY-MM-DD)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one vote per user per token per day
  UNIQUE(token, fid, period)
);

-- Create indexes for faster queries
CREATE INDEX idx_votes_token_period ON votes(token, period);
CREATE INDEX idx_votes_fid ON votes(fid);

-- Enable Row Level Security (optional but recommended)
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read votes
CREATE POLICY "Anyone can read votes" ON votes
  FOR SELECT USING (true);

-- Allow inserts from authenticated service role
CREATE POLICY "Service role can insert votes" ON votes
  FOR INSERT WITH CHECK (true);
