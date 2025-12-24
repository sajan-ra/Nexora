
import React, { useState, useMemo } from 'react';
import { Stock } from '../types';
import { Search, Loader2 } from 'lucide-react';

interface SidebarProps {
  stocks: Stock[];
  selectedSymbol: string;
  onSelect: (symbol: string) => void;
  loading: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ stocks, selectedSymbol, onSelect, loading }) => {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => 
    stocks.filter(s => s.Symbol.toLowerCase().includes(search.toLowerCase())),
    [stocks, search]
  );

  return (
    <aside className="w-64 border-r border-[#1c2127] bg-[#111418] flex flex-col">
      <div className="p-4 border-b border-[#1c2127]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={12} />
          <input 
            type="text"
            placeholder="Search Market Symbols..."
            className="w-full bg-[#080a0c] border border-[#1c2127] rounded-lg py-2 pl-9 pr-3 text-[11px] font-bold focus:outline-none focus:border-[#2ebd85] transition placeholder:text-slate-700"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#080a0c]/20">
        <div className="px-4 py-2 flex justify-between items-center text-[9px] font-black text-slate-600 uppercase tracking-widest bg-[#111418]/50 border-b border-[#1c2127]">
          <span>Watchlist</span>
          {loading && <Loader2 size={10} className="animate-spin text-[#2ebd85]" />}
        </div>
        
        {filtered.length > 0 ? (
          filtered.map(stock => (
            <button
              key={stock.Symbol}
              onClick={() => onSelect(stock.Symbol)}
              className={`w-full px-4 py-3.5 flex justify-between items-center transition border-b border-[#1c2127]/30 ${
                selectedSymbol === stock.Symbol ? 'bg-[#2ebd85]/10 border-l-2 border-l-[#2ebd85]' : 'hover:bg-white/[0.02]'
              }`}
            >
              <div className="text-left">
                <div className={`text-xs font-black tracking-tighter ${selectedSymbol === stock.Symbol ? 'text-[#2ebd85]' : 'text-slate-200'}`}>
                  {stock.Symbol}
                </div>
                <div className="text-[9px] text-slate-600 font-bold uppercase">Equity</div>
              </div>
              <div className="text-right">
                {stock.LTP > 0 ? (
                  <>
                    <div className="text-[11px] font-black text-slate-300 tabular-nums">
                      {stock.LTP.toFixed(2)}
                    </div>
                    <div className={`text-[9px] font-black tabular-nums ${stock.Change >= 0 ? 'text-[#2ebd85]' : 'text-[#f6465d]'}`}>
                      {stock.Change >= 0 ? '+' : ''}{stock.Change.toFixed(2)}%
                    </div>
                  </>
                ) : (
                  <div className="text-[10px] text-slate-800 font-black italic">---</div>
                )}
              </div>
            </button>
          ))
        ) : (
          <div className="p-10 text-center text-[10px] text-slate-700 font-black uppercase italic">
            No Match Found
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
