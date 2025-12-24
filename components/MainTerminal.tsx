
import React, { useMemo } from 'react';
import { Stock, Holding } from '../types';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
} from 'recharts';
import { Wifi, WifiOff, Moon } from 'lucide-react';

interface ExtendedStock extends Stock {
  isLive?: boolean;
}

interface MainTerminalProps {
  stock?: ExtendedStock;
  holdings: Holding[];
  stocks: ExtendedStock[];
  isMarketOpen: boolean;
}

const Candlestick = (props: any) => {
  const { x, y, width, height, low, high, open, close } = props;
  const isUp = close >= open;
  const color = isUp ? "#2ebd85" : "#f6465d";
  const ratio = height / (high - low);
  const bodyUpper = Math.max(open, close);
  const bodyLower = Math.min(open, close);
  const bodyHeight = Math.max(2, (bodyUpper - bodyLower) * ratio);
  const bodyY = y + (high - bodyUpper) * ratio;
  const wickX = x + width / 2;

  return (
    <g>
      <line x1={wickX} y1={y} x2={wickX} y2={y + height} stroke={color} strokeWidth={1} />
      <rect x={x} y={bodyY} width={width} height={bodyHeight} fill={color} stroke={color} strokeOpacity={0.8} />
    </g>
  );
};

const MainTerminal: React.FC<MainTerminalProps> = ({ stock, holdings, stocks, isMarketOpen }) => {
  const chartData = useMemo(() => {
    if (!stock) return [];
    let lastClose = stock.LTP * (1 - (stock.Change / 100));
    return Array.from({ length: 45 }).map((_, i) => {
      const open = lastClose;
      const isLast = i === 44;
      let close, high, low;
      if (isLast) {
        close = stock.LTP;
        high = Math.max(open, close, stock.High);
        low = Math.min(open, close, stock.Low);
      } else {
        const volatility = 0.008;
        const change = (Math.random() * 2 - 1) * volatility;
        close = open * (1 + change);
        high = Math.max(open, close) * (1 + Math.random() * 0.003);
        low = Math.min(open, close) * (1 - Math.random() * 0.003);
      }
      lastClose = close;
      return { time: i, open, high, low, close, range: [low, high] };
    });
  }, [stock?.Symbol, stock?.LTP]);

  if (!stock) return (
    <div className="flex-1 bg-[#080a0c] flex items-center justify-center">
      <div className="text-slate-800 font-black text-xl uppercase tracking-[0.4em] animate-pulse">
        Terminal Standby
      </div>
    </div>
  );

  return (
    <main className="flex-1 flex flex-col bg-[#080a0c] overflow-hidden">
      <div className="h-16 border-b border-[#1c2127] px-6 flex items-center justify-between bg-[#111418]/50">
        <div className="flex items-center gap-6">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-black text-white leading-none">{stock.Symbol}</h2>
              <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[8px] font-black uppercase border transition-colors ${stock.isLive ? 'bg-[#2ebd85]/10 border-[#2ebd85]/30 text-[#2ebd85]' : 'bg-amber-500/10 border-amber-500/30 text-amber-500'}`}>
                {stock.isLive ? <Wifi size={10} /> : <WifiOff size={10} />}
                {stock.isLive ? 'Nexora Synced' : 'Simulated'}
              </div>
              {!isMarketOpen && (
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[8px] font-black uppercase border bg-slate-800/30 border-slate-700 text-slate-500">
                  <Moon size={10} />
                  Paused
                </div>
              )}
            </div>
            <div className="flex gap-3 text-[9px] text-slate-600 font-black mt-1">
              <span>VOL <span className="text-slate-400">{Math.floor(stock.Volume).toLocaleString()}</span></span>
              <span className="opacity-20">|</span>
              <span>PREV <span className="text-slate-400">{stock.Open.toFixed(2)}</span></span>
            </div>
          </div>
          <div className="h-8 w-px bg-[#1c2127]"></div>
          <div>
            <div className={`text-xl font-black tabular-nums ${stock.Change >= 0 ? 'text-[#2ebd85]' : 'text-[#f6465d]'}`}>
              {stock.LTP.toFixed(2)}
            </div>
            <div className={`text-[10px] font-black flex gap-1 ${stock.Change >= 0 ? 'text-[#2ebd85]' : 'text-[#f6465d]'}`}>
              <span>{stock.Change >= 0 ? '▲' : '▼'}</span>
              <span>{Math.abs(stock.Change).toFixed(2)}%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 relative p-4 flex flex-col min-h-[300px]">
        {!isMarketOpen && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#080a0c]/40 backdrop-blur-[1px] pointer-events-none">
            <div className="bg-[#111418] border border-[#1c2127] px-4 py-2 rounded-full flex items-center gap-3 shadow-2xl">
              <Moon size={14} className="text-slate-500" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Trading Paused • Nexora Closed</span>
            </div>
          </div>
        )}
        
        <div className="absolute inset-0 flex items-center justify-center z-0 pointer-events-none">
           <h1 className="text-[18vw] font-black text-white/[0.015] select-none tracking-tighter leading-none uppercase">
             {stock.Symbol}
           </h1>
        </div>
        
        <div className="flex-1 relative">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <BarChart data={chartData} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1c2127" vertical={false} strokeOpacity={0.4} />
              <XAxis dataKey="time" hide />
              <YAxis orientation="right" domain={['auto', 'auto']} tick={{ fill: '#334155', fontSize: 10, fontWeight: '900' }} axisLine={false} tickLine={false} width={50} />
              <Tooltip
                contentStyle={{ backgroundColor: '#111418', border: '1px solid #1c2127', borderRadius: '4px' }}
                cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                content={({ active, payload }) => {
                  if (active && payload?.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="bg-[#111418] border border-[#1c2127] p-2 rounded shadow-2xl">
                        <div className="grid grid-cols-2 gap-x-4 text-[9px] font-black uppercase">
                          <span className="text-slate-600">O:</span><span className="text-slate-300 text-right">{d.open.toFixed(2)}</span>
                          <span className="text-slate-600">H:</span><span className="text-[#2ebd85] text-right">{d.high.toFixed(2)}</span>
                          <span className="text-slate-600">L:</span><span className="text-[#f6465d] text-right">{d.low.toFixed(2)}</span>
                          <span className="text-slate-600">C:</span><span className="text-slate-300 text-right">{d.close.toFixed(2)}</span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="range" shape={<Candlestick />} animationDuration={0} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="h-64 border-t border-[#1c2127] flex flex-col bg-[#111418]/30">
        <div className="px-4 py-2 border-b border-[#1c2127] flex items-center justify-between">
          <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Active Orders Terminal</span>
        </div>
        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full text-left text-[11px]">
            <thead className="sticky top-0 bg-[#080a0c] text-slate-700 font-black border-b border-[#1c2127]">
              <tr>
                <th className="px-4 py-2 uppercase tracking-tight">Instrument</th>
                <th className="px-4 py-2 text-right uppercase tracking-tight">Qty</th>
                <th className="px-4 py-2 text-right uppercase tracking-tight">Avg. Cost</th>
                <th className="px-4 py-2 text-right uppercase tracking-tight">LTP</th>
                <th className="px-4 py-2 text-right uppercase tracking-tight">Net P&L</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1c2127]/30">
              {holdings.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-16 text-center text-slate-800 font-black uppercase tracking-widest opacity-30 text-xs">No holdings detected</td>
                </tr>
              ) : (
                holdings.map(h => {
                  const currentLtp = stocks.find(s => s.Symbol === h.symbol)?.LTP || 0;
                  const pl = (currentLtp - h.avgPrice) * h.quantity;
                  return (
                    <tr key={h.symbol} className="hover:bg-white/[0.01] transition-colors border-l-2 border-l-transparent hover:border-l-[#2ebd85]">
                      <td className="px-4 py-3 font-black text-slate-400">{h.symbol}</td>
                      <td className="px-4 py-3 text-right font-bold text-slate-500">{h.quantity}</td>
                      <td className="px-4 py-3 text-right font-medium text-slate-600">{h.avgPrice.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right font-black text-slate-300 tabular-nums">{currentLtp.toFixed(2)}</td>
                      <td className={`px-4 py-3 text-right font-black tabular-nums ${pl >= 0 ? 'text-[#2ebd85]' : 'text-[#f6465d]'}`}>
                        {pl >= 0 ? '+' : ''}{pl.toFixed(2)}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
};

export default MainTerminal;
