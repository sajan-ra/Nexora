
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { fetchStockBySymbol } from './services/api';
import { Stock, Portfolio, Holding, Transaction, AppTab } from './types';
import Sidebar from './components/Sidebar';
import MainTerminal from './components/MainTerminal';
import OrderPanel from './components/OrderPanel';
import PortfolioView from './components/PortfolioView';
import DashboardStats from './components/DashboardStats';
import AIInsights from './components/AIInsights';
import { TrendingUp, User, LayoutDashboard, Briefcase, Cpu, WifiOff, Wifi, Loader2 } from 'lucide-react';

const SYMBOLS = {
  "Banks": ["NABIL","NMB","NICA","GBIME","EBL","HBL","NIBL","PCBL","SBL","SCB","ADBL","CZBIL","MBL","KBL","LBL","SANIMA","PRVU","BOKL","MEGA","SRBL"],
  "Development": ["MNBBL","JBBL","GBBL","SHINE","SADBL","CORBL","SAPDBL","MLBL","KSBBL","UDBL"],
  "Finance": ["GUFL","PFL","MFIL","CFCL","ICFC","BFCL","SFCL"],
  "Insurance": ["NLIC","LICN","ALICL","PLIC","RLICL","SLICL","SNLI","ILI","ULI","NICL","SICL","NIL","PRIN","IGI","SALICO"],
  "Hydropower": ["CHCL","BPCL","NHPC","SHPC","RADHI","SAHAS","UPCL","UNHPL","AKPL","API","NGPL","NYADI","DHPL"],
  "Other": ["CIT","HIDCL","NIFRA","NRN","HATHY","UNL","HDL","SHIVM","BNT","STC","BBC","NTC"]
};

const ALL_FLAT_SYMBOLS = Object.values(SYMBOLS).flat();
const INITIAL_BALANCE = 1000000;
const SIMULATION_INTERVAL = 2000;
const SYNC_DELAY = 400; 

interface ExtendedStock extends Stock {
  isLive?: boolean;
}

const App: React.FC = () => {
  // 1. Market Hours Check
  const checkIsMarketOpen = useCallback(() => {
    const now = new Date();
    // UTC+5:45 for Local Standard Time
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const nptDate = new Date(utc + (3600000 * 5.75));
    
    const day = nptDate.getDay(); // 0 is Sunday, 4 is Thursday
    const hour = nptDate.getHours();
    const minute = nptDate.getMinutes();
    const timeInMinutes = hour * 60 + minute;

    // Nexora Market Hours: Sun (0) to Thu (4), 11:00 AM to 3:00 PM
    const isOpen = (day >= 0 && day <= 4) && (timeInMinutes >= 660 && timeInMinutes < 900);
    return isOpen;
  }, []);

  const [isMarketOpen, setIsMarketOpen] = useState(checkIsMarketOpen());
  const [stocks, setStocks] = useState<ExtendedStock[]>(() => 
    ALL_FLAT_SYMBOLS.map(symbol => ({
      Symbol: symbol,
      LTP: 150 + Math.random() * 850,
      Change: 0,
      Open: 150,
      High: 150,
      Low: 150,
      Volume: 1000,
      Amount: 0,
      isLive: false
    }))
  );
  
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.MARKET);
  const [selectedSymbol, setSelectedSymbol] = useState<string>('NABIL');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  
  const [portfolio, setPortfolio] = useState<Portfolio>(() => {
    const saved = localStorage.getItem('nexora_portfolio');
    if (saved) return JSON.parse(saved);
    return { balance: INITIAL_BALANCE, holdings: [], history: [] };
  });

  const runBackgroundSync = useCallback(async (force: boolean = false) => {
    if (isSyncing || (!isMarketOpen && !force)) return;
    
    setIsSyncing(true);
    const priority = Array.from(new Set([
      selectedSymbol, 
      ...portfolio.holdings.map(h => h.symbol)
    ]));
    const rest = ALL_FLAT_SYMBOLS.filter(s => !priority.includes(s));
    const queue = [...priority, ...rest];

    for (let i = 0; i < queue.length; i++) {
      const symbol = queue[i];
      const data = await fetchStockBySymbol(symbol);
      
      if (data && typeof data.LTP === 'number' && data.LTP > 0) {
        setStocks(prev => prev.map(s => s.Symbol === symbol ? {
          ...s,
          LTP: data.LTP!,
          Open: s.isLive ? s.Open : data.LTP!,
          High: Math.max(s.High, data.LTP!),
          Low: Math.min(s.Low, data.LTP!),
          isLive: true
        } as ExtendedStock : s));
      }
      setSyncProgress(Math.round(((i + 1) / queue.length) * 100));
      await new Promise(r => setTimeout(r, SYNC_DELAY));
    }
    setIsSyncing(false);
  }, [selectedSymbol, portfolio.holdings, isSyncing, isMarketOpen]);

  useEffect(() => {
    runBackgroundSync(true);

    const statusInterval = setInterval(() => {
      const open = checkIsMarketOpen();
      setIsMarketOpen(open);
    }, 10000);

    const syncInterval = setInterval(() => {
      runBackgroundSync();
    }, 300000); 

    return () => {
      clearInterval(statusInterval);
      clearInterval(syncInterval);
    };
  }, [runBackgroundSync, checkIsMarketOpen]);

  const simulateActiveStocks = useCallback(() => {
    if (!isMarketOpen) return; 

    setStocks(current => 
      current.map(stock => {
        const isHeld = portfolio.holdings.some(h => h.symbol === stock.Symbol);
        const isSelected = stock.Symbol === selectedSymbol;
        
        if (!isSelected && !isHeld) return stock;

        const volatility = stock.LTP > 1000 ? 1.5 : 0.4;
        const drift = (Math.random() * 2 - 1) * volatility;
        const newLTP = Math.max(1, stock.LTP + drift);
        const openPrice = stock.Open || newLTP;
        const newChange = ((newLTP - openPrice) / openPrice) * 100;

        return {
          ...stock,
          LTP: newLTP,
          Change: newChange,
          High: Math.max(stock.High, newLTP),
          Low: Math.min(stock.Low, newLTP),
          Volume: stock.Volume + Math.floor(Math.random() * 10)
        };
      })
    );
  }, [selectedSymbol, portfolio.holdings, isMarketOpen]);

  useEffect(() => {
    const simInterval = setInterval(simulateActiveStocks, SIMULATION_INTERVAL);
    return () => clearInterval(simInterval);
  }, [simulateActiveStocks]);

  useEffect(() => {
    localStorage.setItem('nexora_portfolio', JSON.stringify(portfolio));
  }, [portfolio]);

  const selectedStock = useMemo(() => 
    stocks.find(s => s.Symbol === selectedSymbol), 
  [stocks, selectedSymbol]);

  const handleTrade = (type: 'BUY' | 'SELL', symbol: string, quantity: number, price: number) => {
    if (!isMarketOpen) {
      alert("Order Rejected: Nexora Market is currently closed.");
      return;
    }

    setPortfolio(prev => {
      const totalCost = quantity * price;
      const newBalance = type === 'BUY' ? prev.balance - totalCost : prev.balance + totalCost;
      
      if (newBalance < 0 && type === 'BUY') {
        alert("Transaction Refused: Insufficient Portfolio Balance.");
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
          alert("Transaction Refused: Insufficient Shares in Vault.");
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
              { id: AppTab.AI_INSIGHTS, icon: Cpu, label: 'Analysis' }
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
          <div className="flex items-center gap-4 bg-[#080a0c] px-3 py-1 rounded border border-[#1c2127]">
            <div className={`w-2 h-2 rounded-full ${isMarketOpen ? 'bg-[#2ebd85] animate-pulse' : 'bg-rose-500'}`}></div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              {isMarketOpen ? 'Market Open' : 'Market Closed'}
            </span>
          </div>

          <div className="flex flex-col items-end">
            <div className="flex items-center gap-2">
               {isSyncing && <Loader2 size={10} className="animate-spin text-[#2ebd85]" />}
               <span className="text-[9px] text-slate-600 font-black uppercase tracking-widest">Network Sync</span>
            </div>
            <div className="w-32 h-1 bg-slate-900 rounded-full mt-1 overflow-hidden border border-white/5">
               <div className="h-full bg-[#2ebd85] transition-all duration-500" style={{ width: `${syncProgress}%` }}></div>
            </div>
          </div>
          
          <div className="flex flex-col items-end border-l border-[#1c2127] pl-6">
            <span className="text-[9px] text-slate-600 font-black uppercase opacity-60">Trading Power</span>
            <span className="text-sm font-black text-white tabular-nums">NPR {portfolio.balance.toLocaleString()}</span>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {activeTab === AppTab.MARKET && (
          <>
            <Sidebar stocks={stocks} selectedSymbol={selectedSymbol} onSelect={setSelectedSymbol} loading={isSyncing} />
            <MainTerminal stock={selectedStock} holdings={portfolio.holdings} stocks={stocks} isMarketOpen={isMarketOpen} />
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
