
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { createChart, IChartApi, ISeriesApi, CandlestickData, UTCTimestamp, ColorType } from 'lightweight-charts';
import { Stock, Holding } from '../types';
import { Moon, Activity, Zap } from 'lucide-react';

const CANDLE_INTERVAL_S = 15; 

interface MainTerminalProps {
  stock?: Stock;
  holdings: Holding[];
  stocks: Stock[];
  isMarketOpen: boolean;
}

const MainTerminal: React.FC<MainTerminalProps> = ({ stock, holdings, stocks, isMarketOpen }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  
  const [tickFlash, setTickFlash] = useState<'up' | 'down' | null>(null);
  
  // Persistence refs to keep track of state without triggering re-renders that reset the chart
  const lastSymbolRef = useRef<string | null>(null);
  const lastPriceRef = useRef<number>(0);
  const lastCandleRef = useRef<CandlestickData | null>(null);

  // 1. Initialize Chart (Once)
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#080a0c' },
        textColor: '#475569',
        fontSize: 11,
        fontFamily: 'Inter, sans-serif',
      },
      grid: {
        vertLines: { color: '#16191d', style: 1 },
        horzLines: { color: '#16191d', style: 1 },
      },
      crosshair: {
        mode: 0,
        vertLine: { color: '#334155', width: 1, style: 3, labelBackgroundColor: '#111418' },
        horzLine: { color: '#334155', width: 1, style: 3, labelBackgroundColor: '#111418' },
      },
      timeScale: {
        borderColor: '#1c2127',
        timeVisible: true,
        secondsVisible: false,
        barSpacing: 10,
      },
      rightPriceScale: {
        borderColor: '#1c2127',
        autoScale: true,
        alignLabels: true,
      },
    });

    const series = chart.addCandlestickSeries({
      upColor: '#2ebd85',
      downColor: '#f6465d',
      borderVisible: false,
      wickUpColor: '#2ebd85',
      wickDownColor: '#f6465d',
    });

    const volume = chart.addHistogramSeries({
      color: '#2ebd8522',
      priceFormat: { type: 'volume' },
      priceScaleId: '', 
    });
    
    volume.priceScale().applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    chartRef.current = chart;
    seriesRef.current = series;
    volumeRef.current = volume;

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ 
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight 
        });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

  // 2. Handle Symbol Switch & Initial Seeding
  useEffect(() => {
    if (!stock || !seriesRef.current || !volumeRef.current) return;

    // Only "Reset/Seed" if the symbol actually changes
    if (lastSymbolRef.current !== stock.Symbol) {
      const now = Math.floor(Date.now() / 1000) as UTCTimestamp;
      const history: CandlestickData[] = [];
      const volHistory: any[] = [];
      let seedPrice = stock.LTP;

      // Create 150 historical candles for a rich look
      for (let i = 150; i > 0; i--) {
        const time = (now - (i * CANDLE_INTERVAL_S)) as UTCTimestamp;
        const o = seedPrice;
        const drift = (Math.random() - 0.5) * (o * 0.002);
        const c = o + drift;
        const h = Math.max(o, c) + (Math.random() * (o * 0.001));
        const l = Math.min(o, c) - (Math.random() * (o * 0.001));
        
        history.push({ time, open: o, high: h, low: l, close: c });
        volHistory.push({ 
          time, 
          value: Math.random() * 5000, 
          color: c >= o ? '#2ebd8522' : '#f6465d22' 
        });
        seedPrice = c;
      }

      seriesRef.current.setData(history);
      volumeRef.current.setData(volHistory);
      
      lastSymbolRef.current = stock.Symbol;
      lastCandleRef.current = history[history.length - 1];
      lastPriceRef.current = stock.LTP;
      
      // Auto-fit content on symbol change
      chartRef.current?.timeScale().fitContent();
    }
  }, [stock?.Symbol]);

  // 3. Live Price Ticks (Updates current candle ONLY)
  useEffect(() => {
    if (!stock || !seriesRef.current || !volumeRef.current) return;

    const currentPrice = stock.LTP;
    const now = Math.floor(Date.now() / 1000);
    const currentIntervalBar = (Math.floor(now / CANDLE_INTERVAL_S) * CANDLE_INTERVAL_S) as UTCTimestamp;

    // Visual Flash effect
    if (currentPrice > lastPriceRef.current) setTickFlash('up');
    else if (currentPrice < lastPriceRef.current) setTickFlash('down');
    lastPriceRef.current = currentPrice;
    const timer = setTimeout(() => setTickFlash(null), 300);

    // Get the base open price for the current interval
    // If the interval just changed, the open price is the previous candle's close
    let openPrice = lastCandleRef.current ? lastCandleRef.current.close : currentPrice;

    // Update (or Create) the bar at currentIntervalBar
    const updatedCandle: CandlestickData = {
      time: currentIntervalBar,
      open: openPrice,
      high: Math.max(openPrice, currentPrice, lastCandleRef.current?.time === currentIntervalBar ? lastCandleRef.current.high : currentPrice),
      low: Math.min(openPrice, currentPrice, lastCandleRef.current?.time === currentIntervalBar ? lastCandleRef.current.low : currentPrice),
      close: currentPrice,
    };

    seriesRef.current.update(updatedCandle);
    
    // Update Volume for the same bar
    volumeRef.current.update({
      time: currentIntervalBar,
      value: (lastCandleRef.current?.time === currentIntervalBar ? 100 : 50) + Math.random() * 100,
      color: currentPrice >= openPrice ? '#2ebd8533' : '#f6465d33'
    });

    lastCandleRef.current = updatedCandle;

    return () => clearTimeout(timer);
  }, [stock?.LTP]);

  // Simulated Order Book
  const depth = useMemo(() => {
    if (!stock) return { bids: [], asks: [] };
    const p = stock.LTP;
    const gen = (start: number, step: number) => Array.from({ length: 6 }).map((_, i) => ({
      price: start + (i * step),
      vol: Math.floor(Math.random() * 1200) + 100
    }));
    return { asks: gen(p + 0.1, 0.15).reverse(), bids: gen(p - 0.1, -0.15) };
  }, [stock?.LTP]);

  if (!stock) return (
    <div className="flex-1 bg-[#080a0c] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Activity className="text-slate-800 animate-pulse" size={48} />
        <span className="text-[10px] font-black text-slate-800 uppercase tracking-[0.5em]">Synchronizing...</span>
      </div>
    </div>
  );

  return (
    <main className="flex-1 flex flex-col bg-[#080a0c] overflow-hidden select-none">
      {/* Header Info */}
      <div className="h-16 border-b border-[#1c2127] px-6 flex items-center justify-between bg-[#0b0e11] z-10">
        <div className="flex items-center gap-8">
          <div>
            <h2 className="text-xl font-black text-white tracking-tighter uppercase flex items-center gap-2">
              {stock.Symbol}
              <span className="text-[10px] bg-[#1c2127] px-1.5 py-0.5 rounded text-[#2ebd85] font-black border border-[#2ebd85]/20">LIVE</span>
            </h2>
            <div className="flex gap-3 text-[9px] font-black text-slate-600 uppercase mt-0.5 tracking-widest">
              <span>PRC: <span className="text-slate-400">NPR</span></span>
              <span>FEED: <span className="text-[#2ebd85]">STABLE</span></span>
            </div>
          </div>
          <div className="h-10 w-px bg-[#1c2127]"></div>
          <div className={`transition-all duration-300 ${tickFlash === 'up' ? 'text-[#2ebd85] scale-105' : tickFlash === 'down' ? 'text-[#f6465d] scale-105' : 'text-white'}`}>
             <div className="text-2xl font-black tabular-nums leading-none">
                {stock.LTP.toFixed(2)}
             </div>
             <div className={`text-[10px] font-bold mt-1 flex gap-2 ${stock.Change >= 0 ? 'text-[#2ebd85]' : 'text-[#f6465d]'}`}>
               <span>{stock.Change >= 0 ? '▲' : '▼'} {Math.abs(stock.Change).toFixed(2)}%</span>
             </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
           <div className="text-right">
              <span className="text-[9px] font-black text-slate-700 uppercase tracking-widest block">24h Volume</span>
              <span className="text-[11px] font-black text-slate-400 tabular-nums">{(stock.Volume * 1240).toLocaleString()}</span>
           </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Chart Viewport */}
        <div className="flex-1 relative border-r border-[#1c2127]">
          {!isMarketOpen && (
            <div className="absolute top-4 left-4 z-40">
               <div className="px-3 py-1.5 bg-[#111418]/80 border border-white/5 rounded-lg flex items-center gap-2 backdrop-blur-md shadow-2xl">
                 <Moon size={12} className="text-indigo-500" />
                 <span className="text-[9px] font-black text-white uppercase tracking-widest">Post-Market Simulation</span>
               </div>
            </div>
          )}
          <div ref={chartContainerRef} className="w-full h-full" />
        </div>

        {/* L2 Depth View */}
        <div className="w-64 bg-[#0b0e11] border-l border-[#1c2127] flex flex-col font-mono text-[10px]">
           <div className="p-4 border-b border-[#1c2127] flex justify-between items-center bg-[#080a0c]">
             <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Market Depth</span>
             <div className="flex gap-1">
               <div className="w-1 h-1 rounded-full bg-[#2ebd85]"></div>
               <div className="w-1 h-1 rounded-full bg-[#2ebd85]"></div>
               <div className="w-1 h-1 rounded-full bg-slate-800"></div>
             </div>
           </div>
           
           <div className="flex-1 overflow-hidden p-2 flex flex-col">
              <div className="flex flex-col-reverse gap-0.5 mb-2">
                 {depth.asks.map((ask, i) => (
                   <div key={i} className="flex justify-between px-2 py-0.5 relative group">
                      <div className="absolute inset-y-0 right-0 bg-[#f6465d]/5" style={{ width: `${(ask.vol / 1300) * 100}%` }}></div>
                      <span className="text-[#f6465d] font-bold z-10 tabular-nums">{ask.price.toFixed(2)}</span>
                      <span className="text-slate-600 z-10 tabular-nums">{ask.vol}</span>
                   </div>
                 ))}
              </div>

              <div className="py-4 border-y border-[#1c2127] flex flex-col items-center justify-center bg-[#080a0c] relative overflow-hidden">
                 <div className={`text-lg font-black tabular-nums relative z-10 ${stock.Change >= 0 ? 'text-[#2ebd85]' : 'text-[#f6465d]'}`}>
                   {stock.LTP.toFixed(2)}
                 </div>
                 <div className="text-[8px] text-slate-700 font-black uppercase mt-1 relative z-10">Avg Spread: 0.12</div>
                 <div className={`absolute inset-0 opacity-10 transition-colors ${tickFlash === 'up' ? 'bg-[#2ebd85]' : tickFlash === 'down' ? 'bg-[#f6465d]' : ''}`}></div>
              </div>

              <div className="flex flex-col gap-0.5 mt-2">
                 {depth.bids.map((bid, i) => (
                   <div key={i} className="flex justify-between px-2 py-0.5 relative group">
                      <div className="absolute inset-y-0 right-0 bg-[#2ebd85]/5" style={{ width: `${(bid.vol / 1300) * 100}%` }}></div>
                      <span className="text-[#2ebd85] font-bold z-10 tabular-nums">{bid.price.toFixed(2)}</span>
                      <span className="text-slate-600 z-10 tabular-nums">{bid.vol}</span>
                   </div>
                 ))}
              </div>
           </div>

           <div className="p-4 bg-[#080a0c] border-t border-[#1c2127]">
              <div className="flex justify-between text-[8px] font-black text-slate-700 uppercase mb-2 tracking-widest">
                 <span>Buy Liquidity</span>
                 <span className="text-slate-500">58.2%</span>
              </div>
              <div className="h-1 w-full bg-[#1c2127] rounded-full overflow-hidden">
                 <div className="h-full bg-[#2ebd85]" style={{ width: '58.2%' }}></div>
              </div>
           </div>
        </div>
      </div>

      {/* Analytics Telemetry */}
      <div className="h-8 border-t border-[#1c2127] px-6 bg-[#080a0c] flex items-center justify-between text-[8px] font-black uppercase tracking-widest text-slate-700">
         <div className="flex gap-6 items-center">
            <span className="flex items-center gap-2"><Zap size={10} className="text-amber-500" /> ENGINE: NEXORA_PRO_RT_V2</span>
            <span className="w-1 h-1 rounded-full bg-slate-800"></span>
            <span className="flex items-center gap-2">UPTIME: 99.9%</span>
         </div>
         <div className="flex gap-4">
            <span className="text-[#2ebd85]">● CONNECTION SECURE</span>
         </div>
      </div>
    </main>
  );
};

export default MainTerminal;
