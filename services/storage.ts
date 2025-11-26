import { Trade, Outcome, Direction, CalculatorEntry, MISTAKES } from '../types';

const STORAGE_KEY = 'trademind_trades';
const USER_KEY = 'trademind_user';
const CALC_KEY = 'trademind_calc_history';
const CALC_SETTINGS_KEY = 'trademind_calc_settings';

export const getTrades = (): Trade[] => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};

// 3️⃣ Automated Mistake Detection Engine
const detectMistakes = (trade: Trade, pastTrades: Trade[]): string[] => {
    const detected: string[] = [...(trade.mistakes || [])]; // Keep manual ones
    
    // 1. Poor R/R (< 1:1)
    if (trade.takeProfit && trade.stopLoss && trade.entryPrice) {
        const risk = Math.abs(trade.entryPrice - trade.stopLoss);
        const reward = Math.abs(trade.takeProfit - trade.entryPrice);
        if (risk > 0 && (reward / risk) < 1) {
            if (!detected.includes('Poor R/R')) detected.push('Poor R/R');
        }
    }

    // 2. No Stop Loss
    if (!trade.stopLoss || trade.stopLoss === 0) {
        if (!detected.includes('No Stop')) detected.push('No Stop');
    }

    // 3. Overtrading (More than 5 trades in same day)
    const tradeDate = new Date(trade.date).toDateString();
    const tradesToday = pastTrades.filter(t => new Date(t.date).toDateString() === tradeDate && t.id !== trade.id).length;
    if (tradesToday >= 5) {
        if (!detected.includes('Overtrading')) detected.push('Overtrading');
    }

    return detected;
};

export const saveTrade = (trade: Trade): Trade[] => {
  const currentTrades = getTrades();
  
  // Run Auto-Detection
  trade.mistakes = detectMistakes(trade, currentTrades);

  // Check if update or new
  const index = currentTrades.findIndex(t => t.id === trade.id);
  let newTrades;
  
  if (index >= 0) {
    newTrades = [...currentTrades];
    newTrades[index] = trade;
  } else {
    newTrades = [trade, ...currentTrades];
  }
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(newTrades));
  return newTrades;
};

export const deleteTrade = (id: string): Trade[] => {
  const currentTrades = getTrades();
  const newTrades = currentTrades.filter(t => t.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(newTrades));
  return newTrades;
};

// --- Calculator Storage ---

export const getCalculatorHistory = (): CalculatorEntry[] => {
  const data = localStorage.getItem(CALC_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveCalculatorEntry = (entry: CalculatorEntry): CalculatorEntry[] => {
  const current = getCalculatorHistory();
  // Keep only last 50 calculations
  const newHistory = [entry, ...current].slice(0, 50);
  localStorage.setItem(CALC_KEY, JSON.stringify(newHistory));
  return newHistory;
};

export const getCalculatorSettings = () => {
    const data = localStorage.getItem(CALC_SETTINGS_KEY);
    return data ? JSON.parse(data) : null;
};

export const saveCalculatorSettings = (settings: any) => {
    localStorage.setItem(CALC_SETTINGS_KEY, JSON.stringify(settings));
};

// Calculations Helper
export const calculateTradeMetrics = (
  direction: Direction,
  entry: number,
  exit: number | undefined,
  stopLoss: number,
  size: number
) => {
  if (exit === undefined) return { pnl: 0, rMultiple: 0, outcome: Outcome.OPEN };

  let pnl = 0;
  if (direction === Direction.LONG) {
    pnl = (exit - entry) * size;
  } else {
    pnl = (entry - exit) * size;
  }

  const riskPerShare = Math.abs(entry - stopLoss);
  const rewardPerShare = Math.abs(exit - entry);
  
  // Avoid division by zero
  const rMultiple = riskPerShare === 0 ? 0 : (pnl > 0 ? rewardPerShare / riskPerShare : -1 * (Math.abs(exit - entry) / riskPerShare));

  let outcome = Outcome.BREAK_EVEN;
  if (pnl > 0) outcome = Outcome.WIN;
  if (pnl < 0) outcome = Outcome.LOSS;

  return { pnl, rMultiple, outcome };
};

// --- Analytics Helpers ---

export const getGroupedStats = (trades: Trade[], key: keyof Trade) => {
    const groups: Record<string, { wins: number, total: number, pnl: number, r: number }> = {};
    
    trades.filter(t => t.outcome !== Outcome.OPEN).forEach(t => {
        const values = Array.isArray(t[key]) ? t[key] as string[] : [t[key] as string];
        // If empty array, group as 'Unknown'
        const safeValues = values.length > 0 ? values : ['Unknown'];

        safeValues.forEach(val => {
             if (!groups[val]) groups[val] = { wins: 0, total: 0, pnl: 0, r: 0 };
             groups[val].total++;
             if (t.outcome === Outcome.WIN) groups[val].wins++;
             groups[val].pnl += (t.pnl || 0);
             groups[val].r += (t.rMultiple || 0);
        });
    });

    return Object.entries(groups).map(([name, stat]) => ({
        name,
        winRate: stat.total ? (stat.wins / stat.total) * 100 : 0,
        totalTrades: stat.total,
        netPnL: stat.pnl,
        avgR: stat.total ? stat.r / stat.total : 0
    })).sort((a,b) => b.winRate - a.winRate);
};

// Mock Auth
export const loginUser = (email: string) => {
  const user = { email, name: email.split('@')[0] };
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  return user;
};

export const logoutUser = () => {
  localStorage.removeItem(USER_KEY);
};

export const getCurrentUser = () => {
  const u = localStorage.getItem(USER_KEY);
  return u ? JSON.parse(u) : null;
};