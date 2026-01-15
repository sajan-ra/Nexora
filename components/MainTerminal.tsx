
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { createChart, IChartApi, ISeriesApi, CandlestickData, UTCTimestamp, ColorType } from 'lightweight-charts';
import { Stock, Holding } from '../types';
import { Activity, Zap, BrainCircuit, ChevronUp, ChevronDown, Sparkles, Target } from 'lucide-react';
import { getTacticalSignal, TacticalSignal } from '../services/aiService';

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
  const [oracleOpen, setOracleOpen] = useState(true);
  const [tacticalSignal, setTacticalSignal] = useState<TacticalSignal | null>(null);
  const [isOracleThinking, setIsOracleThinking] = useState(false);
  
  const initializedSymbol = useRef<string | null>(null);
  const lastBarRef = useRef<CandlestickData | null>(null);
  const lastPriceRef = useRef<number>(0);
  const historyRef = useRef<CandlestickData[]>([]);

  // Chart Engine Setup
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
    
    volume.priceScale().applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });

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

  // History Seeding & Oracle Trigger
  useEffect(() => {
    if (!stock || !seriesRef.current || !volumeRef.current) return;
    if (initializedSymbol.current === stock.Symbol) return;

    const now = Math.floor(Date.now() / 1000) as UTCTimestamp;
    const history: CandlestickData[] = [];
    const volHistory: any[] = [];
    let priceCursor = stock.LTP;

    for (let i = 150; i > 0; i--) {
      const time = (now - (i * CANDLE_INTERVAL_S)) as UTCTimestamp;
      const open = priceCursor;
      const volatility = (Math.random() - 0.5) * (priceCursor * 0.005);
      const close = open + volatility;
      const high = Math.max(open, close) + (Math.random() * (priceCursor * 0.001));
      const low = Math.min(open, close) - (Math.random() * (priceCursor * 0.001));
      history.push({ time, open, high, low, close });
      volHistory.push({ time, value: Math.random() * 5000, color: close >= open ? '#2ebd8522' : '#f6465d22' });
      priceCursor = close;
    }

    seriesRef.current.setData(history);
    volumeRef.current.setData(volHistory);
    historyRef.current = history;
    
    initializedSymbol.current = stock.Symbol;
    lastBarRef.current = history[history.length - 1];
    lastPriceRef.current = stock.LTP;
    chartRef.current?.timeScale().fitContent();

    // Trigger AI Oracle
    setIsOracleThinking(true);
    getTacticalSignal(stock, history).then(signal => {
      setTacticalSignal(signal);
      setIsOracleThinking(false);
    });
  }, [stock?.Symbol]);

  // Live Tick Updates
  useEffect(() => {
    if (!stock || !seriesRef.current || !volumeRef.current || !lastBarRef.current) return;
    if (initializedSymbol.current !== stock.Symbol) return;

    const currentPrice = stock.LTP;
    const now = Math.floor(Date.now() / 1000);
    const currentIntervalBar = (Math.floor(now / CANDLE_INTERVAL_S) * CANDLE_INTERVAL_S) as UTCTimestamp;

    if (currentPrice > lastPriceRef.current) setTickFlash('up');
    else if (currentPrice < lastPriceRef.current) setTickFlash('down');
    lastPriceRef.current = currentPrice;
    const flashTimer = setTimeout(() => setTickFlash(null), 300);

    let open = lastBarRef.current.time === currentIntervalBar ? lastBarRef.current.open : lastBarRef.current.close;
    const noise = currentPrice * 0.0005; 
    let high = Math.max(currentPrice, open) + (Math.random() * noise);
    let low = Math.min(currentPrice, open) - (Math.random() * noise);

    if (currentIntervalBar === lastBarRef.current.time) {
      high = Math.max(high, lastBarRef.current.high);
      low = Math.min(low, lastBarRef.current.low);
    }

    const liveBar: CandlestickData = { time: currentIntervalBar, open, high, low, close: currentPrice };
    seriesRef.current.update(liveBar);
    volumeRef.current.update({
      time: currentIntervalBar,
      value: (currentIntervalBar === lastBarRef.current.time ? 100 : 50) + Math.random() * 80,
      color: currentPrice >= open ? '#2ebd8533' : '#f6465d33'
    });
    lastBarRef.current = liveBar;

    return () => clearTimeout(flashTimer);
  }, [stock?.LTP]);

  const depth = useMemo(() => {
    if (!stock) return { bids: [], asks: [] };
    const p = stock.LTP;
    const gen = (start: number, step: number) => Array.from({ length: 6 }).map((_, i) => ({
      price: start + (i * step),
      vol: Math.floor(Math.random() * 1500) + 100
    }));
    return { asks: gen(p + 0.15, 0.15).reverse(), bids: gen(p - 0.15, -0.15) };
  }, [stock?.LTP]);

  if (!stock) return (
    <div className="flex-1 bg-[#080a0c] flex items-center justify-center font-black text-slate-800 uppercase tracking-[0.3em]">
      Initializing Terminal Stream...
    </div>
  );

  return (
    <main className="flex-1 flex flex-col bg-[#080a0c] overflow-hidden select-none relative">
      {/* Header */}
      <div className="h-16 border-b border-[#1c2127] px-6 flex items-center justify-between bg-[#0b0e11] z-10">
        <div className="flex items-center gap-8">
          <div>
            <h2 className="text-xl font-black text-white tracking-tighter uppercase flex items-center gap-2">
              {stock.Symbol}
              <span className="text-[10px] bg-[#2ebd85]/10 px-1.5 py-0.5 rounded text-[#2ebd85] font-black border border-[#2ebd85]/20">LIVE ENGINE</span>
            </h2>
          </div>
          <div className="h-10 w-px bg-[#1c2127]"></div>
          <div className={`transition-all duration-300 ${tickFlash === 'up' ? 'text-[#2ebd85]' : tickFlash === 'down' ? 'text-[#f6465d]' : 'text-white'}`}>
             <div className="text-2xl font-black tabular-nums leading-none">{stock.LTP.toFixed(2)}</div>
             <div className={`text-[10px] font-bold mt-1 ${stock.Change >= 0 ? 'text-[#2ebd85]' : 'text-[#f6465d]'}`}>
               {stock.Change >= 0 ? '▲' : '▼'} {Math.abs(stock.Change).toFixed(2)}%
             </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 relative border-r border-[#1c2127]">
          <div ref={chartContainerRef} className="w-full h-full" />
          
          {/* FLOATING AI ORACLE */}
          <div className={`absolute top-6 left-6 z-20 transition-all duration-500 ${oracleOpen ? 'w-64' : 'w-12 h-12 overflow-hidden'}`}>
            <div className="bg-[#111418]/90 backdrop-blur-xl border border-[#2ebd85]/30 rounded-2xl shadow-2xl shadow-[#2ebd85]/10 flex flex-col">
              <div className="p-3 flex items-center justify-between border-b border-white/5">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg ${isOracleThinking ? 'bg-[#2ebd85] animate-pulse' : 'bg-[#2ebd85]/20'}`}>
                    <BrainCircuit size={16} className="text-white" />
                  </div>
                  {oracleOpen && <span className="text-[10px] font-black text-white uppercase tracking-widest">Nexora Oracle</span>}
                </div>
                <button onClick={() => setOracleOpen(!oracleOpen)} className="p-1 hover:bg-white/5 rounded-md text-slate-500 hover:text-white transition">
                  {oracleOpen ? <ChevronDown size={14} /> : <Sparkles size={14} className="text-[#2ebd85]" />}
                </button>
              </div>

              {oracleOpen && (
                <div className="p-4 space-y-4">
                  {isOracleThinking ? (
                    <div className="space-y-2 py-4">
                      <div className="h-2 bg-white/5 rounded-full animate-pulse w-full"></div>
                      <div className="h-2 bg-white/5 rounded-full animate-pulse w-2/3"></div>
                    </div>
                  ) : tacticalSignal ? (
                    <>
                      <div>
                        <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Detected Pattern</div>
                        <div className="text-xs font-bold text-[#2ebd85] flex items-center gap-1.5">
                          <Activity size={12} /> {tacticalSignal.pattern}
                        </div>
                      </div>
                      <div className="flex items-center justify-between bg-white/5 p-2.5 rounded-xl border border-white/5">
                        <div>
                          <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Signal</div>
                          <div className={`text-lg font-black ${tacticalSignal.signal === 'BUY' ? 'text-[#2ebd85]' : tacticalSignal.signal === 'SELL' ? 'text-[#f6465d]' : 'text-slate-400'}`}>
                            {tacticalSignal.signal}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Confidence</div>
                          <div className="text-lg font-black text-white">{tacticalSignal.confidence}%</div>
                        </div>
                      </div>
                      <div className="text-[10px] text-slate-400 leading-relaxed italic border-l-2 border-[#2ebd85]/40 pl-3">
                        "{tacticalSignal.advice}"
                      </div>
                    </>
                  ) : (
                    <div className="text-[10px] text-slate-600 font-bold uppercase tracking-widest text-center py-4">Waiting for Pulse...</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Depth View */}
        <div className="w-64 bg-[#0b0e11] border-l border-[#1c2127] flex flex-col font-mono text-[10px]">
           <div className="p-4 border-b border-[#1c2127] flex justify-between items-center bg-[#080a0c]">
             <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Live Orderbook</span>
           </div>
           <div className="flex-1 overflow-hidden p-2 flex flex-col">
              <div className="flex flex-col-reverse gap-0.5 mb-2">
                 {depth.asks.map((ask, i) => (
                   <div key={i} className="flex justify-between px-2 py-0.5 relative">
                      <div className="absolute inset-y-0 right-0 bg-[#f6465d]/5" style={{ width: `${(ask.vol / 1600) * 100}%` }}></div>
                      <span className="text-[#f6465d] font-bold z-10">{ask.price.toFixed(2)}</span>
                      <span className="text-slate-600 z-10">{ask.vol}</span>
                   </div>
                 ))}
              </div>
              <div className="py-4 border-y border-[#1c2127] flex flex-col items-center justify-center bg-[#080a0c]">
                 <div className={`text-lg font-black tabular-nums ${stock.Change >= 0 ? 'text-[#2ebd85]' : 'text-[#f6465d]'}`}>
                   {stock.LTP.toFixed(2)}
                 </div>
              </div>
              <div className="flex flex-col gap-0.5 mt-2">
                 {depth.bids.map((bid, i) => (
                   <div key={i} className="flex justify-between px-2 py-0.5 relative">
                      <div className="absolute inset-y-0 right-0 bg-[#2ebd85]/5" style={{ width: `${(bid.vol / 1600) * 100}%` }}></div>
                      <span className="text-[#2ebd85] font-bold z-10">{bid.price.toFixed(2)}</span>
                      <span className="text-slate-600 z-10">{bid.vol}</span>
                   </div>
                 ))}
              </div>
           </div>
        </div>
      </div>
    </main>
  );
};

export default MainTerminal;
