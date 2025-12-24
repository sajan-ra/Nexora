
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { fetchMarketData } from './services/api';
import { Stock, Portfolio, Holding, Transaction, AppTab } from './types';
import Sidebar from './components/Sidebar';
import MainTerminal from './components/MainTerminal';
import OrderPanel from './components/OrderPanel';
import PortfolioView from './components/PortfolioView';
import DashboardStats from './components/DashboardStats';
import AIInsights from './components/AIInsights';
import { TrendingUp, User, LayoutDashboard, Briefcase, Cpu, Globe } from 'lucide-react';

const INITIAL_BALANCE = 500000;
const SIMULATION_INTERVAL = 3000;

const App: React.FC = () => {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.MARKET);
  const [selectedSymbol, setSelectedSymbol] = useState<string>('ADBL');
  const [isMarketOpen, setIsMarketOpen] = useState(false);
  const [portfolio, setPortfolio] = useState<Portfolio>(() => {
    const saved = localStorage.getItem('nexora_portfolio');
    if (saved) return JSON.parse(saved);
    return {
      balance: INITIAL_BALANCE,
      holdings: [],
      history: []
    };
  });

  const checkMarketStatus = useCallback(() => {
    const now = new Date();
    const day = now.getDay(); 
    const hour = now.getHours();
    const isBusinessDay = day >= 0 && day <= 4; 
    const isWithinHours = hour >= 10 && hour < 15;
    setIsMarketOpen(isBusinessDay && isWithinHours);
  }, []);

  const simulatePriceMovements = useCallback(() => {
    if (!isMarketOpen) return;
    setStocks(currentStocks => 
      currentStocks.map(stock => {
        const volatility = stock.LTP > 1000 ? 2.5 : 0.8;
        const nudge = (Math.random() * 2 - 1) * volatility;
        const newLTP = Math.max(1, stock.LTP + nudge);
        const openPrice = stock.Open || (newLTP / (1 + stock.Change/100));
        const newChange = ((newLTP - openPrice) / openPrice) * 100;
        return {
          ...stock,
          LTP: newLTP,
          Change: newChange,
          High: Math.max(stock.High, newLTP),
          Low: Math.min(stock.Low, newLTP)
        };
      })
    );
  }, [isMarketOpen]);

  const refreshMarketData = useCallback(async () => {
    checkMarketStatus();
    const data = await fetchMarketData();
    if (data.length > 0) {
      setStocks(prevStocks => {
        if (prevStocks.length === 0) return data;
        return data.map(apiStock => {
          const localStock = prevStocks.find(s => s.Symbol === apiStock.Symbol);
          if (localStock) {
            const diff = Math.abs(apiStock.LTP - localStock.LTP);
            if (diff < 0.05) return localStock; 
          }
          return apiStock;
        });
      });
      if (!selectedSymbol || !data.find(s => s.Symbol === selectedSymbol)) {
        setSelectedSymbol(data[0].Symbol);
      }
    }
    setLoading(false);
  }, [selectedSymbol, checkMarketStatus]);

  useEffect(() => {
    refreshMarketData();
    const apiInterval = setInterval(refreshMarketData, 30000);
    return () => clearInterval(apiInterval);
  }, [refreshMarketData]);

  useEffect(() => {
    const simInterval = setInterval(simulatePriceMovements, SIMULATION_INTERVAL);
    return () => clearInterval(simInterval);
  }, [simulatePriceMovements]);

  useEffect(() => {
    localStorage.setItem('nexora_portfolio', JSON.stringify(portfolio));
  }, [portfolio]);

  const selectedStock = useMemo(() => 
    stocks.find(s => s.Symbol === selectedSymbol), 
  [stocks, selectedSymbol]);

  const handleTrade = (type: 'BUY' | 'SELL', symbol: string, quantity: number, price: number) => {
    if (!isMarketOpen) {
      alert("Market is currently closed.");
      return;
    }
    setPortfolio(prev => {
      const totalCost = quantity * price;
      const newBalance = type === 'BUY' ? prev.balance - totalCost : prev.balance + totalCost;
      if (newBalance < 0 && type === 'BUY') {
        alert("Insufficient balance!");
        return prev;
      }
      const existingHolding = prev.holdings.find(h => h.symbol === symbol);
      let newHoldings = [...prev.holdings];
      if (type === 'BUY') {
        if (existingHolding) {
          const newQty = existingHolding.quantity + quantity;
          const newAvg = ((existingHolding.avgPrice * existingHolding.quantity) + (price * quantity)) / newQty;
          newHoldings = newHoldings.map(h => h.symbol === symbol ? { ...h, quantity: newQty, avgPrice: newAvg } : h);
        } else {
          newHoldings.push({ symbol, quantity, avgPrice: price });
        }
      } else {
        if (!existingHolding || existingHolding.quantity < quantity) {
          alert("Insufficient shares!");
          return prev;
        }
        const newQty = existingHolding.quantity - quantity;
        newHoldings = newQty === 0 ? newHoldings.filter(h => h.symbol !== symbol) : newHoldings.map(h => h.symbol === symbol ? { ...h, quantity: newQty } : h);
      }
      const transaction: Transaction = {
        id: Math.random().toString(36).substr(2, 9),
        symbol, type, quantity, price, timestamp: Date.now()
      };
      return { ...prev, balance: newBalance, holdings: newHoldings, history: [transaction, ...prev.history] };
    });
  };

  return (
    <div className="flex flex-col h-screen bg-[#080a0c] text-slate-200 overflow-hidden font-sans">
      {/* Dynamic Header */}
      <header className="h-14 border-b border-[#1c2127] flex items-center justify-between px-6 bg-[#111418] z-50">
        <div className="flex items-center gap-10">
          <div className="flex items-center gap-2.5">
            <div className="bg-[#2ebd85] p-1.5 rounded-lg shadow-lg shadow-[#2ebd85]/20">
              <TrendingUp size={18} className="text-white" />
            </div>
            <span className="font-black tracking-tighter text-base uppercase">Nexora <span className="text-[#2ebd85]">Pro</span></span>
          </div>
          
          <nav className="flex items-center gap-1 bg-[#080a0c] p-1 rounded-lg border border-[#1c2127]">
            {[
              { id: AppTab.MARKET, icon: LayoutDashboard, label: 'Terminal' },
              { id: AppTab.PORTFOLIO, icon: Briefcase, label: 'Portfolio' },
              { id: AppTab.AI_INSIGHTS, icon: Cpu, label: 'AI Insights' }
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-[11px] font-black uppercase transition-all ${activeTab === t.id ? 'bg-[#1c2127] text-[#2ebd85] shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
              >
                <t.icon size={14} />
                {t.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-6">
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tight border ${isMarketOpen ? 'bg-[#2ebd85]/5 text-[#2ebd85] border-[#2ebd85]/20' : 'bg-rose-500/5 text-rose-500 border-rose-500/20'}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${isMarketOpen ? 'bg-[#2ebd85] animate-pulse' : 'bg-rose-500'}`}></div>
            {isMarketOpen ? 'Live Market' : 'Closed'}
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest opacity-60">Available Capital</span>
            <span className="text-sm font-black text-white tabular-nums">NPR {portfolio.balance.toLocaleString()}</span>
          </div>
          <div className="h-8 w-px bg-[#1c2127]"></div>
          <div className="bg-[#1c2127] p-2 rounded-full border border-white/5 cursor-pointer hover:bg-[#2ebd85]/10 transition-colors">
            <User size={18} className="text-slate-400" />
          </div>
        </div>
      </header>

      {/* Dynamic Viewport */}
      <div className="flex-1 flex overflow-hidden">
        {activeTab === AppTab.MARKET && (
          <>
            <Sidebar stocks={stocks} selectedSymbol={selectedSymbol} onSelect={setSelectedSymbol} loading={loading} />
            <MainTerminal stock={selectedStock} holdings={portfolio.holdings} stocks={stocks} />
            <OrderPanel stock={selectedStock} balance={portfolio.balance} history={portfolio.history} onTrade={handleTrade} holdings={portfolio.holdings} isMarketOpen={isMarketOpen} />
          </>
        )}

        {activeTab === AppTab.PORTFOLIO && (
          <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-8 bg-[#080a0c]">
            <div className="max-w-7xl mx-auto space-y-8">
              <div className="flex justify-between items-end">
                <div>
                  <h1 className="text-3xl font-black text-white uppercase tracking-tighter">My Portfolio</h1>
                  <p className="text-slate-500 text-sm font-medium">Real-time valuation of your NEPSE assets</p>
                </div>
                <div className="flex gap-2">
                  <div className="px-4 py-2 bg-[#111418] border border-[#1c2127] rounded-xl">
                    <span className="text-[10px] text-slate-500 font-black block uppercase">Market Hours</span>
                    <span className="text-xs font-bold text-slate-300">10:00 - 15:00</span>
                  </div>
                </div>
              </div>
              <DashboardStats portfolio={portfolio} stocks={stocks} />
              <PortfolioView portfolio={portfolio} stocks={stocks} onTrade={handleTrade} />
            </div>
          </div>
        )}

        {activeTab === AppTab.AI_INSIGHTS && (
          <div className="flex-1 overflow-y-auto custom-scrollbar p-8 bg-[#080a0c]">
            <div className="max-w-4xl mx-auto">
              <AIInsights stocks={stocks} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
