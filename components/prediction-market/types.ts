export type MarketType = 'ETH' | 'BYEMONEY';
export type Direction = 'up' | 'down';
export type TxState = 'idle' | 'buying' | 'claiming' | 'success' | 'error';

export interface MarketData {
  id: bigint;
  startPrice: bigint;
  endPrice: bigint;
  startTime: bigint;
  endTime: bigint;
  upPool: bigint;
  downPool: bigint;
  status: number;
  result: number;
  totalTickets: bigint;
}

export interface UserPosition {
  up: bigint;
  down: bigint;
  claimed: boolean;
}

export interface RecentBet {
  id: string;
  fid: number;
  username: string;
  pfp_url: string;
  direction: Direction;
  tickets: number;
  timestamp: string;
  wallet_address: string;
  market_id: number;
  price_at_bet: number | null;
}

export interface UnclaimedMarket {
  marketId: number;
  upTickets: number;
  downTickets: number;
  result: number;
  status: number;
  estimatedWinnings: number;
  upPool: number;
  downPool: number;
}

export interface HistoryItem {
  marketId: number;
  direction: Direction;
  tickets: number;
  result: number;
  status: number;
  claimed: boolean;
  winnings: number;
  timestamp: string;
  priceAtBet: number;
}

export interface TimeLeft {
  hours: number;
  minutes: number;
  seconds: number;
}

export interface PredictionMarketProps {
  userFid?: number;
  username?: string;
  initialData?: {
    marketId: number;
    timeRemaining: number;
    totalPool: number;
    upPool: number;
    downPool: number;
    ethPrice: number;
  };
  onDataUpdate?: (data: {
    marketId: number;
    timeRemaining: number;
    totalPool: number;
    upPool: number;
    downPool: number;
    ethPrice: number;
    recentWins: Array<{
      username: string;
      pfp: string;
      amount: number;
      direction: Direction;
    }>;
  }) => void;
  onMarketChange?: (market: MarketType) => void;
  selectedMarket?: MarketType;
}

export interface CoinOption {
  symbol: string;
  name: string;
  icon: string;
  active: boolean;
}
