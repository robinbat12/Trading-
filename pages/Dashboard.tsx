import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
    TrendingUp, 
    TrendingDown, 
    DollarSign, 
    Activity, 
    Plus,
    ArrowUpRight,
    ArrowDownRight
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Trade, TradeStats, Outcome } from '../types';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface DashboardProps {
  trades: Trade[];
}

export const Dashboard: React.FC<DashboardProps> = ({ trades }) => {
  const stats: TradeStats = useMemo(() => {
    const closedTrades = trades.filter(t => t.outcome !== Outcome.OPEN);
    const wins = closedTrades.filter(t => t.outcome === Outcome.WIN);
    const totalTrades = closedTrades.length;
    const winRate = totalTrades ? (wins.length / totalTrades) * 100 : 0;
    const grossPnL = closedTrades.reduce((acc, t) => acc + (t.pnl || 0), 0);
    const avgR = totalTrades ? closedTrades.reduce((acc, t) => acc + (t.rMultiple || 0), 0) / totalTrades : 0;
    
    // Profit Factor (Gross Win / Gross Loss)
    const grossWin = wins.reduce((acc, t) => acc + (t.pnl || 0), 0);
    const grossLoss = Math.abs(closedTrades.filter(t => t.outcome === Outcome.LOSS).reduce((acc, t) => acc + (t.pnl || 0), 0));
    const profitFactor = grossLoss === 0 ? grossWin : grossWin / grossLoss;

    return {
      totalTrades,
      winRate: parseFloat(winRate.toFixed(1)),
      grossPnL: parseFloat(grossPnL.toFixed(2)),
      averageR: parseFloat(avgR.toFixed(2)),
      profitFactor: parseFloat(profitFactor.toFixed(2)),
      bestTrade: Math.max(...closedTrades.map(t => t.pnl || 0), 0),
      worstTrade: Math.min(...closedTrades.map(t => t.pnl || 0), 0),
    };
  }, [trades]);

  // Equity Curve Data
  const chartData = useMemo(() => {
      let balance = 0;
      return trades
        .filter(t => t.outcome !== Outcome.OPEN)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .map(t => {
            balance += (t.pnl || 0);
            return {
                date: new Date(t.date).toLocaleDateString(),
                balance: balance
            };
        });
  }, [trades]);

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
             {trend === 'up' ? <ArrowUpRight className="w-4 h-4 text-emerald-500"/> : <ArrowDownRight className="w-4 h-4 text-rose-500"/>}
             <span className={trend === 'up' ? 'text-emerald-500' : 'text-rose-500'}>{subtext}</span>
             <span className="text-slate-500 ml-1">vs last month</span>
          </div>
      )}
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Dashboard</h2>
          <p className="text-slate-400">Welcome back, here's your trading overview.</p>
        </div>
        <Link to="/journal?new=true">
            <Button className="w-full md:w-auto gap-2">
            <Plus className="w-4 h-4" />
            Log New Trade
            </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
            title="Total PnL" 
            value={`$${stats.grossPnL}`} 
            icon={DollarSign} 
            trend={stats.grossPnL >= 0 ? 'up' : 'down'}
            subtext="12%"
        />
        <StatCard 
            title="Win Rate" 
            value={`${stats.winRate}%`} 
            icon={TrendingUp}
            trend={stats.winRate > 50 ? 'up' : 'down'} 
            subtext="2.1%"
        />
        <StatCard 
            title="Profit Factor" 
            value={stats.profitFactor} 
            icon={Activity} 
            trend={stats.profitFactor > 1.5 ? 'up' : 'down'}
        />
        <StatCard 
            title="Avg R-Multiple" 
            value={`${stats.averageR}R`} 
            icon={TrendingDown}
            trend={stats.averageR > 1 ? 'up' : 'down'}
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
                        <YAxis stroke="#475569" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                        <Tooltip 
                            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                            itemStyle={{ color: '#f8fafc' }}
                        />
                        <Area type="monotone" dataKey="balance" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorBalance)" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
            <h3 className="text-lg font-semibold text-white mb-6">Recent Trades</h3>
            <div className="space-y-4">
                {trades.slice(0, 5).map(trade => (
                    <div key={trade.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-800/50 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${trade.outcome === Outcome.WIN ? 'bg-emerald-500' : trade.outcome === Outcome.LOSS ? 'bg-rose-500' : 'bg-slate-500'}`} />
                            <div>
                                <p className="text-sm font-medium text-white">{trade.pair}</p>
                                <p className="text-xs text-slate-500">{new Date(trade.date).toLocaleDateString()}</p>
                            </div>
                        </div>
                        <div className="text-right">
                             <p className={`text-sm font-medium ${trade.pnl && trade.pnl > 0 ? 'text-emerald-500' : trade.pnl && trade.pnl < 0 ? 'text-rose-500' : 'text-slate-400'}`}>
                                 {trade.pnl ? `$${trade.pnl}` : 'Open'}
                             </p>
                             <p className="text-xs text-slate-500">{trade.direction}</p>
                        </div>
                    </div>
                ))}
                {trades.length === 0 && <p className="text-slate-500 text-sm text-center py-4">No trades logged yet.</p>}
            </div>
        </div>
      </div>
    </div>
  );
};