
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
import { Moon, Activity, Target, TrendingUp, TrendingDown } from 'lucide-react';

const TIMEFRAME_MS = 15000; // 15-second candle intervals for high-frequency simulation

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
  range: [number, number]; 
  pattern?: string;
  isForming?: boolean;
  signal?: 'BUY' | 'SELL' | 'NEUTRAL';
}

const Candlestick = (props: any) => {
  const { x, y, width, height, payload } = props;
  if (!payload || height === undefined) return null;

  const { open, close, high, low, isForming, pattern, signal } = payload;
  const isUp = close >= open;
  const color = isUp ? "#2ebd85" : "#f6465d";
  
  const priceRange = high - low;
  const ratio = priceRange <= 0 ? 0 : height / priceRange;

  const bodyMax = Math.max(open, close);
  const bodyMin = Math.min(open, close);
  
  const bodyTop = y + (high - bodyMax) * ratio;
  const bodyBottom = y + (high - bodyMin) * ratio;
  const bodyHeight = Math.max(1.5, bodyBottom - bodyTop);

  const centerX = x + width / 2;

  return (
    <g>
      {/* Wick (Shadow) */}
      <line x1={centerX} y1={y} x2={centerX} y2={bodyTop} stroke={color} strokeWidth={1} />
      <line x1={centerX} y1={bodyBottom} x2={centerX} y2={y + height} stroke={color} strokeWidth={1} />

      {/* Real Body */}
      <rect 
        x={x} 
        y={bodyTop} 
        width={width} 
        height={bodyHeight} 
        fill={color} 
        fillOpacity={isForming ? 0.6 : 1}
        stroke={color} 
        strokeWidth={0.5}
      />

      {/* Pattern Label */}
      {pattern && (
        <text 
          x={centerX} 
          y={y - 12} 
          textAnchor="middle" 
          fill={color} 
          fontSize="7" 
          fontWeight="900" 
          className="uppercase tracking-tighter"
        >
          {pattern}
        </text>
      )}

      {/* Signal Indicators */}
      {signal && !isForming && signal !== 'NEUTRAL' && (
        <g transform={`translate(${centerX - 4}, ${signal === 'BUY' ? y + height + 5 : y - 22})`}>
          {signal === 'BUY' ? (
            <path d="M0 4 L4 0 L8 4" fill="none" stroke="#2ebd85" strokeWidth="2" />
          ) : (
            <path d="M0 0 L4 4 L8 0" fill="none" stroke="#f6465d" strokeWidth="2" />
          )}
        </g>
      )}
    </g>
  );
};

const MainTerminal: React.FC<MainTerminalProps> = ({ stock, holdings, stocks, isMarketOpen }) => {
  const [historyBuffer, setHistoryBuffer] = useState<Record<string, Candle[]>>({});
  const currentOHLCRef = useRef<Record<string, { o: number, h: number, l: number, startTime: number }>>({});

  const detectPatterns = (current: Candle, previous?: Candle): { pattern?: string, signal?: 'BUY' | 'SELL' | 'NEUTRAL' } => {
    const bodySize = Math.abs(current.close - current.open);
    const totalRange = current.high - current.low;
    const upperWick = current.high - Math.max(current.open, current.close);
    const lowerWick = Math.min(current.open, current.close) - current.low;

    if (totalRange === 0) return { signal: 'NEUTRAL' };

    // Doji: Very small body relative to range
    if (bodySize <= totalRange * 0.1) return { pattern: "Doji", signal: 'NEUTRAL' };

    // Hammer: Long lower wick, small body at top
    if (lowerWick >= bodySize * 2 && upperWick <= bodySize * 0.5) return { pattern: "Hammer", signal: 'BUY' };

    // Shooting Star: Long upper wick, small body at bottom
    if (upperWick >= bodySize * 2 && lowerWick <= bodySize * 0.5) return { pattern: "S.Star", signal: 'SELL' };

    if (previous) {
      const isPrevDown = previous.close < previous.open;
      const isCurrUp = current.close > current.open;

      // Bullish Engulfing
      if (isPrevDown && isCurrUp && current.close > previous.open && current.open < previous.close) {
        return { pattern: "B.Engulf", signal: 'BUY' };
      }
      // Bearish Engulfing
      if (!isPrevDown && !isCurrUp && current.close < previous.open && current.open > previous.close) {
        return { pattern: "S.Engulf", signal: 'SELL' };
      }
    }

    return { signal: 'NEUTRAL' };
  };

  // Seed history on first symbol select
  useEffect(() => {
    if (!stock) return;
    const symbol = stock.Symbol;

    if (!historyBuffer[symbol]) {
      const seeded: Candle[] = [];
      let lastClose = stock.LTP - (Math.random() * 10);
      const now = Date.now();
      
      for (let i = 40; i > 0; i--) {
        const o = lastClose;
        const drift = (Math.random() - 0.5) * (o * 0.01);
        const c = o + drift;
        const h = Math.max(o, c) + (Math.random() * 2);
        const l = Math.min(o, c) - (Math.random() * 2);
        
        const candle: Candle = {
          time: now - (i * TIMEFRAME_MS),
          open: o,
          high: h,
          low: l,
          close: c,
          range: [l, h]
        };
        
        const { pattern, signal } = detectPatterns(candle, seeded[seeded.length - 1]);
        seeded.push({ ...candle, pattern, signal });
        lastClose = c;
      }
      
      setHistoryBuffer(prev => ({ ...prev, [symbol]: seeded }));
      currentOHLCRef.current[symbol] = { o: lastClose, h: lastClose, l: lastClose, startTime: Math.floor(now / TIMEFRAME_MS) * TIMEFRAME_MS };
    }
  }, [stock?.Symbol]);

  // Real-time OHLC construction
  useEffect(() => {
    if (!stock) return;
    const symbol = stock.Symbol;
    const currentPrice = stock.LTP;
    const now = Date.now();
    const currentIntervalStart = Math.floor(now / TIMEFRAME_MS) * TIMEFRAME_MS;

    setHistoryBuffer(prev => {
      const history = prev[symbol] || [];
      const lastClosed = history.filter(c => !c.isForming).slice(-1)[0];
      
      if (!currentOHLCRef.current[symbol]) {
        const startPrice = lastClosed ? lastClosed.close : currentPrice;
        currentOHLCRef.current[symbol] = { o: startPrice, h: startPrice, l: startPrice, startTime: currentIntervalStart };
      }

      const activeOHLC = currentOHLCRef.current[symbol];

      // If timeframe elapsed, close the candle and start new one
      if (currentIntervalStart > activeOHLC.startTime) {
        const finishedCandle: Candle = {
          time: activeOHLC.startTime,
          open: activeOHLC.o,
          high: activeOHLC.h,
          low: activeOHLC.l,
          close: currentPrice,
          range: [activeOHLC.l, activeOHLC.h]
        };

        const { pattern, signal } = detectPatterns(finishedCandle, lastClosed);
        
        // Prepare next candle ref: Open = Previous Close
        currentOHLCRef.current[symbol] = { 
          o: currentPrice, 
          h: currentPrice, 
          l: currentPrice, 
          startTime: currentIntervalStart 
        };

        return { 
          ...prev, 
          [symbol]: [...history.filter(c => !c.isForming), { ...finishedCandle, pattern, signal }].slice(-60) 
        };
      }

      // Update current forming candle
      currentOHLCRef.current[symbol] = {
        ...activeOHLC,
        h: Math.max(activeOHLC.h, currentPrice),
        l: Math.min(activeOHLC.l, currentPrice)
      };

      const forming: Candle = {
        time: activeOHLC.startTime,
        open: activeOHLC.o,
        high: currentOHLCRef.current[symbol].h,
        low: currentOHLCRef.current[symbol].l,
        close: currentPrice,
        range: [currentOHLCRef.current[symbol].l, currentOHLCRef.current[symbol].h],
        isForming: true
      };

      return { 
        ...prev, 
        [symbol]: [...history.filter(c => !c.isForming), forming] 
      };
    });
  }, [stock?.LTP, stock?.Symbol]);

  const displayData = useMemo(() => (stock ? historyBuffer[stock.Symbol] || [] : []), [historyBuffer, stock?.Symbol]);
  
  const currentSignal = useMemo(() => {
    const closed = displayData.filter(c => !c.isForming);
    return closed.length > 0 ? closed[closed.length - 1].signal : 'NEUTRAL';
  }, [displayData]);

  if (!stock) return (
    <div className="flex-1 bg-[#080a0c] flex items-center justify-center">
      <div className="text-slate-800 font-black text-xs uppercase tracking-[0.5em] animate-pulse">Initializing Terminal...</div>
    </div>
  );

  return (
    <main className="flex-1 flex flex-col bg-[#080a0c] overflow-hidden">
      <div className="h-16 border-b border-[#1c2127] px-6 flex items-center justify-between bg-[#111418]/60 backdrop-blur-md">
        <div className="flex items-center gap-6">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-black text-white tracking-tighter uppercase">{stock.Symbol}</h2>
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[8px] font-black uppercase border border-[#2ebd85]/30 bg-[#2ebd85]/5 text-[#2ebd85]">
                <Activity size={10} /> Live Feed
              </div>
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

        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${
            currentSignal === 'BUY' ? 'bg-[#2ebd85]/10 border-[#2ebd85]/30 text-[#2ebd85]' :
            currentSignal === 'SELL' ? 'bg-[#f6465d]/10 border-[#f6465d]/30 text-[#f6465d]' :
            'bg-[#1c2127] border-transparent text-slate-500'
          }`}>
            <Target size={12} />
            <span className="text-[10px] font-black uppercase">Auto Signal: {currentSignal}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 relative p-4">
        {!isMarketOpen && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#080a0c]/70 backdrop-blur-[2px] pointer-events-none">
             <div className="bg-[#111418] border border-[#1c2127] px-6 py-3 rounded-2xl flex items-center gap-4">
              <Moon size={20} className="text-slate-500" />
              <div className="flex flex-col">
                 <span className="text-[10px] font-black uppercase tracking-widest text-slate-200">Market Closed</span>
                 <span className="text-[8px] font-bold text-slate-600 uppercase mt-0.5">Simulated Trading Enabled</span>
              </div>
            </div>
          </div>
        )}
        
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={displayData} margin={{ top: 30, right: 10, left: 0, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1c2127" vertical={false} strokeOpacity={0.2} />
            <XAxis dataKey="time" hide />
            <YAxis 
              orientation="right" 
              domain={['auto', 'auto']} 
              tick={{ fill: '#475569', fontSize: 10, fontWeight: '700' }} 
              axisLine={false} 
              tickLine={false}
              width={45}
            />
            <Tooltip
              isAnimationActive={false}
              contentStyle={{ backgroundColor: '#111418', border: '1px solid #1c2127', borderRadius: '8px' }}
              content={({ active, payload }) => {
                if (active && payload?.length) {
                  const d = payload[0].payload;
                  return (
                    <div className="bg-[#111418] border border-[#1c2127] p-3 rounded-lg shadow-xl">
                      <div className="flex flex-col gap-1 text-[9px] font-bold uppercase">
                        <div className="flex justify-between border-b border-[#1c2127] pb-1 mb-1">
                          <span className="text-slate-600">Open</span>
                          <span className="text-white ml-4">{d.open.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between"><span className="text-[#2ebd85]">High</span><span className="text-white">{d.high.toFixed(2)}</span></div>
                        <div className="flex justify-between"><span className="text-[#f6465d]">Low</span><span className="text-white">{d.low.toFixed(2)}</span></div>
                        <div className="flex justify-between"><span className="text-slate-300">Close</span><span className="text-white">{d.close.toFixed(2)}</span></div>
                        {d.pattern && <div className="mt-1 pt-1 border-t border-[#1c2127] text-center text-[#2ebd85] font-black">{d.pattern}</div>}
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="range" shape={<Candlestick />} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="h-40 border-t border-[#1c2127] flex flex-col bg-[#111418]/20">
        <div className="px-5 py-2 border-b border-[#1c2127] flex items-center justify-between">
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Active Holdings</span>
        </div>
        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full text-left text-[10px]">
            <thead className="sticky top-0 bg-[#080a0c] text-slate-600 font-black border-b border-[#1c2127]">
              <tr>
                <th className="px-6 py-2 uppercase tracking-tighter">Symbol</th>
                <th className="px-6 py-2 text-right uppercase tracking-tighter">Qty</th>
                <th className="px-6 py-2 text-right uppercase tracking-tighter">Avg</th>
                <th className="px-6 py-2 text-right uppercase tracking-tighter">P&L</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1c2127]/30">
              {holdings.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-800 font-black uppercase tracking-[0.2em] opacity-30">No positions found</td>
                </tr>
              ) : (
                holdings.map(h => {
                  const currentLtp = stocks.find(s => s.Symbol === h.symbol)?.LTP || 0;
                  const pl = (currentLtp - h.avgPrice) * h.quantity;
                  return (
                    <tr key={h.symbol} className="hover:bg-white/[0.01]">
                      <td className="px-6 py-2.5 font-black text-slate-400">{h.symbol}</td>
                      <td className="px-6 py-2.5 text-right font-bold text-slate-500">{h.quantity}</td>
                      <td className="px-6 py-2.5 text-right font-medium text-slate-600">{h.avgPrice.toFixed(2)}</td>
                      <td className={`px-6 py-2.5 text-right font-black tabular-nums ${pl >= 0 ? 'text-[#2ebd85]' : 'text-[#f6465d]'}`}>
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
