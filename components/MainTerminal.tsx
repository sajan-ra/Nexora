
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Stock, Holding } from '../types';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { Wifi, WifiOff, Moon, Target, Zap } from 'lucide-react';

const TIMEFRAME_MS = 15000; // 15-second candle intervals

interface ExtendedStock extends Stock {
  isLive?: boolean;
}

interface MainTerminalProps {
  stock?: ExtendedStock;
  holdings: Holding[];
  stocks: ExtendedStock[];
  isMarketOpen: boolean;
}

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  range: [number, number]; // [Low, High] for Recharts mapping
  pattern?: string;
  isForming?: boolean;
}

/**
 * High-Precision Candlestick Component
 * Renders the "Pillar" body and the "Sticks" (Wicks)
 */
const Candlestick = (props: any) => {
  const { x, y, width, height, payload } = props;
  if (!payload || height === undefined) return null;

  const { open, close, high, low, isForming } = payload;
  const isUp = close >= open;
  const color = isUp ? "#2ebd85" : "#f6465d";
  
  // Recharts passes 'y' as the pixel for the HIGH value 
  // and 'height' as the total pixel distance to the LOW value.
  // We calculate a pixel-per-unit ratio to position the body precisely.
  const priceRange = high - low;
  const ratio = priceRange === 0 ? 0 : height / priceRange;

  // Calculate Body Y coordinates relative to the 'y' (High) pixel
  const bodyMax = Math.max(open, close);
  const bodyMin = Math.min(open, close);
  
  const bodyTop = y + (high - bodyMax) * ratio;
  const bodyBottom = y + (high - bodyMin) * ratio;
  const bodyHeight = Math.max(1.5, bodyBottom - bodyTop);

  const centerX = x + width / 2;

  return (
    <g>
      {/* 1. The "Stick" (Full Wick from High to Low) */}
      <line 
        x1={centerX} 
        y1={y} 
        x2={centerX} 
        y2={y + height} 
        stroke={color} 
        strokeWidth={1.2}
        strokeLinecap="round"
      />

      {/* 2. The "Pillar" (The Candle Body) */}
      <rect 
        x={x} 
        y={bodyTop} 
        width={width} 
        height={bodyHeight} 
        fill={color} 
        fillOpacity={isForming ? 0.6 : 0.9}
        stroke={color} 
        strokeWidth={0.5}
        className={isForming ? "animate-pulse" : ""}
      />

      {/* 3. Forming Indicator (Small glow at the current price) */}
      {isForming && (
        <circle 
          cx={centerX} 
          cy={isUp ? bodyTop : bodyBottom} 
          r={2} 
          fill={color} 
          className="animate-ping"
        />
      )}

      {/* 4. Pattern Annotations */}
      {payload.pattern && (
        <text 
          x={centerX} 
          y={y - 12} 
          textAnchor="middle" 
          fill={color} 
          fontSize="8" 
          fontWeight="900" 
          className="uppercase tracking-widest"
        >
          {payload.pattern}
        </text>
      )}
    </g>
  );
};

const MainTerminal: React.FC<MainTerminalProps> = ({ stock, holdings, stocks, isMarketOpen }) => {
  const [historyBuffer, setHistoryBuffer] = useState<Record<string, Candle[]>>({});
  const currentOHLCRef = useRef<Record<string, { o: number, h: number, l: number, startTime: number }>>({});

  // Initial Seeding: Ensures the chart is never empty
  useEffect(() => {
    if (!stock) return;
    const symbol = stock.Symbol;

    if (!historyBuffer[symbol]) {
      const seeded: Candle[] = [];
      let base = stock.LTP;
      const now = Date.now();
      
      for (let i = 40; i > 0; i--) {
        const drift = (Math.random() * 2 - 1) * (base * 0.003);
        const o = base;
        const c = base + drift;
        const h = Math.max(o, c) + Math.random() * (base * 0.001);
        const l = Math.min(o, c) - Math.random() * (base * 0.001);
        
        seeded.push({
          time: now - (i * TIMEFRAME_MS),
          open: o,
          high: h,
          low: l,
          close: c,
          range: [l, h]
        });
        base = c;
      }
      
      setHistoryBuffer(prev => ({ ...prev, [symbol]: seeded }));
      currentOHLCRef.current[symbol] = { o: stock.LTP, h: stock.LTP, l: stock.LTP, startTime: now };
    }
  }, [stock?.Symbol]);

  // Real-time Tick Processor
  useEffect(() => {
    if (!stock) return;

    const symbol = stock.Symbol;
    const now = Date.now();
    const currentPrice = stock.LTP;

    setHistoryBuffer(prev => {
      const history = prev[symbol] || [];
      const current = currentOHLCRef.current[symbol] || { o: currentPrice, h: currentPrice, l: currentPrice, startTime: now };

      // TIME-INTERVAL LOGIC: Close candle if interval expired
      if (now - current.startTime >= TIMEFRAME_MS) {
        const closedCandle: Candle = {
          time: current.startTime,
          open: current.o,
          high: Math.max(current.h, currentPrice),
          low: Math.min(current.l, currentPrice),
          close: currentPrice,
          range: [Math.min(current.l, currentPrice), Math.max(current.h, currentPrice)]
        };

        // NUMERIC PATTERN RECOGNITION (As requested)
        const body = Math.abs(closedCandle.close - closedCandle.open);
        const range = closedCandle.high - closedCandle.low;
        const upperWick = closedCandle.high - Math.max(closedCandle.open, closedCandle.close);
        const lowerWick = Math.min(closedCandle.open, closedCandle.close) - closedCandle.low;

        if (range > 0) {
           if (body <= 0.1 * range) closedCandle.pattern = "Doji";
           else if (lowerWick >= 2 * body && upperWick <= 0.3 * body && body > 0) closedCandle.pattern = "Hammer";
           else if (upperWick >= 2 * body && lowerWick <= 0.3 * body && body > 0) closedCandle.pattern = "Star";
        }
        
        // Engulfing Check (Logic: Comparing against previous candle)
        if (history.length > 0) {
          const prevC = history[history.length - 1];
          const isBullEng = prevC.close < prevC.open && closedCandle.close > closedCandle.open && closedCandle.open < prevC.close && closedCandle.close > prevC.open;
          const isBearEng = prevC.close > prevC.open && closedCandle.close < closedCandle.open && closedCandle.open > prevC.close && closedCandle.close < prevC.open;
          if (isBullEng) closedCandle.pattern = "Bull.Eng";
          if (isBearEng) closedCandle.pattern = "Bear.Eng";
        }

        // Reset the tracker for the next interval
        currentOHLCRef.current[symbol] = { o: currentPrice, h: currentPrice, l: currentPrice, startTime: now };
        return { ...prev, [symbol]: [...history.filter(c => !c.isForming), closedCandle].slice(-50) };
      }

      // PILLAR GROWTH LOGIC: Update current interval trackers
      currentOHLCRef.current[symbol] = {
        ...current,
        h: Math.max(current.h, currentPrice),
        l: Math.min(current.l, currentPrice)
      };

      const formingCandle: Candle = {
        time: current.startTime,
        open: current.o,
        high: Math.max(current.h, currentPrice),
        low: Math.min(current.l, currentPrice),
        close: currentPrice,
        range: [Math.min(current.l, currentPrice), Math.max(current.h, currentPrice)],
        isForming: true
      };

      return { 
        ...prev, 
        [symbol]: [...history.filter(c => !c.isForming), formingCandle] 
      };
    });
  }, [stock?.LTP, stock?.Symbol]);

  const displayData = useMemo(() => {
    if (!stock) return [];
    return historyBuffer[stock.Symbol] || [];
  }, [historyBuffer, stock?.Symbol]);

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
              <h2 className="text-xl font-black text-white leading-none tracking-tighter uppercase">{stock.Symbol}</h2>
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[8px] font-black uppercase border border-[#2ebd85]/40 bg-[#2ebd85]/10 text-[#2ebd85]">
                <Zap size={10} fill="#2ebd85" /> Real-Time Engine
              </div>
            </div>
            <div className="flex gap-4 text-[9px] text-slate-600 font-black mt-1 uppercase tracking-tighter">
              <span>High <span className="text-slate-400 tabular-nums">{stock.High.toFixed(2)}</span></span>
              <span>Low <span className="text-slate-400 tabular-nums">{stock.Low.toFixed(2)}</span></span>
              <span>Vol <span className="text-slate-400 tabular-nums">{stock.Volume.toLocaleString()}</span></span>
            </div>
          </div>
          <div className="h-8 w-px bg-[#1c2127]"></div>
          <div>
            <div className={`text-xl font-black tabular-nums leading-none ${stock.Change >= 0 ? 'text-[#2ebd85]' : 'text-[#f6465d]'}`}>
              {stock.LTP.toFixed(2)}
            </div>
            <div className={`text-[10px] font-black flex gap-1 mt-1 ${stock.Change >= 0 ? 'text-[#2ebd85]' : 'text-[#f6465d]'}`}>
              <span>{stock.Change >= 0 ? '▲' : '▼'}</span>
              <span>{Math.abs(stock.Change).toFixed(2)}%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 relative p-4 flex flex-col min-h-[400px]">
        {!isMarketOpen && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#080a0c]/70 backdrop-blur-[4px] pointer-events-none">
            <div className="bg-[#111418] border border-[#1c2127] px-8 py-4 rounded-3xl flex items-center gap-5 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
              <Moon size={24} className="text-slate-500 animate-pulse" />
              <div className="flex flex-col">
                 <span className="text-xs font-black uppercase tracking-[0.3em] text-slate-200">Market Suspended</span>
                 <span className="text-[9px] font-bold text-slate-500 uppercase mt-1">Simulated Trading Only</span>
              </div>
            </div>
          </div>
        )}
        
        <div className="absolute inset-0 flex items-center justify-center z-0 pointer-events-none overflow-hidden select-none">
           <h1 className="text-[30vw] font-black text-white/[0.012] tracking-tighter leading-none uppercase">
             {stock.Symbol}
           </h1>
        </div>
        
        <div className="flex-1 relative z-10">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={displayData} margin={{ top: 40, right: 10, left: 0, bottom: 10 }}>
              <CartesianGrid strokeDasharray="2 4" stroke="#1c2127" vertical={false} strokeOpacity={0.5} />
              <XAxis dataKey="time" hide />
              <YAxis 
                orientation="right" 
                domain={['auto', 'auto']} 
                tick={{ fill: '#334155', fontSize: 11, fontWeight: '900' }} 
                axisLine={false} 
                tickLine={false} 
                width={70}
                mirror={false}
              />
              <Tooltip
                isAnimationActive={false}
                contentStyle={{ backgroundColor: '#111418', border: '1px solid #1c2127', borderRadius: '12px' }}
                cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                content={({ active, payload }) => {
                  if (active && payload?.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="bg-[#111418] border border-[#1c2127] p-4 rounded-xl shadow-2xl min-w-[140px]">
                        <div className="flex flex-col gap-2 text-[10px] font-black uppercase">
                          <div className="flex justify-between border-b border-[#1c2127] pb-1">
                            <span className="text-slate-600">Period</span>
                            <span className="text-slate-400">{new Date(d.time).toLocaleTimeString()}</span>
                          </div>
                          <div className="flex justify-between"><span className="text-slate-600">Open</span><span className="text-white">{d.open.toFixed(2)}</span></div>
                          <div className="flex justify-between"><span className="text-slate-600">High</span><span className="text-[#2ebd85]">{d.high.toFixed(2)}</span></div>
                          <div className="flex justify-between"><span className="text-slate-600">Low</span><span className="text-[#f6465d]">{d.low.toFixed(2)}</span></div>
                          <div className="flex justify-between border-t border-[#1c2127] pt-1"><span className="text-slate-600">Close</span><span className="text-white">{d.close.toFixed(2)}</span></div>
                          {d.pattern && (
                            <div className="mt-2 text-center bg-[#2ebd85]/20 p-2 rounded-lg text-[#2ebd85] border border-[#2ebd85]/30">
                              {d.pattern}
                            </div>
                          )}
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
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Footer Stats */}
      <div className="h-64 border-t border-[#1c2127] flex flex-col bg-[#111418]/30">
        <div className="px-5 py-2.5 border-b border-[#1c2127] flex items-center justify-between">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Global Order Stream</span>
          <div className="flex gap-4 text-[9px] font-black text-slate-700 uppercase">
             <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-[#2ebd85]"></div> Terminal Synced</span>
          </div>
        </div>
        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full text-left text-[11px]">
            <thead className="sticky top-0 bg-[#080a0c] text-slate-600 font-black border-b border-[#1c2127]">
              <tr>
                <th className="px-6 py-3 uppercase tracking-tighter">Instrument</th>
                <th className="px-6 py-3 text-right uppercase tracking-tighter">Quantity</th>
                <th className="px-6 py-3 text-right uppercase tracking-tighter">Entry Price</th>
                <th className="px-6 py-3 text-right uppercase tracking-tighter">Current LTP</th>
                <th className="px-6 py-3 text-right uppercase tracking-tighter">Day P&L</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1c2127]/40">
              {holdings.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center text-slate-800 font-black uppercase tracking-[0.3em] opacity-40 text-xs">No active positions detected</td>
                </tr>
              ) : (
                holdings.map(h => {
                  const currentLtp = stocks.find(s => s.Symbol === h.symbol)?.LTP || 0;
                  const pl = (currentLtp - h.avgPrice) * h.quantity;
                  return (
                    <tr key={h.symbol} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-6 py-4 font-black text-slate-300 group-hover:text-[#2ebd85] transition-colors">{h.symbol}</td>
                      <td className="px-6 py-4 text-right font-bold text-slate-500">{h.quantity}</td>
                      <td className="px-6 py-4 text-right font-medium text-slate-600">{h.avgPrice.toFixed(2)}</td>
                      <td className="px-6 py-4 text-right font-black text-slate-300 tabular-nums">{currentLtp.toFixed(2)}</td>
                      <td className={`px-6 py-4 text-right font-black tabular-nums ${pl >= 0 ? 'text-[#2ebd85]' : 'text-[#f6465d]'}`}>
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
