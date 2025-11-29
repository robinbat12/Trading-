import React, { useState } from 'react';
import { Plus } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, className = '', ...props }) => {
  return (
    <div className="w-full">
      {label && <label className="block text-xs font-medium text-slate-400 mb-1">{label}</label>}
      <input
        className={`w-full bg-slate-800 border ${error ? 'border-rose-500' : 'border-slate-700'} rounded-lg px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all ${className}`}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-rose-500">{error}</p>}
    </div>
  );
};

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    options: { value: string; label: string }[];
}

export const Select: React.FC<SelectProps> = ({ label, options, className = '', ...props }) => {
    return (
        <div className="w-full">
            {label && <label className="block text-xs font-medium text-slate-400 mb-1">{label}</label>}
            <div className="relative">
                <select
                    className={`w-full appearance-none bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all ${className}`}
                    {...props}
                >
                    {options.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
                    <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
                </div>
            </div>
        </div>
    );
};

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
}

export const Textarea: React.FC<TextareaProps> = ({ label, className = '', ...props }) => {
    return (
        <div className="w-full">
            {label && <label className="block text-xs font-medium text-slate-400 mb-1">{label}</label>}
            <textarea
                className={`w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all ${className}`}
                {...props}
            />
        </div>
    );
};

interface TagSelectorProps {
    label?: string;
    options: string[];
    selected: string[];
    onChange: (selected: string[]) => void;
    allowCustom?: boolean;
}

export const TagSelector: React.FC<TagSelectorProps> = ({ label, options, selected, onChange, allowCustom = false }) => {
    const [customTag, setCustomTag] = useState('');

    const toggleTag = (tag: string) => {
        if (selected.includes(tag)) {
            onChange(selected.filter(t => t !== tag));
        } else {
            onChange([...selected, tag]);
        }
    };

    const handleAddCustom = (e: React.FormEvent) => {
        e.preventDefault();
        if (customTag.trim() && !selected.includes(customTag.trim())) {
            onChange([...selected, customTag.trim()]);
            setCustomTag('');
        }
    };

    return (
        <div className="w-full">
            {label && <label className="block text-xs font-medium text-slate-400 mb-2">{label}</label>}
            <div className="flex flex-wrap gap-2 mb-2">
                {options.map(tag => (
                    <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                            selected.includes(tag)
                                ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400'
                                : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-300'
                        }`}
                    >
                        {tag}
                    </button>
                ))}
                {/* Render selected custom tags that are NOT in options */}
                {selected.filter(t => !options.includes(t)).map(tag => (
                    <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className="px-3 py-1 rounded-full text-xs font-medium border bg-emerald-600/20 border-emerald-500 text-emerald-400"
                    >
                        {tag}
                    </button>
                ))}
            </div>
            
            {allowCustom && (
                <div className="flex items-center gap-2 mt-2">
                    <input 
                        type="text" 
                        value={customTag}
                        onChange={(e) => setCustomTag(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddCustom(e);
                            }
                        }}
                        placeholder="Add custom tag..." 
                        className="bg-slate-800 border border-slate-700 rounded-md px-2 py-1 text-xs text-slate-200 placeholder-slate-500 focus:border-emerald-500 focus:outline-none w-32"
                    />
                    <button 
                        type="button"
                        onClick={handleAddCustom}
                        disabled={!customTag.trim()}
                        className="p-1 rounded bg-slate-700 text-slate-300 hover:bg-emerald-600 hover:text-white disabled:opacity-50"
                    >
                        <Plus className="w-3 h-3" />
                    </button>
                </div>
            )}
        </div>
    );
};