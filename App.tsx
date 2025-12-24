
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { fetchStockBySymbol } from './services/api';
import { Stock, Portfolio, Holding, Transaction, AppTab } from './types';
import Sidebar from './components/Sidebar';
import MainTerminal from './components/MainTerminal';
import OrderPanel from './components/OrderPanel';
import PortfolioView from './components/PortfolioView';
import DashboardStats from './components/DashboardStats';
import AIInsights from './components/AIInsights';
import { TrendingUp, User, LayoutDashboard, Briefcase, Cpu } from 'lucide-react';

const SYMBOLS = {
  "Commercial Banks": ["NABIL","NMB","NICA","GBIME","EBL","HBL","NIBL","PCBL","SBL","SCB","ADBL","CZBIL","MBL","KBL","LBL","SANIMA","PRVU","BOKL","MEGA","SRBL"],
  "Dev Banks": ["MNBBL","JBBL","GBBL","SHINE","SADBL","CORBL","SAPDBL","MLBL","KSBBL","UDBL"],
  "Finance": ["GUFL","PFL","MFIL","CFCL","ICFC","BFCL","SFCL"],
  "Life Insurance": ["NLIC","LICN","ALICL","PLIC","RLICL","SLICL","SNLI","ILI","ULI"],
  "Non-Life Insurance": ["NICL","SICL","NIL","PRIN","IGI","SALICO","SGIC","SPIL","HEI","RBCL"],
  "Hydropower": ["CHCL","BPCL","NHPC","SHPC","RADHI","SAHAS","UPCL","UNHPL","AKPL","API","NGPL","NYADI","DHPL","RHPL","HPPL"],
  "Investment": ["CIT","HIDCL","NIFRA","NRN","HATHY","ENL"],
  "Manufacturing": ["UNL","HDL","SHIVM","BNT","BNL","SARBTM","GCIL","SONA","NLO","OMPL"],
  "Others": ["STC","BBC","NTC","OHL","TRH","YHL","AHPC"]
};

const ALL_FLAT_SYMBOLS = Object.values(SYMBOLS).flat();
const INITIAL_BALANCE = 1000000;
const SIMULATION_INTERVAL = 2000;

const App: React.FC = () => {
  const [stocks, setStocks] = useState<Stock[]>(() => 
    ALL_FLAT_SYMBOLS.map(symbol => ({
      Symbol: symbol,
      LTP: 100 + Math.random() * 900, // Placeholder until first fetch
      Change: 0,
      Open: 100,
      High: 100,
      Low: 100,
      Volume: 0,
      Amount: 0
    }))
  );
  
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.MARKET);
  const [selectedSymbol, setSelectedSymbol] = useState<string>('NABIL');
  const [isMarketOpen, setIsMarketOpen] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [portfolio, setPortfolio] = useState<Portfolio>(() => {
    const saved = localStorage.getItem('nexora_portfolio');
    if (saved) return JSON.parse(saved);
    return { balance: INITIAL_BALANCE, holdings: [], history: [] };
  });

  const checkMarketStatus = useCallback(() => {
    const now = new Date();
    const day = now.getDay(); // 0 is Sunday in some locales, check Nepal context
    const hour = now.getHours();
    // Sun (0) to Thu (4)
    const isBusinessDay = day >= 0 && day <= 4; 
    const isWithinHours = hour >= 10 && hour < 15;
    setIsMarketOpen(isBusinessDay && isWithinHours);
  }, []);

  // Simulator: Locally nudges prices to feel "live"
  const simulatePriceMovements = useCallback(() => {
    if (!isMarketOpen) return;
    setStocks(currentStocks => 
      currentStocks.map(stock => {
        // We only simulate the active stock or stocks in our portfolio for performance
        const isInPortfolio = portfolio.holdings.some(h => h.symbol === stock.Symbol);
        const isSelected = stock.Symbol === selectedSymbol;
        
        if (!isSelected && !isInPortfolio) return stock;

        // "2-3 digit" nudge (e.g. 0.01 to 0.99 or slightly more for high value stocks)
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
  }, [isMarketOpen, selectedSymbol, portfolio.holdings]);

  const loadStockData = useCallback(async (symbol: string) => {
    setIsFetching(true);
    const data = await fetchStockBySymbol(symbol);
    if (data) {
      setStocks(prev => prev.map(s => s.Symbol === symbol ? { ...s, ...data } as Stock : s));
    }
    setIsFetching(false);
  }, []);

  // Load selected stock on change
  useEffect(() => {
    loadStockData(selectedSymbol);
  }, [selectedSymbol, loadStockData]);

  // Global heartbeat
  useEffect(() => {
    checkMarketStatus();
    const simInterval = setInterval(simulatePriceMovements, SIMULATION_INTERVAL);
    const statusInterval = setInterval(checkMarketStatus, 60000);
    return () => {
      clearInterval(simInterval);
      clearInterval(statusInterval);
    };
  }, [simulatePriceMovements, checkMarketStatus]);

  useEffect(() => {
    localStorage.setItem('nexora_portfolio', JSON.stringify(portfolio));
  }, [portfolio]);

  const selectedStock = useMemo(() => 
    stocks.find(s => s.Symbol === selectedSymbol), 
  [stocks, selectedSymbol]);

  const handleTrade = (type: 'BUY' | 'SELL', symbol: string, quantity: number, price: number) => {
    if (!isMarketOpen) {
      alert("Market is currently closed. (Sun-Thu, 10:00-15:00)");
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
      <header className="h-14 border-b border-[#1c2127] flex items-center justify-between px-6 bg-[#111418] z-50">
        <div className="flex items-center gap-10">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setActiveTab(AppTab.MARKET)}>
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
                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-[11px] font-black uppercase transition-all ${activeTab === t.id ? 'bg-[#1c2127] text-[#2ebd85]' : 'text-slate-500 hover:text-slate-300'}`}
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
            {isMarketOpen ? 'Live' : 'Closed'}
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[9px] text-slate-500 font-black uppercase opacity-60">Capital</span>
            <span className="text-sm font-black text-white tabular-nums">NPR {portfolio.balance.toLocaleString()}</span>
          </div>
          <div className="bg-[#1c2127] p-2 rounded-full border border-white/5 cursor-pointer hover:bg-[#2ebd85]/10 transition-colors">
            <User size={18} className="text-slate-400" />
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {activeTab === AppTab.MARKET && (
          <>
            <Sidebar stocks={stocks} selectedSymbol={selectedSymbol} onSelect={setSelectedSymbol} loading={isFetching} />
            <MainTerminal stock={selectedStock} holdings={portfolio.holdings} stocks={stocks} />
            <OrderPanel stock={selectedStock} balance={portfolio.balance} history={portfolio.history} onTrade={handleTrade} holdings={portfolio.holdings} isMarketOpen={isMarketOpen} />
          </>
        )}

        {activeTab === AppTab.PORTFOLIO && (
          <div className="flex-1 overflow-y-auto custom-scrollbar p-8 bg-[#080a0c]">
            <div className="max-w-7xl mx-auto space-y-8">
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
