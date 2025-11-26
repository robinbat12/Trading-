import React, { useMemo, useState } from 'react';
import { Trade } from '../types';
import { getCapitalSettings, computeCapitalStats, saveCapitalSettings } from '../services/storage';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, PieChart, Pie, Cell, Legend } from 'recharts';
import { DollarSign, Activity, ArrowDownRight, ArrowUpRight, ShieldAlert, Settings2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';

interface CapitalProps {
  trades: Trade[];
}

type PeriodFilter = 'all' | 'month' | 'week';

export const Capital: React.FC<CapitalProps> = ({ trades }) => {
  const [settings, setSettings] = useState(getCapitalSettings());
  const [editing, setEditing] = useState(false);
  const [period, setPeriod] = useState<PeriodFilter>('all');

  const stats = useMemo(() => computeCapitalStats(trades, settings), [trades, settings]);

  // Period-filtered equity data
  const equityData = useMemo(() => {
    const points = stats.equityCurve;
    if (period === 'all') return points.map(p => ({
      ...p,
      label: new Date(p.date).toLocaleDateString(),
    }));

    const now = new Date();
    const cutoff = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - (period === 'week' ? 7 : 30)
    ).getTime();

    return points
      .filter(p => new Date(p.date).getTime() >= cutoff)
      .map(p => ({
        ...p,
        label: new Date(p.date).toLocaleDateString(),
      }));
  }, [stats.equityCurve, period]);

  // Simple realized vs unrealized breakdown
  const pnlBreakdown = [
    { name: 'Realized', value: stats.realizedPnL },
    { name: 'Unrealized', value: stats.unrealizedPnL },
  ];

  const openAllocation = useMemo(() => {
    const open = trades.filter(t => t.outcome === 'Open');
    const totalExposure = open.reduce((acc, t) => acc + (t.positionSize * t.entryPrice), 0);
    if (totalExposure === 0) return [];
    const byPair: Record<string, number> = {};
    open.forEach(t => {
      const exposure = t.positionSize * t.entryPrice;
      byPair[t.pair] = (byPair[t.pair] || 0) + exposure;
    });
    return Object.entries(byPair).map(([pair, exposure]) => ({
      name: pair,
      value: (exposure / totalExposure) * 100,
    }));
  }, [trades]);

  const handleSettingsSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveCapitalSettings(settings);
    setEditing(false);
  };

  const isDrawdownAlert =
    stats.maxDrawdownPct >= settings.maxDrawdownAlertPct && stats.maxDrawdownPct > 0;

  const pieColors = ['#10b981', '#f97316', '#6366f1', '#f43f5e', '#22c55e'];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Capital & Growth</h2>
          <p className="text-slate-400">
            Monitor your account balance, drawdowns, and risk-adjusted performance.
          </p>
        </div>
        <div className="flex gap-3">
          <Select
            value={period}
            onChange={(e) => setPeriod(e.target.value as PeriodFilter)}
            options={[
              { value: 'all', label: 'All Time' },
              { value: 'month', label: 'Last 30 Days' },
              { value: 'week', label: 'Last 7 Days' },
            ]}
            className="w-40"
          />
          <Button variant="secondary" onClick={() => setEditing(true)}>
            <Settings2 className="w-4 h-4 mr-2" />
            Capital Settings
          </Button>
        </div>
      </div>

      {/* Quick Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Current Balance</p>
            <p className="text-2xl font-bold text-white mt-1">${stats.currentBalance.toFixed(2)}</p>
            <p className="text-xs text-slate-500 mt-1">
              Started at ${stats.startingBalance.toFixed(2)}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-emerald-500/10">
            <DollarSign className="w-6 h-6 text-emerald-500" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Net Growth</p>
            <p
              className={`text-2xl font-bold mt-1 ${
                stats.netGrowthPct >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {stats.netGrowthPct >= 0 ? '+' : ''}
              {stats.netGrowthPct.toFixed(2)}%
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Realized PnL {stats.realizedPnL >= 0 ? '+' : ''}
              {stats.realizedPnL.toFixed(2)}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-sky-500/10">
            <Activity className="w-6 h-6 text-sky-400" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Max Drawdown</p>
            <p className="text-2xl font-bold text-rose-400 mt-1">
              -{stats.maxDrawdown.toFixed(2)} ({stats.maxDrawdownPct.toFixed(1)}%)
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Win/Loss Streak: {stats.streaks.maxWinStreak}W / {stats.streaks.maxLossStreak}L
            </p>
          </div>
          <div className="p-3 rounded-lg bg-rose-500/10">
            <ArrowDownRight className="w-6 h-6 text-rose-400" />
          </div>
        </div>
      </div>

      {/* Alert Banner */}
      {isDrawdownAlert && (
        <div className="bg-rose-950/70 border border-rose-500/40 rounded-xl p-4 flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 text-rose-400" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-rose-100">Drawdown Risk Alert</p>
            <p className="text-xs text-rose-200/80">
              Your max drawdown of {stats.maxDrawdownPct.toFixed(1)}% has breached your alert
              threshold of {settings.maxDrawdownAlertPct}%.
            </p>
          </div>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Equity Curve */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Equity Curve</h3>
            <span className="text-xs text-slate-500">
              {equityData.length} points · closed trades only
            </span>
          </div>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={equityData}>
                <defs>
                  <linearGradient id="equityFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="label" stroke="#64748b" />
                <YAxis stroke="#64748b" tickFormatter={(v) => `$${v}`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#020617',
                    border: '1px solid #1e293b',
                    borderRadius: 8,
                  }}
                  labelStyle={{ color: '#e5e7eb' }}
                  formatter={(value, name) => {
                    if (name === 'equity') return [`$${(value as number).toFixed(2)}`, 'Equity'];
                    return [value as number, name];
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="equity"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#equityFill)"
                  name="equity"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* PnL Breakdown & Risk-Adjusted */}
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h3 className="text-sm font-semibold text-white mb-4">PnL Breakdown</h3>
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pnlBreakdown}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={60}
                    innerRadius={30}
                    paddingAngle={4}
                  >
                    {pnlBreakdown.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={index === 0 ? '#10b981' : '#f97316'}
                      />
                    ))}
                  </Pie>
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 text-xs text-slate-400 space-y-1">
              <p>
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-2" />
                Realized: {stats.realizedPnL.toFixed(2)}
              </p>
              <p>
                <span className="inline-block w-2 h-2 rounded-full bg-orange-400 mr-2" />
                Unrealized (assumed): {stats.unrealizedPnL.toFixed(2)}
              </p>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h3 className="text-sm font-semibold text-white mb-3">Risk-Adjusted Returns</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Average R / Trade</span>
                <span className="font-medium text-emerald-400">
                  {stats.avgRPerTrade.toFixed(2)}R
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Sharpe (R-based)</span>
                <span className="font-medium text-sky-400">
                  {stats.sharpeRatio !== undefined
                    ? stats.sharpeRatio.toFixed(2)
                    : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Capital Allocation */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">Capital Allocation (Open Trades)</h3>
          <span className="text-xs text-slate-500">
            % of notional exposure by pair
          </span>
        </div>
        {openAllocation.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-6">
            No open trades. Open positions to see allocation.
          </p>
        ) : (
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={openAllocation}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={70}
                  innerRadius={35}
                  label={({ name, value }) => `${name} (${value.toFixed(1)}%)`}
                >
                  {openAllocation.map((entry, index) => (
                    <Cell
                      key={`alloc-${index}`}
                      fill={pieColors[index % pieColors.length]}
                    />
                  ))}
                </Pie>
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Settings Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Capital Settings</h3>
              <button
                onClick={() => setEditing(false)}
                className="text-slate-500 hover:text-slate-200"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSettingsSave} className="space-y-4">
              <Input
                label="Starting Balance"
                type="number"
                step="0.01"
                value={settings.startingBalance}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    startingBalance: Number(e.target.value || 0),
                  })
                }
              />
              <Input
                label="Max Drawdown Alert (%)"
                type="number"
                step="0.1"
                value={settings.maxDrawdownAlertPct}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    maxDrawdownAlertPct: Number(e.target.value || 0),
                  })
                }
              />
              <Input
                label="Default Risk per Trade (%)"
                type="number"
                step="0.1"
                value={settings.defaultRiskPerTradePct || ''}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    defaultRiskPerTradePct: Number(e.target.value || 0),
                  })
                }
              />
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setEditing(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  <ArrowUpRight className="w-4 h-4 mr-1" />
                  Save Settings
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};



