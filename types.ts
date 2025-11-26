export enum Direction {
  LONG = 'Long',
  SHORT = 'Short'
}

export enum Outcome {
  WIN = 'Win',
  LOSS = 'Loss',
  BREAK_EVEN = 'Break Even',
  OPEN = 'Open'
}

export type TradeStatus =
  | 'Open'
  | 'Closed'
  | 'Missed'
  | 'Invalidated'
  | 'BreakEven'
  | 'Partial';

// New Edge Module Types
export const STANDARD_SETUPS = ['Breakout', 'Pullback', 'Reversal', 'Trend Continuation', 'Range Play', 'News', 'Scalp'];
export const TIMEFRAMES = ['1M', '5M', '15M', '30M', '1H', '4H', 'D', 'W'];
export const EMOTIONS = ['FOMO', 'Fear', 'Greed', 'Confident', 'Hesitant', 'Revenge', 'Flow State'];
export const MISTAKES = ['Poor R/R', 'No Stop', 'Chase', 'Early Exit', 'Late Exit', 'Overrisk', 'Impulse'];

export interface Trade {
  id: string;
  userId: string; // User isolation
  date: string; // ISO String
  pair: string;
  direction: Direction;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  exitPrice?: number;
  positionSize: number;
  riskAmount: number; 
  reason: string;
  notes: string;
  screenshotUrl?: string;
  tradingViewUrl?: string;
  
  // New Fields for Modules
  setups: string[];
  timeframes: string[];
  emotions: string[];
  mistakes: string[]; // Auto-detected + Manual

  // Auto-calculated fields
  pnl?: number;
  rMultiple?: number;
  outcome: Outcome;
  duration?: string;
  // Capital module
  capitalImpacting?: boolean;
  // Journal / lifecycle
  status?: TradeStatus;
  reasonForExit?: string;
  beforeScreenshotUrl?: string;
  afterScreenshotUrl?: string;
  mediaUrl?: string;
  fromWatchlist?: boolean;
  newsAffected?: boolean;
  newsEventIds?: string[];
}

export interface TradeStats {
  totalTrades: number;
  winRate: number;
  grossPnL: number;
  averageR: number;
  profitFactor: number;
  bestTrade: number;
  worstTrade: number;
}

// Capital & Risk Module
export interface EquityPoint {
  date: string; // ISO or label
  equity: number;
  realizedPnL: number;
  unrealizedPnL: number;
}

export interface StreakStats {
  maxWinStreak: number;
  maxLossStreak: number;
}

export interface CapitalStats {
  startingBalance: number;
  currentBalance: number;
  realizedPnL: number;
  unrealizedPnL: number;
  netGrowthPct: number;
  maxDrawdown: number;
  maxDrawdownPct: number;
  avgRPerTrade: number;
  sharpeRatio?: number;
  equityCurve: EquityPoint[];
  streaks: StreakStats;
}

export interface CapitalSettings {
  startingBalance: number;
  maxDrawdownAlertPct: number; // e.g. 20 = alert at -20% DD
  defaultRiskPerTradePct?: number;
}

// Watchlist & History
export interface WatchlistItem {
  id: string;
  userId: string; // User isolation
  pair: string;
  priority: number; // higher = more important
  notes?: string;
  preferredSetups: string[];
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
}

export interface TradeHistoryEntry {
  id: string;
  userId: string; // User isolation
  tradeId: string;
  timestamp: string;
  before: Trade;
  after: Trade;
}

export type NewsImpactLevel = 'high' | 'medium' | 'low';

export interface NewsEvent {
  news_id: string;
  title: string;
  description: string;
  timestamp: string; // ISO
  impact_level: NewsImpactLevel;
  affected_assets: string[]; // e.g. ['EURUSD', 'DXY']
  source: string;
  fetched_at: string;
  notified: boolean;
}

export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash: string; // bcrypt hash in production
  emailVerified: boolean;
  verificationToken?: string;
  verificationTokenExpiry?: string;
  resetPasswordToken?: string;
  resetPasswordTokenExpiry?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserSession {
  userId: string;
  email: string;
  name: string;
  token: string;
  expiresAt: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}

export interface AuthError {
  code: 'EMAIL_EXISTS' | 'INVALID_EMAIL' | 'WEAK_PASSWORD' | 'INVALID_CREDENTIALS' | 'EMAIL_NOT_VERIFIED' | 'TOKEN_EXPIRED' | 'TOKEN_INVALID' | 'ACCOUNT_NOT_FOUND';
  message: string;
}

// Calculator Types
export type CalculatorMode = 'PERCENT' | 'FIXED';

export interface CalculatorEntry {
  id: string;
  userId: string; // User isolation
  date: string;
  mode: CalculatorMode;
  balance: number;
  riskInput: number; // % or Fixed Amount depending on mode
  entryPrice: number;
  stopLoss: number;
  leverage: number;
  
  // Outputs
  positionSize: number;
  positionValue: number;
  dollarRisk: number;
}