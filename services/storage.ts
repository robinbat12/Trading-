import { Trade, Outcome, Direction, CalculatorEntry, CapitalSettings, CapitalStats, EquityPoint, WatchlistItem, TradeHistoryEntry } from '../types';

const STORAGE_KEY = 'trademind_trades';
const USER_KEY = 'trademind_user';
const CALC_KEY = 'trademind_calc_history';
const CALC_SETTINGS_KEY = 'trademind_calc_settings';
const CAPITAL_SETTINGS_KEY = 'trademind_capital_settings';
const WATCHLIST_KEY = 'trademind_watchlist';
const TRADE_HISTORY_KEY = 'trademind_trade_history';

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
    // Save version history
    const historyRaw = localStorage.getItem(TRADE_HISTORY_KEY);
    const history: TradeHistoryEntry[] = historyRaw ? JSON.parse(historyRaw) : [];
    const previous = currentTrades[index];
    const entry: TradeHistoryEntry = {
      id: crypto.randomUUID(),
      tradeId: trade.id,
      timestamp: new Date().toISOString(),
      before: previous,
      after: trade,
    };
    localStorage.setItem(TRADE_HISTORY_KEY, JSON.stringify([entry, ...history]));

    newTrades = [...currentTrades];
    newTrades[index] = trade;
  } else {
    newTrades = [trade, ...currentTrades];
  }
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(newTrades));
  return newTrades;
};

export const getTradeHistory = (tradeId?: string): TradeHistoryEntry[] => {
  const data = localStorage.getItem(TRADE_HISTORY_KEY);
  const all: TradeHistoryEntry[] = data ? JSON.parse(data) : [];
  if (!tradeId) return all;
  return all.filter(h => h.tradeId === tradeId);
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

// --- Capital Tracking & Growth ---

export const getCapitalSettings = (): CapitalSettings => {
  const data = localStorage.getItem(CAPITAL_SETTINGS_KEY);
  if (data) return JSON.parse(data);
  // Sensible defaults
  return {
    startingBalance: 10000,
    maxDrawdownAlertPct: 20,
    defaultRiskPerTradePct: 1
  };
};

export const saveCapitalSettings = (settings: CapitalSettings) => {
  localStorage.setItem(CAPITAL_SETTINGS_KEY, JSON.stringify(settings));
};

// Compute equity curve and capital stats from trades
export const computeCapitalStats = (trades: Trade[], settings: CapitalSettings): CapitalStats => {
  const startingBalance = settings.startingBalance || 0;
  const impactingTrades = trades.filter(t => t.capitalImpacting !== false);
  const closedTrades = impactingTrades.filter(t => t.outcome !== Outcome.OPEN);
  const openTrades = impactingTrades.filter(t => t.outcome === Outcome.OPEN);

  const realizedPnL = closedTrades.reduce((acc, t) => acc + (t.pnl || 0), 0);
  // Without live pricing, we conservatively treat unrealized PnL as 0
  const unrealizedPnL = 0;

  const equityPoints: EquityPoint[] = [];
  let equity = startingBalance;
  let peakEquity = startingBalance;
  let maxDrawdown = 0;

  const sorted = [...closedTrades].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  sorted.forEach((t) => {
    equity += t.pnl || 0;
    peakEquity = Math.max(peakEquity, equity);
    const dd = peakEquity - equity;
    if (dd > maxDrawdown) maxDrawdown = dd;
    equityPoints.push({
      date: t.date,
      equity,
      realizedPnL: realizedPnL,
      unrealizedPnL,
    });
  });

  const currentBalance = startingBalance + realizedPnL + unrealizedPnL;
  const netGrowthPct = startingBalance
    ? ((currentBalance - startingBalance) / startingBalance) * 100
    : 0;
  const maxDrawdownPct =
    peakEquity > 0 ? (maxDrawdown / peakEquity) * 100 : 0;

  // Avg R and simple Sharpe on R-multiples
  const rValues = closedTrades
    .map((t) => t.rMultiple)
    .filter((r): r is number => typeof r === 'number');
  const avgRPerTrade =
    rValues.length > 0
      ? rValues.reduce((acc, r) => acc + r, 0) / rValues.length
      : 0;

  let sharpeRatio: number | undefined = undefined;
  if (rValues.length > 1) {
    const mean = avgRPerTrade;
    const variance =
      rValues.reduce((acc, r) => acc + Math.pow(r - mean, 2), 0) /
      (rValues.length - 1);
    const stdDev = Math.sqrt(variance);
    if (stdDev > 0) {
      sharpeRatio = mean / stdDev;
    }
  }

  // Win / loss streaks
  let maxWinStreak = 0;
  let maxLossStreak = 0;
  let currentWin = 0;
  let currentLoss = 0;
  sorted.forEach((t) => {
    if (t.outcome === Outcome.WIN) {
      currentWin += 1;
      currentLoss = 0;
    } else if (t.outcome === Outcome.LOSS) {
      currentLoss += 1;
      currentWin = 0;
    } else {
      currentWin = 0;
      currentLoss = 0;
    }
    if (currentWin > maxWinStreak) maxWinStreak = currentWin;
    if (currentLoss > maxLossStreak) maxLossStreak = currentLoss;
  });

  return {
    startingBalance,
    currentBalance,
    realizedPnL,
    unrealizedPnL,
    netGrowthPct,
    maxDrawdown,
    maxDrawdownPct,
    avgRPerTrade,
    sharpeRatio,
    equityCurve: equityPoints,
    streaks: {
      maxWinStreak,
      maxLossStreak,
    },
  };
};

// --- Watchlist Storage ---

export const getWatchlist = (): WatchlistItem[] => {
  const data = localStorage.getItem(WATCHLIST_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveWatchlistItem = (item: Omit<WatchlistItem, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): WatchlistItem[] => {
  const current = getWatchlist();
  const now = new Date().toISOString();
  let updated: WatchlistItem[];

  if (item.id) {
    updated = current.map((w) =>
      w.id === item.id
        ? { ...w, ...item, updatedAt: now }
        : w
    );
  } else {
    const id = crypto.randomUUID();
    const nextOrder =
      current.length > 0
        ? Math.max(...current.map((w) => w.orderIndex)) + 1
        : 0;
    const created: WatchlistItem = {
      ...item,
      id,
      createdAt: now,
      updatedAt: now,
      orderIndex: item.orderIndex ?? nextOrder,
    };
    updated = [...current, created];
  }

  localStorage.setItem(WATCHLIST_KEY, JSON.stringify(updated));
  return updated;
};

export const deleteWatchlistItem = (id: string): WatchlistItem[] => {
  const current = getWatchlist();
  const updated = current.filter((w) => w.id !== id);
  localStorage.setItem(WATCHLIST_KEY, JSON.stringify(updated));
  return updated;
};

export const reorderWatchlist = (id: string, direction: 'up' | 'down'): WatchlistItem[] => {
  const current = [...getWatchlist()].sort((a, b) => a.orderIndex - b.orderIndex);
  const index = current.findIndex((w) => w.id === id);
  if (index === -1) return current;

  const swapWith = direction === 'up' ? index - 1 : index + 1;
  if (swapWith < 0 || swapWith >= current.length) return current;

  const tmp = current[index].orderIndex;
  current[index].orderIndex = current[swapWith].orderIndex;
  current[swapWith].orderIndex = tmp;

  const updated = [...current].sort((a, b) => a.orderIndex - b.orderIndex);
  localStorage.setItem(WATCHLIST_KEY, JSON.stringify(updated));
  return updated;
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