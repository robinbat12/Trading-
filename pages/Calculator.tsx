import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calculator as CalcIcon, History, ArrowRight, Download, Save, RefreshCw, Target, DollarSign } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { CalculatorEntry, CalculatorMode, CalculatorTarget, Trade } from '../types';
import { getCalculatorHistory, saveCalculatorEntry, getCalculatorSettings, saveCalculatorSettings, getUserSettings, getGlobalStats } from '../services/storage';

interface CalculatorProps {
  trades?: Trade[];
}

export const Calculator: React.FC<CalculatorProps> = ({ trades = [] }) => {
  const navigate = useNavigate();
  
  // Settings State
  const [targetMode, setTargetMode] = useState<CalculatorTarget>('UNITS');
  const [mode, setMode] = useState<CalculatorMode>('PERCENT');
  
  // Input State
  const [balance, setBalance] = useState<number>(10000);
  const [riskInput, setRiskInput] = useState<number>(1); // % or $
  
  // Units Mode Inputs
  const [entryPrice, setEntryPrice] = useState<number | string>('');
  const [stopLoss, setStopLoss] = useState<number | string>('');
  
  // Value Mode Inputs
  const [stopLossPercent, setStopLossPercent] = useState<number | string>('');
  
  const [leverage, setLeverage] = useState<number>(1);
  const [history, setHistory] = useState<CalculatorEntry[]>([]);

  // Calculate Real-time Capital from Dashboard
  useEffect(() => {
    const userSettings = getUserSettings();
    const stats = getGlobalStats(trades);
    const currentCapital = userSettings.initialCapital + stats.grossPnL;
    
    // Only auto-update balance if it matches previous default or is 0
    // But per prompt requirement: "Must integrate with user's current capital"
    // We'll set it on mount.
    setBalance(currentCapital);
  }, [trades]);

  // Load calculator-specific history/settings
  useEffect(() => {
    const savedSettings = getCalculatorSettings();
    if (savedSettings) {
        if (savedSettings.mode) setMode(savedSettings.mode);
        if (savedSettings.targetMode) setTargetMode(savedSettings.targetMode);
        if (savedSettings.riskInput) setRiskInput(savedSettings.riskInput);
        if (savedSettings.leverage) setLeverage(savedSettings.leverage);
    }
    setHistory(getCalculatorHistory());
  }, []);

  // Save settings on change
  useEffect(() => {
    saveCalculatorSettings({ mode, targetMode, riskInput, leverage });
  }, [mode, targetMode, riskInput, leverage]);

  // --- Core Logic ---
  const results = useMemo(() => {
    const riskVal = Number(riskInput);
    const balVal = Number(balance);
    
    let dollarRisk = 0;
    if (mode === 'PERCENT') {
        dollarRisk = balVal * (riskVal / 100);
    } else {
        dollarRisk = riskVal;
    }

    // Common Output structure
    let positionSize = 0;
    let positionValue = 0;
    let valid = false;

    if (targetMode === 'UNITS') {
        // --- UNITS MODE (Price Based) ---
        // Formula: Units = Risk$ / |Entry - Stop|
        const ep = Number(entryPrice);
        const sl = Number(stopLoss);
        const dist = Math.abs(ep - sl);

        if (ep > 0 && sl > 0 && dist > 0 && dollarRisk > 0) {
            positionSize = dollarRisk / dist;
            positionValue = positionSize * ep;
            valid = true;
        }
    } else {
        // --- VALUE MODE (% Based) ---
        // Formula: Position Value = Risk$ / StopLoss%
        const slPct = Number(stopLossPercent) / 100;
        
        if (slPct > 0 && dollarRisk > 0) {
            positionValue = dollarRisk / slPct;
            valid = true;

            // Back-calculate Units if Entry Price provided
            const ep = Number(entryPrice);
            if (ep > 0) {
                positionSize = positionValue / ep;
            }
        }
    }

    return {
        valid,
        positionSize,
        positionValue,
        dollarRisk
    };
  }, [targetMode, mode, balance, riskInput, entryPrice, stopLoss, stopLossPercent]);

  // Handlers
  const handleSaveCalculation = () => {
    if (!results.valid) return;
    
    const entry: CalculatorEntry = {
        id: crypto.randomUUID(),
        date: new Date().toISOString(),
        targetMode,
        mode,
        balance,
        riskInput,
        entryPrice: Number(entryPrice) || undefined,
        stopLoss: targetMode === 'UNITS' ? Number(stopLoss) : undefined,
        stopLossPercent: targetMode === 'VALUE' ? Number(stopLossPercent) : undefined,
        leverage,
        positionSize: results.positionSize,
        positionValue: results.positionValue,
        dollarRisk: results.dollarRisk
    };

    const newHistory = saveCalculatorEntry(entry);
    setHistory(newHistory);
  };

  const handleUseInJournal = () => {
    if (!results.valid) return;
    
    const params = new URLSearchParams();
    params.set('new', 'true');
    
    // Common Params
    if (results.positionSize > 0) params.set('size', results.positionSize.toFixed(6));
    params.set('risk', results.dollarRisk.toFixed(2));
    
    const ep = Number(entryPrice);

    if (targetMode === 'UNITS') {
        params.set('entry', ep.toString());
        params.set('stop', stopLoss.toString());
        // Infer Direction
        const dir = ep > Number(stopLoss) ? 'Long' : 'Short';
        params.set('dir', dir);
    } else {
        // VALUE Mode
        if (ep > 0) {
            params.set('entry', ep.toString());
            // Implicitly calculate stop based on %? 
            // We don't know direction (Long/Short) for sure, but we can guess or leave blank.
            // Let's leave Stop blank for user to decide Direction in Journal, 
            // OR if we assume Long:
            // Stop = Entry * (1 - %);
        }
    }

    navigate(`/journal?${params.toString()}`);
  };

  const downloadCSV = () => {
    if (history.length === 0) return;
    
    const headers = ['Date', 'Type', 'Balance', 'Risk', 'Entry', 'Stop', 'Size', 'Value', 'Risk $'];
    const rows = history.map(h => [
        new Date(h.date).toLocaleString(),
        h.targetMode,
        h.balance,
        h.riskInput + (h.mode === 'PERCENT' ? '%' : '$'),
        h.entryPrice || '-',
        h.targetMode === 'UNITS' ? h.stopLoss : (h.stopLossPercent + '%'),
        h.positionSize.toFixed(4),
        h.positionValue.toFixed(2),
        h.dollarRisk.toFixed(2)
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
        + headers.join(",") + "\n" 
        + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "trademind_calc_history.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white">Position Calculator</h2>
        <p className="text-slate-400">Precision risk management for every trade.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Input Form */}
        <div className="lg:col-span-2 space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                
                {/* 1. Target Toggle (Units vs Value) */}
                <div className="mb-8">
                    <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">Calculation Target</label>
                    <div className="grid grid-cols-2 gap-4">
                        <button 
                            onClick={() => setTargetMode('UNITS')}
                            className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border transition-all ${
                                targetMode === 'UNITS' 
                                ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400' 
                                : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                            }`}
                        >
                            <Target className="w-4 h-4" />
                            <div className="text-left">
                                <div className="text-sm font-bold">Position Units</div>
                                <div className="text-[10px] opacity-70">Based on Price Levels</div>
                            </div>
                        </button>
                        <button 
                            onClick={() => setTargetMode('VALUE')}
                            className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border transition-all ${
                                targetMode === 'VALUE' 
                                ? 'bg-blue-600/20 border-blue-500 text-blue-400' 
                                : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                            }`}
                        >
                            <DollarSign className="w-4 h-4" />
                            <div className="text-left">
                                <div className="text-sm font-bold">Position Value</div>
                                <div className="text-[10px] opacity-70">Based on Stop %</div>
                            </div>
                        </button>
                    </div>
                </div>

                {/* 2. Risk Settings */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 pb-6 border-b border-slate-800">
                    <div className="relative">
                        <Input 
                            label="Account Balance" 
                            type="number" 
                            value={balance} 
                            onChange={(e) => setBalance(parseFloat(e.target.value))}
                            className="pr-8"
                        />
                        <div className="absolute top-8 right-3 text-slate-500 text-xs font-medium">USD</div>
                    </div>
                    
                    <div className="space-y-1">
                        <div className="flex justify-between items-center">
                            <label className="text-xs font-medium text-slate-400">Risk Amount</label>
                            <div className="flex bg-slate-800 rounded p-0.5">
                                <button onClick={()=>setMode('PERCENT')} className={`px-2 py-0.5 text-[10px] rounded ${mode==='PERCENT' ? 'bg-slate-600 text-white' : 'text-slate-400'}`}>%</button>
                                <button onClick={()=>setMode('FIXED')} className={`px-2 py-0.5 text-[10px] rounded ${mode==='FIXED' ? 'bg-slate-600 text-white' : 'text-slate-400'}`}>$</button>
                            </div>
                        </div>
                        <Input 
                            type="number" 
                            step={mode === 'PERCENT' ? "0.1" : "1"}
                            value={riskInput} 
                            onChange={(e) => setRiskInput(parseFloat(e.target.value))}
                            placeholder={mode === 'PERCENT' ? "1%" : "$100"}
                        />
                    </div>
                </div>

                {/* 3. Conditional Inputs */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {targetMode === 'UNITS' ? (
                        <>
                            <Input 
                                label="Entry Price" 
                                type="number" 
                                step="any"
                                value={entryPrice} 
                                onChange={(e) => setEntryPrice(e.target.value)}
                                placeholder="e.g. 50000"
                            />
                            <Input 
                                label="Stop Loss Price" 
                                type="number" 
                                step="any"
                                value={stopLoss} 
                                onChange={(e) => setStopLoss(e.target.value)}
                                placeholder="e.g. 49500"
                            />
                        </>
                    ) : (
                        <>
                            <Input 
                                label="Stop Loss Distance (%)" 
                                type="number" 
                                step="0.1"
                                value={stopLossPercent} 
                                onChange={(e) => setStopLossPercent(e.target.value)}
                                placeholder="e.g. 5"
                            />
                            <div>
                                <Input 
                                    label="Entry Price (Optional)" 
                                    type="number" 
                                    step="any"
                                    value={entryPrice} 
                                    onChange={(e) => setEntryPrice(e.target.value)}
                                    placeholder="Calculate Units?"
                                />
                                <p className="text-[10px] text-slate-500 mt-1">Enter price to back-calculate units.</p>
                            </div>
                        </>
                    )}
                </div>

                {/* Optional Leverage */}
                <div className="mt-6 pt-6 border-t border-slate-800">
                     <Input 
                        label="Leverage (Optional - for Margin calc)" 
                        type="number" 
                        min="1"
                        value={leverage} 
                        onChange={(e) => setLeverage(parseFloat(e.target.value))}
                        className="w-1/3"
                    />
                </div>
            </div>

            {/* History Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <div className="p-4 border-b border-slate-800 flex justify-between items-center">
                    <h3 className="text-lg font-medium text-white flex items-center gap-2">
                        <History className="w-4 h-4 text-emerald-500" /> Recent Calculations
                    </h3>
                    <Button variant="ghost" size="sm" onClick={downloadCSV} disabled={history.length === 0}>
                        <Download className="w-4 h-4 mr-2" /> CSV
                    </Button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-950 text-slate-400">
                            <tr>
                                <th className="px-4 py-3">Mode</th>
                                <th className="px-4 py-3">Stop</th>
                                <th className="px-4 py-3">Risk</th>
                                <th className="px-4 py-3 text-right">Value</th>
                                <th className="px-4 py-3 text-right">Units</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {history.slice(0, 5).map(h => (
                                <tr key={h.id} className="text-slate-300">
                                    <td className="px-4 py-3">
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${h.targetMode === 'UNITS' ? 'border-emerald-900 bg-emerald-900/20 text-emerald-400' : 'border-blue-900 bg-blue-900/20 text-blue-400'}`}>
                                            {h.targetMode}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-xs">
                                        {h.targetMode === 'UNITS' ? h.stopLoss : `${h.stopLossPercent}%`}
                                    </td>
                                    <td className="px-4 py-3 text-rose-400 font-medium">${h.dollarRisk.toFixed(2)}</td>
                                    <td className="px-4 py-3 text-right text-slate-300">${h.positionValue.toLocaleString()}</td>
                                    <td className="px-4 py-3 text-right font-mono text-emerald-500">{h.positionSize > 0 ? h.positionSize.toFixed(4) : '-'}</td>
                                </tr>
                            ))}
                            {history.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-6 text-center text-slate-500">No history available yet.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        {/* Right Column: Result Card */}
        <div className="lg:col-span-1">
            <div className={`bg-gradient-to-b from-slate-800 to-slate-900 border-2 rounded-xl p-6 shadow-2xl sticky top-8 transition-colors ${results.valid ? (targetMode === 'UNITS' ? 'border-emerald-500/50' : 'border-blue-500/50') : 'border-slate-800'}`}>
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">
                    {targetMode === 'UNITS' ? 'Position Size' : 'Total Position Value'}
                </h3>
                
                <div className="space-y-6">
                    {/* Primary Output */}
                    <div>
                        <p className="text-slate-400 text-sm mb-1">
                            {targetMode === 'UNITS' ? 'Units to Buy/Sell' : 'Capital Required'}
                        </p>
                        <p className={`text-4xl font-bold tracking-tight break-all ${targetMode === 'UNITS' ? 'text-white' : 'text-blue-400'}`}>
                            {targetMode === 'UNITS' 
                                ? (results.positionSize ? results.positionSize.toLocaleString(undefined, { maximumFractionDigits: 6 }) : '---')
                                : `$${results.positionValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
                            }
                        </p>
                    </div>

                    {/* Secondary Metrics */}
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-700">
                        <div>
                            <p className="text-slate-500 text-xs mb-1">
                                {targetMode === 'UNITS' ? 'Total Value' : 'Equivalent Units'}
                            </p>
                            <p className="text-lg font-semibold text-slate-200">
                                {targetMode === 'UNITS'
                                    ? `$${results.positionValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
                                    : (results.positionSize > 0 ? results.positionSize.toLocaleString(undefined, { maximumFractionDigits: 6 }) : 'Requires Entry')
                                }
                            </p>
                        </div>
                        <div>
                            <p className="text-slate-500 text-xs mb-1">Risk Amount</p>
                            <p className="text-lg font-semibold text-rose-500">
                                ${results.dollarRisk.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                            </p>
                        </div>
                    </div>

                    <div className="bg-slate-950/50 rounded-lg p-3 text-xs text-slate-400 space-y-1">
                        {leverage > 1 && (
                            <div className="flex justify-between">
                                <span>Margin ({leverage}x):</span>
                                <span className="text-slate-200">${(results.positionValue / leverage).toFixed(2)}</span>
                            </div>
                        )}
                        {targetMode === 'UNITS' && results.valid && (
                            <div className="flex justify-between">
                                <span>Stop Distance:</span>
                                <span className="text-slate-200">{Math.abs(((Number(entryPrice) - Number(stopLoss))/Number(entryPrice))*100).toFixed(2)}%</span>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col gap-3 pt-4">
                        <Button onClick={handleSaveCalculation} disabled={!results.valid} variant="secondary" className="w-full">
                            <Save className="w-4 h-4 mr-2" /> Save to History
                        </Button>
                        <Button onClick={handleUseInJournal} disabled={!results.valid} className={`w-full ${targetMode === 'UNITS' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
                            Use in Journal <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};