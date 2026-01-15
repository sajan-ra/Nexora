
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Stock, Holding } from '../types';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  ReferenceLine
} from 'recharts';
import { Moon, Activity, Target, Zap, TrendingUp, TrendingDown, ArrowUp, ArrowDown } from 'lucide-react';

const TIMEFRAME_MS = 15000; 

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
  volume: number;
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
  const bodyHeight = Math.max(2, bodyBottom - bodyTop);

  const centerX = x + width / 2;

  return (
    <g>
      {/* High-Low Wick */}
      <line x1={centerX} y1={y} x2={centerX} y2={y + height} stroke={color} strokeWidth={1} />

      {/* Real Body */}
      <rect 
        x={x + 1} 
        y={bodyTop} 
        width={width - 2} 
        height={bodyHeight} 
        fill={isUp ? color : 'transparent'} 
        stroke={color}
        strokeWidth={1}
        fillOpacity={isForming ? 0.4 : 1}
      />

      {/* Pattern Label Icons */}
      {pattern && (
        <g transform={`translate(${centerX}, ${y - 15})`}>
           <text textAnchor="middle" fill={color} fontSize="8" fontWeight="900" className="uppercase tracking-tighter">
             {pattern}
           </text>
        </g>
      )}
    </g>
  );
};

const MainTerminal: React.FC<MainTerminalProps> = ({ stock, holdings, stocks, isMarketOpen }) => {
  const [historyBuffer, setHistoryBuffer] = useState<Record<string, Candle[]>>({});
  const currentOHLCRef = useRef<Record<string, { o: number, h: number, l: number, v: number, startTime: number }>>({});
  const [flash, setFlash] = useState<'up' | 'down' | null>(null);
  const prevPrice = useRef<number>(0);

  const detectPatterns = (current: Candle, previous?: Candle): { pattern?: string, signal?: 'BUY' | 'SELL' | 'NEUTRAL' } => {
    const bodySize = Math.abs(current.close - current.open);
    const totalRange = current.high - current.low;
    const upperWick = current.high - Math.max(current.open, current.close);
    const lowerWick = Math.min(current.open, current.close) - current.low;

    if (totalRange === 0) return { signal: 'NEUTRAL' };
    if (bodySize <= totalRange * 0.1) return { pattern: "Doji", signal: 'NEUTRAL' };
    if (lowerWick >= bodySize * 2 && upperWick <= bodySize * 0.5) return { pattern: "Hammer", signal: 'BUY' };
    if (upperWick >= bodySize * 2 && lowerWick <= bodySize * 0.5) return { pattern: "S.Star", signal: 'SELL' };

    if (previous) {
      const isPrevDown = previous.close < previous.open;
      const isCurrUp = current.close > current.open;
      if (isPrevDown && isCurrUp && current.close > previous.open) return { pattern: "Bullish", signal: 'BUY' };
      if (!isPrevDown && !isCurrUp && current.close < previous.open) return { pattern: "Bearish", signal: 'SELL' };
    }
    return { signal: 'NEUTRAL' };
  };

  useEffect(() => {
    if (!stock) return;
    if (stock.LTP > prevPrice.current) setFlash('up');
    else if (stock.LTP < prevPrice.current) setFlash('down');
    prevPrice.current = stock.LTP;
    const timer = setTimeout(() => setFlash(null), 300);
    return () => clearTimeout(timer);
  }, [stock?.LTP]);

  useEffect(() => {
    if (!stock) return;
    const symbol = stock.Symbol;
    if (!historyBuffer[symbol]) {
      const seeded: Candle[] = [];
      let lastClose = stock.LTP - 5;
      const now = Date.now();
      for (let i = 40; i > 0; i--) {
        const o = lastClose;
        const drift = (Math.random() - 0.5) * 4;
        const c = o + drift;
        const candle: Candle = {
          time: now - (i * TIMEFRAME_MS),
          open: o, high: Math.max(o, c) + 1, low: Math.min(o, c) - 1, close: c,
          volume: Math.random() * 5000, range: [Math.min(o, c) - 1, Math.max(o, c) + 1]
        };
        const { pattern, signal } = detectPatterns(candle, seeded[seeded.length - 1]);
        seeded.push({ ...candle, pattern, signal });
        lastClose = c;
      }
      setHistoryBuffer(prev => ({ ...prev, [symbol]: seeded }));
      currentOHLCRef.current[symbol] = { o: lastClose, h: lastClose, l: lastClose, v: 0, startTime: Math.floor(now / TIMEFRAME_MS) * TIMEFRAME_MS };
    }
  }, [stock?.Symbol]);

  useEffect(() => {
    if (!stock) return;
    const symbol = stock.Symbol;
    const currentPrice = stock.LTP;
    const now = Date.now();
    const intervalStart = Math.floor(now / TIMEFRAME_MS) * TIMEFRAME_MS;

    setHistoryBuffer(prev => {
      const history = prev[symbol] || [];
      const lastClosed = history.filter(c => !c.isForming).slice(-1)[0];
      if (!currentOHLCRef.current[symbol]) {
        currentOHLCRef.current[symbol] = { o: lastClosed?.close || currentPrice, h: currentPrice, l: currentPrice, v: 0, startTime: intervalStart };
      }
      const active = currentOHLCRef.current[symbol];

      if (intervalStart > active.startTime) {
        const closed: Candle = {
          time: active.startTime, open: active.o, high: active.h, low: active.l, close: currentPrice,
          volume: active.v + Math.random() * 100, range: [active.l, active.h]
        };
        const { pattern, signal } = detectPatterns(closed, lastClosed);
        currentOHLCRef.current[symbol] = { o: currentPrice, h: currentPrice, l: currentPrice, v: 0, startTime: intervalStart };
        return { ...prev, [symbol]: [...history.filter(c => !c.isForming), { ...closed, pattern, signal }].slice(-60) };
      }

      currentOHLCRef.current[symbol] = { ...active, h: Math.max(active.h, currentPrice), l: Math.min(active.l, currentPrice), v: active.v + 5 };
      const forming: Candle = {
        time: active.startTime, open: active.o, high: Math.max(active.h, currentPrice), low: Math.min(active.l, currentPrice),
        close: currentPrice, volume: active.v, range: [Math.min(active.l, currentPrice), Math.max(active.h, currentPrice)], isForming: true
      };
      return { ...prev, [symbol]: [...history.filter(c => !c.isForming), forming] };
    });
  }, [stock?.LTP, stock?.Symbol]);

  const displayData = useMemo(() => (stock ? historyBuffer[stock.Symbol] || [] : []), [historyBuffer, stock?.Symbol]);
  
  // Simulated L2 Order Book
  const orderBook = useMemo(() => {
    if (!stock) return { bids: [], asks: [] };
    const price = stock.LTP;
    const generateLevel = (p: number, v: number) => ({ price: p, vol: Math.floor(Math.random() * v) + 10 });
    const asks = Array.from({ length: 5 }).map((_, i) => generateLevel(price + (i + 1) * 0.15, 200)).reverse();
    const bids = Array.from({ length: 5 }).map((_, i) => generateLevel(price - (i + 1) * 0.15, 200));
    return { asks, bids };
  }, [stock?.LTP]);

  if (!stock) return <div className="flex-1 bg-[#080a0c] flex items-center justify-center font-black text-slate-800 animate-pulse">TERMINAL STANDBY...</div>;

  return (
    <main className="flex-1 flex flex-col bg-[#080a0c] overflow-hidden">
      {/* Dynamic Header */}
      <div className="h-16 border-b border-[#1c2127] px-6 flex items-center justify-between bg-[#111418]/60 backdrop-blur-xl">
        <div className="flex items-center gap-6">
          <div className="flex flex-col">
            <h2 className="text-xl font-black text-white tracking-tighter uppercase flex items-center gap-2">
              {stock.Symbol}
              <span className="text-[10px] bg-[#1c2127] px-2 py-0.5 rounded text-slate-500 font-bold">EQ</span>
            </h2>
            <span className="text-[9px] text-slate-500 font-black tracking-widest uppercase">Nexora Spot Exchange</span>
          </div>
          <div className="h-8 w-px bg-[#1c2127]"></div>
          <div className={`p-2 rounded-lg transition-colors duration-300 ${flash === 'up' ? 'bg-[#2ebd85]/20' : flash === 'down' ? 'bg-[#f6465d]/20' : ''}`}>
            <div className={`text-2xl font-black tabular-nums leading-none ${stock.Change >= 0 ? 'text-[#2ebd85]' : 'text-[#f6465d]'}`}>
              {stock.LTP.toFixed(2)}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
             <span className="text-[9px] text-slate-600 font-black uppercase tracking-widest">Network Load</span>
             <div className="flex gap-0.5 mt-1">
                {[1,2,3,4,5].map(i => <div key={i} className={`w-1 h-3 rounded-full ${i <= 4 ? 'bg-[#2ebd85]' : 'bg-slate-800'}`}></div>)}
             </div>
          </div>
          <div className="h-8 w-px bg-[#1c2127]"></div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#2ebd85]/20 bg-[#2ebd85]/5 text-[#2ebd85]">
            <Activity size={12} className="animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-tighter">Live HFT Core</span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Real Chart Area */}
        <div className="flex-1 relative border-r border-[#1c2127]">
          {!isMarketOpen && (
            <div className="absolute inset-0 z-30 bg-[#080a0c]/60 backdrop-blur-[2px] pointer-events-none flex items-center justify-center">
              <div className="bg-[#111418] border border-white/5 p-4 rounded-xl flex items-center gap-3 shadow-2xl">
                 <Moon size={16} className="text-indigo-400" />
                 <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Night Session Simulation</span>
              </div>
            </div>
          )}
          
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={displayData} margin={{ top: 40, right: 60, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="1 4" stroke="#1c2127" vertical={false} />
              <XAxis dataKey="time" hide />
              <YAxis 
                orientation="right" 
                domain={['auto', 'auto']} 
                tick={{ fill: '#475569', fontSize: 10, fontWeight: '900' }} 
                axisLine={false} 
                tickLine={false}
                width={50}
              />
              <Tooltip
                isAnimationActive={false}
                contentStyle={{ backgroundColor: '#080a0c', border: '1px solid #1c2127', borderRadius: '4px' }}
                content={({ active, payload }) => {
                  if (active && payload?.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="text-[10px] font-black p-2 uppercase space-y-1">
                        <div className="flex justify-between gap-4 text-slate-500"><span>O</span><span className="text-white">{d.open.toFixed(2)}</span></div>
                        <div className="flex justify-between gap-4 text-[#2ebd85]"><span>H</span><span className="text-white">{d.high.toFixed(2)}</span></div>
                        <div className="flex justify-between gap-4 text-[#f6465d]"><span>L</span><span className="text-white">{d.low.toFixed(2)}</span></div>
                        <div className="flex justify-between gap-4 text-slate-300"><span>C</span><span className="text-white">{d.close.toFixed(2)}</span></div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <ReferenceLine y={stock.LTP} stroke={stock.Change >= 0 ? "#2ebd85" : "#f6465d"} strokeDasharray="3 3" label={{ position: 'right', value: stock.LTP.toFixed(2), fill: '#fff', fontSize: 9, fontWeight: 'bold', className: 'bg-black' }} />
              <Bar dataKey="range" shape={<Candlestick />} isAnimationActive={false} />
              {/* Volume Bars at bottom */}
              <Bar dataKey="volume" yAxisId="vol" isAnimationActive={false}>
                {displayData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.close >= entry.open ? '#2ebd8533' : '#f6465d33'} />
                ))}
              </Bar>
              <YAxis yAxisId="vol" hide domain={[0, dataMax => dataMax * 5]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* L2 Order Book Sidebar */}
        <div className="w-56 bg-[#111418]/30 flex flex-col text-[10px] font-bold overflow-hidden border-l border-[#1c2127]">
          <div className="p-3 border-b border-[#1c2127] text-slate-600 uppercase tracking-widest text-[9px] font-black">Market Depth</div>
          <div className="flex-1 flex flex-col p-2 space-y-1 overflow-hidden">
            {/* ASKS (SELLS) */}
            <div className="flex flex-col-reverse gap-0.5">
              {orderBook.asks.map((ask, i) => (
                <div key={i} className="flex justify-between px-2 py-0.5 relative group">
                  <div className="absolute inset-y-0 right-0 bg-[#f6465d]/5 transition-all group-hover:bg-[#f6465d]/10" style={{ width: `${(ask.vol / 200) * 100}%` }}></div>
                  <span className="text-[#f6465d] relative z-10 tabular-nums">{ask.price.toFixed(2)}</span>
                  <span className="text-slate-500 relative z-10 tabular-nums">{ask.vol}</span>
                </div>
              ))}
            </div>
            
            <div className="py-2 border-y border-[#1c2127] text-center">
              <div className={`text-sm font-black tabular-nums ${stock.Change >= 0 ? 'text-[#2ebd85]' : 'text-[#f6465d]'}`}>
                {stock.LTP.toFixed(2)}
              </div>
              <div className="text-[8px] text-slate-700 uppercase">Spread: 0.15</div>
            </div>

            {/* BIDS (BUYS) */}
            <div className="flex flex-col gap-0.5">
              {orderBook.bids.map((bid, i) => (
                <div key={i} className="flex justify-between px-2 py-0.5 relative group">
                  <div className="absolute inset-y-0 right-0 bg-[#2ebd85]/5 transition-all group-hover:bg-[#2ebd85]/10" style={{ width: `${(bid.vol / 200) * 100}%` }}></div>
                  <span className="text-[#2ebd85] relative z-10 tabular-nums">{bid.price.toFixed(2)}</span>
                  <span className="text-slate-500 relative z-10 tabular-nums">{bid.vol}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="p-3 bg-[#080a0c]/50 border-t border-[#1c2127] flex flex-col gap-2">
            <div className="flex justify-between text-slate-500">
              <span className="uppercase text-[8px] font-black">Buy Pressure</span>
              <span className="text-white">64%</span>
            </div>
            <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
               <div className="h-full bg-[#2ebd85]" style={{ width: '64%' }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Account Status Footer */}
      <div className="h-10 border-t border-[#1c2127] bg-[#080a0c] flex items-center px-6 justify-between text-[9px] font-black uppercase tracking-tighter">
        <div className="flex gap-6">
          <div className="flex items-center gap-2 text-slate-600">
            <Zap size={10} className="text-amber-500" />
            LTP Engine: <span className="text-slate-400">Vercel-Sync-Core</span>
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            Latency: <span className="text-[#2ebd85]">24ms</span>
          </div>
        </div>
        <div className="flex gap-4">
          <span className="text-slate-700">Market Data: Delayed 15m (EOD Sync)</span>
        </div>
      </div>
    </main>
  );
};

export default MainTerminal;
