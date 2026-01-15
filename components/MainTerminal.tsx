
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { createChart, IChartApi, ISeriesApi, CandlestickData, UTCTimestamp, ColorType } from 'lightweight-charts';
import { Stock, Holding } from '../types';
import { Moon, Activity, Zap, TrendingUp, TrendingDown } from 'lucide-react';

const CANDLE_INTERVAL_S = 15; // 15s candles

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
  const prevPrice = useRef<number>(0);

  // Initialize TradingView Chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#080a0c' },
        textColor: '#475569',
        fontSize: 10,
        fontFamily: 'Inter, sans-serif',
      },
      grid: {
        vertLines: { color: '#1c2127', style: 2 },
        horzLines: { color: '#1c2127', style: 2 },
      },
      crosshair: {
        mode: 0,
        vertLine: { color: '#334155', width: 1, style: 3, labelBackgroundColor: '#111418' },
        horzLine: { color: '#334155', width: 1, style: 3, labelBackgroundColor: '#111418' },
      },
      timeScale: {
        borderColor: '#1c2127',
        timeVisible: true,
        secondsVisible: true,
      },
      rightPriceScale: {
        borderColor: '#1c2127',
        scaleMargins: { top: 0.1, bottom: 0.2 },
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
      priceScaleId: '', // Overlay on price
    });
    
    volume.priceScale().applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    chartRef.current = chart;
    seriesRef.current = series;
    volumeRef.current = volume;

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ 
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

  // Seed and Update Data
  useEffect(() => {
    if (!stock || !seriesRef.current || !volumeRef.current) return;

    const symbol = stock.Symbol;
    const now = Math.floor(Date.now() / 1000) as UTCTimestamp;
    
    // Check if price changed for flash effect
    if (stock.LTP > prevPrice.current) setTickFlash('up');
    else if (stock.LTP < prevPrice.current) setTickFlash('down');
    prevPrice.current = stock.LTP;
    const timer = setTimeout(() => setTickFlash(null), 300);

    // Initial Seed for new symbol
    const history: CandlestickData[] = [];
    const volHistory: any[] = [];
    let lastClose = stock.LTP;
    
    // Mock 100 historical candles for continuity
    for (let i = 100; i > 0; i--) {
      const time = (now - (i * CANDLE_INTERVAL_S)) as UTCTimestamp;
      const o = lastClose;
      const move = (Math.random() - 0.5) * (o * 0.004);
      const c = o + move;
      const h = Math.max(o, c) + (Math.random() * 0.5);
      const l = Math.min(o, c) - (Math.random() * 0.5);
      
      history.push({ time, open: o, high: h, low: l, close: c });
      volHistory.push({ time, value: Math.random() * 1000, color: c >= o ? '#2ebd8522' : '#f6465d22' });
      lastClose = c;
    }

    seriesRef.current.setData(history);
    volumeRef.current.setData(volHistory);

    // Live Update Logic
    const currentCandleTime = (Math.floor(now / CANDLE_INTERVAL_S) * CANDLE_INTERVAL_S) as UTCTimestamp;
    
    const updateTick = () => {
      if (!seriesRef.current || !volumeRef.current) return;
      
      seriesRef.current.update({
        time: currentCandleTime,
        open: lastClose, // Professional continuity: Open = Prev Close
        high: Math.max(lastClose, stock.LTP),
        low: Math.min(lastClose, stock.LTP),
        close: stock.LTP,
      });

      volumeRef.current.update({
        time: currentCandleTime,
        value: Math.random() * 50,
        color: stock.LTP >= lastClose ? '#2ebd8522' : '#f6465d22'
      });
    };

    updateTick();

    return () => clearTimeout(timer);
  }, [stock?.Symbol, stock?.LTP]);

  // Market Depth Simulation
  const depth = useMemo(() => {
    if (!stock) return { bids: [], asks: [] };
    const p = stock.LTP;
    const gen = (start: number, step: number) => Array.from({ length: 5 }).map((_, i) => ({
      price: start + (i * step),
      vol: Math.floor(Math.random() * 800) + 100
    }));
    return { asks: gen(p + 0.1, 0.15).reverse(), bids: gen(p - 0.1, -0.15) };
  }, [stock?.LTP]);

  if (!stock) return (
    <div className="flex-1 bg-[#080a0c] flex items-center justify-center font-black text-slate-800 uppercase tracking-[0.4em]">
      Waiting for Data Stream...
    </div>
  );

  return (
    <main className="flex-1 flex flex-col bg-[#080a0c] overflow-hidden select-none">
      {/* TradingView-Style Header */}
      <div className="h-16 border-b border-[#1c2127] px-6 flex items-center justify-between bg-[#0b0e11] z-10">
        <div className="flex items-center gap-8">
          <div>
            <h2 className="text-xl font-black text-white tracking-tighter uppercase flex items-center gap-2">
              {stock.Symbol}
              <span className="text-[10px] bg-[#1c2127] px-1.5 py-0.5 rounded text-slate-500 font-bold">LIVE</span>
            </h2>
            <div className="flex gap-3 text-[9px] font-black text-slate-600 uppercase mt-0.5 tracking-widest">
              <span>EXCHANGE: <span className="text-slate-400">NEPSE</span></span>
              <span>15S <span className="text-[#2ebd85]">●</span></span>
            </div>
          </div>
          <div className="h-10 w-px bg-[#1c2127]"></div>
          <div className={`transition-all duration-300 ${tickFlash === 'up' ? 'text-[#2ebd85] scale-105' : tickFlash === 'down' ? 'text-[#f6465d] scale-105' : 'text-white'}`}>
             <div className="text-2xl font-black tabular-nums leading-none">
                {stock.LTP.toFixed(2)}
             </div>
             <div className={`text-[10px] font-bold mt-1 flex gap-2 ${stock.Change >= 0 ? 'text-[#2ebd85]' : 'text-[#f6465d]'}`}>
               <span>{stock.Change >= 0 ? '+' : ''}{stock.Change.toFixed(2)}%</span>
               <span className="opacity-40">CHG</span>
             </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
           <div className="flex flex-col items-end mr-4">
              <span className="text-[9px] font-black text-slate-700 uppercase tracking-widest">Feed Status</span>
              <div className="flex items-center gap-2 mt-1">
                 <div className="w-1.5 h-1.5 rounded-full bg-[#2ebd85] animate-pulse"></div>
                 <span className="text-[10px] font-bold text-slate-400">STABLE</span>
              </div>
           </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* The Professional Chart Engine */}
        <div className="flex-1 relative border-r border-[#1c2127]">
          {!isMarketOpen && (
            <div className="absolute inset-0 z-40 bg-[#080a0c]/60 backdrop-blur-[1px] pointer-events-none flex items-center justify-center">
               <div className="px-6 py-2.5 bg-[#111418] border border-white/5 rounded-xl flex items-center gap-3 shadow-2xl">
                 <Moon size={14} className="text-indigo-500" />
                 <span className="text-[10px] font-black text-white uppercase tracking-widest">Simulation Mode</span>
               </div>
            </div>
          )}
          <div ref={chartContainerRef} className="w-full h-full" />
        </div>

        {/* Real-time Order Book */}
        <div className="w-64 bg-[#0b0e11] border-l border-[#1c2127] flex flex-col font-mono text-[10px]">
           <div className="p-4 border-b border-[#1c2127] flex justify-between items-center bg-[#080a0c]">
             <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Order Book</span>
             <span className="text-[8px] text-[#2ebd85] font-black">L2 AGG</span>
           </div>
           
           <div className="flex-1 overflow-hidden p-2 flex flex-col">
              <div className="flex flex-col-reverse gap-0.5 mb-2">
                 {depth.asks.map((ask, i) => (
                   <div key={i} className="flex justify-between px-2 py-0.5 relative group cursor-crosshair">
                      <div className="absolute inset-y-0 right-0 bg-[#f6465d]/5" style={{ width: `${(ask.vol / 900) * 100}%` }}></div>
                      <span className="text-[#f6465d] font-bold z-10">{ask.price.toFixed(2)}</span>
                      <span className="text-slate-500 z-10">{ask.vol}</span>
                   </div>
                 ))}
              </div>

              <div className="py-4 border-y border-[#1c2127] flex flex-col items-center justify-center bg-[#080a0c]">
                 <div className={`text-base font-black tabular-nums ${stock.Change >= 0 ? 'text-[#2ebd85]' : 'text-[#f6465d]'}`}>
                   {stock.LTP.toFixed(2)}
                 </div>
                 <div className="text-[8px] text-slate-700 font-black uppercase mt-1">Spread: 0.15</div>
              </div>

              <div className="flex flex-col gap-0.5 mt-2">
                 {depth.bids.map((bid, i) => (
                   <div key={i} className="flex justify-between px-2 py-0.5 relative group cursor-crosshair">
                      <div className="absolute inset-y-0 right-0 bg-[#2ebd85]/5" style={{ width: `${(bid.vol / 900) * 100}%` }}></div>
                      <span className="text-[#2ebd85] font-bold z-10">{bid.price.toFixed(2)}</span>
                      <span className="text-slate-500 z-10">{bid.vol}</span>
                   </div>
                 ))}
              </div>
           </div>

           <div className="p-4 bg-[#080a0c] border-t border-[#1c2127]">
              <div className="flex justify-between text-[8px] font-black text-slate-600 uppercase mb-2">
                 <span>Buy Pressure</span>
                 <span className="text-[#2ebd85]">61.4%</span>
              </div>
              <div className="h-1 w-full bg-[#1c2127] rounded-full overflow-hidden">
                 <div className="h-full bg-[#2ebd85]" style={{ width: '61.4%' }}></div>
              </div>
           </div>
        </div>
      </div>

      {/* Analytics Telemetry */}
      <div className="h-8 border-t border-[#1c2127] px-6 bg-[#080a0c] flex items-center justify-between text-[8px] font-black uppercase tracking-widest text-slate-600">
         <div className="flex gap-6">
            <span className="flex items-center gap-2"><Zap size={10} className="text-amber-500" /> V8 QUANT ENGINE</span>
            <span className="flex items-center gap-2"><Activity size={10} /> LATENCY: 9ms</span>
         </div>
         <div className="flex gap-4">
            <span>UNIX: {Math.floor(Date.now()/1000)}</span>
         </div>
      </div>
    </main>
  );
};

export default MainTerminal;
