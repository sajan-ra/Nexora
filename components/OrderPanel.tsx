
import React, { useState } from 'react';
import { Stock, Transaction, Holding } from '../types';
import { ShoppingCart, Trash2, Clock, AlertCircle } from 'lucide-react';

interface OrderPanelProps {
  stock?: Stock;
  balance: number;
  history: Transaction[];
  onTrade: (type: 'BUY' | 'SELL', symbol: string, quantity: number, price: number) => void;
  holdings: Holding[];
  isMarketOpen: boolean;
}

const OrderPanel: React.FC<OrderPanelProps> = ({ stock, balance, history, onTrade, holdings, isMarketOpen }) => {
  const [tab, setTab] = useState<'MARKET' | 'LIMIT'>('MARKET');
  const [qty, setQty] = useState<number>(1);

  if (!stock) return <aside className="w-80 bg-[#111418] border-l border-[#1c2127]"></aside>;

  const marginRequired = qty * stock.LTP;
  const currentHolding = holdings.find(h => h.symbol === stock.Symbol);

  const handleAddQty = (amount: number) => setQty(prev => prev + amount);

  return (
    <aside className="w-80 border-l border-[#1c2127] bg-[#111418] flex flex-col overflow-hidden">
      {/* Order Input */}
      <div className="p-4 flex flex-col gap-4 border-b border-[#1c2127]">
        {!isMarketOpen && (
          <div className="bg-rose-500/10 border border-rose-500/20 p-3 rounded-md flex items-start gap-2">
            <AlertCircle size={14} className="text-rose-500 mt-0.5 shrink-0" />
            <div className="text-[10px] text-rose-200 leading-tight">
              <span className="font-black uppercase block mb-0.5">Market Closed</span>
              Trading is available Sunday to Thursday, from 11:00 AM to 3:00 PM.
            </div>
          </div>
        )}

        <div className="flex bg-[#080a0c] p-1 rounded-md">
          <button 
            onClick={() => setTab('MARKET')}
            className={`flex-1 py-1.5 text-[10px] font-black rounded transition ${tab === 'MARKET' ? 'bg-[#2ebd85] text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
          >
            MARKET
          </button>
          <button 
            onClick={() => setTab('LIMIT')}
            className={`flex-1 py-1.5 text-[10px] font-black rounded transition ${tab === 'LIMIT' ? 'bg-[#2ebd85] text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
          >
            LIMIT
          </button>
        </div>

        <div className={`space-y-3 transition-opacity duration-300 ${!isMarketOpen ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-[10px] font-black text-slate-600 uppercase">Quantity</label>
              <span className="text-[10px] text-slate-500 font-bold">Available: {currentHolding?.quantity || 0}</span>
            </div>
            <input 
              type="number"
              className="w-full bg-[#080a0c] border border-[#1c2127] rounded-md px-3 py-2 text-sm font-bold focus:outline-none focus:border-[#2ebd85]"
              value={qty}
              onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 0))}
              disabled={!isMarketOpen}
            />
            <div className="grid grid-cols-4 gap-2 mt-2">
              {[+1, +5, +10, +50].map(val => (
                <button 
                  key={val}
                  onClick={() => handleAddQty(val)}
                  disabled={!isMarketOpen}
                  className="bg-[#080a0c] border border-[#1c2127] py-1 text-[10px] font-bold text-slate-400 rounded hover:bg-[#1c2127] transition disabled:opacity-50"
                >
                  +{val}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-[#080a0c]/50 p-3 rounded-md border border-[#1c2127] flex justify-between items-center">
            <span className="text-[10px] font-black text-slate-600 uppercase">Margin Required</span>
            <span className="text-sm font-bold text-[#2ebd85]">NPR {marginRequired.toLocaleString()}</span>
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <button 
              onClick={() => onTrade('BUY', stock.Symbol, qty, stock.LTP)}
              disabled={!isMarketOpen}
              className="w-full bg-[#2ebd85] hover:bg-[#27b07a] text-white font-black py-3 rounded-md transition transform active:scale-95 text-xs shadow-lg shadow-[#2ebd85]/10 disabled:bg-slate-700 disabled:text-slate-500 disabled:shadow-none"
            >
              BUY {stock.Symbol}
            </button>
            <button 
              onClick={() => onTrade('SELL', stock.Symbol, qty, stock.LTP)}
              disabled={!isMarketOpen}
              className="w-full bg-transparent border border-[#f6465d] text-[#f6465d] hover:bg-[#f6465d] hover:text-white font-black py-3 rounded-md transition transform active:scale-95 text-xs disabled:border-slate-700 disabled:text-slate-700 disabled:hover:bg-transparent"
            >
              SELL {stock.Symbol}
            </button>
          </div>
        </div>

        {!isMarketOpen && (
          <div className="text-[9px] text-center text-slate-600 font-bold uppercase tracking-wider">
            Terminal in Read-Only Mode
          </div>
        )}
      </div>

      {/* Order History */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[#080a0c]/30">
        <div className="p-3 border-b border-[#1c2127] flex items-center gap-2">
          <Clock size={14} className="text-slate-500" />
          <span className="text-[10px] font-black text-slate-500 uppercase">Order History</span>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {history.length === 0 ? (
            <div className="p-12 text-center text-slate-700 text-[10px] italic font-bold">NO ORDERS EXECUTED</div>
          ) : (
            history.map(tx => (
              <div key={tx.id} className="p-3 border-b border-[#1c2127]/50 hover:bg-white/5 transition group">
                <div className="flex justify-between items-start mb-1">
                  <span className={`text-[10px] font-bold px-1 rounded ${tx.type === 'BUY' ? 'bg-[#2ebd85]/20 text-[#2ebd85]' : 'bg-[#f6465d]/20 text-[#f6465d]'}`}>
                    {tx.type}
                  </span>
                  <span className="text-[9px] text-slate-600">{new Date(tx.timestamp).toLocaleTimeString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-200">{tx.symbol}</span>
                  <span className="text-xs text-slate-400">{tx.quantity} @ {tx.price.toLocaleString()}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </aside>
  );
};

export default OrderPanel;
