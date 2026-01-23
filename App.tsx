
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Stock, Portfolio, Holding, Transaction, AppTab } from './types';
import Sidebar from './components/Sidebar';
import MainTerminal from './components/MainTerminal';
import OrderPanel from './components/OrderPanel';
import PortfolioView from './components/PortfolioView';
import DashboardStats from './components/DashboardStats';
import AIInsights from './components/AIInsights';
import Auth from './components/Auth';
import { auth, db, rtdb } from './services/firebase';
import { fetchLiveLtp } from './services/api';
import { onAuthStateChanged, signOut, User, updateProfile } from 'firebase/auth';
import { doc, onSnapshot, updateDoc, increment } from 'firebase/firestore';
import { ref, onValue, update as rtdbUpdate } from 'firebase/database';
import { TrendingUp, LayoutDashboard, Briefcase, Cpu, Loader2, LogOut, Clock, RefreshCw, Lock, Unlock, ShieldCheck, CheckCircle2 } from 'lucide-react';

const ADMIN_UID = "wL3xCPtylQc5pxcuaFOWNdW62UW2";

const SYMBOLS = {
  "Banks": ["NABIL","NMB","NICA","GBIME","EBL","HBL","NIBL","PCBL","SBL","SCB","ADBL","CZBIL","MBL","KBL","LBL","SANIMA","PRVU","BOKL","MEGA","SRBL"],
  "Development & Finance": ["MNBBL","JBBL","GBBL","SHINE","SADBL","CORBL","SAPDBL","MLBL","KSBBL","UDBL","GUFL","PFL","MFIL","CFCL","ICFC","BFCL","SFCL"],
  "Insurance": ["NLIC","LICN","ALICL","PLIC","RLICL","SLICL","SNLI","ILI","ULI","NICL","SICL","NIL","PRIN","IGI","SALICO","SGIC","SPIL","HEI","RBCL"],
  "Hydropower": ["CHCL","BPCL","NHPC","SHPC","RADHI","SAHAS","UPCL","UNHPL","AKPL","API","NGPL","NYADI","DHPL","RHPL","HPPL","AHPC"],
  "Manufacturing & Others": ["CIT","HIDCL","NIFRA","NRN","HATHY","ENL","UNL","HDL","SHIVM","BNT","BNL","SARBTM","GCIL","SONA","NLO","OMPL","STC","BBC","NTC","OHL","TRH","YHL"]
};

const ALL_FLAT_SYMBOLS = Array.from(new Set(Object.values(SYMBOLS).flat()));
const INITIAL_BALANCE = 50000;
const SIMULATION_INTERVAL = 2000; 
const RTDB_SYNC_INTERVAL = 15000; 

const BASE_PRICES: Record<string, number> = {
  "NABIL": 498.6, "NMB": 235.1, "NICA": 321, "GBIME": 228, "EBL": 647.29, "HBL": 187.9, "NIBL": 150, "PCBL": 257, "SBL": 374.9, "SCB": 624.79, "ADBL": 288, "CZBIL": 191.5, "MBL": 220, "KBL": 178.4, "LBL": 173, "SANIMA": 319, "PRVU": 182, "BOKL": 207.3, "MEGA": 219, "SRBL": 173.1, "MNBBL": 342.6, "JBBL": 318, "GBBL": 374, "SHINE": 391, "SADBL": 381, "CORBL": 1450, "SAPDBL": 793.1, "MLBL": 354.5, "KSBBL": 429.5, "GUFL": 486, "PFL": 358, "MFIL": 709, "CFCL": 462.1, "ICFC": 620, "BFCL": 165, "SFCL": 375, "NLIC": 750.5, "LICN": 876, "ALICL": 457, "PLIC": 340, "SLICL": 387, "SNLI": 504, "ILI": 442, "ULI": 393.8, "NICL": 504.9, "SICL": 635, "NIL": 602.5, "PRIN": 657, "IGI": 414, "SALICO": 600.3, "SGIC": 472, "SPIL": 740, "HEI": 500, "RBCL": 14940, "CHCL": 498, "BPCL": 714, "NHPC": 190.8, "SHPC": 515, "RADHI": 730, "SAHAS": 543, "UPCL": 359, "UNHPL": 481.5, "AKPL": 244, "API": 289, "NGPL": 387.5, "NYADI": 370, "DHPL": 288, "RHPL": 268.8, "HPPL": 472, "CIT": 1809.5, "HIDCL": 254.5, "NIFRA": 261.2, "NRN": 1345.2, "HATHY": 886.9, "ENL": 890, "UNL": 47200, "HDL": 1132.2, "SHIVM": 575, "BNT": 11952, "BNL": 15904.9, "SARBTM": 865, "GCIL": 405.3, "SONA": 414.8, "NLO": 254.1, "OMPL": 1239, "STC": 5405, "BBC": 4864, "NTC": 895.4, "OHL": 691.1, "TRH": 708, "YHL": 600, "AHPC": 272.3
};

interface SimulationState {
    intent: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    patternBuilding: 'NONE' | 'HAMMER' | 'ENGULFING' | 'STARS' | 'THREE_SOLDIERS' | 'TWEEZER' | 'RISING_THREE';
    stepsRemaining: number;
}

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isMarketOpen, setIsMarketOpen] = useState(false);
  const [isApiSyncing, setIsApiSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string>('');
  
  const [stocks, setStocks] = useState<Stock[]>(() => {
    return ALL_FLAT_SYMBOLS.map(symbol => {
      const price = BASE_PRICES[symbol] || 100.0;
      return { Symbol: symbol, LTP: price, Change: 0, Open: price, High: price, Low: price, Volume: 1000, Amount: 0 };
    });
  });

  const simStatesRef = useRef<Record<string, SimulationState>>({});
  const lastRtdbSyncRef = useRef<number>(0);
  const isAdmin = useMemo(() => user?.uid === ADMIN_UID, [user]);
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.MARKET);
  const [selectedSymbol, setSelectedSymbol] = useState<string>('NABIL');
  const [portfolio, setPortfolio] = useState<Portfolio>({ balance: INITIAL_BALANCE, holdings: [], history: [] });

  const toggleMarketStatus = useCallback(async () => {
    if (!isAdmin) return;
    const newStatus = !isMarketOpen;
    await rtdbUpdate(ref(rtdb, 'settings/market'), { isOpen: newStatus });
  }, [isAdmin, isMarketOpen]);

  const syncMarketData = useCallback(async () => {
    if (!user || isApiSyncing) return;
    setIsApiSyncing(true);
    setSyncStatus('Syncing...');
    const BATCH_SIZE = 5;
    const total = ALL_FLAT_SYMBOLS.length;
    let successCount = 0;
    
    for (let i = 0; i < total; i += BATCH_SIZE) {
        const batch = ALL_FLAT_SYMBOLS.slice(i, i + BATCH_SIZE);
        const results = await Promise.all(batch.map(sym => fetchLiveLtp(sym)));
        const updates: Record<string, any> = {};

        setStocks(current => current.map((s, idx) => {
            const symIdx = batch.indexOf(s.Symbol);
            if (symIdx !== -1 && results[symIdx] !== null) {
                successCount++;
                const ltp = results[symIdx]!;
                updates[s.Symbol] = { ltp, updatedAt: Date.now() };
                return { ...s, LTP: ltp };
            }
            return s;
        }));

        if (Object.keys(updates).length > 0) {
            await rtdbUpdate(ref(rtdb, 'market/snapshot/stocks'), updates);
        }
        await new Promise(r => setTimeout(r, 800));
    }
    setSyncStatus(`Done: ${successCount}`);
    setTimeout(() => setSyncStatus(''), 5000);
    setIsApiSyncing(false);
  }, [user, isApiSyncing]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    return onValue(ref(rtdb, 'settings/market'), (snapshot) => {
      if (snapshot.exists()) setIsMarketOpen(snapshot.val().isOpen);
    });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    return onValue(ref(rtdb, 'market/snapshot/stocks'), (snapshot) => {
      if (!snapshot.exists()) return;
      const data = snapshot.val();
      setStocks(prev => prev.map(s => {
        const remote = data[s.Symbol];
        return remote ? { ...s, LTP: remote.ltp } : s;
      }));
    });
  }, [user]);

  // PATTERN-DRIVEN SIMULATION ENGINE with 5% Pattern Probability
  useEffect(() => {
    if (!isAdmin || !isMarketOpen || !user) return;

    const interval = setInterval(() => {
        const now = Date.now();
        setStocks(current => {
            const next = current.map(stock => {
                let state = simStatesRef.current[stock.Symbol];
                
                // Initialize state if missing or expired
                if (!state || state.stepsRemaining <= 0) {
                    const rand = Math.random();
                    // 5% chance to start a defined bullish pattern
                    if (rand < 0.05) {
                        const patternChoices: SimulationState['patternBuilding'][] = [
                            'HAMMER', 'ENGULFING', 'THREE_SOLDIERS', 'TWEEZER', 'RISING_THREE'
                        ];
                        const picked = patternChoices[Math.floor(Math.random() * patternChoices.length)];
                        state = { intent: 'BULLISH', patternBuilding: picked, stepsRemaining: picked === 'RISING_THREE' ? 25 : 15 };
                    } else if (rand < 0.2) {
                        state = { intent: 'BEARISH', patternBuilding: 'NONE', stepsRemaining: 10 };
                    } else {
                        state = { intent: 'NEUTRAL', patternBuilding: 'NONE', stepsRemaining: 20 };
                    }
                    simStatesRef.current[stock.Symbol] = state;
                }

                let drift = 0;
                
                // Force market logic based on pattern intent
                if (state.patternBuilding !== 'NONE') {
                    // Start of pattern (usually involves a dip or indecision)
                    if (state.stepsRemaining > 10) {
                        drift = state.patternBuilding === 'RISING_THREE' ? (Math.random() - 0.5) * 0.001 : -0.003;
                    } 
                    // Confirmation Move (Price works according to the candle stick)
                    else {
                        drift = 0.005; // Force Bullish confirmation after pattern detection window
                    }
                } else if (state.intent === 'BULLISH') {
                    drift = 0.0008;
                } else if (state.intent === 'BEARISH') {
                    drift = -0.0008;
                } else {
                    drift = (Math.random() - 0.5) * 0.0004;
                }

                const newLTP = Number((stock.LTP * (1 + drift)).toFixed(2));
                state.stepsRemaining--;

                return {
                    ...stock,
                    LTP: newLTP,
                    Change: stock.Open !== 0 ? ((newLTP - stock.Open) / stock.Open) * 100 : 0,
                    High: Math.max(stock.High, newLTP),
                    Low: Math.min(stock.Low, newLTP)
                };
            });

            // Broadcast to RTDB every 15s
            if (now - lastRtdbSyncRef.current >= RTDB_SYNC_INTERVAL) {
                const batch: Record<string, any> = {};
                next.forEach(s => batch[s.Symbol] = { ltp: s.LTP, updatedAt: now });
                rtdbUpdate(ref(rtdb, 'market/snapshot/stocks'), batch);
                lastRtdbSyncRef.current = now;
            }

            return next;
        });
    }, SIMULATION_INTERVAL);

    return () => clearInterval(interval);
  }, [isAdmin, isMarketOpen, user]);

  const handleTrade = async (type: 'BUY' | 'SELL', symbol: string, quantity: number, price: number) => {
    if (!user || !isMarketOpen) return;
    const userRef = doc(db, 'portfolios', user.uid);
    const totalCost = quantity * price;
    const existingHolding = portfolio.holdings.find(h => h.symbol === symbol);

    if (type === 'BUY' && portfolio.balance < totalCost) return;
    if (type === 'SELL' && (!existingHolding || existingHolding.quantity < quantity)) return;

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

  useEffect(() => {
    if (!user) return;
    return onSnapshot(doc(db, 'portfolios', user.uid), (snap) => {
      if (snap.exists()) setPortfolio(snap.data() as Portfolio);
    });
  }, [user]);

  const selectedStock = useMemo(() => stocks.find(s => s.Symbol === selectedSymbol), [stocks, selectedSymbol]);

  if (authLoading) return <div className="h-screen bg-[#080a0c] flex items-center justify-center"><Loader2 className="animate-spin text-[#2ebd85]" size={32} /></div>;
  if (!user) return <Auth />;

  return (
    <div className="flex flex-col h-screen bg-[#080a0c] text-slate-200 overflow-hidden font-sans">
      <header className="h-14 border-b border-[#1c2127] flex items-center justify-between px-6 bg-[#111418] z-50">
        <div className="flex items-center gap-10">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setActiveTab(AppTab.MARKET)}>
            <div className="bg-[#2ebd85] p-1.5 rounded-lg">
              <TrendingUp size={18} className="text-white" />
            </div>
            <span className="font-black text-base uppercase">Nexora <span className="text-[#2ebd85]">Pro</span></span>
          </div>
          <nav className="flex gap-1 bg-[#080a0c] p-1 rounded-lg border border-[#1c2127]">
            {[{ id: AppTab.MARKET, icon: LayoutDashboard, label: 'Terminal' }, { id: AppTab.PORTFOLIO, icon: Briefcase, label: 'Portfolio' }, { id: AppTab.AI_INSIGHTS, icon: Cpu, label: 'Analysis' }].map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)} className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-[11px] font-black uppercase ${activeTab === t.id ? 'bg-[#1c2127] text-[#2ebd85]' : 'text-slate-500'}`}><t.icon size={14} />{t.label}</button>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-6">
          {isAdmin && (
             <div className="flex items-center gap-2 mr-2 bg-slate-900/50 p-1 rounded-lg border border-slate-800">
               <span className="text-[9px] font-black uppercase text-slate-500 px-2 flex items-center gap-1"><ShieldCheck size={10} /> Admin</span>
               <button onClick={toggleMarketStatus} className={`px-3 py-1.5 rounded-md text-[9px] font-black uppercase ${isMarketOpen ? 'bg-rose-500/20 text-rose-500' : 'bg-emerald-500/20 text-emerald-500'}`}>
                 {isMarketOpen ? <Unlock size={12} /> : <Lock size={12} />} {isMarketOpen ? 'Close' : 'Open'}
               </button>
               <button onClick={syncMarketData} disabled={isApiSyncing} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-500/10 text-blue-400 disabled:opacity-50">
                 {isApiSyncing ? <Loader2 size={12} className="animate-spin" /> : syncStatus.includes('Done') ? <CheckCircle2 size={12} /> : <RefreshCw size={12} />}
                 <span className="text-[9px] font-black uppercase">{syncStatus || 'Sync'}</span>
               </button>
             </div>
          )}
          <div className={`flex items-center gap-3 bg-[#080a0c] px-3 py-1 rounded-full border ${isMarketOpen ? 'border-[#2ebd85]/30' : 'border-rose-500/30'}`}>
            <Clock size={12} className={isMarketOpen ? 'text-[#2ebd85]' : 'text-rose-500'} />
            <span className={`text-[9px] font-black uppercase ${isMarketOpen ? 'text-[#2ebd85]' : 'text-rose-500'}`}>{isMarketOpen ? 'Market Open' : 'Market Closed'}</span>
          </div>
          <button onClick={() => signOut(auth)} className="p-2 text-slate-600 hover:text-rose-500"><LogOut size={18} /></button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {activeTab === AppTab.MARKET && (
          <>
            <Sidebar stocks={stocks} selectedSymbol={selectedSymbol} onSelect={setSelectedSymbol} loading={isApiSyncing} />
            <MainTerminal stock={selectedStock} holdings={portfolio.holdings} stocks={stocks} isMarketOpen={isMarketOpen} />
            <OrderPanel stock={selectedStock} balance={portfolio.balance} history={portfolio.history} onTrade={handleTrade} holdings={portfolio.holdings} isMarketOpen={isMarketOpen} />
          </>
        )}
        {activeTab === AppTab.PORTFOLIO && (
          <div className="flex-1 overflow-y-auto p-8"><PortfolioView portfolio={portfolio} stocks={stocks} user={user} onTrade={handleTrade} onUpdateName={async (n) => { if(user) await updateProfile(user, {displayName: n}); }} /></div>
        )}
        {activeTab === AppTab.AI_INSIGHTS && <div className="flex-1 overflow-y-auto p-8"><AIInsights stocks={stocks} /></div>}
      </div>
    </div>
  );
};

export default App;
