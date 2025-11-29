
import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Download, Trash2, Edit2, ExternalLink, ChevronDown, Tag, Calculator, CheckCircle, XCircle, Wallet, PlayCircle, SkipBack, SkipForward, Filter, X, Unlock, Lock, Clock, AlertTriangle, EyeOff, Image } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input, Select, Textarea, TagSelector } from '../components/ui/Input';
import { Trade, Direction, Outcome, STANDARD_SETUPS, TIMEFRAMES, EMOTIONS, MISTAKES, Session, Confidence, MARKET_CONDITIONS } from '../types';
import { calculateTradeMetrics, getGlobalStats, getUserSettings, calculateDuration } from '../services/storage';

interface JournalProps {
  trades: Trade[];
  onSave: (trade: Trade) => void;
  onDelete: (id: string) => void;
}

export const Journal: React.FC<JournalProps> = ({ trades, onSave, onDelete }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // --- Confirmation Modal State ---
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [pendingTrade, setPendingTrade] = useState<Trade | null>(null);

  // --- Filter State ---
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
      outcome: 'All',
      setup: 'All',
      session: 'All',
      mistake: 'All',
      timeframe: 'All'
  });

  // --- Capital Integration ---
  const [settings] = useState(getUserSettings());
  const globalStats = useMemo(() => getGlobalStats(trades), [trades]);
  const currentBalance = settings.initialCapital + globalStats.grossPnL;
  
  // --- Form State ---
  const initialFormState: Partial<Trade> = {
    date: new Date().toISOString().slice(0, 16),
    direction: Direction.LONG,
    riskAmount: 1, 
    setups: [],
    timeframes: [],
    mistakes: [],
    emotions: [],
    session: undefined,
    confidence: undefined,
    marketCondition: undefined,
    entryEmotion: undefined,
    exitEmotion: undefined,
    isManualPnL: false,
    pnl: undefined,
    exitDate: undefined,
    skipReason: '',
    outcome: Outcome.OPEN
  };
  const [formData, setFormData] = useState<Partial<Trade>>(initialFormState);
  const [isMissedTrade, setIsMissedTrade] = useState(false);

  // --- Position Sizing State ---
  const [sizingMode, setSizingMode] = useState<'MANUAL' | 'UNITS' | 'VALUE'>('MANUAL');
  const [valueModeStopPct, setValueModeStopPct] = useState<string>('');

  // --- Replay Mode State ---
  const [replayIndex, setReplayIndex] = useState(0);

  // Effect to handle URL params
  useEffect(() => {
    if (searchParams.get('new') === 'true') {
        const entry = searchParams.get('entry');
        const stop = searchParams.get('stop');
        const size = searchParams.get('size');
        const dir = searchParams.get('dir');
        
        setFormData(prev => ({
            ...prev,
            entryPrice: entry ? parseFloat(entry) : prev.entryPrice,
            stopLoss: stop ? parseFloat(stop) : prev.stopLoss,
            positionSize: size ? parseFloat(size) : prev.positionSize,
            direction: (dir === 'Long' || dir === 'Short') ? (dir as Direction) : prev.direction
        }));
        setIsFormOpen(true);
    }
  }, [searchParams]);

  // Update missed status when loading form data (e.g. edit mode)
  useEffect(() => {
      if (formData.outcome === Outcome.MISSED) {
          setIsMissedTrade(true);
      } else {
          setIsMissedTrade(false);
      }
  }, [formData.outcome]);

  // --- Auto-Calculation Effect (Position Size) ---
  useEffect(() => {
    if (!isFormOpen || sizingMode === 'MANUAL' || isMissedTrade) return;
    const riskPct = Number(formData.riskAmount) || 0;
    const balance = currentBalance;
    const entry = Number(formData.entryPrice) || 0;
    const riskDollars = balance * (riskPct / 100);
    if (riskDollars <= 0) return;

    if (sizingMode === 'UNITS') {
        const stop = Number(formData.stopLoss) || 0;
        if (entry > 0 && stop > 0 && entry !== stop) {
            const dist = Math.abs(entry - stop);
            const units = riskDollars / dist;
            if (Math.abs(units - (formData.positionSize || 0)) > 0.000001) {
                 setFormData(prev => ({ ...prev, positionSize: parseFloat(units.toFixed(6)) }));
            }
        }
    } else if (sizingMode === 'VALUE') {
        let slPct = parseFloat(valueModeStopPct) / 100;
        if (!slPct && entry > 0 && formData.stopLoss) {
             slPct = Math.abs(entry - formData.stopLoss) / entry;
        }
        if (slPct > 0) {
            const totalValue = riskDollars / slPct;
            if (entry > 0) {
                const units = totalValue / entry;
                if (Math.abs(units - (formData.positionSize || 0)) > 0.000001) {
                    setFormData(prev => ({ ...prev, positionSize: parseFloat(units.toFixed(6)) }));
                }
            }
        }
    }
  }, [sizingMode, formData.riskAmount, formData.entryPrice, formData.stopLoss, valueModeStopPct, currentBalance, isFormOpen, formData.positionSize, isMissedTrade]);

  // --- Auto-Calculation Effect (PnL) ---
  useEffect(() => {
      // If manual PnL is on OR Missed Trade, do NOT auto-calculate PnL
      if (formData.isManualPnL || isMissedTrade) return;

      const metrics = calculateTradeMetrics(
        formData.direction as Direction,
        Number(formData.entryPrice),
        formData.exitPrice ? Number(formData.exitPrice) : undefined,
        Number(formData.stopLoss),
        Number(formData.positionSize)
      );

      // Only update if metrics changed
      if (metrics.pnl !== formData.pnl || metrics.outcome !== formData.outcome) {
           setFormData(prev => ({ ...prev, pnl: metrics.pnl, outcome: metrics.outcome }));
      }
  }, [formData.direction, formData.entryPrice, formData.exitPrice, formData.stopLoss, formData.positionSize, formData.isManualPnL, isMissedTrade]);


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const val = type === 'number' ? parseFloat(value) : value;
    setFormData(prev => ({ ...prev, [name]: val }));
  };

  const handleTagsChange = (field: keyof Trade, tags: string[]) => {
      setFormData(prev => ({ ...prev, [field]: tags }));
  };

  const handleManualPnLChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      setFormData(prev => {
          let outcome = Outcome.OPEN;
          if (!isNaN(val)) {
             if (val > 0) outcome = Outcome.WIN;
             else if (val < 0) outcome = Outcome.LOSS;
             else outcome = Outcome.BREAK_EVEN;
          }
          return { ...prev, pnl: val, isManualPnL: true, outcome };
      });
  };

  const toggleManualPnL = () => {
      setFormData(prev => ({ ...prev, isManualPnL: !prev.isManualPnL }));
  };
  
  const handleMissedTradeToggle = () => {
      setIsMissedTrade(prev => !prev);
      setFormData(prev => ({
          ...prev,
          outcome: !isMissedTrade ? Outcome.MISSED : Outcome.OPEN,
          pnl: !isMissedTrade ? 0 : prev.pnl,
          // Clear exit data if becoming missed
          exitPrice: !isMissedTrade ? undefined : prev.exitPrice,
          exitDate: !isMissedTrade ? undefined : prev.exitDate,
          isManualPnL: !isMissedTrade ? false : prev.isManualPnL
      }));
  };

  const finalizeSave = (trade: Trade) => {
    onSave(trade);
    setIsFormOpen(false);
    setConfirmModalOpen(false);
    setPendingTrade(null);
    setFormData(initialFormState);
    setIsMissedTrade(false);
    setSizingMode('MANUAL');
    setSearchParams({});
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Base metrics calculation
    let metrics = calculateTradeMetrics(
        formData.direction as Direction,
        Number(formData.entryPrice),
        formData.exitPrice ? Number(formData.exitPrice) : undefined,
        Number(formData.stopLoss),
        Number(formData.positionSize)
    );

    // Override if Manual PnL
    if (formData.isManualPnL && formData.pnl !== undefined && !isNaN(formData.pnl)) {
        metrics.pnl = formData.pnl;
        if (metrics.pnl > 0) metrics.outcome = Outcome.WIN;
        else if (metrics.pnl < 0) metrics.outcome = Outcome.LOSS;
        else metrics.outcome = Outcome.BREAK_EVEN;
        
        // Attempt to calculate R if Entry/Stop exist
        if (formData.entryPrice && formData.stopLoss) {
             const riskPerUnit = Math.abs(formData.entryPrice - formData.stopLoss);
             const totalRisk = riskPerUnit * (formData.positionSize || 1); // fallback to size 1 if not set
             if (totalRisk > 0) {
                 metrics.rMultiple = metrics.pnl / totalRisk;
             }
        }
    }

    // Missed Trade Override
    if (isMissedTrade) {
        metrics.outcome = Outcome.MISSED;
        metrics.pnl = 0;
        metrics.rMultiple = 0;
    }

    // Calculate Duration
    let duration = undefined;
    if (formData.exitDate && formData.date && !isMissedTrade) {
        duration = calculateDuration(formData.date, formData.exitDate);
    }

    const newTrade: Trade = {
        id: formData.id || crypto.randomUUID(),
        date: formData.date!,
        pair: formData.pair!,
        direction: formData.direction as Direction,
        entryPrice: Number(formData.entryPrice),
        stopLoss: Number(formData.stopLoss),
        takeProfit: Number(formData.takeProfit),
        exitPrice: formData.exitPrice ? Number(formData.exitPrice) : undefined,
        exitDate: formData.exitDate,
        positionSize: Number(formData.positionSize),
        riskAmount: Number(formData.riskAmount),
        reason: formData.reason || '',
        notes: formData.notes || '',
        screenshotUrl: formData.screenshotUrl,
        tradingViewUrl: formData.tradingViewUrl,
        
        // Missed Specific
        skipReason: isMissedTrade ? formData.skipReason : undefined,
        
        // Advanced
        session: formData.session as Session,
        confidence: formData.confidence as Confidence,
        marketCondition: formData.marketCondition,
        entryEmotion: formData.entryEmotion,
        exitEmotion: formData.exitEmotion,

        setups: formData.setups || [],
        timeframes: formData.timeframes || [],
        emotions: formData.emotions || [],
        mistakes: formData.mistakes || [],
        
        isManualPnL: formData.isManualPnL,
        duration: duration,
        
        ...metrics
    };

    // --- Confirmation Check ---
    // If the trade is being CLOSED (Outcome != OPEN) AND it is NOT manual PnL AND NOT Missed
    // We want the user to confirm the calculated values.
    if (newTrade.outcome !== Outcome.OPEN && newTrade.outcome !== Outcome.MISSED && !newTrade.isManualPnL) {
        setPendingTrade(newTrade);
        setConfirmModalOpen(true);
        return;
    }

    finalizeSave(newTrade);
  };

  const handleSwitchToManual = () => {
    if (pendingTrade) {
        setFormData(prev => ({
            ...prev,
            pnl: pendingTrade.pnl,
            outcome: pendingTrade.outcome,
            isManualPnL: true
        }));
    }
    setConfirmModalOpen(false);
    setPendingTrade(null);
  };

  // --- Filtering Logic ---
  const filteredTrades = useMemo(() => {
    return trades.filter(t => {
        const matchesSearch = t.pair.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesOutcome = filters.outcome === 'All' || t.outcome === filters.outcome;
        const matchesSetup = filters.setup === 'All' || (t.setups && t.setups.includes(filters.setup));
        const matchesSession = filters.session === 'All' || t.session === filters.session;
        const matchesMistake = filters.mistake === 'All' || (t.mistakes && t.mistakes.includes(filters.mistake));
        const matchesTimeframe = filters.timeframe === 'All' || (t.timeframes && t.timeframes.includes(filters.timeframe));

        return matchesSearch && matchesOutcome && matchesSetup && matchesSession && matchesMistake && matchesTimeframe;
    }).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [trades, searchTerm, filters]);

  // --- Replay Controls ---
  const activeReplayTrade = filteredTrades[replayIndex];
  const nextTrade = () => setReplayIndex(prev => Math.min(prev + 1, filteredTrades.length - 1));
  const prevTrade = () => setReplayIndex(prev => Math.max(prev - 1, 0));

  const calculatedRiskDollars = (currentBalance * (Number(formData.riskAmount || 0) / 100)).toFixed(2);

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Trade Journal</h2>
          <p className="text-slate-400">Log, Tag, and Review.</p>
        </div>
        <div className="flex items-center gap-3">
             <Button 
                variant={isReviewMode ? "primary" : "secondary"} 
                onClick={() => { setIsReviewMode(!isReviewMode); setReplayIndex(0); }}
                disabled={filteredTrades.length === 0}
            >
                <PlayCircle className="w-4 h-4 mr-2" /> {isReviewMode ? 'Exit Review' : 'Review Mode'}
            </Button>
            <Button onClick={() => { setFormData(initialFormState); setIsMissedTrade(false); setSizingMode('MANUAL'); setIsFormOpen(true); }}>
                <Plus className="w-4 h-4 mr-2" /> Log Trade
            </Button>
        </div>
      </div>

      {/* Main Filter Bar */}
      <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-4 flex-1">
              <Input 
                 placeholder="Search Pair..." 
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 className="w-40 md:w-64"
              />
              <Select 
                options={[
                    { value: 'All', label: 'All Outcomes' },
                    { value: Outcome.WIN, label: 'Win' },
                    { value: Outcome.LOSS, label: 'Loss' },
                    { value: Outcome.OPEN, label: 'Open' },
                    { value: Outcome.MISSED, label: 'Missed' },
                ]}
                value={filters.outcome}
                onChange={(e) => setFilters(prev => ({...prev, outcome: e.target.value}))}
                className="w-32 md:w-40"
              />
               <Select 
                options={[{ value: 'All', label: 'All Setups' }, ...STANDARD_SETUPS.map(s => ({ value: s, label: s }))]}
                value={filters.setup}
                onChange={(e) => setFilters(prev => ({...prev, setup: e.target.value}))}
                className="w-32 md:w-40"
              />
              <Button variant="ghost" onClick={() => setIsFilterOpen(!isFilterOpen)} className={isFilterOpen ? 'text-emerald-500 bg-emerald-500/10' : ''}>
                  <Filter className="w-4 h-4 mr-2" /> More Filters
              </Button>
          </div>
          <div className="text-sm text-slate-500 font-medium">
              Showing {filteredTrades.length} trades
          </div>
      </div>

      {/* Expanded Filters */}
      {isFilterOpen && (
          <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-4 animate-fadeIn">
              <Select 
                  label="Session"
                  options={[{ value: 'All', label: 'All Sessions' }, {value: Session.LONDON, label: 'London'}, {value: Session.NEW_YORK, label: 'New York'}, {value: Session.ASIAN, label: 'Asian'}]}
                  value={filters.session}
                  onChange={(e) => setFilters(prev => ({...prev, session: e.target.value}))}
              />
              <Select 
                  label="Mistake"
                  options={[{ value: 'All', label: 'Any Mistake' }, ...MISTAKES.map(s => ({ value: s, label: s }))]}
                  value={filters.mistake}
                  onChange={(e) => setFilters(prev => ({...prev, mistake: e.target.value}))}
              />
               <Select 
                  label="Timeframe"
                  options={[{ value: 'All', label: 'All TFs' }, ...TIMEFRAMES.map(s => ({ value: s, label: s }))]}
                  value={filters.timeframe}
                  onChange={(e) => setFilters(prev => ({...prev, timeframe: e.target.value}))}
              />
          </div>
      )}

      {/* REVIEW / REPLAY MODE */}
      {isReviewMode && activeReplayTrade ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden animate-fadeIn">
              {/* Toolbar */}
              <div className="bg-slate-950 p-4 border-b border-slate-800 flex justify-between items-center">
                  <div className="flex items-center gap-4">
                      <Button variant="ghost" onClick={prevTrade} disabled={replayIndex === 0}>
                          <SkipBack className="w-5 h-5" />
                      </Button>
                      <div className="text-center">
                          <p className="text-sm font-bold text-white">{activeReplayTrade.pair} - {new Date(activeReplayTrade.date).toLocaleDateString()}</p>
                          <p className="text-xs text-slate-500">Trade {filteredTrades.length - replayIndex} of {filteredTrades.length}</p>
                      </div>
                      <Button variant="ghost" onClick={nextTrade} disabled={replayIndex === filteredTrades.length - 1}>
                          <SkipForward className="w-5 h-5" />
                      </Button>
                  </div>
                  <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                           activeReplayTrade.outcome === Outcome.WIN ? 'bg-emerald-500/20 text-emerald-500' : 
                           activeReplayTrade.outcome === Outcome.LOSS ? 'bg-rose-500/20 text-rose-500' : 
                           activeReplayTrade.outcome === Outcome.MISSED ? 'bg-slate-700 text-slate-300 border border-dashed border-slate-500' :
                           'bg-slate-700 text-slate-300'
                      }`}>
                          {activeReplayTrade.outcome} {activeReplayTrade.pnl ? `(${activeReplayTrade.pnl > 0 ? '+' : ''}$${activeReplayTrade.pnl})` : ''}
                      </span>
                  </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2">
                  {/* Left: Chart/Image */}
                  <div className="bg-black/50 min-h-[400px] flex items-center justify-center border-r border-slate-800 relative">
                       {activeReplayTrade.screenshotUrl ? (
                           <img src={activeReplayTrade.screenshotUrl} alt="Chart" className="max-h-[500px] w-auto object-contain" />
                       ) : (
                           <div className="text-center p-8">
                               <Wallet className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                               <p className="text-slate-500">No screenshot attached.</p>
                               {activeReplayTrade.tradingViewUrl && (
                                   <a href={activeReplayTrade.tradingViewUrl} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline mt-2 inline-block">Open TradingView Link</a>
                               )}
                           </div>
                       )}
                  </div>
                  
                  {/* Right: Details */}
                  <div className="p-6 space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                           <div className="bg-slate-800/30 p-3 rounded-lg">
                               <span className="text-xs text-slate-500 block">Setup</span>
                               <span className="text-sm font-medium text-white">{activeReplayTrade.setups?.join(', ') || '-'}</span>
                           </div>
                           <div className="bg-slate-800/30 p-3 rounded-lg">
                               <span className="text-xs text-slate-500 block">Session</span>
                               <span className="text-sm font-medium text-white">{activeReplayTrade.session || '-'}</span>
                           </div>
                           <div className="bg-slate-800/30 p-3 rounded-lg">
                               <span className="text-xs text-slate-500 block">Entry Emotion</span>
                               <span className="text-sm font-medium text-white">{activeReplayTrade.entryEmotion || '-'}</span>
                           </div>
                           <div className="bg-slate-800/30 p-3 rounded-lg">
                               <span className="text-xs text-slate-500 block">Duration</span>
                               <span className="text-sm font-medium text-white">{activeReplayTrade.duration || '-'}</span>
                           </div>
                           <div className="bg-slate-800/30 p-3 rounded-lg col-span-2">
                               <span className="text-xs text-slate-500 block">Mistakes</span>
                               <span className="text-sm font-medium text-rose-400">{activeReplayTrade.mistakes?.join(', ') || 'None'}</span>
                           </div>
                      </div>

                      <div className="border-t border-slate-800 pt-4">
                           <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Analysis</h4>
                           {activeReplayTrade.skipReason && (
                               <div className="mb-4 p-3 bg-slate-800 border border-slate-700 rounded-lg">
                                   <p className="text-xs text-slate-400 font-bold mb-1">SKIPPED BECAUSE:</p>
                                   <p className="text-sm text-white">{activeReplayTrade.skipReason}</p>
                               </div>
                           )}
                           <p className="text-sm text-slate-300 leading-relaxed">{activeReplayTrade.reason}</p>
                           {activeReplayTrade.notes && (
                               <p className="text-sm text-slate-400 mt-2 italic">"{activeReplayTrade.notes}"</p>
                           )}
                      </div>

                      <div className="flex gap-2">
                           <Button size="sm" variant="secondary" onClick={() => { setFormData(activeReplayTrade); setIsMissedTrade(activeReplayTrade.outcome === Outcome.MISSED); setSizingMode('MANUAL'); setIsFormOpen(true); }}>
                               <Edit2 className="w-3 h-3 mr-2" /> Edit Trade
                           </Button>
                      </div>
                  </div>
              </div>
          </div>
      ) : (
          /* Standard Table View */
          <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
             <div className="overflow-x-auto">
                 <table className="w-full text-left text-sm">
                     <thead className="bg-slate-950 text-slate-400 font-medium">
                         <tr>
                             <th className="px-6 py-4">Date</th>
                             <th className="px-6 py-4">Pair</th>
                             <th className="px-6 py-4">Setup</th>
                             <th className="px-6 py-4">Session</th>
                             <th className="px-6 py-4">Outcome</th>
                             <th className="px-6 py-4 text-right">PnL</th>
                             <th className="px-6 py-4 text-center">Duration</th>
                             <th className="px-6 py-4 text-right">R</th>
                             <th className="px-6 py-4 text-center">Actions</th>
                         </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-800">
                         {filteredTrades.map(trade => (
                             <TradeRow key={trade.id} trade={trade} onEdit={(t) => { setFormData(t); setIsMissedTrade(t.outcome === Outcome.MISSED); setSizingMode('MANUAL'); setIsFormOpen(true); }} onDelete={onDelete} />
                         ))}
                         {filteredTrades.length === 0 && (
                             <tr><td colSpan={9} className="px-6 py-12 text-center text-slate-500">No trades match criteria.</td></tr>
                         )}
                     </tbody>
                 </table>
             </div>
          </div>
      )}

      {/* Confirmation Modal */}
      {confirmModalOpen && pendingTrade && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
              <div className="bg-slate-900 w-full max-w-md rounded-2xl border border-slate-800 shadow-2xl p-6">
                  <div className="flex items-center gap-3 mb-4 text-emerald-500">
                      <AlertTriangle className="w-6 h-6" />
                      <h3 className="text-lg font-bold text-white">Confirm Auto-Calculation</h3>
                  </div>
                  <p className="text-slate-400 text-sm mb-6">
                      Based on your exit price, we calculated the following results. Is this correct?
                  </p>
                  
                  <div className="bg-slate-800/50 rounded-xl p-4 space-y-3 mb-6 border border-slate-800">
                      <div className="flex justify-between items-center">
                          <span className="text-slate-400 text-sm">PnL</span>
                          <span className={`font-bold text-lg ${pendingTrade.pnl && pendingTrade.pnl > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                              {pendingTrade.pnl && pendingTrade.pnl > 0 ? '+' : ''}${pendingTrade.pnl?.toFixed(2)}
                          </span>
                      </div>
                      <div className="flex justify-between items-center">
                          <span className="text-slate-400 text-sm">Outcome</span>
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${pendingTrade.outcome === Outcome.WIN ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                              {pendingTrade.outcome}
                          </span>
                      </div>
                      <div className="flex justify-between items-center">
                          <span className="text-slate-400 text-sm">R-Multiple</span>
                          <span className="text-slate-200 font-medium">{pendingTrade.rMultiple?.toFixed(2)}R</span>
                      </div>
                  </div>

                  <div className="flex gap-3">
                      <Button variant="secondary" className="flex-1" onClick={handleSwitchToManual}>
                          Edit Manually
                      </Button>
                      <Button className="flex-1" onClick={() => finalizeSave(pendingTrade)}>
                          Confirm & Save
                      </Button>
                  </div>
              </div>
          </div>
      )}

      {/* Main Trade Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-slate-900 w-full max-w-4xl rounded-2xl border border-slate-800 shadow-2xl p-6 md:p-8 max-h-[95vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-4">
                        <h3 className="text-xl font-bold text-white">{formData.id ? 'Edit Trade' : 'Log New Trade'}</h3>
                        <button 
                             type="button" 
                             onClick={handleMissedTradeToggle}
                             className={`text-xs px-3 py-1.5 rounded-full border flex items-center gap-2 transition-colors ${
                                 isMissedTrade 
                                 ? 'bg-slate-700 border-slate-500 text-slate-200' 
                                 : 'border-slate-700 text-slate-400 hover:border-slate-500'
                             }`}
                        >
                             <EyeOff className="w-3 h-3" />
                             {isMissedTrade ? 'Missed Trade Log' : 'Log Missed Trade?'}
                        </button>
                    </div>
                    <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-white"><X className="w-6 h-6"/></button>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Execution Details */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                             <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                 {isMissedTrade ? 'Potential Execution' : 'Execution'}
                             </h4>
                             {formData.outcome !== Outcome.OPEN && (
                                 <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold ${
                                     formData.outcome === Outcome.WIN ? 'bg-emerald-500/20 text-emerald-400' : 
                                     formData.outcome === Outcome.LOSS ? 'bg-rose-500/20 text-rose-400' : 
                                     formData.outcome === Outcome.MISSED ? 'bg-slate-700 text-slate-300' : 'bg-slate-700 text-slate-300'
                                 }`}>
                                     {formData.outcome === Outcome.WIN ? <CheckCircle className="w-3 h-3"/> : formData.outcome === Outcome.LOSS ? <XCircle className="w-3 h-3"/> : <EyeOff className="w-3 h-3"/>}
                                     {formData.outcome} {formData.pnl ? `(${formData.pnl > 0 ? '+' : ''}$${formData.pnl.toFixed(2)})` : ''}
                                 </div>
                             )}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <Input type="datetime-local" label="Date/Time" name="date" required value={formData.date} onChange={handleInputChange} />
                            <Input label="Asset / Pair" name="pair" placeholder="BTC/USD" required value={formData.pair} onChange={handleInputChange} />
                            <Select label="Direction" name="direction" required value={formData.direction} onChange={handleInputChange} options={[{value: Direction.LONG, label: 'Long'}, {value: Direction.SHORT, label: 'Short'}]} />
                            <Select label="Session" name="session" value={formData.session} onChange={handleInputChange} options={[
                                {value: '', label: 'Select...'},
                                {value: Session.LONDON, label: 'London'},
                                {value: Session.NEW_YORK, label: 'New York'},
                                {value: Session.ASIAN, label: 'Asian'},
                                {value: Session.CLOSE, label: 'Close'}
                            ]} />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <Input type="number" step="any" label="Entry (Ideal)" name="entryPrice" required value={formData.entryPrice} onChange={handleInputChange} />
                            <Input type="number" step="any" label="Stop Loss" name="stopLoss" required value={formData.stopLoss} onChange={handleInputChange} />
                            <Input type="number" step="any" label="Take Profit" name="takeProfit" value={formData.takeProfit} onChange={handleInputChange} />
                        </div>
                        
                        {/* POSITION SIZING MODULE (Hidden if Missed Trade) */}
                        {!isMissedTrade && (
                            <div className="bg-slate-800/30 rounded-xl border border-slate-800 p-4">
                                <div className="flex flex-wrap items-center justify-between gap-4 mb-4 border-b border-slate-700/50 pb-3">
                                    <div className="flex items-center gap-2">
                                        <Calculator className="w-4 h-4 text-emerald-500" />
                                        <h5 className="text-sm font-medium text-slate-200">Position Sizing</h5>
                                    </div>
                                    <div className="flex bg-slate-800 rounded-lg p-1 text-xs font-medium">
                                        <button type="button" onClick={() => setSizingMode('MANUAL')} className={`px-3 py-1.5 rounded-md ${sizingMode === 'MANUAL' ? 'bg-slate-700 text-white' : 'text-slate-400'}`}>Manual</button>
                                        <button type="button" onClick={() => setSizingMode('UNITS')} className={`px-3 py-1.5 rounded-md ${sizingMode === 'UNITS' ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}>Auto (Units)</button>
                                        <button type="button" onClick={() => setSizingMode('VALUE')} className={`px-3 py-1.5 rounded-md ${sizingMode === 'VALUE' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>Auto (Value)</button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                                    {sizingMode !== 'MANUAL' && (
                                         <div className="relative">
                                            <Input type="number" step="0.1" label="Risk %" name="riskAmount" value={formData.riskAmount} onChange={handleInputChange} className="pr-12" />
                                            <div className="absolute top-8 right-3 text-xs text-rose-500 font-medium">${calculatedRiskDollars}</div>
                                         </div>
                                    )}
                                    {sizingMode === 'VALUE' && (
                                         <Input label="Stop Loss %" type="number" step="0.1" value={valueModeStopPct} onChange={(e) => setValueModeStopPct(e.target.value)} />
                                    )}
                                    <Input 
                                        label="Position Size" 
                                        type="number" step="any" 
                                        name="positionSize" 
                                        required 
                                        value={formData.positionSize} 
                                        onChange={handleInputChange} 
                                        className={sizingMode !== 'MANUAL' ? "bg-slate-900 border-emerald-500/50 text-emerald-400 font-medium" : ""}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Outcome / PnL Section (Hidden if Missed Trade) */}
                        {!isMissedTrade && (
                            <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                                <div>
                                    <Input 
                                        type="number" 
                                        step="any" 
                                        label="Exit Price" 
                                        name="exitPrice" 
                                        value={formData.exitPrice || ''} 
                                        onChange={handleInputChange} 
                                        placeholder="Close Price" 
                                        disabled={formData.isManualPnL}
                                    />
                                </div>
                                <div>
                                    <Input 
                                        type="datetime-local" 
                                        label="Exit Date" 
                                        name="exitDate" 
                                        value={formData.exitDate || ''} 
                                        onChange={handleInputChange} 
                                    />
                                </div>
                                <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
                                     <div className="flex justify-between items-center mb-2">
                                         <label className="text-xs font-medium text-slate-400">Profit / Loss (PnL)</label>
                                         <button 
                                            type="button" 
                                            onClick={toggleManualPnL}
                                            className={`text-[10px] px-2 py-0.5 rounded border flex items-center gap-1 ${formData.isManualPnL ? 'border-blue-500 text-blue-400 bg-blue-500/10' : 'border-slate-600 text-slate-500'}`}
                                         >
                                             {formData.isManualPnL ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                                             {formData.isManualPnL ? 'Manual Mode' : 'Auto-Calc'}
                                         </button>
                                     </div>
                                     <div className="relative">
                                         <Input 
                                             type="number" 
                                             step="any"
                                             value={formData.pnl !== undefined ? formData.pnl : ''}
                                             onChange={handleManualPnLChange}
                                             className={`font-bold text-lg ${
                                                 formData.pnl && formData.pnl > 0 ? 'text-emerald-500 border-emerald-900' : 
                                                 formData.pnl && formData.pnl < 0 ? 'text-rose-500 border-rose-900' : 'text-slate-300'
                                             }`}
                                             placeholder="0.00"
                                             disabled={!formData.isManualPnL && !formData.exitPrice} 
                                             readOnly={!formData.isManualPnL} 
                                         />
                                         <div className="absolute top-2.5 right-3 text-slate-500 text-sm">$</div>
                                     </div>
                                </div>
                            </div>
                        )}

                        {isMissedTrade && (
                             <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-700 border-dashed">
                                 <label className="block text-xs font-medium text-slate-400 mb-2">Reason for Skipping (Required)</label>
                                 <Textarea 
                                    required 
                                    placeholder="Why did you miss or skip this trade? (e.g. Hesitation, Asleep, Spread too high)"
                                    rows={2}
                                    value={formData.skipReason}
                                    onChange={(e) => setFormData(prev => ({...prev, skipReason: e.target.value}))}
                                 />
                             </div>
                        )}
                    </div>

                    {/* Advanced Tagging */}
                    <div className="space-y-6">
                         <h4 className="text-xs font-bold text-emerald-500 uppercase tracking-wider border-b border-slate-800 pb-2">Analysis & Psychology</h4>
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                             {/* Enhanced TagSelector with AllowCustom */}
                             <TagSelector 
                                label="Setups" 
                                options={STANDARD_SETUPS} 
                                selected={formData.setups || []} 
                                onChange={(tags) => handleTagsChange('setups', tags)} 
                                allowCustom={true} 
                             />
                             <Select label="Market Condition" name="marketCondition" value={formData.marketCondition} onChange={handleInputChange} options={[{value: '', label: 'Select...'}, ...MARKET_CONDITIONS.map(m => ({value: m, label: m}))]} />
                             <Select label="Confidence" name="confidence" value={formData.confidence} onChange={handleInputChange} options={[{value: '', label: 'Select...'}, {value: Confidence.HIGH, label: 'High'}, {value: Confidence.MEDIUM, label: 'Medium'}, {value: Confidence.LOW, label: 'Low'}]} />
                         </div>
                         
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-800/30 p-4 rounded-lg">
                             <Select label="Emotion Before Entry" name="entryEmotion" value={formData.entryEmotion} onChange={handleInputChange} options={[{value: '', label: 'Select...'}, ...EMOTIONS.map(e => ({value: e, label: e}))]} />
                             {!isMissedTrade && (
                                 <Select label="Emotion After Exit" name="exitEmotion" value={formData.exitEmotion} onChange={handleInputChange} options={[{value: '', label: 'Select...'}, ...EMOTIONS.map(e => ({value: e, label: e}))]} />
                             )}
                         </div>
                         
                         {!isMissedTrade && (
                             <TagSelector label="Mistakes" options={MISTAKES} selected={formData.mistakes || []} onChange={(tags) => handleTagsChange('mistakes', tags)} />
                         )}
                    </div>

                    {/* Media */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-2 border-b border-slate-800 pb-2">
                             <Image className="w-4 h-4 text-emerald-500" />
                             <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Media & Chart Links</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Input label="Screenshot URL" name="screenshotUrl" value={formData.screenshotUrl || ''} onChange={handleInputChange} placeholder="https://..." />
                            <Input label="TradingView URL" name="tradingViewUrl" value={formData.tradingViewUrl || ''} onChange={handleInputChange} placeholder="https://www.tradingview.com/x/..." />
                        </div>
                        <div className="grid grid-cols-1 gap-6">
                            <Textarea label="Analysis / Notes" name="reason" rows={3} value={formData.reason} onChange={handleInputChange} placeholder="Detailed analysis of the setup..." />
                            <Textarea label="Private Notes" name="notes" rows={2} value={formData.notes} onChange={handleInputChange} />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-6 border-t border-slate-800">
                        <Button type="button" variant="ghost" onClick={() => setIsFormOpen(false)}>Cancel</Button>
                        <Button type="submit">Save {isMissedTrade ? 'Missed Trade' : 'Trade'}</Button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};

const TradeRow: React.FC<{trade: Trade, onEdit: (t:Trade)=>void, onDelete: (id:string)=>void}> = ({ trade, onEdit, onDelete }) => {
    return (
        <tr className={`hover:bg-slate-800/50 transition-colors group ${trade.outcome === Outcome.MISSED ? 'bg-slate-900/50 opacity-70' : ''}`}>
            <td className="px-6 py-4 text-slate-300 whitespace-nowrap">
                {new Date(trade.date).toLocaleDateString()}
                <div className="text-xs text-slate-500">{new Date(trade.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
            </td>
            <td className="px-6 py-4 font-medium text-white">{trade.pair}</td>
            <td className="px-6 py-4">
                {trade.setups && trade.setups.length > 0 ? (
                     <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">{trade.setups[0]}</span>
                ) : <span className="text-slate-600 text-xs">-</span>}
            </td>
            <td className="px-6 py-4 text-slate-400 text-sm">{trade.session || '-'}</td>
            <td className="px-6 py-4">
                <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                    trade.outcome === Outcome.WIN ? 'bg-emerald-500/10 text-emerald-500' : 
                    trade.outcome === Outcome.LOSS ? 'bg-rose-500/10 text-rose-500' : 
                    trade.outcome === Outcome.MISSED ? 'bg-slate-700 text-slate-400 border border-slate-600 border-dashed' :
                    trade.outcome === Outcome.OPEN ? 'bg-blue-500/10 text-blue-500' : 'bg-slate-700 text-slate-300'
                }`}>{trade.outcome}</span>
            </td>
            <td className={`px-6 py-4 text-right font-medium ${trade.pnl && trade.pnl > 0 ? 'text-emerald-500' : trade.pnl && trade.pnl < 0 ? 'text-rose-500' : 'text-slate-400'}`}>
                {trade.outcome === Outcome.MISSED ? '-' : (trade.pnl !== undefined ? `$${trade.pnl.toFixed(2)}` : '-')}
            </td>
            <td className="px-6 py-4 text-center text-slate-400 text-sm">{trade.duration || '-'}</td>
            <td className="px-6 py-4 text-right text-slate-300">{trade.outcome === Outcome.MISSED ? '-' : (trade.rMultiple ? `${trade.rMultiple.toFixed(2)}R` : '-')}</td>
            <td className="px-6 py-4 text-center">
                <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => onEdit(trade)} className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white"><Edit2 className="w-4 h-4"/></button>
                    <button onClick={() => onDelete(trade.id)} className="p-1 hover:bg-rose-900/50 rounded text-slate-400 hover:text-rose-500"><Trash2 className="w-4 h-4"/></button>
                </div>
            </td>
        </tr>
    );
};
