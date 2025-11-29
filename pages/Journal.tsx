
import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Download, Trash2, Edit2, ExternalLink, ChevronDown, Tag, Clock, AlertTriangle, Calculator, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input, Select, Textarea, TagSelector } from '../components/ui/Input';
import { Trade, Direction, Outcome, STANDARD_SETUPS, TIMEFRAMES, EMOTIONS, MISTAKES } from '../types';
import { calculateTradeMetrics } from '../services/storage';

interface JournalProps {
  trades: Trade[];
  onSave: (trade: Trade) => void;
  onDelete: (id: string) => void;
}

export const Journal: React.FC<JournalProps> = ({ trades, onSave, onDelete }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterOutcome, setFilterOutcome] = useState('All');
  const [filterSetup, setFilterSetup] = useState('All');
  
  // Form State
  const initialFormState: Partial<Trade> = {
    date: new Date().toISOString().slice(0, 16),
    direction: Direction.LONG,
    riskAmount: 1, // Default 1%
    setups: [],
    timeframes: [],
    emotions: [],
    mistakes: []
  };
  const [formData, setFormData] = useState<Partial<Trade>>(initialFormState);

  // Live PnL Preview
  const previewMetrics = useMemo(() => {
    if (!formData.entryPrice || !formData.positionSize) return null;
    return calculateTradeMetrics(
        formData.direction as Direction,
        Number(formData.entryPrice),
        formData.exitPrice ? Number(formData.exitPrice) : undefined,
        Number(formData.stopLoss),
        Number(formData.positionSize)
    );
  }, [formData.direction, formData.entryPrice, formData.exitPrice, formData.stopLoss, formData.positionSize]);

  // Effect to handle URL params (from Calculator or New button)
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const val = type === 'number' ? parseFloat(value) : value;
    setFormData(prev => ({ ...prev, [name]: val }));
  };

  const handleTagsChange = (field: keyof Trade, tags: string[]) => {
      setFormData(prev => ({ ...prev, [field]: tags }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Final Calculation check
    const metrics = calculateTradeMetrics(
        formData.direction as Direction,
        Number(formData.entryPrice),
        formData.exitPrice ? Number(formData.exitPrice) : undefined,
        Number(formData.stopLoss),
        Number(formData.positionSize)
    );

    const newTrade: Trade = {
        id: formData.id || crypto.randomUUID(),
        date: formData.date!,
        pair: formData.pair!,
        direction: formData.direction as Direction,
        entryPrice: Number(formData.entryPrice),
        stopLoss: Number(formData.stopLoss),
        takeProfit: Number(formData.takeProfit),
        exitPrice: formData.exitPrice ? Number(formData.exitPrice) : undefined,
        positionSize: Number(formData.positionSize),
        riskAmount: Number(formData.riskAmount),
        reason: formData.reason || '',
        notes: formData.notes || '',
        screenshotUrl: formData.screenshotUrl,
        tradingViewUrl: formData.tradingViewUrl,
        setups: formData.setups || [],
        timeframes: formData.timeframes || [],
        emotions: formData.emotions || [],
        mistakes: formData.mistakes || [],
        ...metrics
    };

    onSave(newTrade);
    setIsFormOpen(false);
    setFormData(initialFormState);
    setSearchParams({}); // Clear params
  };

  const handleEdit = (trade: Trade) => {
      setFormData(trade);
      setIsFormOpen(true);
  };

  // Filter Logic
  const filteredTrades = trades.filter(t => {
      const matchesSearch = t.pair.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesOutcome = filterOutcome === 'All' || t.outcome === filterOutcome;
      const matchesSetup = filterSetup === 'All' || (t.setups && t.setups.includes(filterSetup));
      return matchesSearch && matchesOutcome && matchesSetup;
  }).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Trade Journal</h2>
          <p className="text-slate-400">Log and review your market execution.</p>
        </div>
        <div className="flex items-center gap-3">
            <Button variant="secondary" onClick={() => alert("Export feature coming soon!")}>
                <Download className="w-4 h-4 mr-2" /> Export
            </Button>
            <Button onClick={() => { setFormData(initialFormState); setIsFormOpen(true); }}>
                <Plus className="w-4 h-4 mr-2" /> Log Trade
            </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex flex-col md:flex-row gap-4">
          <Input 
             placeholder="Search Pair (e.g. BTC/USD)" 
             value={searchTerm}
             onChange={(e) => setSearchTerm(e.target.value)}
             className="md:w-64"
          />
          <Select 
            options={[
                { value: 'All', label: 'All Outcomes' },
                { value: Outcome.WIN, label: 'Win' },
                { value: Outcome.LOSS, label: 'Loss' },
                { value: Outcome.OPEN, label: 'Open' },
            ]}
            value={filterOutcome}
            onChange={(e) => setFilterOutcome(e.target.value)}
            className="md:w-48"
          />
           <Select 
            options={[
                { value: 'All', label: 'All Setups' },
                ...STANDARD_SETUPS.map(s => ({ value: s, label: s }))
            ]}
            value={filterSetup}
            onChange={(e) => setFilterSetup(e.target.value)}
            className="md:w-48"
          />
      </div>

      {/* Table */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
         <div className="overflow-x-auto">
             <table className="w-full text-left text-sm">
                 <thead className="bg-slate-950 text-slate-400 font-medium">
                     <tr>
                         <th className="px-6 py-4">Date</th>
                         <th className="px-6 py-4">Pair</th>
                         <th className="px-6 py-4">Setup</th>
                         <th className="px-6 py-4">Direction</th>
                         <th className="px-6 py-4">Outcome</th>
                         <th className="px-6 py-4 text-right">PnL</th>
                         <th className="px-6 py-4 text-right">R-Multiple</th>
                         <th className="px-6 py-4 text-center">Actions</th>
                     </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-800">
                     {filteredTrades.map(trade => (
                         <TradeRow key={trade.id} trade={trade} onEdit={handleEdit} onDelete={onDelete} />
                     ))}
                     {filteredTrades.length === 0 && (
                         <tr>
                             <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                                 No trades found matching your filters.
                             </td>
                         </tr>
                     )}
                 </tbody>
             </table>
         </div>
      </div>

      {/* Modal Form */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-slate-900 w-full max-w-4xl rounded-2xl border border-slate-800 shadow-2xl p-6 md:p-8 max-h-[95vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-white">{formData.id ? 'Edit Trade' : 'Log New Trade'}</h3>
                    <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-white">✕</button>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Execution Section */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                             <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Execution Details</h4>
                             {/* PnL Preview Badge */}
                             {previewMetrics && previewMetrics.outcome !== Outcome.OPEN && (
                                 <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold ${previewMetrics.pnl > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                                     {previewMetrics.pnl > 0 ? <CheckCircle className="w-3 h-3"/> : <XCircle className="w-3 h-3"/>}
                                     Projected: {previewMetrics.outcome} (${previewMetrics.pnl.toFixed(2)})
                                 </div>
                             )}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <Input type="datetime-local" label="Date/Time" name="date" required value={formData.date} onChange={handleInputChange} />
                            <Input label="Pair" name="pair" placeholder="e.g. BTC/USD" required value={formData.pair} onChange={handleInputChange} />
                            <Select label="Direction" name="direction" required value={formData.direction} onChange={handleInputChange} options={[
                                {value: Direction.LONG, label: 'Long'},
                                {value: Direction.SHORT, label: 'Short'}
                            ]} />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <Input type="number" step="any" label="Entry Price" name="entryPrice" required value={formData.entryPrice} onChange={handleInputChange} />
                            <Input type="number" step="any" label="Stop Loss" name="stopLoss" required value={formData.stopLoss} onChange={handleInputChange} />
                            <Input type="number" step="any" label="Take Profit" name="takeProfit" value={formData.takeProfit} onChange={handleInputChange} />
                            <Input type="number" step="any" label="Position Size" name="positionSize" required value={formData.positionSize} onChange={handleInputChange} />
                        </div>
                        
                        {/* CLOSE TRADE SECTION */}
                        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-800">
                             <h5 className="text-sm font-medium text-slate-300 mb-4 flex items-center gap-2">
                                 <Calculator className="w-4 h-4 text-emerald-500" /> Close Trade / Outcome
                             </h5>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                 <div>
                                    <Input 
                                        type="number" 
                                        step="any" 
                                        label="Exit Price" 
                                        name="exitPrice" 
                                        value={formData.exitPrice || ''} 
                                        onChange={handleInputChange} 
                                        placeholder="Enter price to close trade" 
                                        className={formData.exitPrice ? "border-emerald-500 ring-1 ring-emerald-500/50" : ""}
                                    />
                                    <p className="text-xs text-slate-500 mt-2">Entering an exit price will automatically calculate PnL and set the outcome.</p>
                                 </div>
                                 <div className="flex flex-col justify-end">
                                     <div className="p-3 bg-slate-800 rounded-lg flex justify-between items-center border border-slate-700">
                                         <span className="text-sm text-slate-400">Result:</span>
                                         <div className="flex items-center gap-2">
                                            {/* UI Toggle for WIN/LOSS Visuals */}
                                            {previewMetrics && previewMetrics.outcome !== Outcome.OPEN ? (
                                                <span className={`flex items-center gap-1 font-bold ${
                                                    previewMetrics.pnl > 0 ? 'text-emerald-500' : 'text-rose-500'
                                                }`}>
                                                    {previewMetrics.pnl > 0 ? 'WIN' : 'LOSS'}
                                                    <span className="text-slate-500 font-normal ml-1">
                                                        ({previewMetrics.pnl > 0 ? '+' : ''}{previewMetrics.pnl.toFixed(2)})
                                                    </span>
                                                </span>
                                            ) : (
                                                <span className="text-slate-500">OPEN</span>
                                            )}
                                         </div>
                                     </div>
                                 </div>
                             </div>
                        </div>
                    </div>

                    {/* Edge Modules Section */}
                    <div className="space-y-6">
                         <h4 className="text-xs font-bold text-emerald-500 uppercase tracking-wider border-b border-slate-800 pb-2">Strategy & Psychology</h4>
                         
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                             <TagSelector 
                                label="Setup Type (Strategy)" 
                                options={STANDARD_SETUPS} 
                                selected={formData.setups || []} 
                                onChange={(tags) => handleTagsChange('setups', tags)}
                             />
                             <TagSelector 
                                label="Timeframes Used" 
                                options={TIMEFRAMES} 
                                selected={formData.timeframes || []} 
                                onChange={(tags) => handleTagsChange('timeframes', tags)}
                             />
                         </div>

                         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                             <TagSelector 
                                label="Emotions Felt (Psychology)" 
                                options={EMOTIONS} 
                                selected={formData.emotions || []} 
                                onChange={(tags) => handleTagsChange('emotions', tags)}
                             />
                             <TagSelector 
                                label="Manual Mistake Tagging (Auto-detection enabled)" 
                                options={MISTAKES} 
                                selected={formData.mistakes || []} 
                                onChange={(tags) => handleTagsChange('mistakes', tags)}
                             />
                         </div>
                    </div>

                    {/* Notes & Media */}
                    <div className="space-y-4">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-800 pb-2">Documentation</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Textarea label="Reason for Entry" name="reason" rows={3} value={formData.reason} onChange={handleInputChange} placeholder="Setup, market structure..." />
                            <Textarea label="Notes / Journal" name="notes" rows={3} value={formData.notes} onChange={handleInputChange} placeholder="Mental state, execution review..." />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Input label="Screenshot URL" name="screenshotUrl" value={formData.screenshotUrl || ''} onChange={handleInputChange} placeholder="https://..." />
                            <Input label="TradingView Link" name="tradingViewUrl" value={formData.tradingViewUrl || ''} onChange={handleInputChange} placeholder="https://tradingview.com/..." />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-6 border-t border-slate-800">
                        <Button type="button" variant="ghost" onClick={() => setIsFormOpen(false)}>Cancel</Button>
                        <Button type="submit">Save Trade</Button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};

// Sub-component for Trade Row
const TradeRow: React.FC<{trade: Trade, onEdit: (t:Trade)=>void, onDelete: (id:string)=>void}> = ({ trade, onEdit, onDelete }) => {
    const [expanded, setExpanded] = useState(false);

    return (
        <>
            <tr className="hover:bg-slate-800/50 transition-colors group cursor-pointer" onClick={() => setExpanded(!expanded)}>
                <td className="px-6 py-4 text-slate-300 whitespace-nowrap">
                    {new Date(trade.date).toLocaleDateString()}
                    <div className="text-xs text-slate-500">{new Date(trade.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                </td>
                <td className="px-6 py-4 font-medium text-white">{trade.pair}</td>
                <td className="px-6 py-4">
                    {trade.setups && trade.setups.length > 0 ? (
                         <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
                             {trade.setups[0]} {trade.setups.length > 1 && `+${trade.setups.length - 1}`}
                         </span>
                    ) : <span className="text-slate-600 text-xs">-</span>}
                </td>
                <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${trade.direction === Direction.LONG ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                        {trade.direction}
                    </span>
                </td>
                <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                        trade.outcome === Outcome.WIN ? 'bg-emerald-500/10 text-emerald-500' : 
                        trade.outcome === Outcome.LOSS ? 'bg-rose-500/10 text-rose-500' : 
                        trade.outcome === Outcome.OPEN ? 'bg-blue-500/10 text-blue-500' : 'bg-slate-700 text-slate-300'
                    }`}>
                        {trade.outcome}
                    </span>
                </td>
                <td className={`px-6 py-4 text-right font-medium ${trade.pnl && trade.pnl > 0 ? 'text-emerald-500' : trade.pnl && trade.pnl < 0 ? 'text-rose-500' : 'text-slate-400'}`}>
                    {trade.pnl ? `$${trade.pnl.toFixed(2)}` : '-'}
                </td>
                <td className="px-6 py-4 text-right text-slate-300">
                    {trade.rMultiple ? `${trade.rMultiple.toFixed(2)}R` : '-'}
                </td>
                <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => onEdit(trade)} className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white"><Edit2 className="w-4 h-4"/></button>
                        <button onClick={() => onDelete(trade.id)} className="p-1 hover:bg-rose-900/50 rounded text-slate-400 hover:text-rose-500"><Trash2 className="w-4 h-4"/></button>
                        <button onClick={() => setExpanded(!expanded)} className="p-1 md:hidden text-slate-400"><ChevronDown className="w-4 h-4"/></button>
                    </div>
                </td>
            </tr>
            {expanded && (
                <tr className="bg-slate-900/50 border-b border-slate-800">
                    <td colSpan={8} className="px-6 py-6">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="space-y-4">
                                <div>
                                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-2"><Tag className="w-3 h-3"/> Context</h4>
                                    <div className="flex flex-wrap gap-2 mb-2">
                                        {trade.timeframes?.map(t => <span key={t} className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-xs border border-slate-700">{t}</span>)}
                                        {trade.setups?.map(s => <span key={s} className="px-2 py-0.5 rounded bg-blue-900/20 text-blue-400 text-xs border border-blue-900/50">{s}</span>)}
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                         {trade.emotions?.map(e => <span key={e} className="px-2 py-0.5 rounded bg-purple-900/20 text-purple-400 text-xs border border-purple-900/50">{e}</span>)}
                                         {trade.mistakes?.map(m => <span key={m} className="px-2 py-0.5 rounded bg-rose-900/20 text-rose-400 text-xs border border-rose-900/50 flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> {m}</span>)}
                                    </div>
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-1">Reason</h4>
                                    <p className="text-sm text-slate-300 leading-relaxed">{trade.reason || 'No reason logged.'}</p>
                                </div>
                            </div>
                            
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div className="bg-slate-800 p-2 rounded">
                                        <span className="text-slate-500 block text-xs">Entry</span> 
                                        {trade.entryPrice}
                                    </div>
                                    <div className="bg-slate-800 p-2 rounded">
                                        <span className="text-slate-500 block text-xs">Stop Loss</span> 
                                        {trade.stopLoss}
                                    </div>
                                    <div className="bg-slate-800 p-2 rounded">
                                        <span className="text-slate-500 block text-xs">Take Profit</span> 
                                        {trade.takeProfit}
                                    </div>
                                     <div className="bg-slate-800 p-2 rounded">
                                        <span className="text-slate-500 block text-xs">Size</span> 
                                        {trade.positionSize}
                                    </div>
                                </div>
                            </div>

                             <div className="space-y-4">
                                {trade.notes && (
                                    <div>
                                        <h4 className="text-xs font-bold text-slate-500 uppercase mb-1">Notes</h4>
                                        <p className="text-sm text-slate-300 leading-relaxed italic">"{trade.notes}"</p>
                                    </div>
                                )}
                                <div className="flex flex-col gap-2">
                                    {trade.screenshotUrl && (
                                        <a href={trade.screenshotUrl} target="_blank" rel="noreferrer" className="flex items-center text-xs px-3 py-2 bg-slate-800 rounded hover:bg-slate-700 text-emerald-500 transition-colors">
                                            <ExternalLink className="w-3 h-3 mr-2" /> View Screenshot
                                        </a>
                                    )}
                                    {trade.tradingViewUrl && (
                                        <a href={trade.tradingViewUrl} target="_blank" rel="noreferrer" className="flex items-center text-xs px-3 py-2 bg-slate-800 rounded hover:bg-slate-700 text-blue-500 transition-colors">
                                            <ExternalLink className="w-3 h-3 mr-2" /> Open in TradingView
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>
                    </td>
                </tr>
            )}
        </>
    );
};
