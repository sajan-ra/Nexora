
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Stock, Portfolio, Holding, Transaction, AppTab } from './types';
import Sidebar from './components/Sidebar';
import MainTerminal from './components/MainTerminal';
import OrderPanel from './components/OrderPanel';
import PortfolioView from './components/PortfolioView';
import DashboardStats from './components/DashboardStats';
import AIInsights from './components/AIInsights';
import Auth from './components/Auth';
import { auth, db } from './services/firebase';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { doc, setDoc, onSnapshot, updateDoc, increment, collection, getDocs, writeBatch } from 'firebase/firestore';
import { TrendingUp, LayoutDashboard, Briefcase, Cpu, Loader2, LogOut, Power } from 'lucide-react';

const SYMBOLS = {
  "Banks": ["NABIL","NMB","NICA","GBIME","EBL","HBL","NIBL","PCBL","SBL","SCB","ADBL","CZBIL","MBL","KBL","LBL","SANIMA","PRVU","BOKL","MEGA","SRBL"],
  "Development & Finance": ["MNBBL","JBBL","GBBL","SHINE","SADBL","CORBL","SAPDBL","MLBL","KSBBL","UDBL","GUFL","PFL","MFIL","CFCL","ICFC","BFCL","SFCL"],
  "Insurance": ["NLIC","LICN","ALICL","PLIC","RLICL","SLICL","SNLI","ILI","ULI","NICL","SICL","NIL","PRIN","IGI","SALICO","SGIC","SPIL","HEI","RBCL"],
  "Hydropower": ["CHCL","BPCL","NHPC","SHPC","RADHI","SAHAS","UPCL","UNHPL","AKPL","API","NGPL","NYADI","DHPL","RHPL","HPPL","AHPC"],
  "Manufacturing & Others": ["CIT","HIDCL","NIFRA","NRN","HATHY","ENL","UNL","HDL","SHIVM","BNT","BNL","SARBTM","GCIL","SONA","NLO","OMPL","STC","BBC","NTC","OHL","TRH","YHL"]
};

const ALL_FLAT_SYMBOLS = Array.from(new Set(Object.values(SYMBOLS).flat()));
const INITIAL_BALANCE = 1000000;
const SIMULATION_INTERVAL = 3000; 

const BASE_PRICES: Record<string, number> = {
  "NABIL": 498.6, "NMB": 235.1, "NICA": 321, "GBIME": 228, "EBL": 647.29, "HBL": 187.9, "NIBL": 0, "PCBL": 257, "SBL": 374.9, "SCB": 624.79, "ADBL": 288, "CZBIL": 191.5, "MBL": 220, "KBL": 178.4, "LBL": 173, "SANIMA": 319, "PRVU": 182, "BOKL": 207.3, "MEGA": 219, "SRBL": 173.1, "MNBBL": 342.6, "JBBL": 318, "GBBL": 374, "SHINE": 391, "SADBL": 381, "CORBL": 1450, "SAPDBL": 793.1, "MLBL": 354.5, "KSBBL": 429.5, "GUFL": 486, "PFL": 358, "MFIL": 709, "CFCL": 462.1, "ICFC": 620, "BFCL": 165, "SFCL": 375, "NLIC": 750.5, "LICN": 876, "ALICL": 457, "PLIC": 340, "SLICL": 387, "SNLI": 504, "ILI": 442, "ULI": 393.8, "NICL": 504.9, "SICL": 635, "NIL": 602.5, "PRIN": 657, "IGI": 414, "SALICO": 600.3, "SGIC": 472, "SPIL": 740, "HEI": 500, "RBCL": 14940, "CHCL": 498, "BPCL": 714, "NHPC": 190.8, "SHPC": 515, "RADHI": 730, "SAHAS": 543, "UPCL": 359, "UNHPL": 481.5, "AKPL": 244, "API": 289, "NGPL": 387.5, "NYADI": 370, "DHPL": 288, "RHPL": 268.8, "HPPL": 472, "CIT": 1809.5, "HIDCL": 254.5, "NIFRA": 261.2, "NRN": 1345.2, "HATHY": 886.9, "ENL": 890, "UNL": 47200, "HDL": 1132.2, "SHIVM": 575, "BNT": 11952, "BNL": 15904.9, "SARBTM": 865, "GCIL": 405.3, "SONA": 414.8, "NLO": 254.1, "OMPL": 1239, "STC": 5405, "BBC": 4864, "NTC": 895.4, "OHL": 691.1, "TRH": 708, "YHL": 600, "AHPC": 272.3
};

interface ExtendedStock extends Stock {
  isLive?: boolean;
}

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isMarketOpen, setIsMarketOpen] = useState(true);
  
  const [stocks, setStocks] = useState<ExtendedStock[]>(() => {
    return ALL_FLAT_SYMBOLS.map(symbol => {
      const initialPrice = BASE_PRICES[symbol] || 100.0;
      return {
        Symbol: symbol,
        LTP: initialPrice,
        Change: 0,
        Open: initialPrice,
        High: initialPrice,
        Low: initialPrice,
        Volume: Math.floor(Math.random() * 10000),
        Amount: 0,
        isLive: true
      };
    });
  });
  
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.MARKET);
  const [selectedSymbol, setSelectedSymbol] = useState<string>('NABIL');
  const [isSyncing, setIsSyncing] = useState(false);
  const [portfolio, setPortfolio] = useState<Portfolio>({ balance: INITIAL_BALANCE, holdings: [], history: [] });

  // Persist function to save current state as "Last Known Price"
  const persistMarketState = useCallback(async (marketStocks: ExtendedStock[]) => {
    if (!db) return;
    const batch = writeBatch(db);
    marketStocks.forEach(s => {
      const stockRef = doc(db, 'market', s.Symbol);
      batch.set(stockRef, { 
        symbol: s.Symbol, 
        ltp: s.LTP, 
        updatedAt: Date.now() 
      }, { merge: true });
    });
    try {
      await batch.commit();
      console.log("Nexora State Persisted to Vault");
    } catch (err) {
      console.error("Persistence failed:", err);
    }
  }, []);

  // Handle Manual Close/Open
  const toggleMarket = async () => {
    const nextState = !isMarketOpen;
    setIsMarketOpen(nextState);
    
    // If closing, do one final sync
    if (!nextState) {
      setIsSyncing(true);
      await persistMarketState(stocks);
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    const userRef = doc(db, 'portfolios', user.uid);
    const unsub = onSnapshot(userRef, (snapshot) => {
      if (snapshot.exists()) {
        setPortfolio(snapshot.data() as Portfolio);
      } else {
        const initial = { balance: INITIAL_BALANCE, holdings: [], history: [] };
        setDoc(userRef, initial);
        setPortfolio(initial);
      }
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const fetchMarketFromDB = async () => {
      setIsSyncing(true);
      try {
        const querySnapshot = await getDocs(collection(db, 'market'));
        const dbPrices: Record<string, number> = {};
        querySnapshot.forEach((doc) => {
          dbPrices[doc.id] = doc.data().ltp;
        });

        setStocks(prev => prev.map(s => {
          const storedPrice = dbPrices[s.Symbol];
          const price = typeof storedPrice === 'number' ? storedPrice : s.LTP;
          return {
            ...s,
            LTP: price,
            Open: price,
            High: price,
            Low: price
          };
        }));
      } catch (err) {
        console.error("Nexora Sync Error:", err);
      } finally {
        setIsSyncing(false);
      }
    };
    fetchMarketFromDB();
  }, [user]);

  // Simulation Engine (only runs when market is open)
  useEffect(() => {
    const simInterval = setInterval(() => {
      if (!isMarketOpen || !user) return; 

      setStocks(current => 
        current.map(stock => {
          const steps = [1.0, 0.1, 0.01];
          const step = steps[Math.floor(Math.random() * steps.length)];
          const direction = Math.random() > 0.49 ? 1 : -1;
          const delta = direction * step;
          const newLTP = Number(Math.max(0.01, stock.LTP + delta).toFixed(2));
          
          return {
            ...stock,
            LTP: newLTP,
            Change: stock.Open !== 0 ? ((newLTP - stock.Open) / stock.Open) * 100 : 0,
            High: Math.max(stock.High, newLTP),
            Low: Math.min(stock.Low, newLTP),
            Volume: stock.Volume + Math.floor(Math.random() * 5)
          };
        })
      );
    }, SIMULATION_INTERVAL);

    return () => clearInterval(simInterval);
  }, [isMarketOpen, user]);

  // Periodic Auto-Persist (every 30s) if market is open
  useEffect(() => {
    const persistInterval = setInterval(() => {
      if (isMarketOpen && user) {
        persistMarketState(stocks);
      }
    }, 30000);
    return () => clearInterval(persistInterval);
  }, [stocks, isMarketOpen, user, persistMarketState]);

  const handleTrade = async (type: 'BUY' | 'SELL', symbol: string, quantity: number, price: number) => {
    if (!user) return;
    if (!isMarketOpen) {
      alert("Nexora Market is currently closed. Execution halted.");
      return;
    }

    const userRef = doc(db, 'portfolios', user.uid);
    const totalCost = quantity * price;

    if (type === 'BUY' && portfolio.balance < totalCost) {
      alert("Insufficient Portfolio Balance.");
      return;
    }

    const existingHolding = portfolio.holdings.find(h => h.symbol === symbol);
    if (type === 'SELL' && (!existingHolding || existingHolding.quantity < quantity)) {
      alert("Insufficient Shares in Vault.");
      return;
    }

    let newHoldings = [...portfolio.holdings];
    if (type === 'BUY') {
      if (existingHolding) {
        const newQty = existingHolding.quantity + quantity;
        const newAvg = ((existingHolding.avgPrice * existingHolding.quantity) + (price * quantity)) / newQty;
        newHoldings = newHoldings.map(h => h.symbol === symbol ? { ...h, quantity: newQty, avgPrice: newAvg } : h);
      } else {
        newHoldings.push({ symbol, quantity, avgPrice: price });
      }
    } else {
      const newQty = existingHolding!.quantity - quantity;
      newHoldings = newQty === 0 ? newHoldings.filter(h => h.symbol !== symbol) : newHoldings.map(h => h.symbol === symbol ? { ...h, quantity: newQty } : h);
    }

    const transaction: Transaction = {
      id: Math.random().toString(36).substr(2, 9),
      symbol, type, quantity, price, timestamp: Date.now()
    };

    await updateDoc(userRef, {
      balance: increment(type === 'BUY' ? -totalCost : totalCost),
      holdings: newHoldings,
      history: [transaction, ...portfolio.history].slice(0, 100)
    });
  };

  const selectedStock = useMemo(() => stocks.find(s => s.Symbol === selectedSymbol), [stocks, selectedSymbol]);

  if (authLoading) {
    return (
      <div className="h-screen bg-[#080a0c] flex items-center justify-center">
        <Loader2 className="animate-spin text-[#2ebd85]" size={32} />
      </div>
    );
  }

  if (!user) return <Auth />;

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
          {/* Market Controller Toggle */}
          <div className="flex items-center gap-3 bg-[#080a0c] px-3 py-1 rounded-full border border-[#1c2127] group">
            <div className={`w-2 h-2 rounded-full ${isMarketOpen ? 'bg-[#2ebd85] animate-pulse' : 'bg-rose-500'}`}></div>
            <span className={`text-[9px] font-black uppercase tracking-widest ${isMarketOpen ? 'text-[#2ebd85]' : 'text-rose-500'}`}>
              {isMarketOpen ? 'Market Open' : 'Market Closed'}
            </span>
            <button 
              onClick={toggleMarket}
              className={`p-1.5 rounded-full transition-all ${isMarketOpen ? 'hover:bg-rose-500/20 text-slate-600' : 'bg-rose-500 text-white shadow-lg shadow-rose-500/20'}`}
              title={isMarketOpen ? "Close Market" : "Open Market"}
            >
              <Power size={12} />
            </button>
          </div>

          <div className="flex flex-col items-end">
            <div className="flex items-center gap-2">
               {isSyncing && <Loader2 size={10} className="animate-spin text-[#2ebd85]" />}
               <span className="text-[9px] text-slate-600 font-black uppercase tracking-widest">
                 {isSyncing ? 'Synchronizing State' : 'Engine Ready'}
               </span>
            </div>
            <div className="w-24 h-1 bg-slate-900 rounded-full mt-1 overflow-hidden border border-white/5">
               <div className="h-full bg-[#2ebd85] transition-all duration-500" style={{ width: isSyncing ? '40%' : '100%' }}></div>
            </div>
          </div>
          
          <div className="flex items-center gap-4 border-l border-[#1c2127] pl-6">
            <div className="flex flex-col items-end">
              <span className="text-[9px] text-slate-600 font-black uppercase opacity-60">Portfolio Power</span>
              <span className="text-sm font-black text-white tabular-nums">NPR {portfolio.balance.toLocaleString()}</span>
            </div>
            <button 
              onClick={() => signOut(auth)}
              className="p-2 hover:bg-rose-500/10 text-slate-600 hover:text-rose-500 rounded-lg transition-colors"
              title="Sign Out"
            >
              <LogOut size={18} />
            </button>
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
