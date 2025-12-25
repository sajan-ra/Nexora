
import React, { useState } from 'react';
import { Portfolio, Stock } from '../types';
import { Wallet, History, ArrowUpRight, ArrowDownRight, User, Edit2, Check, X } from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';

interface PortfolioViewProps {
  portfolio: Portfolio;
  stocks: Stock[];
  onTrade: (type: 'BUY' | 'SELL', symbol: string, quantity: number, price: number) => void;
  user: FirebaseUser | null;
  onUpdateName: (newName: string) => Promise<void>;
}

const PortfolioView: React.FC<PortfolioViewProps> = ({ portfolio, stocks, user, onUpdateName }) => {
  const [activeSubTab, setActiveSubTab] = useState<'HOLDINGS' | 'HISTORY'>('HOLDINGS');
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(user?.displayName || '');
  const [isSaving, setIsSaving] = useState(false);

  const getStockPrice = (symbol: string) => {
    return stocks.find(s => s.Symbol === symbol)?.LTP || 0;
  };

  const calculateHoldingsValue = () => {
    return portfolio.holdings.reduce((acc, h) => acc + (h.quantity * getStockPrice(h.symbol)), 0);
  };

  const handleSaveName = async () => {
    if (!tempName.trim()) return;
    setIsSaving(true);
    try {
      await onUpdateName(tempName);
      setIsEditingName(false);
    } finally {
      setIsSaving(false);
    }
  };

  const totalValue = portfolio.balance + calculateHoldingsValue();
  const initialValue = 50000; 
  const totalPL = totalValue - initialValue;
  const plPercentage = (totalPL / initialValue) * 100;

  return (
    <div className="space-y-6">
      {/* Profile Management Section */}
      <div className="glass-effect p-6 rounded-[2rem] border border-white/10 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 rounded-full bg-[#2ebd85]/20 border border-[#2ebd85]/30 flex items-center justify-center text-[#2ebd85]">
            <User size={32} />
          </div>
          <div>
            {isEditingName ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  className="bg-[#080a0c] border border-[#2ebd85] rounded-lg px-3 py-1 text-sm font-black uppercase text-white outline-none"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  autoFocus
                />
                <button onClick={handleSaveName} disabled={isSaving} className="p-1 text-[#2ebd85] hover:bg-[#2ebd85]/10 rounded">
                  <Check size={16} />
                </button>
                <button onClick={() => { setIsEditingName(false); setTempName(user?.displayName || ''); }} className="p-1 text-rose-500 hover:bg-rose-500/10 rounded">
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-white uppercase tracking-tighter">
                  {user?.displayName || 'Anonymous Trader'}
                </h2>
                <button onClick={() => setIsEditingName(true)} className="p-1 text-slate-500 hover:text-white transition">
                  <Edit2 size={12} />
                </button>
              </div>
            )}
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
              Member ID: {user?.uid.substring(0, 8).toUpperCase()}...
            </p>
          </div>
        </div>

        <div className="flex items-center gap-8 border-l border-[#1c2127] pl-8">
          <div className="text-center">
            <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest mb-1">Session Rank</p>
            <p className="text-sm font-black text-white">Advanced</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest mb-1">Status</p>
            <p className="text-sm font-black text-[#2ebd85] uppercase">Verified</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="glass-effect p-6 rounded-2xl border border-white/10 flex flex-col gap-2">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-sm font-medium">Cash Balance</span>
            <Wallet size={18} />
          </div>
          <div className="text-3xl font-bold">NPR {portfolio.balance.toLocaleString()}</div>
        </div>

        <div className="glass-effect p-6 rounded-2xl border border-white/10 flex flex-col gap-2">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-sm font-medium">Invested Value</span>
            <ArrowUpRight size={18} />
          </div>
          <div className="text-3xl font-bold">NPR {calculateHoldingsValue().toLocaleString()}</div>
        </div>

        <div className={`glass-effect p-6 rounded-2xl border ${totalPL >= 0 ? 'border-emerald-500/30' : 'border-rose-500/30'} flex flex-col gap-2`}>
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-sm font-medium">Total Returns</span>
            {totalPL >= 0 ? <ArrowUpRight className="text-emerald-500" size={18} /> : <ArrowDownRight className="text-rose-500" size={18} />}
          </div>
          <div className={`text-3xl font-bold ${totalPL >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
            {totalPL >= 0 ? '+' : ''}{totalPL.toLocaleString()} ({plPercentage.toFixed(2)}%)
          </div>
        </div>
      </div>

      <div className="flex gap-4 border-b border-white/10">
        <button 
          onClick={() => setActiveSubTab('HOLDINGS')}
          className={`pb-3 px-2 font-semibold transition relative ${activeSubTab === 'HOLDINGS' ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-slate-500'}`}
        >
          My Holdings
        </button>
        <button 
          onClick={() => setActiveSubTab('HISTORY')}
          className={`pb-3 px-2 font-semibold transition relative ${activeSubTab === 'HISTORY' ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-slate-500'}`}
        >
          Order History
        </button>
      </div>

      {activeSubTab === 'HOLDINGS' ? (
        <div className="glass-effect rounded-2xl overflow-hidden border border-white/5">
          {portfolio.holdings.length === 0 ? (
            <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-4">
              <User size={48} className="opacity-20" />
              <p>Your portfolio is empty. Go to Market to start trading.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-white/5 border-b border-white/5 text-slate-400 text-sm">
                  <tr>
                    <th className="px-6 py-4">Asset</th>
                    <th className="px-6 py-4 text-right">Qty</th>
                    <th className="px-6 py-4 text-right">Avg Price</th>
                    <th className="px-6 py-4 text-right">Current LTP</th>
                    <th className="px-6 py-4 text-right">Market Value</th>
                    <th className="px-6 py-4 text-right">P/L</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {portfolio.holdings.map((h) => {
                    const ltp = getStockPrice(h.symbol);
                    const marketVal = h.quantity * ltp;
                    const invested = h.quantity * h.avgPrice;
                    const pl = marketVal - invested;
                    const plPct = (pl / invested) * 100;

                    return (
                      <tr key={h.symbol} className="hover:bg-white/5 transition">
                        <td className="px-6 py-4 font-bold text-white">{h.symbol}</td>
                        <td className="px-6 py-4 text-right">{h.quantity}</td>
                        <td className="px-6 py-4 text-right">{h.avgPrice.toLocaleString()}</td>
                        <td className="px-6 py-4 text-right">{ltp.toLocaleString()}</td>
                        <td className="px-6 py-4 text-right font-medium">{marketVal.toLocaleString()}</td>
                        <td className={`px-6 py-4 text-right font-bold ${pl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {pl >= 0 ? '+' : ''}{pl.toLocaleString()} ({plPct.toFixed(2)}%)
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="glass-effect rounded-2xl overflow-hidden border border-white/5">
          {portfolio.history.length === 0 ? (
            <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-4">
              <History size={48} className="opacity-20" />
              <p>No trading activity recorded yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-white/5 border-b border-white/5 text-slate-400 text-sm">
                  <tr>
                    <th className="px-6 py-4">Time</th>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4">Asset</th>
                    <th className="px-6 py-4 text-right">Qty</th>
                    <th className="px-6 py-4 text-right">Price</th>
                    <th className="px-6 py-4 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-300">
                  {portfolio.history.map((tx) => (
                    <tr key={tx.id} className="hover:bg-white/5 transition">
                      <td className="px-6 py-4 text-sm text-slate-500">{new Date(tx.timestamp).toLocaleString()}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${tx.type === 'BUY' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-rose-500/20 text-rose-500'}`}>
                          {tx.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-bold">{tx.symbol}</td>
                      <td className="px-6 py-4 text-right">{tx.quantity}</td>
                      <td className="px-6 py-4 text-right">{tx.price.toLocaleString()}</td>
                      <td className="px-6 py-4 text-right">{(tx.quantity * tx.price).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PortfolioView;
