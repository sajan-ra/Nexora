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
import { onAuthStateChanged, signOut, User, updateProfile } from 'firebase/auth';
import { doc, setDoc, onSnapshot, updateDoc, increment, collection, getDocs, writeBatch } from 'firebase/firestore';
import { TrendingUp, LayoutDashboard, Briefcase, Cpu, Loader2, LogOut, Power, ShieldCheck, RefreshCw } from 'lucide-react';

const ADMIN_UID = "mgDRF6WPYLR8G2AkbSlT6ndsbyI3";

const SYMBOLS = {
  "Banks": ["NABIL","NMB","NICA","GBIME","EBL","HBL","NIBL","PCBL","SBL","SCB","ADBL","CZBIL","MBL","KBL","LBL","SANIMA","PRVU","BOKL","MEGA","SRBL"],
  "Development & Finance": ["MNBBL","JBBL","GBBL","SHINE","SADBL","CORBL","SAPDBL","MLBL","KSBBL","UDBL","GUFL","PFL","MFIL","CFCL","ICFC","BFCL","SFCL"],
  "Insurance": ["NLIC","LICN","ALICL","PLIC","RLICL","SLICL","SNLI","ILI","ULI","NICL","SICL","NIL","PRIN","IGI","SALICO","SGIC","SPIL","HEI","RBCL"],
  "Hydropower": ["CHCL","BPCL","NHPC","SHPC","RADHI","SAHAS","UPCL","UNHPL","AKPL","API","NGPL","NYADI","DHPL","RHPL","HPPL","AHPC"],
  "Manufacturing & Others": ["CIT","HIDCL","NIFRA","NRN","HATHY","ENL","UNL","HDL","SHIVM","BNT","BNL","SARBTM","GCIL","SONA","NLO","OMPL","STC","BBC","NTC","OHL","TRH","YHL"]
};

const ALL_FLAT_SYMBOLS = Array.from(new Set(Object.values(SYMBOLS).flat()));
const INITIAL_BALANCE = 50000;
const SIMULATION_INTERVAL = 5000; 

const BASE_PRICES: Record<string, number> = {
  "NABIL": 498.6, "NMB": 235.1, "NICA": 321, "GBIME": 228, "EBL": 647.29, "HBL": 187.9, "NIBL": 0, "PCBL": 257, "SBL": 374.9, "SCB": 624.79, "ADBL": 288, "CZBIL": 191.5, "MBL": 220, "KBL": 178.4, "LBL": 173, "SANIMA": 319, "PRVU": 182, "BOKL": 207.3, "MEGA": 219, "SRBL": 173.1, "MNBBL": 342.6, "JBBL": 318, "GBBL": 374, "SHINE": 391, "SADBL": 381, "CORBL": 1450, "SAPDBL": 793.1, "MLBL": 354.5, "KSBBL": 429.5, "GUFL": 486, "PFL": 358, "MFIL": 709, "CFCL": 462.1, "ICFC": 620, "BFCL": 165, "SFCL": 375, "NLIC": 750.5, "LICN": 876, "ALICL": 457, "PLIC": 340, "SLICL": 387, "SNLI": 504, "ILI": 442, "ULI": 393.8, "NICL": 504.9, "SICL": 635, "NIL": 602.5, "PRIN": 657, "IGI": 414, "SALICO": 600.3, "SGIC": 472, "SPIL": 740, "HEI": 500, "RBCL": 14940, "CHCL": 498, "BPCL": 714, "NHPC": 190.8, "SHPC": 515, "RADHI": 730, "SAHAS": 543, "UPCL": 359, "UNHPL": 481.5, "AKPL": 244, "API": 289, "NGPL": 387.5, "NYADI": 370, "DHPL": 288, "RHPL": 268.8, "HPPL": 472, "CIT": 1809.5, "HIDCL": 254.5, "NIFRA": 261.2, "NRN": 1345.2, "HATHY": 886.9, "ENL": 890, "UNL": 47200, "HDL": 1132.2, "SHIVM": 575, "BNT": 11952, "BNL": 15904.9, "SARBTM": 865, "GCIL": 405.3, "SONA": 414.8, "NLO": 254.1, "OMPL": 1239, "STC": 5405, "BBC": 4864, "NTC": 895.4, "OHL": 691.1, "TRH": 708, "YHL": 600, "AHPC": 272.3
};

interface ExtendedStock extends Stock {
  isLive?: boolean;
}

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isMarketOpen, setIsMarketOpen] = useState(false);
  
  const [stocks, setStocks] = useState<ExtendedStock[]>(() => {
    return ALL_FLAT_SYMBOLS.map(symbol => {
      const price = BASE_PRICES[symbol] || 100.0;
      return { Symbol: symbol, LTP: price, Change: 0, Open: price, High: price, Low: price, Volume: 1000, Amount: 0, isLive: true };
    });
  });
  
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.MARKET);
  const [selectedSymbol, setSelectedSymbol] = useState<string>('NABIL');
  const [isSyncing, setIsSyncing] = useState(false);
  const [portfolio, setPortfolio] = useState<Portfolio>({ balance: INITIAL_BALANCE, holdings: [], history: [] });

  const isAdmin = useMemo(() => user?.uid === ADMIN_UID, [user]);

  // Handle Authentication State Change
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Handle Name Update
  const handleUpdateName = async (newName: string) => {
    if (user) {
      await updateProfile(user, { displayName: newName });
      // Trigger a local state refresh to reflect the new display name
      setUser({ ...user, displayName: newName } as User);
    }
  };

  // 1. GLOBAL MARKET STATE (Sync for everyone)
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, 'settings', 'market'), (snap) => {
      if (snap.exists()) {
        setIsMarketOpen(snap.data().isOpen);
      } else if (isAdmin) {
        setDoc(doc(db, 'settings', 'market'), { isOpen: false });
      }
    });
    return () => unsub();
  }, [user, isAdmin]);

  // 2. LIVE PRICE LISTENER (Everyone listens to Firestore broadcast)
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(collection(db, 'market'), (snap) => {
      const updates: Record<string, any> = {};
      snap.forEach(doc => {
        updates[doc.id] = doc.data();
      });

      setStocks(current => current.map(s => {
        const up = updates[s.Symbol];
        if (!up) return s;
        return {
          ...s,
          LTP: up.ltp,
          Change: up.change || s.Change,
          High: up.high || s.High,
          Low: up.low || s.Low,
          Volume: up.volume || s.Volume
        };
      }));
    });
    return () => unsub();
  }, [user]);

  // 3. ADMIN SIMULATION ENGINE (Exclusive to Overseer)
  useEffect(() => {
    if (!isAdmin || !isMarketOpen || !user) return;

    const simInterval = setInterval(async () => {
      const batch = writeBatch(db);
      
      const updatedStocks = stocks.map(stock => {
        const steps = [1.0, 0.1, 0.01];
        const step = steps[Math.floor(Math.random() * steps.length)];
        const direction = Math.random() > 0.49 ? 1 : -1;
        const delta = direction * step;
        const newLTP = Number(Math.max(0.01, stock.LTP + delta).toFixed(2));
        
        const newStock = {
          ...stock,
          LTP: newLTP,
          Change: stock.Open !== 0 ? ((newLTP - stock.Open) / stock.Open) * 100 : 0,
          High: Math.max(stock.High, newLTP),
          Low: Math.min(stock.Low, newLTP),
          Volume: stock.Volume + Math.floor(Math.random() * 2)
        };

        // Only push updates for a random subset to save Firebase quota
        if (Math.random() > 0.7) {
          batch.set(doc(db, 'market', stock.Symbol), {
            ltp: newStock.LTP,
            change: newStock.Change,
            high: newStock.High,
            low: newStock.Low,
            volume: newStock.Volume,
            updatedAt: Date.now()
          }, { merge: true });
        }

        return newStock;
      });

      try {
        await batch.commit();
        setStocks(updatedStocks);
      } catch (e) {
        console.error("Admin Broadcast Failed:", e);
      }
    }, SIMULATION_INTERVAL);

    return () => clearInterval(simInterval);
  }, [isAdmin, isMarketOpen, user, stocks]);

  // 4. ADMIN COMMANDS
  const toggleMarket = async () => {
    if (!isAdmin) return;
    setIsSyncing(true);
    try {
      await updateDoc(doc(db, 'settings', 'market'), { isOpen: !isMarketOpen });
    } finally {
      setIsSyncing(false);
    }
  };

  const resetMarket = async () => {
    if (!isAdmin || !window.confirm("RESET ALL MARKET DATA? This will restore original LTP values globally.")) return;
    setIsSyncing(true);
    try {
      const batch = writeBatch(db);
      ALL_FLAT_SYMBOLS.forEach(symbol => {
        const price = BASE_PRICES[symbol] || 100.0;
        batch.set(doc(db, 'market', symbol), {
          ltp: price,
          change: 0,
          high: price,
          low: price,
          volume: 1000,
          updatedAt: Date.now()
        });
      });
      await batch.commit();
      alert("Nexora Core Reset Complete.");
    } finally {
      setIsSyncing(false);
    }
  };

  // 5. PORTFOLIO LOGIC
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, 'portfolios', user.uid), (snap) => {
      if (snap.exists()) {
        setPortfolio(snap.data() as Portfolio);
      } else {
        setDoc(doc(db, 'portfolios', user.uid), { balance: INITIAL_BALANCE, holdings: [], history: [] });
      }
    });
    return () => unsub();
  }, [user]);

  const handleTrade = async (type: 'BUY' | 'SELL', symbol: string, quantity: number, price: number) => {
    if (!user) return;
    if (!isMarketOpen) {
      alert("ACCESS DENIED: Market is currently halted.");
      return;
    }

    const userRef = doc(db, 'portfolios', user.uid);
    const totalCost = quantity * price;

    if (type === 'BUY' && portfolio.balance < totalCost) {
      alert("Insufficient Capital.");
      return;
    }

    const existingHolding = portfolio.holdings.find(h => h.symbol === symbol);
    if (type === 'SELL' && (!existingHolding || existingHolding.quantity < quantity)) {
      alert("Insufficient Inventory.");
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

    await updateDoc(userRef, {
      balance: increment(type === 'BUY' ? -totalCost : totalCost),
      holdings: newHoldings,
      history: [{ id: Math.random().toString(36).substr(2, 9), symbol, type, quantity, price, timestamp: Date.now() }, ...portfolio.history].slice(0, 50)
    });
  };

  const selectedStock = useMemo(() => stocks.find(s => s.Symbol === selectedSymbol), [stocks, selectedSymbol]);

  if (authLoading) return <div className="h-screen bg-[#080a0c] flex items-center justify-center"><Loader2 className="animate-spin text-[#2ebd85]" size={32} /></div>;
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
          {/* OVERSEER CONTROLS */}
          <div className={`flex items-center gap-3 bg-[#080a0c] px-3 py-1 rounded-full border border-[#1c2127] ${isAdmin ? 'ring-1 ring-[#2ebd85]/40 shadow-lg shadow-[#2ebd85]/5' : ''}`}>
            {isAdmin && <ShieldCheck size={14} className="text-[#2ebd85]" />}
            <div className={`w-2 h-2 rounded-full ${isMarketOpen ? 'bg-[#2ebd85] animate-pulse' : 'bg-rose-500'}`}></div>
            <span className={`text-[9px] font-black uppercase tracking-widest ${isMarketOpen ? 'text-[#2ebd85]' : 'text-rose-500'}`}>
              {isMarketOpen ? 'Broadcasting Live' : 'Trading Halted'}
            </span>
            {isAdmin && (
              <div className="flex items-center border-l border-[#1c2127] ml-2 pl-2 gap-2">
                <button 
                  onClick={toggleMarket}
                  disabled={isSyncing}
                  className={`p-1.5 rounded-full transition-all ${isMarketOpen ? 'text-slate-600 hover:text-rose-500 hover:bg-rose-500/10' : 'bg-rose-600 text-white'}`}
                  title={isMarketOpen ? "Halt Global Market" : "Open Global Market"}
                >
                  {isSyncing ? <Loader2 size={12} className="animate-spin" /> : <Power size={12} />}
                </button>
                <button 
                  onClick={resetMarket}
                  disabled={isSyncing}
                  className="p-1.5 text-slate-600 hover:text-[#2ebd85] hover:bg-[#2ebd85]/10 rounded-full transition-all"
                  title="Reset Global Prices"
                >
                  <RefreshCw size={12} />
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-col items-end">
            <span className="text-[9px] text-slate-600 font-black uppercase opacity-60">Trading Power</span>
            <span className="text-sm font-black text-white tabular-nums">NPR {portfolio.balance.toLocaleString()}</span>
          </div>

          <button onClick={() => signOut(auth)} className="p-2 hover:bg-rose-500/10 text-slate-600 hover:text-rose-500 rounded-lg transition-colors">
            <LogOut size={18} />
          </button>
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
              <PortfolioView portfolio={portfolio} stocks={stocks} onTrade={handleTrade} user={user} onUpdateName={handleUpdateName} />
              <DashboardStats portfolio={portfolio} stocks={stocks} />
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