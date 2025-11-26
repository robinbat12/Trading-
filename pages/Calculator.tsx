import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calculator as CalcIcon, History, ArrowRight, Download, Save } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { CalculatorEntry, CalculatorMode } from '../types';
import { getCalculatorHistory, saveCalculatorEntry, getCalculatorSettings, saveCalculatorSettings } from '../services/storage';

export const Calculator: React.FC = () => {
  const navigate = useNavigate();
  
  // State
  const [mode, setMode] = useState<CalculatorMode>('PERCENT');
  const [balance, setBalance] = useState<number>(10000);
  const [riskInput, setRiskInput] = useState<number>(1); // % or $
  const [entryPrice, setEntryPrice] = useState<number>(0);
  const [stopLoss, setStopLoss] = useState<number>(0);
  const [leverage, setLeverage] = useState<number>(1);
  const [history, setHistory] = useState<CalculatorEntry[]>([]);

  // Load settings on mount
  useEffect(() => {
    const savedSettings = getCalculatorSettings();
    if (savedSettings) {
        setBalance(savedSettings.balance || 10000);
        setMode(savedSettings.mode || 'PERCENT');
        setRiskInput(savedSettings.riskInput || 1);
        setLeverage(savedSettings.leverage || 1);
    }
    setHistory(getCalculatorHistory());
  }, []);

  // Save settings on unmount or change (debounced implicitly by user action)
  useEffect(() => {
    saveCalculatorSettings({ balance, mode, riskInput, leverage });
  }, [balance, mode, riskInput, leverage]);

  // Calculation Logic
  const results = useMemo(() => {
    const dist = Math.abs(entryPrice - stopLoss);
    
    // Validations
    if (entryPrice <= 0 || stopLoss <= 0 || dist === 0) {
        return { valid: false, positionSize: 0, positionValue: 0, dollarRisk: 0, leverageAdjusted: 0 };
    }

    let dollarRisk = 0;
    if (mode === 'PERCENT') {
        dollarRisk = balance * (riskInput / 100);
    } else {
        dollarRisk = riskInput;
    }

    const positionSize = dollarRisk / dist;
    const positionValue = positionSize * entryPrice;
    
    return {
        valid: true,
        positionSize: positionSize,
        positionValue: positionValue,
        dollarRisk: dollarRisk,
        leverageAdjusted: positionSize / leverage // Not used in trade entry, but good for margin calculation
    };
  }, [mode, balance, riskInput, entryPrice, stopLoss, leverage]);

  const handleSaveCalculation = () => {
    if (!results.valid) return;
    
    const entry: CalculatorEntry = {
        id: crypto.randomUUID(),
        date: new Date().toISOString(),
        mode,
        balance,
        riskInput,
        entryPrice,
        stopLoss,
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
    // Redirect to Journal with params
    const params = new URLSearchParams();
    params.set('new', 'true');
    params.set('entry', entryPrice.toString());
    params.set('stop', stopLoss.toString());
    params.set('size', results.positionSize.toFixed(6)); // Precision for crypto
    params.set('risk', results.dollarRisk.toFixed(2));
    
    // Infer direction
    const direction = entryPrice > stopLoss ? 'Long' : 'Short';
    params.set('dir', direction);

    navigate(`/journal?${params.toString()}`);
  };

  const downloadCSV = () => {
    if (history.length === 0) return;
    
    const headers = ['Date', 'Mode', 'Balance', 'Risk Input', 'Entry', 'Stop Loss', 'Leverage', 'Pos Size', 'Pos Value', 'Risk $'];
    const rows = history.map(h => [
        new Date(h.date).toLocaleString(),
        h.mode,
        h.balance,
        h.riskInput,
        h.entryPrice,
        h.stopLoss,
        h.leverage,
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
                
                {/* Mode Toggle */}
                <div className="flex bg-slate-950 p-1 rounded-lg mb-6 w-full md:w-fit">
                    <button 
                        onClick={() => setMode('PERCENT')}
                        className={`flex-1 md:flex-none px-6 py-2 rounded-md text-sm font-medium transition-all ${mode === 'PERCENT' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                    >
                        Risk % Mode
                    </button>
                    <button 
                        onClick={() => setMode('FIXED')}
                        className={`flex-1 md:flex-none px-6 py-2 rounded-md text-sm font-medium transition-all ${mode === 'FIXED' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                    >
                        Fixed $ Mode
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input 
                        label="Account Balance ($)" 
                        type="number" 
                        value={balance} 
                        onChange={(e) => setBalance(parseFloat(e.target.value))}
                    />
                    
                    <Input 
                        label={mode === 'PERCENT' ? "Risk per Trade (%)" : "Risk per Trade ($)"}
                        type="number" 
                        step={mode === 'PERCENT' ? "0.1" : "1"}
                        value={riskInput} 
                        onChange={(e) => setRiskInput(parseFloat(e.target.value))}
                    />

                    <Input 
                        label="Entry Price" 
                        type="number" 
                        step="any"
                        value={entryPrice} 
                        onChange={(e) => setEntryPrice(parseFloat(e.target.value))}
                    />

                    <Input 
                        label="Stop Loss Price" 
                        type="number" 
                        step="any"
                        value={stopLoss} 
                        onChange={(e) => setStopLoss(parseFloat(e.target.value))}
                    />

                    <Input 
                        label="Leverage (Optional)" 
                        type="number" 
                        min="1"
                        value={leverage} 
                        onChange={(e) => setLeverage(parseFloat(e.target.value))}
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
                                <th className="px-4 py-3">Time</th>
                                <th className="px-4 py-3">Entry</th>
                                <th className="px-4 py-3">Stop</th>
                                <th className="px-4 py-3">Risk</th>
                                <th className="px-4 py-3 text-right">Size (Units)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {history.slice(0, 5).map(h => (
                                <tr key={h.id} className="text-slate-300">
                                    <td className="px-4 py-3 text-xs text-slate-500">{new Date(h.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                                    <td className="px-4 py-3">{h.entryPrice}</td>
                                    <td className="px-4 py-3">{h.stopLoss}</td>
                                    <td className="px-4 py-3 text-rose-400">${h.dollarRisk.toFixed(2)}</td>
                                    <td className="px-4 py-3 text-right font-medium text-emerald-500">{h.positionSize.toFixed(4)}</td>
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
            <div className={`bg-gradient-to-b from-slate-800 to-slate-900 border-2 rounded-xl p-6 shadow-2xl sticky top-8 ${results.valid ? 'border-emerald-500/50' : 'border-slate-800'}`}>
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Position Results</h3>
                
                <div className="space-y-6">
                    <div>
                        <p className="text-slate-400 text-sm mb-1">Position Size (Units)</p>
                        <p className="text-4xl font-bold text-white tracking-tight break-all">
                            {results.positionSize ? results.positionSize.toLocaleString(undefined, { maximumFractionDigits: 6 }) : '---'}
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-700">
                        <div>
                            <p className="text-slate-500 text-xs mb-1">Total Value</p>
                            <p className="text-lg font-semibold text-slate-200">
                                ${results.positionValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                            </p>
                        </div>
                        <div>
                            <p className="text-slate-500 text-xs mb-1">Risk Amount</p>
                            <p className="text-lg font-semibold text-rose-500">
                                ${results.dollarRisk.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                            </p>
                        </div>
                    </div>

                    <div className="bg-slate-950/50 rounded-lg p-3 text-xs text-slate-400">
                        {leverage > 1 && (
                            <div className="flex justify-between mb-1">
                                <span>Margin Required ({leverage}x):</span>
                                <span className="text-slate-200">${(results.positionValue / leverage).toFixed(2)}</span>
                            </div>
                        )}
                        <div className="flex justify-between">
                            <span>Distance to Stop:</span>
                            <span className="text-slate-200">{Math.abs(((entryPrice - stopLoss)/entryPrice)*100).toFixed(2)}%</span>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 pt-4">
                        <Button onClick={handleSaveCalculation} disabled={!results.valid} variant="secondary" className="w-full">
                            <Save className="w-4 h-4 mr-2" /> Save to History
                        </Button>
                        <Button onClick={handleUseInJournal} disabled={!results.valid} className="w-full bg-emerald-600 hover:bg-emerald-700">
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