
import React, { useState } from 'react';
import { Stock } from '../types';
import { Search } from 'lucide-react';

interface SidebarProps {
  stocks: Stock[];
  selectedSymbol: string;
  onSelect: (symbol: string) => void;
  loading: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ stocks, selectedSymbol, onSelect, loading }) => {
  const [search, setSearch] = useState('');

  const filtered = stocks.filter(s => 
    s.Symbol.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <aside className="w-64 border-r border-[#1c2127] bg-[#111418] flex flex-col">
      <div className="p-3 border-b border-[#1c2127]">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
          <input 
            type="text"
            placeholder="Search..."
            className="w-full bg-[#080a0c] border border-[#1c2127] rounded-md py-1.5 pl-8 pr-3 text-xs focus:outline-none focus:border-[#2ebd85] transition"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {loading && stocks.length === 0 ? (
          <div className="p-4 text-center text-slate-600 text-xs animate-pulse">Loading market...</div>
        ) : (
          filtered.map(stock => (
            <button
              key={stock.Symbol}
              onClick={() => onSelect(stock.Symbol)}
              className={`w-full px-4 py-3 flex justify-between items-center transition border-b border-[#1c2127]/50 ${
                selectedSymbol === stock.Symbol ? 'bg-[#2ebd85]/5 border-r-2 border-r-[#2ebd85]' : 'hover:bg-white/5'
              }`}
            >
              <div className="text-left">
                <div className={`text-xs font-bold ${selectedSymbol === stock.Symbol ? 'text-[#2ebd85]' : 'text-slate-200'}`}>
                  {stock.Symbol}
                </div>
                <div className="text-[10px] text-slate-600 font-medium">NEPSE</div>
              </div>
              <div className="text-right">
                <div className="text-xs font-bold text-slate-200">{stock.LTP.toLocaleString()}</div>
                <div className={`text-[10px] font-bold ${stock.Change >= 0 ? 'text-[#2ebd85]' : 'text-[#f6465d]'}`}>
                  {stock.Change >= 0 ? '+' : ''}{stock.Change.toFixed(2)}%
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
