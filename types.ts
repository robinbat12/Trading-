
export enum Direction {
  LONG = 'Long',
  SHORT = 'Short'
}

export enum Outcome {
  WIN = 'Win',
  LOSS = 'Loss',
  BREAK_EVEN = 'Break Even',
  OPEN = 'Open',
  MISSED = 'Missed'
}

export enum Session {
  ASIAN = 'Asian',
  LONDON = 'London',
  NEW_YORK = 'New York',
  CLOSE = 'Close'
}

export enum Confidence {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High'
}

// New Edge Module Types
export const STANDARD_SETUPS = ['Breakout', 'Pullback', 'Reversal', 'Trend Continuation', 'Range Play', 'News', 'Scalp'];
export const TIMEFRAMES = ['1M', '5M', '15M', '30M', '1H', '4H', 'D', 'W'];
export const MARKET_CONDITIONS = ['Trending Up', 'Trending Down', 'Ranging', 'Choppy', 'Volatile', 'Quiet'];
export const EMOTIONS = ['FOMO', 'Fear', 'Greed', 'Confident', 'Hesitant', 'Revenge', 'Flow State', 'Anxious', 'Bored', 'Patient'];
// Added 'Overtrading' and 'No Discipline' to standard list
export const MISTAKES = ['Poor R/R', 'No Stop', 'Chase', 'Early Exit', 'Late Exit', 'Overrisk', 'Impulse', 'Overtrading', 'No Discipline', 'Tilt'];
export const AUTO_DETECTED_MISTAKES = ['Poor R/R', 'No Stop', 'Overtrading', 'No Discipline'];

export interface Trade {
  id: string;
  date: string; // ISO String (Entry Date)
  pair: string;
  direction: Direction;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  exitPrice?: number;
  exitDate?: string; // ISO String (Exit Date)
  positionSize: number;
  riskAmount: number; 
  reason: string;
  notes: string;
  screenshotUrl?: string;
  tradingViewUrl?: string;
  
  // Missed Trade Specific
  skipReason?: string;

  // Advanced Tagging
  session?: Session;
  marketCondition?: string;
  confidence?: Confidence;

  // Psychology
  entryEmotion?: string;
  exitEmotion?: string;
  
  // New Fields for Modules
  setups: string[];
  timeframes: string[];
  emotions: string[]; // Kept for backward compatibility, preference is entry/exit specific
  mistakes: string[]; // Auto-detected + Manual

  // Auto-calculated fields
  pnl?: number;
  isManualPnL?: boolean; // If true, pnl is not auto-calculated
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
  
  // Advanced
  expectancy: number;
  maxDrawdown: number;
  currentStreak: number; // positive for win, negative for loss
  maxWinStreak: number;
  maxLossStreak: number;
}

export interface User {
  email: string;
  name: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}

export interface UserSettings {
  initialCapital: number;
  currency: string;
  maxDailyLoss: number;
  maxWeeklyLoss: number;
}

// Calculator Types
export type CalculatorMode = 'PERCENT' | 'FIXED';
export type CalculatorTarget = 'UNITS' | 'VALUE';

export interface CalculatorEntry {
  id: string;
  date: string;
  
  // Settings
  targetMode: CalculatorTarget; // 'UNITS' | 'VALUE'
  mode: CalculatorMode; // Risk Mode
  
  balance: number;
  riskInput: number; // % or Fixed Amount depending on mode
  
  // Inputs
  entryPrice?: number; // Optional in Value mode
  stopLoss?: number;   // Used in Units mode
  stopLossPercent?: number; // Used in Value mode
  leverage: number;
  
  // Outputs
  positionSize: number;
  positionValue: number;
  dollarRisk: number;
}
