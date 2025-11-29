
import React, { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
    TrendingUp, 
    TrendingDown, 
    DollarSign, 
    Activity, 
    Plus,
    ArrowUpRight,
    ArrowDownRight,
    Wallet,
    Edit2,
    Check,
    X,
    ShieldAlert,
    EyeOff
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Trade, TradeStats, Outcome, UserSettings } from '../types';
import { getGlobalStats, getUserSettings, saveUserSettings, checkRiskRules } from '../services/storage';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface DashboardProps {
  trades: Trade[];
}

export const Dashboard: React.FC<DashboardProps> = ({ trades }) => {
  const [settings, setSettings] = useState<UserSettings>({ 
      initialCapital: 10000, 
      currency: 'USD', 
      maxDailyLoss: 0, 
      maxWeeklyLoss: 0 
  });
  const [isEditingCapital, setIsEditingCapital] = useState(false);
  const [isEditingRisk, setIsEditingRisk] = useState(false);
  
  // Edit States
  const [editedCapital, setEditedCapital] = useState('');
  const [editedDailyRisk, setEditedDailyRisk] = useState('');
  const [editedWeeklyRisk, setEditedWeeklyRisk] = useState('');

  // Load settings on mount
  useEffect(() => {
    const s = getUserSettings();
    setSettings(s);
    setEditedDailyRisk(s.maxDailyLoss.toString());
    setEditedWeeklyRisk(s.maxWeeklyLoss.toString());
  }, []);

  const stats: TradeStats = useMemo(() => getGlobalStats(trades), [trades]);

  const missedCount = useMemo(() => trades.filter(t => t.outcome === Outcome.MISSED).length, [trades]);

  const currentCapital = useMemo(() => {
    return settings.initialCapital + stats.grossPnL;
  }, [settings.initialCapital, stats.grossPnL]);

  const roi = useMemo(() => {
    if (settings.initialCapital === 0) return 0;
    return ((stats.grossPnL / settings.initialCapital) * 100).toFixed(2);
  }, [stats.grossPnL, settings.initialCapital]);

  // Risk Alerts
  const riskViolations = useMemo(() => checkRiskRules(trades, settings), [trades, settings]);

  // Equity Curve Data
  const chartData = useMemo(() => {
      let runningBalance = settings.initialCapital;
      const data = [
          { date: 'Start', balance: settings.initialCapital, pnl: 0 }
      ];
      
      const sortedTrades = [...trades]
        .filter(t => t.outcome !== Outcome.OPEN && t.outcome !== Outcome.MISSED)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      sortedTrades.forEach(t => {
            runningBalance += (t.pnl || 0);
            data.push({
                date: new Date(t.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
                balance: runningBalance,
                pnl: t.pnl || 0
            });
        });

      return data;
  }, [trades, settings.initialCapital]);

  const handleSaveCapital = () => {
    const val = parseFloat(editedCapital);
    if (!isNaN(val) && val >= 0) {
        const newSettings = { ...settings, initialCapital: val };
        setSettings(saveUserSettings(newSettings));
        setIsEditingCapital(false);
    }
  };

  const handleSaveRisk = () => {
      const d = parseFloat(editedDailyRisk) || 0;
      const w = parseFloat(editedWeeklyRisk) || 0;
      const newSettings = { ...settings, maxDailyLoss: d, maxWeeklyLoss: w };
      setSettings(saveUserSettings(newSettings));
      setIsEditingRisk(false);
  };

  const startEditingCapital = () => {
      setEditedCapital(settings.initialCapital.toString());
      setIsEditingCapital(true);
  };

  const StatCard = ({ title, value, subtext, icon: Icon, trend }: any) => (
    <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-slate-400 text-sm font-medium">{title}</p>
          <h3 className="text-2xl font-bold text-white mt-1">{value}</h3>
        </div>
        <div className={`p-2 rounded-lg ${trend === 'up' ? 'bg-emerald-500/10' : trend === 'down' ? 'bg-rose-500/10' : 'bg-slate-800'}`}>
          <Icon className={`w-5 h-5 ${trend === 'up' ? 'text-emerald-500' : trend === 'down' ? 'text-rose-500' : 'text-slate-400'}`} />
        </div>
      </div>
      {subtext && (
          <div className="mt-4 flex items-center gap-1 text-sm">
             {trend === 'up' ? <ArrowUpRight className="w-4 h-4 text-emerald-500"/> : trend === 'down' ? <ArrowDownRight className="w-4 h-4 text-rose-500"/> : null}
             <span className={trend === 'up' ? 'text-emerald-500' : trend === 'down' ? 'text-rose-500' : 'text-slate-500'}>{subtext}</span>
          </div>
      )}
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Risk Alert Banner */}
      {riskViolations.length > 0 && (
          <div className="bg-rose-600/10 border border-rose-600/50 p-4 rounded-xl flex items-start gap-3 animate-pulse">
              <ShieldAlert className="w-6 h-6 text-rose-500 mt-0.5" />
              <div>
                  <h3 className="text-rose-500 font-bold">Risk Rule Breach Detected</h3>
                  <ul className="list-disc list-inside text-rose-400 text-sm mt-1">
                      {riskViolations.map((v, i) => (
                          <li key={i}>{v.rule} Exceeded: Current {v.current.toFixed(2)} (Limit: -{v.limit})</li>
                      ))}
                  </ul>
                  <p className="text-rose-400/80 text-xs mt-2 font-medium uppercase tracking-wide">Stop trading immediately and review your plan.</p>
              </div>
          </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Dashboard</h2>
          <p className="text-slate-400">Overview of your capital and performance.</p>
        </div>
        <Link to="/journal?new=true">
            <Button className="w-full md:w-auto gap-2">
            <Plus className="w-4 h-4" />
            Log New Trade
            </Button>
        </Link>
      </div>

      {/* Capital Overview Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
            <div className="p-6 border-b border-slate-800 bg-slate-950/30">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-emerald-500" /> Capital Management
                </h3>
            </div>
            <div className="grid grid-cols-2 divide-x divide-slate-800">
                {/* Initial Capital */}
                <div className="p-6">
                    <p className="text-slate-400 text-sm font-medium mb-1">Initial Capital</p>
                    <div className="flex items-center gap-3 h-10">
                        {isEditingCapital ? (
                            <div className="flex items-center gap-2 w-full">
                                <Input 
                                    autoFocus
                                    type="number" 
                                    value={editedCapital} 
                                    onChange={(e) => setEditedCapital(e.target.value)}
                                    className="h-8 py-1"
                                />
                                <button onClick={handleSaveCapital} className="p-1.5 bg-emerald-600 rounded text-white hover:bg-emerald-500"><Check className="w-4 h-4"/></button>
                                <button onClick={() => setIsEditingCapital(false)} className="p-1.5 bg-slate-700 rounded text-white hover:bg-slate-600"><X className="w-4 h-4"/></button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3 group w-full">
                                <span className="text-2xl font-bold text-white">${settings.initialCapital.toLocaleString()}</span>
                                <button onClick={startEditingCapital} className="text-slate-600 hover:text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity ml-auto md:ml-2">
                                    <Edit2 className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Current Capital */}
                <div className="p-6 bg-slate-800/20">
                    <p className="text-slate-400 text-sm font-medium mb-1">Current Balance</p>
                    <div className="h-10 flex items-center">
                        <span className="text-3xl font-bold text-white">${currentCapital.toLocaleString()}</span>
                    </div>
                </div>
            </div>
        </div>

        {/* Risk Rules Section */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
            <div className="p-6 border-b border-slate-800 bg-slate-950/30 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-rose-500" /> Risk Rules
                </h3>
                {!isEditingRisk ? (
                     <button onClick={() => setIsEditingRisk(true)} className="text-xs text-slate-400 hover:text-white flex items-center gap-1">
                         <Edit2 className="w-3 h-3" /> Edit Limits
                     </button>
                ) : (
                    <div className="flex gap-2">
                        <button onClick={handleSaveRisk} className="text-xs text-emerald-500 hover:text-emerald-400 font-bold">Save</button>
                        <button onClick={() => setIsEditingRisk(false)} className="text-xs text-slate-400 hover:text-white">Cancel</button>
                    </div>
                )}
            </div>
            <div className="p-6 grid grid-cols-2 gap-6">
                 <div>
                     <p className="text-slate-400 text-xs uppercase tracking-wider font-bold mb-1">Max Daily Loss</p>
                     {isEditingRisk ? (
                         <div className="relative">
                             <Input type="number" value={editedDailyRisk} onChange={(e) => setEditedDailyRisk(e.target.value)} placeholder="0" className="pl-6" />
                             <span className="absolute left-2.5 top-2 text-slate-500">$</span>
                         </div>
                     ) : (
                         <span className="text-xl font-medium text-white">{settings.maxDailyLoss > 0 ? `$${settings.maxDailyLoss}` : 'Disabled'}</span>
                     )}
                 </div>
                 <div>
                     <p className="text-slate-400 text-xs uppercase tracking-wider font-bold mb-1">Max Weekly Loss</p>
                     {isEditingRisk ? (
                         <div className="relative">
                             <Input type="number" value={editedWeeklyRisk} onChange={(e) => setEditedWeeklyRisk(e.target.value)} placeholder="0" className="pl-6" />
                             <span className="absolute left-2.5 top-2 text-slate-500">$</span>
                         </div>
                     ) : (
                         <span className="text-xl font-medium text-white">{settings.maxWeeklyLoss > 0 ? `$${settings.maxWeeklyLoss}` : 'Disabled'}</span>
                     )}
                 </div>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
            title="Total PnL" 
            value={`$${stats.grossPnL}`} 
            icon={DollarSign} 
            trend={stats.grossPnL >= 0 ? 'up' : 'down'}
            subtext={`${roi}% ROI`}
        />
        <StatCard 
            title="Win Rate" 
            value={`${stats.winRate}%`} 
            icon={TrendingUp}
            trend={stats.winRate > 50 ? 'up' : 'down'} 
            subtext={`${stats.totalTrades} Trades`}
        />
        <StatCard 
            title="Profit Factor" 
            value={stats.profitFactor} 
            icon={Activity} 
            trend={stats.profitFactor > 1.5 ? 'up' : 'down'}
        />
        <StatCard 
            title="Missed Opportunities" 
            value={missedCount} 
            icon={EyeOff}
            trend="neutral"
            subtext="Tracked"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Equity Curve */}
        <div className="lg:col-span-2 bg-slate-900 rounded-xl border border-slate-800 p-6">
            <h3 className="text-lg font-semibold text-white mb-6">Equity Curve</h3>
            <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                        <defs>
                            <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <XAxis dataKey="date" stroke="#475569" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#475569" fontSize={12} tickLine={false} axisLine={false} domain={['auto', 'auto']} tickFormatter={(value) => `$${value}`} />
                        <Tooltip 
                            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                            itemStyle={{ color: '#f8fafc' }}
                            formatter={(value: any) => [`$${value.toLocaleString()}`, 'Balance']}
                        />
                        <Area type="monotone" dataKey="balance" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorBalance)" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* Streak & Stats */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 space-y-6">
            <h3 className="text-lg font-semibold text-white">Current Form</h3>
            
            <div className="bg-slate-800/50 rounded-lg p-4 flex justify-between items-center">
                <div>
                    <p className="text-slate-400 text-xs uppercase font-bold">Current Streak</p>
                    <p className={`text-2xl font-bold ${stats.currentStreak > 0 ? 'text-emerald-500' : stats.currentStreak < 0 ? 'text-rose-500' : 'text-slate-300'}`}>
                        {Math.abs(stats.currentStreak)} {stats.currentStreak > 0 ? 'Wins' : stats.currentStreak < 0 ? 'Losses' : '-'}
                    </p>
                </div>
                {stats.currentStreak > 0 ? <TrendingUp className="w-8 h-8 text-emerald-500/50" /> : <TrendingDown className="w-8 h-8 text-rose-500/50" />}
            </div>

            <div className="grid grid-cols-2 gap-4">
                 <div className="bg-slate-800/30 p-3 rounded-lg">
                      <p className="text-slate-500 text-xs">Best Streak</p>
                      <p className="text-lg font-semibold text-emerald-400">{stats.maxWinStreak} Wins</p>
                 </div>
                 <div className="bg-slate-800/30 p-3 rounded-lg">
                      <p className="text-slate-500 text-xs">Worst Streak</p>
                      <p className="text-lg font-semibold text-rose-400">{stats.maxLossStreak} Losses</p>
                 </div>
            </div>
            
            <div className="pt-4 border-t border-slate-800">
                <p className="text-slate-400 text-xs uppercase font-bold mb-2">Max Drawdown</p>
                <div className="flex items-end gap-2">
                    <span className="text-2xl font-bold text-rose-500">-${stats.maxDrawdown}</span>
                    <span className="text-slate-500 text-xs mb-1.5">from peak</span>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
