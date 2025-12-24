
import React, { useState } from 'react';
import { Stock, Holding } from '../types';
import { X, TrendingUp, Wallet, Package } from 'lucide-react';

interface TradeModalProps {
  stock: Stock;
  onClose: () => void;
  onTrade: (type: 'BUY' | 'SELL', symbol: string, quantity: number, price: number) => void;
  balance: number;
  holdings: Holding[];
}

const TradeModal: React.FC<TradeModalProps> = ({ stock, onClose, onTrade, balance, holdings }) => {
  const [type, setType] = useState<'BUY' | 'SELL'>('BUY');
  const [quantity, setQuantity] = useState<number>(1);
  
  const holding = holdings.find(h => h.symbol === stock.Symbol);
  const totalCost = quantity * stock.LTP;
  const canAfford = type === 'BUY' ? balance >= totalCost : (holding?.quantity || 0) >= quantity;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canAfford) return;
    onTrade(type, stock.Symbol, quantity, stock.LTP);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-white/10 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center p-6 border-b border-white/5">
          <div>
            <h3 className="text-xl font-bold text-white">Trade {stock.Symbol}</h3>
            <p className="text-sm text-slate-500">Current LTP: NPR {stock.LTP.toLocaleString()}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="flex bg-slate-950 p-1 rounded-xl gap-1">
            <button
              type="button"
              onClick={() => setType('BUY')}
              className={`flex-1 py-2 rounded-lg font-bold transition ${type === 'BUY' ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
            >
              BUY
            </button>
            <button
              type="button"
              onClick={() => setType('SELL')}
              className={`flex-1 py-2 rounded-lg font-bold transition ${type === 'SELL' ? 'bg-rose-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
            >
              SELL
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1.5">Quantity</label>
              <input
                type="number"
                min="1"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-lg font-bold focus:outline-none focus:border-emerald-500 transition"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 0))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-950/50 p-3 rounded-xl border border-white/5">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1">Total Amount</p>
                <p className="font-bold">NPR {totalCost.toLocaleString()}</p>
              </div>
              <div className="bg-slate-950/50 p-3 rounded-xl border border-white/5">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1">
                  {type === 'BUY' ? 'Available Cash' : 'Your Holdings'}
                </p>
                <p className="font-bold">
                  {type === 'BUY' ? `NPR ${balance.toLocaleString()}` : `${holding?.quantity || 0} Shares`}
                </p>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={!canAfford}
            className={`w-full py-4 rounded-xl font-bold text-white shadow-xl transition transform active:scale-[0.98] ${
              !canAfford 
                ? 'bg-slate-800 cursor-not-allowed text-slate-500' 
                : type === 'BUY' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-rose-600 hover:bg-rose-500'
            }`}
          >
            {!canAfford 
              ? (type === 'BUY' ? 'Insufficient Funds' : 'Insufficient Shares') 
              : `Place ${type} Order`}
          </button>
        </form>
      </div>
    </div>
  );
};

export default TradeModal;
