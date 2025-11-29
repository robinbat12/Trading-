
import React, { useMemo, useState } from 'react';
import { Trade, TradeStats, Outcome } from '../types';
import { getGroupedStats, getGlobalStats, getCalendarHeatmap, calculateDrawdownSeries, getUserSettings } from '../services/storage';
import { generateTraderReport } from '../services/gemini';
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { BrainCircuit, Clock, AlertTriangle, Crosshair, TrendingUp, Sparkles, Calendar, Activity, Zap } from 'lucide-react';
import { Button } from '../components/ui/Button';
import ReactMarkdown from 'react-markdown';

interface AnalyticsProps {
  trades: Trade[];
}

export const Analytics: React.FC<AnalyticsProps> = ({ trades }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'strategies' | 'psychology' | 'patterns'>('overview');
  const [report, setReport] = useState<string | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);

  // --- Derived Stats ---
  const globalStats = useMemo(() => getGlobalStats(trades), [trades]);
  const userSettings = getUserSettings();
  const setupStats = useMemo(() => getGroupedStats(trades, 'setups'), [trades]);
  const timeframeStats = useMemo(() => getGroupedStats(trades, 'timeframes'), [trades]);
  const emotionStats = useMemo(() => getGroupedStats(trades, 'entryEmotion'), [trades]);
  const mistakeStats = useMemo(() => getGroupedStats(trades, 'mistakes'), [trades]);
  
  // New Analytics Data
  const heatmapData = useMemo(() => getCalendarHeatmap(trades, 35), [trades]);
  const drawdownData = useMemo(() => calculateDrawdownSeries(trades, userSettings.initialCapital), [trades, userSettings.initialCapital]);

  // Time of Day Analysis
  const timeOfDayStats = useMemo(() => {
      const hours = Array.from({length: 24}, (_, i) => i);
      const raw = trades.filter(t => t.outcome !== Outcome.OPEN).reduce((acc, t) => {
          const hour = new Date(t.date).getHours();
          if (!acc[hour]) acc[hour] = { wins: 0, total: 0, pnl: 0 };
          acc[hour].total++;
          if (t.outcome === Outcome.WIN) acc[hour].wins++;
          acc[hour].pnl += (t.pnl || 0);
          return acc;
      }, {} as Record<number, any>);
  
      return hours.map(h => ({
          hour: h,
          winRate: raw[h]?.total ? (raw[h].wins / raw[h].total) * 100 : 0,
          pnl: raw[h]?.pnl || 0,
          total: raw[h]?.total || 0
      })).filter(h => h.total > 0);
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
          <h2 className="text-2xl font-bold text-white">Performance Analytics</h2>
          <p className="text-slate-400">Deep dive into your data to find your edge.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 space-x-6 overflow-x-auto">
          <button onClick={() => setActiveTab('overview')} className={`pb-4 text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'overview' ? 'text-emerald-500 border-b-2 border-emerald-500' : 'text-slate-400 hover:text-white'}`}>
              Overview & Calendar
          </button>
          <button onClick={() => setActiveTab('strategies')} className={`pb-4 text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'strategies' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-slate-400 hover:text-white'}`}>
              Strategies & Setups
          </button>
          <button onClick={() => setActiveTab('psychology')} className={`pb-4 text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'psychology' ? 'text-purple-500 border-b-2 border-purple-500' : 'text-slate-400 hover:text-white'}`}>
              Psychology
          </button>
          <button onClick={() => setActiveTab('patterns')} className={`pb-4 text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'patterns' ? 'text-orange-500 border-b-2 border-orange-500' : 'text-slate-400 hover:text-white'}`}>
              Time & Patterns
          </button>
      </div>

      {/* Content */}
      <div className="min-h-[400px]">
          
          {/* --- OVERVIEW TAB --- */}
          {activeTab === 'overview' && (
              <div className="space-y-8 animate-fadeIn">
                  
                  {/* Key Advanced Metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                          <p className="text-slate-400 text-xs uppercase font-bold">Expectancy</p>
                          <p className={`text-2xl font-bold mt-1 ${globalStats.expectancy > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                              ${globalStats.expectancy}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">per trade</p>
                      </div>
                      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                           <p className="text-slate-400 text-xs uppercase font-bold">Profit Factor</p>
                          <p className={`text-2xl font-bold mt-1 ${globalStats.profitFactor > 1.5 ? 'text-emerald-500' : 'text-yellow-500'}`}>
                              {globalStats.profitFactor}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">Gross Win / Loss</p>
                      </div>
                      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                           <p className="text-slate-400 text-xs uppercase font-bold">Max Drawdown</p>
                          <p className="text-2xl font-bold mt-1 text-rose-500">
                              -${globalStats.maxDrawdown}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">Peak to Valley</p>
                      </div>
                       <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                           <p className="text-slate-400 text-xs uppercase font-bold">Win Rate</p>
                          <p className="text-2xl font-bold mt-1 text-blue-500">
                              {globalStats.winRate}%
                          </p>
                          <p className="text-xs text-slate-500 mt-1">on {globalStats.totalTrades} trades</p>
                      </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                       {/* Profit Calendar Heatmap */}
                       <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                           <div className="flex items-center gap-2 mb-6">
                               <Calendar className="w-5 h-5 text-emerald-500" />
                               <h3 className="text-lg font-semibold text-white">Profit Calendar</h3>
                           </div>
                           <div className="grid grid-cols-7 gap-2">
                               {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d,i) => (
                                   <div key={i} className="text-center text-xs text-slate-500 font-bold mb-2">{d}</div>
                               ))}
                               {heatmapData.map((day, idx) => (
                                   <div 
                                      key={idx} 
                                      className={`aspect-square rounded flex flex-col items-center justify-center border border-slate-800/50 transition-all hover:scale-105 cursor-default group relative ${
                                          day.value > 0 ? 'bg-emerald-500/20 text-emerald-400' : 
                                          day.value < 0 ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-800 text-slate-500'
                                      }`}
                                   >
                                       <span className="text-xs font-medium">{day.day}</span>
                                       {/* Tooltip */}
                                       <div className="absolute bottom-full mb-2 bg-slate-950 text-white text-xs px-2 py-1 rounded border border-slate-700 opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-10">
                                           {day.date}: ${day.value.toFixed(2)}
                                       </div>
                                   </div>
                               ))}
                           </div>
                       </div>

                       {/* Drawdown Chart */}
                       <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                           <div className="flex items-center gap-2 mb-6">
                               <Activity className="w-5 h-5 text-rose-500" />
                               <h3 className="text-lg font-semibold text-white">Drawdown Curve</h3>
                           </div>
                           <div className="h-[250px] w-full">
                               <ResponsiveContainer width="100%" height="100%">
                                   <AreaChart data={drawdownData}>
                                        <defs>
                                            <linearGradient id="colorDD" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                                                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <XAxis dataKey="date" hide />
                                        <YAxis stroke="#475569" fontSize={12} tickFormatter={v => `${v}%`} />
                                        <Tooltip 
                                            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }} 
                                            formatter={(val: number) => [`${val.toFixed(2)}%`, 'Drawdown']}
                                        />
                                        <Area type="monotone" dataKey="percentage" stroke="#f43f5e" fill="url(#colorDD)" />
                                   </AreaChart>
                               </ResponsiveContainer>
                           </div>
                       </div>
                  </div>
              </div>
          )}

          {/* --- STRATEGIES TAB --- */}
          {activeTab === 'strategies' && (
              <div className="space-y-8 animate-fadeIn">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      {/* Setup Performance */}
                      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                          <div className="flex items-center gap-2 mb-6">
                              <Crosshair className="w-5 h-5 text-emerald-500"/>
                              <h4 className="text-lg font-semibold text-white">Best Performing Setups</h4>
                          </div>
                          <div className="space-y-4">
                              {setupStats.map(s => (
                                  <div key={s.name} className="flex items-center justify-between p-3 rounded-lg bg-slate-800/30 border border-slate-800 hover:bg-slate-800/50 transition-colors">
                                      <div className="flex items-center gap-3">
                                          <div className={`w-1.5 h-10 rounded-full ${s.netPnL >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                                          <div>
                                              <p className="font-bold text-white text-sm">{s.name}</p>
                                              <p className="text-xs text-slate-500">{s.totalTrades} trades • {s.winRate.toFixed(0)}% WR</p>
                                          </div>
                                      </div>
                                      <div className="text-right">
                                           <p className={`font-bold ${s.netPnL >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>${s.netPnL.toFixed(2)}</p>
                                           <p className="text-xs text-blue-400">{s.avgR.toFixed(2)}R Avg</p>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </div>

                      {/* Timeframe Performance */}
                      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                           <div className="flex items-center gap-2 mb-6">
                              <Clock className="w-5 h-5 text-blue-500"/>
                              <h4 className="text-lg font-semibold text-white">Performance by Timeframe</h4>
                          </div>
                          <div className="h-[300px]">
                              <ResponsiveContainer width="100%" height="100%">
                                  <BarChart data={timeframeStats}>
                                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                      <XAxis dataKey="name" stroke="#64748b" />
                                      <YAxis stroke="#64748b" />
                                      <Tooltip cursor={{fill: '#334155', opacity: 0.2}} contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }} />
                                      <Bar dataKey="netPnL" radius={[4, 4, 0, 0]}>
                                          {timeframeStats.map((entry, index) => (
                                              <Cell key={`cell-${index}`} fill={entry.netPnL >= 0 ? '#3b82f6' : '#f43f5e'} />
                                          ))}
                                      </Bar>
                                  </BarChart>
                              </ResponsiveContainer>
                          </div>
                      </div>
                  </div>
              </div>
          )}

          {/* --- PSYCHOLOGY TAB --- */}
          {activeTab === 'psychology' && (
              <div className="space-y-8 animate-fadeIn">
                   
                   {/* AI Report Section */}
                   <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-emerald-500/30 rounded-xl p-6 relative overflow-hidden">
                       <div className="absolute top-0 right-0 p-4 opacity-10">
                           <Sparkles className="w-32 h-32 text-emerald-500" />
                       </div>
                       <div className="relative z-10">
                           <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    <Sparkles className="w-5 h-5 text-emerald-500" /> AI Psychology Coach
                                </h3>
                                <Button onClick={handleGenerateReport} disabled={loadingReport || trades.length < 3} size="sm">
                                    {loadingReport ? 'Analyzing...' : 'Generate Analysis'}
                                </Button>
                           </div>
                           {report ? (
                               <div className="prose prose-invert prose-sm max-w-none bg-slate-900/50 p-4 rounded-lg border border-slate-800">
                                   <ReactMarkdown>{report}</ReactMarkdown>
                               </div>
                           ) : (
                               <div className="text-slate-400 text-sm">
                                   Generate a personalized report to detect hidden behavioral patterns.
                               </div>
                           )}
                       </div>
                  </div>

                   <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                       {/* Emotion Impact */}
                       <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                           <div className="flex items-center gap-2 mb-6">
                              <BrainCircuit className="w-5 h-5 text-purple-500"/>
                              <h4 className="text-lg font-semibold text-white">Entry Emotion vs Result</h4>
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
                              {emotionStats.length === 0 && <p className="text-slate-500 text-center py-8">Log entry emotions to see data.</p>}
                          </div>
                       </div>

                       {/* Mistakes */}
                       <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                           <div className="flex items-center gap-2 mb-6">
                              <AlertTriangle className="w-5 h-5 text-rose-500"/>
                              <h4 className="text-lg font-semibold text-white">Cost of Mistakes</h4>
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
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                      <div className="flex items-center gap-2 mb-6">
                          <Clock className="w-5 h-5 text-orange-500"/>
                          <h4 className="text-lg font-semibold text-white">Time of Day Performance</h4>
                      </div>
                      <div className="h-[300px]">
                          <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={timeOfDayStats}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                  <XAxis dataKey="hour" stroke="#64748b" tickFormatter={h => `${h}:00`} />
                                  <YAxis stroke="#64748b" yAxisId="left" />
                                  <YAxis stroke="#f59e0b" orientation="right" yAxisId="right" unit="%" domain={[0, 100]} />
                                  <Tooltip cursor={{fill: '#334155', opacity: 0.2}} contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }} />
                                  <Bar yAxisId="left" dataKey="pnl" name="PnL" radius={[4, 4, 0, 0]}>
                                      {timeOfDayStats.map((entry, index) => (
                                          <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? '#10b981' : '#f43f5e'} />
                                      ))}
                                  </Bar>
                                  <Bar yAxisId="right" dataKey="winRate" name="Win Rate" fill="#f59e0b" radius={[4, 4, 0, 0]} opacity={0.5} />
                              </BarChart>
                          </ResponsiveContainer>
                      </div>
                  </div>
              </div>
          )}
      </div>
    </div>
  );
};
