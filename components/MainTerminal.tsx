
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { createChart, IChartApi, ISeriesApi, CandlestickData, UTCTimestamp, ColorType } from 'lightweight-charts';
import { Stock, Holding } from '../types';
import { Activity, Zap } from 'lucide-react';

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
  
  // CRITICAL: Persistent references to prevent "Changing History"
  const historyInitialized = useRef<string | null>(null);
  const lastPriceRef = useRef<number>(0);
  const lastBarRef = useRef<CandlestickData | null>(null);

  // 1. Setup the Chart UI (Run once)
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
        vertLines: { color: '#16191d' },
        horzLines: { color: '#16191d' },
      },
      timeScale: {
        borderColor: '#1c2127',
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: '#1c2127',
        autoScale: true,
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

  // 2. Initialize History (Runs only when Symbol Changes)
  useEffect(() => {
    if (!stock || !seriesRef.current || !volumeRef.current) return;
    
    // STOP: If we already initialized history for THIS symbol, don't do it again!
    if (historyInitialized.current === stock.Symbol) return;

    const now = Math.floor(Date.now() / 1000) as UTCTimestamp;
    const history: CandlestickData[] = [];
    const volHistory: any[] = [];
    let seedPrice = stock.LTP - (Math.random() * 20); // Create a slight trend start

    // Generate 150 static historical bars
    for (let i = 150; i > 0; i--) {
      const time = (now - (i * CANDLE_INTERVAL_S)) as UTCTimestamp;
      const o = seedPrice;
      const drift = (Math.random() - 0.5) * (o * 0.003);
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

    // Set full data once
    seriesRef.current.setData(history);
    volumeRef.current.setData(volHistory);
    
    // Save state
    historyInitialized.current = stock.Symbol;
    lastBarRef.current = history[history.length - 1];
    lastPriceRef.current = stock.LTP;
    
    chartRef.current?.timeScale().fitContent();
  }, [stock?.Symbol]);

  // 3. Live Ticks (Runs on every price update - ONLY updates the last bar)
  useEffect(() => {
    if (!stock || !seriesRef.current || !volumeRef.current || !lastBarRef.current) return;
    if (historyInitialized.current !== stock.Symbol) return;

    const currentPrice = stock.LTP;
    const now = Math.floor(Date.now() / 1000);
    const currentIntervalBar = (Math.floor(now / CANDLE_INTERVAL_S) * CANDLE_INTERVAL_S) as UTCTimestamp;

    // Tick visual flash
    if (currentPrice > lastPriceRef.current) setTickFlash('up');
    else if (currentPrice < lastPriceRef.current) setTickFlash('down');
    lastPriceRef.current = currentPrice;
    const flashTimer = setTimeout(() => setTickFlash(null), 300);

    // Get reference to the previous bar to maintain continuity (Open = Prev Close)
    const prevClose = lastBarRef.current.close;
    
    // If we are in the same time block as the last bar, keep updating it.
    // If it's a new time block, lastBarRef will naturally be the "previous" one.
    let open = currentIntervalBar === lastBarRef.current.time ? lastBarRef.current.open : prevClose;
    let high = Math.max(currentPrice, open);
    let low = Math.min(currentPrice, open);

    // If we are continuing the same bar, factor in its existing High/Low
    if (currentIntervalBar === lastBarRef.current.time) {
        high = Math.max(high, lastBarRef.current.high);
        low = Math.min(low, lastBarRef.current.low);
    }

    const liveBar: CandlestickData = {
      time: currentIntervalBar,
      open: open,
      high: high,
      low: low,
      close: currentPrice,
    };

    // Incremental update only! This does NOT reset the chart background or history.
    seriesRef.current.update(liveBar);
    
    volumeRef.current.update({
      time: currentIntervalBar,
      value: (currentIntervalBar === lastBarRef.current.time ? 100 : 50) + Math.random() * 50,
      color: currentPrice >= open ? '#2ebd8533' : '#f6465d33'
    });

    lastBarRef.current = liveBar;

    return () => clearTimeout(flashTimer);
  }, [stock?.LTP]);

  // UI Components (Market Depth etc)
  const depth = useMemo(() => {
    if (!stock) return { bids: [], asks: [] };
    const p = stock.LTP;
    const gen = (start: number, step: number) => Array.from({ length: 6 }).map((_, i) => ({
      price: start + (i * step),
      vol: Math.floor(Math.random() * 1000) + 50
    }));
    return { asks: gen(p + 0.1, 0.12).reverse(), bids: gen(p - 0.1, -0.12) };
  }, [stock?.LTP]);

  if (!stock) return <div className="flex-1 bg-[#080a0c] flex items-center justify-center font-black text-slate-800 uppercase tracking-widest">Waiting for stream...</div>;

  return (
    <main className="flex-1 flex flex-col bg-[#080a0c] overflow-hidden select-none">
      <div className="h-16 border-b border-[#1c2127] px-6 flex items-center justify-between bg-[#0b0e11] z-10">
        <div className="flex items-center gap-8">
          <div>
            <h2 className="text-xl font-black text-white tracking-tighter uppercase flex items-center gap-2">
              {stock.Symbol}
              <span className="text-[10px] bg-[#2ebd85]/10 px-1.5 py-0.5 rounded text-[#2ebd85] font-black border border-[#2ebd85]/20">RT-FEED</span>
            </h2>
            <div className="flex gap-3 text-[9px] font-black text-slate-600 uppercase mt-0.5 tracking-widest">
              <span>NPR</span>
              <span className="text-[#2ebd85]">OPEN</span>
            </div>
          </div>
          <div className="h-10 w-px bg-[#1c2127]"></div>
          <div className={`transition-all duration-300 ${tickFlash === 'up' ? 'text-[#2ebd85]' : tickFlash === 'down' ? 'text-[#f6465d]' : 'text-white'}`}>
             <div className="text-2xl font-black tabular-nums leading-none">
                {stock.LTP.toFixed(2)}
             </div>
             <div className={`text-[10px] font-bold mt-1 ${stock.Change >= 0 ? 'text-[#2ebd85]' : 'text-[#f6465d]'}`}>
               {stock.Change >= 0 ? '+' : ''}{stock.Change.toFixed(2)}%
             </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 relative border-r border-[#1c2127]">
          <div ref={chartContainerRef} className="w-full h-full" />
        </div>

        <div className="w-64 bg-[#0b0e11] border-l border-[#1c2127] flex flex-col font-mono text-[10px]">
           <div className="p-4 border-b border-[#1c2127] flex justify-between items-center bg-[#080a0c]">
             <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Live Order Book</span>
           </div>
           
           <div className="flex-1 overflow-hidden p-2 flex flex-col">
              <div className="flex flex-col-reverse gap-0.5 mb-2">
                 {depth.asks.map((ask, i) => (
                   <div key={i} className="flex justify-between px-2 py-0.5 relative group">
                      <div className="absolute inset-y-0 right-0 bg-[#f6465d]/5" style={{ width: `${(ask.vol / 1100) * 100}%` }}></div>
                      <span className="text-[#f6465d] font-bold z-10">{ask.price.toFixed(2)}</span>
                      <span className="text-slate-600 z-10">{ask.vol}</span>
                   </div>
                 ))}
              </div>

              <div className="py-4 border-y border-[#1c2127] flex flex-col items-center justify-center bg-[#080a0c] relative">
                 <div className={`text-lg font-black tabular-nums ${stock.Change >= 0 ? 'text-[#2ebd85]' : 'text-[#f6465d]'}`}>
                   {stock.LTP.toFixed(2)}
                 </div>
              </div>

              <div className="flex flex-col gap-0.5 mt-2">
                 {depth.bids.map((bid, i) => (
                   <div key={i} className="flex justify-between px-2 py-0.5 relative group">
                      <div className="absolute inset-y-0 right-0 bg-[#2ebd85]/5" style={{ width: `${(bid.vol / 1100) * 100}%` }}></div>
                      <span className="text-[#2ebd85] font-bold z-10">{bid.price.toFixed(2)}</span>
                      <span className="text-slate-600 z-10">{bid.vol}</span>
                   </div>
                 ))}
              </div>
           </div>
        </div>
      </div>

      <div className="h-8 border-t border-[#1c2127] px-6 bg-[#080a0c] flex items-center justify-between text-[8px] font-black uppercase tracking-widest text-slate-700">
         <div className="flex gap-6 items-center">
            <span className="flex items-center gap-2"><Zap size={10} className="text-amber-500" /> ENGINE PRO V4</span>
         </div>
      </div>
    </main>
  );
};

export default MainTerminal;
