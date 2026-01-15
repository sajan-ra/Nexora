
import React, { useState, useEffect } from 'react';
import { Stock } from '../types';
import { streamAnalysis, AIChunk } from '../services/aiService';
import { BrainCircuit, RefreshCcw, ShieldAlert, Cpu, Sparkles } from 'lucide-react';

interface AIInsightsProps {
  stocks: Stock[];
}

const AIInsights: React.FC<AIInsightsProps> = ({ stocks }) => {
  const [analysis, setAnalysis] = useState<string>('');
  const [reasoning, setReasoning] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const generateAnalysis = async () => {
    if (stocks.length === 0) return;
    setLoading(true);
    setAnalysis('');
    setReasoning('');

    await streamAnalysis(stocks, (chunk: AIChunk) => {
      if (chunk.reasoning) setReasoning(prev => prev + chunk.reasoning);
      if (chunk.content) setAnalysis(prev => prev + chunk.content);
    });
    
    setLoading(false);
  };

  useEffect(() => {
    if (stocks.length > 0 && !analysis) {
      generateAnalysis();
    }
  }, [stocks]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="bg-[#2ebd85]/20 p-3 rounded-2xl border border-[#2ebd85]/30">
            <BrainCircuit className="text-[#2ebd85] w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Nexora Intelligence</h2>
            <p className="text-sm text-slate-500 font-medium flex items-center gap-2">
               <Cpu size={12} /> Powered by DeepSeek-V3
            </p>
          </div>
        </div>
        <button 
          onClick={generateAnalysis}
          disabled={loading}
          className="flex items-center gap-2 bg-[#2ebd85] hover:bg-[#2ebd85]/90 disabled:opacity-50 px-6 py-2.5 rounded-xl transition-all text-[#080a0c] font-black uppercase text-xs shadow-lg shadow-[#2ebd85]/10"
        >
          <RefreshCcw size={16} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Processing...' : 'Deep Sync'}
        </button>
      </div>

      {reasoning && (
        <div className="bg-[#0f1216] border border-[#1c2127] p-6 rounded-2xl relative">
          <div className="flex items-center gap-2 text-[10px] font-black text-[#2ebd85] uppercase tracking-widest mb-3">
            <Sparkles size={12} /> Neural Reasoning Path
          </div>
          <div className="text-[11px] font-mono text-slate-500 leading-relaxed italic max-h-32 overflow-y-auto custom-scrollbar">
            {reasoning}
          </div>
        </div>
      )}

      <div className="bg-[#111418] rounded-[2rem] p-10 border border-[#1c2127] shadow-2xl relative overflow-hidden">
        {loading && !analysis ? (
          <div className="space-y-6">
            <div className="h-6 bg-slate-800/30 animate-pulse rounded-full w-3/4"></div>
            <div className="h-4 bg-slate-800/20 animate-pulse rounded-full w-5/6"></div>
            <div className="h-32 bg-slate-800/10 animate-pulse rounded-3xl w-full"></div>
          </div>
        ) : (
          <div className="prose prose-invert max-w-none prose-emerald prose-headings:text-[#2ebd85] prose-headings:font-black prose-headings:uppercase prose-p:text-slate-300">
            {analysis ? analysis.split('\n').map((line, i) => {
              if (line.startsWith('#')) return <h3 key={i} className="text-xl mt-8 mb-4 border-b border-white/5 pb-2">{line.replace(/#/g, '').trim()}</h3>;
              if (line.startsWith('-') || line.startsWith('*')) return <li key={i} className="ml-4 mb-2">{line.substring(1).trim()}</li>;
              if (line.trim() === '') return <div key={i} className="h-4" />;
              return <p key={i} className="mb-4">{line}</p>;
            }) : (
              <div className="text-center py-20 opacity-30 font-black uppercase tracking-widest">Analysis Stream Idle</div>
            )}
          </div>
        )}
      </div>

      <div className="bg-amber-500/5 border border-amber-500/20 p-5 rounded-2xl flex gap-4 items-start">
        <ShieldAlert className="text-amber-500 shrink-0 mt-0.5" size={20} />
        <p className="text-[11px] text-amber-500/70 leading-normal font-medium">
          <strong className="text-amber-500 uppercase font-black block mb-1">AI Risk Warning</strong>
          DeepSeek-V3 insights are purely pattern-based. In simulated environments, trends are amplified. Not financial advice.
        </p>
      </div>
    </div>
  );
};

export default AIInsights;
