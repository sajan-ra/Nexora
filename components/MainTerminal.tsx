
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
  Cell 
} from 'recharts';

interface MainTerminalProps {
  stock?: Stock;
  holdings: Holding[];
  stocks: Stock[];
}

// Custom Candle Component for Recharts
const Candlestick = (props: any) => {
  const { x, y, width, height, low, high, open, close } = props;
  const isUp = close >= open;
  const color = isUp ? "#2ebd85" : "#f6465d";

  // Recharts maps our data values to pixels.
  const ratio = height / (high - low);
  
  const bodyUpper = Math.max(open, close);
  const bodyLower = Math.min(open, close);
  
  const bodyHeight = Math.max(2, (bodyUpper - bodyLower) * ratio);
  const bodyY = y + (high - bodyUpper) * ratio;
  
  const wickX = x + width / 2;

  return (
    <g>
      {/* Wick (High to Low) */}
      <line
        x1={wickX}
        y1={y}
        x2={wickX}
        y2={y + height}
        stroke={color}
        strokeWidth={1}
      />
      {/* Body (Open to Close) */}
      <rect
        x={x}
        y={bodyY}
        width={width}
        height={bodyHeight}
        fill={color}
        stroke={color}
        strokeOpacity={0.8}
      />
    </g>
  );
};

const MainTerminal: React.FC<MainTerminalProps> = ({ stock, holdings, stocks }) => {
  const chartData = useMemo(() => {
    if (!stock) return [];
    
    // Seed with current LTP to make the chart look connected to current price
    let lastClose = stock.LTP * (1 - (stock.Change / 100));
    
    return Array.from({ length: 45 }).map((_, i) => {
      const open = lastClose;
      // If we're at the very end of the array, the close should be the current LTP
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
      
      return {
        time: i,
        open,
        high,
        low,
        close,
        range: [low, high]
      };
    });
  }, [stock?.Symbol, stock?.LTP]); // Re-calculate when LTP changes for real-time feel

  if (!stock) return (
    <div className="flex-1 bg-[#080a0c] flex items-center justify-center">
      <div className="text-slate-700 font-black text-xl uppercase tracking-widest animate-pulse">
        Select an instrument
      </div>
    </div>
  );

  return (
    <main className="flex-1 flex flex-col bg-[#080a0c] overflow-hidden">
      {/* Asset Stats Bar */}
      <div className="h-16 border-b border-[#1c2127] px-6 flex items-center justify-between bg-[#111418]/50">
        <div className="flex items-center gap-6">
          <div>
            <div className="flex items-baseline gap-2">
              <h2 className="text-xl font-black text-white leading-none">{stock.Symbol}</h2>
              <span className="text-[9px] text-slate-600 font-black uppercase tracking-[0.2em]">NEPSE</span>
            </div>
            <div className="flex gap-3 text-[9px] text-slate-500 font-black mt-1">
              <span>VOL <span className="text-slate-300 font-bold">{Math.floor(stock.Volume).toLocaleString()}</span></span>
              <span className="opacity-30">|</span>
              <span>PREV <span className="text-slate-300 font-bold">{stock.Open.toFixed(2)}</span></span>
            </div>
          </div>
          <div className="h-8 w-px bg-[#1c2127]"></div>
          <div>
            <div className={`text-xl font-black tabular-nums transition-colors duration-300 ${stock.Change >= 0 ? 'text-[#2ebd85]' : 'text-[#f6465d]'}`}>
              {stock.LTP.toFixed(2)}
            </div>
            <div className={`text-[10px] font-black flex gap-1 ${stock.Change >= 0 ? 'text-[#2ebd85]' : 'text-[#f6465d]'}`}>
              <span>{stock.Change >= 0 ? '▲' : '▼'}</span>
              <span>{Math.abs(stock.Change).toFixed(2)}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Chart Area */}
      <div className="flex-1 relative p-4 min-h-[300px]">
        <div className="absolute inset-0 flex items-center justify-center z-0 pointer-events-none overflow-hidden">
           <h1 className="text-[20vw] font-black text-white/[0.02] select-none tracking-tighter leading-none">
             {stock.Symbol}
           </h1>
        </div>
        
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1c2127" vertical={false} strokeOpacity={0.5} />
            <XAxis dataKey="time" hide />
            <YAxis 
              orientation="right" 
              domain={['auto', 'auto']} 
              tick={{ fill: '#475569', fontSize: 10, fontWeight: '900' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(val) => val.toFixed(1)}
              width={50}
            />
            <Tooltip
              contentStyle={{ backgroundColor: '#111418', border: '1px solid #1c2127', borderRadius: '4px', fontSize: '10px' }}
              cursor={{ fill: 'rgba(255,255,255,0.03)' }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-[#111418] border border-[#1c2127] p-2 rounded shadow-2xl backdrop-blur-md">
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                        <span className="text-slate-500 font-black uppercase text-[8px]">Open</span>
                        <span className="text-slate-200 font-bold text-right">{data.open.toFixed(2)}</span>
                        <span className="text-slate-500 font-black uppercase text-[8px]">High</span>
                        <span className="text-[#2ebd85] font-bold text-right">{data.high.toFixed(2)}</span>
                        <span className="text-slate-500 font-black uppercase text-[8px]">Low</span>
                        <span className="text-[#f6465d] font-bold text-right">{data.low.toFixed(2)}</span>
                        <span className="text-slate-500 font-black uppercase text-[8px]">Close</span>
                        <span className="text-slate-200 font-bold text-right">{data.close.toFixed(2)}</span>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar 
              dataKey="range" 
              shape={<Candlestick />}
              animationDuration={0}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Positions Section */}
      <div className="h-64 border-t border-[#1c2127] flex flex-col bg-[#111418]/30 backdrop-blur-md">
        <div className="px-4 py-2 border-b border-[#1c2127] flex items-center justify-between">
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Positions Terminal</span>
          <div className="flex gap-4 text-[10px] font-black text-slate-600">
            <span>ACTIVE: <span className="text-[#2ebd85]">{holdings.length}</span></span>
          </div>
        </div>
        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full text-left text-[11px]">
            <thead className="sticky top-0 bg-[#080a0c] text-slate-600 font-black border-b border-[#1c2127] z-10">
              <tr>
                <th className="px-4 py-2 uppercase tracking-tighter">Instrument</th>
                <th className="px-4 py-2 text-right uppercase tracking-tighter">Qty</th>
                <th className="px-4 py-2 text-right uppercase tracking-tighter">Avg. Prc</th>
                <th className="px-4 py-2 text-right uppercase tracking-tighter">LTP</th>
                <th className="px-4 py-2 text-right uppercase tracking-tighter">P&L</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1c2127]/30">
              {holdings.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-16 text-center text-slate-700 font-black uppercase tracking-[0.3em] opacity-20 text-xs">No active positions</td>
                </tr>
              ) : (
                holdings.map(h => {
                  const currentLtp = stocks.find(s => s.Symbol === h.symbol)?.LTP || 0;
                  const pl = (currentLtp - h.avgPrice) * h.quantity;
                  return (
                    <tr key={h.symbol} className="hover:bg-white/[0.02] transition-colors border-l-2 border-l-transparent hover:border-l-[#2ebd85]">
                      <td className="px-4 py-3 font-black text-slate-200">{h.symbol}</td>
                      <td className="px-4 py-3 text-right font-bold text-slate-400">{h.quantity}</td>
                      <td className="px-4 py-3 text-right font-medium text-slate-500">{h.avgPrice.toFixed(2)}</td>
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
