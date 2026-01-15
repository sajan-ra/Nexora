
import { initializeApp } from "firebase/app";
import { getDatabase, ref, update } from "firebase/database";

const SYMBOLS = ["NABIL","NMB","NICA","GBIME","EBL","HBL","NIBL","PCBL","SBL","SCB","ADBL","CZBIL","MBL","KBL","LBL","SANIMA","PRVU","BOKL","MEGA","SRBL","MNBBL","JBBL","GBBL","SHINE","SADBL","CORBL","SAPDBL","MLBL","KSBBL","UDBL","GUFL","PFL","MFIL","CFCL","ICFC","BFCL","SFCL","NLIC","LICN","ALICL","PLIC","RLICL","SLICL","SNLI","ILI","ULI","NICL","SICL","NIL","PRIN","IGI","SALICO","SGIC","SPIL","HEI","RBCL","CHCL","BPCL","NHPC","SHPC","RADHI","SAHAS","UPCL","UNHPL","AKPL","API","NGPL","NYADI","DHPL","RHPL","HPPL","CIT","HIDCL","NIFRA","NRN","HATHY","ENL","UNL","HDL","SHIVM","BNT","BNL","SARBTM","GCIL","SONA","NLO","OMPL","STC","BBC","NTC","OHL","TRH","YHL","AHPC"];

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  databaseURL: "https://nexoo-91eb6-default-rtdb.firebaseio.com/",
  projectId: "nexoo-91eb6",
};

const app = initializeApp(firebaseConfig);
const rtdb = getDatabase(app);
const BASE_URL = "https://nepsetty.kokomo.workers.dev/api/stock";
const BATCH_SIZE = 10;

async function fetchStockWithRetry(symbol: string, attempts = 2): Promise<{symbol: string, ltp: number}> {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(`${BASE_URL}?symbol=${symbol}`, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const price = Number(data?.ltp);
      if (!isNaN(price) && price > 0) return { symbol, ltp: price };
    } catch (err) {
      console.warn(`Attempt ${i+1} failed for ${symbol}:`, err);
      if (i < attempts - 1) await new Promise(r => setTimeout(r, 300));
    }
  }
  return { symbol, ltp: 0 };
}

export default async function handler(req: any, res: any) {
  console.log(`[${new Date().toISOString()}] Starting NEPSE Daily Sync...`);
  const startTime = Date.now();
  
  try {
    const finalResults: Record<string, any> = {};
    
    // Batch processing to prevent Vercel execution timeouts and network congestion
    for (let i = 0; i < SYMBOLS.length; i += BATCH_SIZE) {
      const batch = SYMBOLS.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(batch.map(s => fetchStockWithRetry(s)));
      
      batchResults.forEach(r => {
        if (r.ltp > 0) {
          finalResults[r.symbol] = { 
            ltp: r.ltp, 
            updatedAt: Date.now(),
            source: 'Vercel_Cron'
          };
        }
      });
      
      // Throttle slightly to respect target worker limits
      await new Promise(r => setTimeout(r, 200));
      console.log(`Synced batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(SYMBOLS.length/BATCH_SIZE)}`);
    }

    // Single write to RTDB for the entire snapshot
    await update(ref(rtdb, 'market/snapshot/stocks'), finalResults);

    const duration = (Date.now() - startTime) / 1000;
    console.log(`Sync Complete in ${duration}s. Success count: ${Object.keys(finalResults).length}`);

    return res.status(200).json({ 
      success: true, 
      count: Object.keys(finalResults).length, 
      durationSeconds: duration 
    });
  } catch (err: any) {
    console.error("Critical Sync Failure:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
