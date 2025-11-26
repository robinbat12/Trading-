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

// New Edge Module Types
export const STANDARD_SETUPS = ['Breakout', 'Pullback', 'Reversal', 'Trend Continuation', 'Range Play', 'News', 'Scalp'];
export const TIMEFRAMES = ['1M', '5M', '15M', '30M', '1H', '4H', 'D', 'W'];
export const EMOTIONS = ['FOMO', 'Fear', 'Greed', 'Confident', 'Hesitant', 'Revenge', 'Flow State'];
export const MISTAKES = ['Poor R/R', 'No Stop', 'Chase', 'Early Exit', 'Late Exit', 'Overrisk', 'Impulse'];

export interface Trade {
  id: string;
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

export interface User {
  email: string;
  name: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}

// Calculator Types
export type CalculatorMode = 'PERCENT' | 'FIXED';

export interface CalculatorEntry {
  id: string;
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