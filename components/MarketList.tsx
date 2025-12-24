
import React, { useState } from 'react';
import { Stock, Holding } from '../types';
import { Search, RefreshCw, ShoppingCart, TrendingDown, TrendingUp } from 'lucide-react';
import TradeModal from './TradeModal';

interface MarketListProps {
  stocks: Stock[];
  loading: boolean;
  onTrade: (type: 'BUY' | 'SELL', symbol: string, quantity: number, price: number) => void;
  onRefresh: () => void;
  balance: number;
  holdings: Holding[];
}

const MarketList: React.FC<MarketListProps> = ({ stocks, loading, onTrade, onRefresh, balance, holdings }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);

  const filteredStocks = stocks.filter(s => 
    s.Symbol.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          Live Market
          <span className="text-sm font-normal text-slate-500">(15-min delayed)</span>
        </h2>
        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input
              type="text"
              placeholder="Search symbol (e.g. NICA, HIDCL)..."
              className="bg-slate-900 border border-slate-800 rounded-lg pl-10 pr-4 py-2 w-full md:w-64 focus:outline-none focus:border-emerald-500 transition"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            onClick={onRefresh}
            className="p-2 bg-slate-900 border border-slate-800 rounded-lg hover:bg-slate-800 transition"
            title="Refresh"
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="glass-effect rounded-2xl overflow-hidden border border-white/5">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-white/5 border-b border-white/5 text-slate-400 text-sm uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 font-semibold">Symbol</th>
                <th className="px-6 py-4 font-semibold text-right">LTP (NPR)</th>
                <th className="px-6 py-4 font-semibold text-right">Change</th>
                <th className="px-6 py-4 font-semibold text-right hidden md:table-cell">High/Low</th>
                <th className="px-6 py-4 font-semibold text-right hidden lg:table-cell">Volume</th>
                <th className="px-6 py-4 font-semibold text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4"><div className="h-4 bg-slate-800 rounded w-20"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-slate-800 rounded w-16 ml-auto"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-slate-800 rounded w-12 ml-auto"></div></td>
                    <td className="px-6 py-4 hidden md:table-cell"><div className="h-4 bg-slate-800 rounded w-24 ml-auto"></div></td>
                    <td className="px-6 py-4 hidden lg:table-cell"><div className="h-4 bg-slate-800 rounded w-16 ml-auto"></div></td>
                    <td className="px-6 py-4"><div className="h-8 bg-slate-800 rounded w-24 mx-auto"></div></td>
                  </tr>
                ))
              ) : filteredStocks.length > 0 ? (
                filteredStocks.map((stock) => (
                  <tr key={stock.Symbol} className="hover:bg-white/5 transition group">
                    <td className="px-6 py-4 font-bold text-emerald-400">{stock.Symbol}</td>
                    <td className="px-6 py-4 text-right font-medium">{stock.LTP.toLocaleString()}</td>
                    <td className={`px-6 py-4 text-right font-medium ${stock.Change >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      <div className="flex items-center justify-end gap-1">
                        {stock.Change >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                        {Math.abs(stock.Change).toFixed(2)}%
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right text-slate-400 hidden md:table-cell">
                      <span className="text-emerald-500/80">{stock.High.toLocaleString()}</span> / <span className="text-rose-500/80">{stock.Low.toLocaleString()}</span>
                    </td>
                    <td className="px-6 py-4 text-right text-slate-500 hidden lg:table-cell">{stock.Volume.toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => setSelectedStock(stock)}
                        className="mx-auto flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 rounded-lg transition transform active:scale-95 text-sm font-semibold shadow-lg shadow-emerald-900/20"
                      >
                        <ShoppingCart size={14} />
                        Trade
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    No stocks found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedStock && (
        <TradeModal 
          stock={selectedStock} 
          onClose={() => setSelectedStock(null)} 
          onTrade={onTrade}
          balance={balance}
          holdings={holdings}
        />
      )}
    </div>
  );
};

export default MarketList;
