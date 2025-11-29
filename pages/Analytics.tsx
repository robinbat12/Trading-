import React, { useMemo, useState } from 'react';
import { Trade, TradeStats, Outcome } from '../types';
import { getGroupedStats, getGlobalStats } from '../services/storage';
import { generateTraderReport } from '../services/gemini';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { BrainCircuit, Clock, AlertTriangle, Crosshair, TrendingUp, Sparkles } from 'lucide-react';
import { Button } from '../components/ui/Button';
import ReactMarkdown from 'react-markdown';

interface AnalyticsProps {
  trades: Trade[];
}

export const Analytics: React.FC<AnalyticsProps> = ({ trades }) => {
  const [activeTab, setActiveTab] = useState<'strategies' | 'psychology' | 'patterns'>('strategies');
  const [report, setReport] = useState<string | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);

  // --- Derived Stats ---
  const globalStats = useMemo(() => getGlobalStats(trades), [trades]);
  const setupStats = useMemo(() => getGroupedStats(trades, 'setups'), [trades]);
  const timeframeStats = useMemo(() => getGroupedStats(trades, 'timeframes'), [trades]);
  const emotionStats = useMemo(() => getGroupedStats(trades, 'emotions'), [trades]);
  const mistakeStats = useMemo(() => getGroupedStats(trades, 'mistakes'), [trades]);

  // Recommended Setup
  const bestSetup = useMemo(() => {
    // Filter for reliable data (at least 2 trades) and sort by Win Rate then R
    const valid = setupStats.filter(s => s.totalTrades >= 2).sort((a,b) => b.winRate - a.winRate || b.avgR - a.avgR);
    return valid.length > 0 ? valid[0] : null;
  }, [setupStats]);

  // Pattern Data (Day of Week)
  const dayStats = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const raw = trades.filter(t => t.outcome !== Outcome.OPEN).reduce((acc, t) => {
        const day = new Date(t.date).getDay();
        if (!acc[day]) acc[day] = { wins: 0, total: 0, pnl: 0 };
        acc[day].total++;
        if (t.outcome === Outcome.WIN) acc[day].wins++;
        acc[day].pnl += (t.pnl || 0);
        return acc;
    }, {} as Record<number, any>);

    return days.map((name, index) => ({
        name,
        winRate: raw[index]?.total ? (raw[index].wins / raw[index].total) * 100 : 0,
        pnl: raw[index]?.pnl || 0
    }));
  }, [trades]);

  // Pattern Data (Hour of Day)
  const hourStats = useMemo(() => {
      const hours = Array.from({length: 24}, (_, i) => i);
      const raw = trades.filter(t => t.outcome !== Outcome.OPEN).reduce((acc, t) => {
          const hour = new Date(t.date).getHours();
          if (!acc[hour]) acc[hour] = { wins: 0, total: 0 };
          acc[hour].total++;
          if (t.outcome === Outcome.WIN) acc[hour].wins++;
          return acc;
      }, {} as Record<number, any>);
  
      return hours.map(h => ({
          hour: h,
          winRate: raw[h]?.total ? (raw[h].wins / raw[h].total) * 100 : 0,
          total: raw[h]?.total || 0
      })).filter(h => h.total > 0); // Only show active hours
  }, [trades]);

  const handleGenerateReport = async () => {
    setLoadingReport(true);
    const result = await generateTraderReport(trades, globalStats);
    setReport(result);
    setLoadingReport(false);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Master Your Performance</h2>
          <p className="text-slate-400">Deep dive into your strategies, psychology, and hidden patterns.</p>
        </div>
      </div>

      {/* AI Report Card Section */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-emerald-500/30 rounded-xl p-6 relative overflow-hidden">
           <div className="absolute top-0 right-0 p-4 opacity-10">
               <Sparkles className="w-32 h-32 text-emerald-500" />
           </div>
           
           <div className="relative z-10">
               <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-emerald-500" /> AI Trader Report Card
                    </h3>
                    <Button onClick={handleGenerateReport} disabled={loadingReport || trades.length < 3} size="sm">
                        {loadingReport ? 'Analyzing...' : 'Generate Report'}
                    </Button>
               </div>
               
               {report ? (
                   <div className="prose prose-invert prose-sm max-w-none bg-slate-900/50 p-4 rounded-lg border border-slate-800">
                       <ReactMarkdown>{report}</ReactMarkdown>
                   </div>
               ) : (
                   <div className="text-slate-400 text-sm">
                       {trades.length < 3 
                         ? "Log at least 3 trades to generate your first AI report." 
                         : "Click 'Generate Report' to get a personalized grade, strength analysis, and psychology review from Gemini AI."}
                   </div>
               )}
           </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 space-x-6 overflow-x-auto">
          <button onClick={() => setActiveTab('strategies')} className={`pb-4 text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'strategies' ? 'text-emerald-500 border-b-2 border-emerald-500' : 'text-slate-400 hover:text-white'}`}>
              Strategy & Timeframes
          </button>
          <button onClick={() => setActiveTab('psychology')} className={`pb-4 text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'psychology' ? 'text-purple-500 border-b-2 border-purple-500' : 'text-slate-400 hover:text-white'}`}>
              Psychology & Mistakes
          </button>
          <button onClick={() => setActiveTab('patterns')} className={`pb-4 text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'patterns' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-slate-400 hover:text-white'}`}>
              Pattern Recognition
          </button>
      </div>

      {/* Content */}
      <div className="min-h-[400px]">
          
          {/* --- STRATEGIES TAB --- */}
          {activeTab === 'strategies' && (
              <div className="space-y-8 animate-fadeIn">
                  
                  {/* Recommended Setup Card */}
                  {bestSetup && (
                      <div className="bg-emerald-900/10 border border-emerald-500/20 rounded-xl p-4 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                              <div className="bg-emerald-500/20 p-3 rounded-full">
                                  <Crosshair className="w-6 h-6 text-emerald-500" />
                              </div>
                              <div>
                                  <h4 className="text-emerald-400 font-bold text-sm uppercase tracking-wider">Top Performing Setup</h4>
                                  <p className="text-xl font-bold text-white">{bestSetup.name}</p>
                              </div>
                          </div>
                          <div className="text-right hidden md:block">
                              <p className="text-emerald-400 font-bold text-xl">{bestSetup.winRate.toFixed(1)}% WR</p>
                              <p className="text-slate-400 text-sm">{bestSetup.avgR.toFixed(2)}R Avg</p>
                          </div>
                      </div>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      {/* Setup Performance */}
                      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                          <div className="flex items-center gap-2 mb-6">
                              <Crosshair className="w-5 h-5 text-emerald-500"/>
                              <h4 className="text-lg font-semibold text-white">Win Rate by Setup</h4>
                          </div>
                          <div className="h-[300px]">
                              <ResponsiveContainer width="100%" height="100%">
                                  <BarChart data={setupStats} layout="vertical" margin={{ left: 20 }}>
                                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                                      <XAxis type="number" stroke="#64748b" unit="%" domain={[0, 100]} />
                                      <YAxis dataKey="name" type="category" stroke="#94a3b8" width={100} />
                                      <Tooltip cursor={{fill: '#334155', opacity: 0.2}} contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }} />
                                      <Bar dataKey="winRate" radius={[0, 4, 4, 0]}>
                                        {setupStats.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.winRate > 50 ? '#10b981' : '#f43f5e'} />
                                        ))}
                                      </Bar>
                                  </BarChart>
                              </ResponsiveContainer>
                          </div>
                      </div>

                      {/* Timeframe Performance */}
                      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                           <div className="flex items-center gap-2 mb-6">
                              <Clock className="w-5 h-5 text-blue-500"/>
                              <h4 className="text-lg font-semibold text-white">Performance by Timeframe</h4>
                          </div>
                          <div className="overflow-x-auto">
                              <table className="w-full text-sm text-left">
                                  <thead className="text-slate-500 border-b border-slate-800">
                                      <tr>
                                          <th className="pb-3 pl-2">TF</th>
                                          <th className="pb-3 text-right">Trades</th>
                                          <th className="pb-3 text-right">Win Rate</th>
                                          <th className="pb-3 text-right">Avg R</th>
                                      </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-800">
                                      {timeframeStats.map(stat => (
                                          <tr key={stat.name} className="hover:bg-slate-800/50">
                                              <td className="py-3 pl-2 text-white font-medium">{stat.name}</td>
                                              <td className="py-3 text-right text-slate-400">{stat.totalTrades}</td>
                                              <td className={`py-3 text-right font-medium ${stat.winRate >= 50 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                  {stat.winRate.toFixed(1)}%
                                              </td>
                                              <td className="py-3 text-right text-blue-400">{stat.avgR.toFixed(2)}R</td>
                                          </tr>
                                      ))}
                                  </tbody>
                              </table>
                          </div>
                      </div>
                  </div>
              </div>
          )}

          {/* --- PSYCHOLOGY TAB --- */}
          {activeTab === 'psychology' && (
              <div className="space-y-8 animate-fadeIn">
                   <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                       {/* Emotion Impact */}
                       <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                           <div className="flex items-center gap-2 mb-6">
                              <BrainCircuit className="w-5 h-5 text-purple-500"/>
                              <h4 className="text-lg font-semibold text-white">Emotional Impact on PnL</h4>
                          </div>
                          <div className="space-y-4">
                              {emotionStats.map(stat => (
                                  <div key={stat.name} className="flex items-center justify-between">
                                      <div className="flex items-center gap-3">
                                          <span className="text-sm font-medium text-slate-200 w-24">{stat.name}</span>
                                          <div className="h-2 w-32 bg-slate-800 rounded-full overflow-hidden">
                                              <div 
                                                className={`h-full rounded-full ${stat.winRate > 50 ? 'bg-emerald-500' : 'bg-rose-500'}`} 
                                                style={{ width: `${stat.winRate}%` }}
                                              />
                                          </div>
                                      </div>
                                      <div className="text-right">
                                          <span className={`block text-sm font-bold ${stat.netPnL > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                              {stat.netPnL > 0 ? '+' : ''}{stat.netPnL.toFixed(2)}
                                          </span>
                                          <span className="text-xs text-slate-500">{stat.totalTrades} trades</span>
                                      </div>
                                  </div>
                              ))}
                              {emotionStats.length === 0 && <p className="text-slate-500 text-center py-8">Log emotions to see data.</p>}
                          </div>
                       </div>

                       {/* Costly Mistakes */}
                       <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                           <div className="flex items-center gap-2 mb-6">
                              <AlertTriangle className="w-5 h-5 text-rose-500"/>
                              <h4 className="text-lg font-semibold text-white">Costliest Mistakes</h4>
                          </div>
                           <div className="space-y-4">
                              {mistakeStats.map(stat => (
                                  <div key={stat.name} className="bg-rose-500/5 border border-rose-500/10 p-3 rounded-lg flex justify-between items-center">
                                      <div>
                                          <h5 className="text-sm font-medium text-rose-200">{stat.name}</h5>
                                          <p className="text-xs text-rose-400/70">{stat.totalTrades} occurrences</p>
                                      </div>
                                      <div className="text-right">
                                          <span className="block text-sm font-bold text-rose-500">${Math.abs(stat.netPnL).toFixed(2)} Loss</span>
                                      </div>
                                  </div>
                              ))}
                              {mistakeStats.length === 0 && <p className="text-slate-500 text-center py-8">Great job! No mistakes detected yet.</p>}
                          </div>
                       </div>
                   </div>
              </div>
          )}

          {/* --- PATTERNS TAB --- */}
          {activeTab === 'patterns' && (
              <div className="space-y-8 animate-fadeIn">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      {/* Day of Week */}
                      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                          <div className="flex items-center gap-2 mb-6">
                              <TrendingUp className="w-5 h-5 text-blue-500"/>
                              <h4 className="text-lg font-semibold text-white">Performance by Day</h4>
                          </div>
                          <div className="h-[300px]">
                              <ResponsiveContainer width="100%" height="100%">
                                  <BarChart data={dayStats}>
                                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                      <XAxis dataKey="name" stroke="#64748b" />
                                      <YAxis stroke="#64748b" />
                                      <Tooltip cursor={{fill: '#334155', opacity: 0.2}} contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }} />
                                      <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                                          {dayStats.map((entry, index) => (
                                              <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? '#10b981' : '#f43f5e'} />
                                          ))}
                                      </Bar>
                                  </BarChart>
                              </ResponsiveContainer>
                          </div>
                      </div>

                      {/* Time of Day */}
                      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                          <div className="flex items-center gap-2 mb-6">
                              <Clock className="w-5 h-5 text-orange-500"/>
                              <h4 className="text-lg font-semibold text-white">Win Rate by Hour</h4>
                          </div>
                          <div className="h-[300px]">
                              <ResponsiveContainer width="100%" height="100%">
                                  <BarChart data={hourStats}>
                                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                      <XAxis dataKey="hour" stroke="#64748b" tickFormatter={h => `${h}:00`} />
                                      <YAxis stroke="#64748b" unit="%" domain={[0, 100]} />
                                      <Tooltip cursor={{fill: '#334155', opacity: 0.2}} contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }} />
                                      <Bar dataKey="winRate" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                                  </BarChart>
                              </ResponsiveContainer>
                          </div>
                      </div>
                  </div>
              </div>
          )}
      </div>
    </div>
  );
};