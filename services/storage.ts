
import { Trade, Outcome, Direction, CalculatorEntry, MISTAKES, AUTO_DETECTED_MISTAKES, TradeStats, UserSettings } from '../types';

const STORAGE_KEY = 'trademind_trades';
const USER_KEY = 'trademind_user';
const CALC_KEY = 'trademind_calc_history';
const CALC_SETTINGS_KEY = 'trademind_calc_settings';
const SETTINGS_KEY = 'trademind_settings';

export const getTrades = (): Trade[] => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};

// 3️⃣ Automated Mistake Detection Engine
const detectMistakes = (trade: Trade, pastTrades: Trade[]): string[] => {
    // Start with manual mistakes (exclude previous auto-detected ones to allow re-calculation)
    let detected: string[] = (trade.mistakes || []).filter(m => !AUTO_DETECTED_MISTAKES.includes(m));
    
    // Skip detection for missed trades
    if (trade.outcome === Outcome.MISSED) return detected;

    // 1. Poor R/R (< 1:1)
    if (trade.takeProfit && trade.stopLoss && trade.entryPrice) {
        const risk = Math.abs(trade.entryPrice - trade.stopLoss);
        const reward = Math.abs(trade.takeProfit - trade.entryPrice);
        if (risk > 0 && (reward / risk) < 1) {
            detected.push('Poor R/R');
        }
    }

    // 2. No Stop Loss
    if (!trade.stopLoss || trade.stopLoss === 0) {
        detected.push('No Stop');
    }

    // 3. Overtrading (More than 5 trades in same day)
    if (trade.date) {
        const tradeDate = new Date(trade.date).toDateString();
        const tradesToday = pastTrades.filter(t => new Date(t.date).toDateString() === tradeDate && t.id !== trade.id && t.outcome !== Outcome.MISSED).length;
        if (tradesToday >= 5) {
            detected.push('Overtrading');
        }
    }

    // 4. Stop Loss Not Respected (No Discipline)
    // If exit price is worse than stop loss
    if (trade.outcome === Outcome.LOSS && trade.exitPrice && trade.stopLoss) {
        if (trade.direction === Direction.LONG && trade.exitPrice < trade.stopLoss) {
             detected.push('No Discipline');
        } else if (trade.direction === Direction.SHORT && trade.exitPrice > trade.stopLoss) {
             detected.push('No Discipline');
        }
    }

    // Deduplicate
    return [...new Set(detected)];
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

// --- User Settings ---
export const getUserSettings = (): UserSettings => {
  const data = localStorage.getItem(SETTINGS_KEY);
  return data ? JSON.parse(data) : { 
      initialCapital: 10000, 
      currency: 'USD',
      maxDailyLoss: 0,
      maxWeeklyLoss: 0
  };
};

export const saveUserSettings = (settings: UserSettings): UserSettings => {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  return settings;
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
  // If no exit price, trade is OPEN
  if (exit === undefined || exit === null || isNaN(exit) || exit === 0) {
      return { pnl: 0, rMultiple: 0, outcome: Outcome.OPEN };
  }

  let pnl = 0;
  if (direction === Direction.LONG) {
    pnl = (exit - entry) * size;
  } else {
    pnl = (entry - exit) * size;
  }

  const riskPerShare = Math.abs(entry - stopLoss);
  
  // Avoid division by zero
  const rMultiple = riskPerShare === 0 ? 0 : (pnl > 0 ? (Math.abs(exit - entry) / riskPerShare) : -1 * (Math.abs(exit - entry) / riskPerShare));

  let outcome = Outcome.BREAK_EVEN;
  if (pnl > 0) outcome = Outcome.WIN;
  if (pnl < 0) outcome = Outcome.LOSS;
  
  // Treat tiny PnL as Break Even
  if (Math.abs(pnl) < 0.01) outcome = Outcome.BREAK_EVEN;

  return { pnl, rMultiple, outcome };
};

export const calculateDuration = (start: string, end: string): string => {
    if (!start || !end) return '';
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diff = endDate.getTime() - startDate.getTime();
    
    if (diff < 0) return '';

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    return `${minutes}m`;
};

// --- Analytics Helpers ---

export const getGlobalStats = (trades: Trade[]): TradeStats => {
    // Exclude Missed trades from stats
    const closedTrades = trades.filter(t => t.outcome !== Outcome.OPEN && t.outcome !== Outcome.MISSED).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const wins = closedTrades.filter(t => t.outcome === Outcome.WIN);
    const losses = closedTrades.filter(t => t.outcome === Outcome.LOSS);
    const totalTrades = closedTrades.length;
    const winRate = totalTrades ? (wins.length / totalTrades) * 100 : 0;
    const grossPnL = closedTrades.reduce((acc, t) => acc + (t.pnl || 0), 0);
    const avgR = totalTrades ? closedTrades.reduce((acc, t) => acc + (t.rMultiple || 0), 0) / totalTrades : 0;
    
    // Profit Factor (Gross Win / Gross Loss)
    const grossWin = wins.reduce((acc, t) => acc + (t.pnl || 0), 0);
    const grossLoss = Math.abs(losses.reduce((acc, t) => acc + (t.pnl || 0), 0));
    const profitFactor = grossLoss === 0 ? (grossWin === 0 ? 0 : 99.99) : grossWin / grossLoss;

    // Expectancy = (WinRate * AvgWin) - (LossRate * AvgLoss)
    const avgWin = wins.length > 0 ? grossWin / wins.length : 0;
    const avgLoss = losses.length > 0 ? grossLoss / losses.length : 0;
    const expectancy = (avgWin * (winRate/100)) - (avgLoss * (1 - (winRate/100)));

    // Streaks
    let currentStreak = 0;
    let maxWinStreak = 0;
    let maxLossStreak = 0;
    let tempWin = 0;
    let tempLoss = 0;

    for (const t of closedTrades) {
        if (t.outcome === Outcome.WIN) {
            tempWin++;
            tempLoss = 0;
            if (currentStreak < 0) currentStreak = 1;
            else currentStreak++;
        } else if (t.outcome === Outcome.LOSS) {
            tempLoss++;
            tempWin = 0;
            if (currentStreak > 0) currentStreak = -1;
            else currentStreak--;
        } else {
             // Break even resets temp but maintains current streak sense usually
             // We will reset for strict streak tracking
             tempWin = 0;
             tempLoss = 0;
             currentStreak = 0;
        }
        maxWinStreak = Math.max(maxWinStreak, tempWin);
        maxLossStreak = Math.max(maxLossStreak, tempLoss);
    }

    // Max Drawdown (Dollar Terms)
    let peak = 0;
    let maxDD = 0;
    let runningPnL = 0;

    for (const t of closedTrades) {
        runningPnL += (t.pnl || 0);
        if (runningPnL > peak) peak = runningPnL;
        const dd = peak - runningPnL;
        if (dd > maxDD) maxDD = dd;
    }

    return {
      totalTrades,
      winRate: parseFloat(winRate.toFixed(1)),
      grossPnL: parseFloat(grossPnL.toFixed(2)),
      averageR: parseFloat(avgR.toFixed(2)),
      profitFactor: parseFloat(profitFactor.toFixed(2)),
      bestTrade: Math.max(...closedTrades.map(t => t.pnl || 0), 0),
      worstTrade: Math.min(...closedTrades.map(t => t.pnl || 0), 0),
      expectancy: parseFloat(expectancy.toFixed(2)),
      maxDrawdown: parseFloat(maxDD.toFixed(2)),
      currentStreak,
      maxWinStreak,
      maxLossStreak
    };
};

export const getGroupedStats = (trades: Trade[], key: keyof Trade) => {
    const groups: Record<string, { wins: number, total: number, pnl: number, r: number }> = {};
    
    // Exclude Missed trades from grouping stats (PnL/Winrate)
    trades.filter(t => t.outcome !== Outcome.OPEN && t.outcome !== Outcome.MISSED).forEach(t => {
        const value = t[key];
        let safeValues: string[] = ['Unknown'];
        
        if (Array.isArray(value)) {
             safeValues = value.length > 0 ? value : ['Unknown'];
        } else if (typeof value === 'string' && value) {
             safeValues = [value];
        }

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

// Generate Data for Calendar Heatmap
export const getCalendarHeatmap = (trades: Trade[], days: number = 30) => {
    const today = new Date();
    const map = new Map<string, number>();
    
    // Initialize last 30 days with 0
    for(let i = 0; i < days; i++) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        map.set(d.toDateString(), 0);
    }

    trades.filter(t => t.outcome !== Outcome.OPEN && t.outcome !== Outcome.MISSED).forEach(t => {
        const dateStr = new Date(t.date).toDateString();
        if (map.has(dateStr)) {
            map.set(dateStr, (map.get(dateStr) || 0) + (t.pnl || 0));
        }
    });

    // Convert to array
    const result = [];
    for(let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        const dateStr = d.toDateString();
        result.push({
            date: dateStr,
            day: d.getDate(),
            value: map.get(dateStr) || 0
        });
    }
    return result;
};

// Generate Data for Drawdown Chart
export const calculateDrawdownSeries = (trades: Trade[], initialCapital: number) => {
    const sorted = [...trades]
        .filter(t => t.outcome !== Outcome.OPEN && t.outcome !== Outcome.MISSED)
        .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    let peakEquity = initialCapital;
    let currentEquity = initialCapital;
    const series = [{ date: 'Start', drawdown: 0, percentage: 0 }];

    sorted.forEach(t => {
        currentEquity += (t.pnl || 0);
        if (currentEquity > peakEquity) peakEquity = currentEquity;
        const dd = peakEquity - currentEquity;
        const ddPct = peakEquity > 0 ? (dd / peakEquity) * 100 : 0;
        
        series.push({
            date: new Date(t.date).toLocaleDateString(undefined, {month:'short', day:'numeric'}),
            drawdown: -dd, // negative for chart visual
            percentage: -ddPct
        });
    });
    return series;
};

// Risk Rules Checker
export const checkRiskRules = (trades: Trade[], settings: UserSettings) => {
    const today = new Date().toDateString();
    
    // Daily PnL
    const todaysTrades = trades.filter(t => new Date(t.date).toDateString() === today && t.outcome !== Outcome.OPEN && t.outcome !== Outcome.MISSED);
    const dailyPnL = todaysTrades.reduce((acc, t) => acc + (t.pnl || 0), 0);
    
    // Weekly PnL (Simplified: Last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weeklyTrades = trades.filter(t => new Date(t.date) > weekAgo && t.outcome !== Outcome.OPEN && t.outcome !== Outcome.MISSED);
    const weeklyPnL = weeklyTrades.reduce((acc, t) => acc + (t.pnl || 0), 0);

    const violations = [];
    if (settings.maxDailyLoss > 0 && dailyPnL <= -Math.abs(settings.maxDailyLoss)) {
        violations.push({ rule: 'Max Daily Loss', limit: settings.maxDailyLoss, current: dailyPnL });
    }
    if (settings.maxWeeklyLoss > 0 && weeklyPnL <= -Math.abs(settings.maxWeeklyLoss)) {
        violations.push({ rule: 'Max Weekly Loss', limit: settings.maxWeeklyLoss, current: weeklyPnL });
    }

    return violations;
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
