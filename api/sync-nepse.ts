
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
const BATCH_SIZE = 10; // Reduced batch size for stability

/**
 * Robust fetch for a single stock with individual error handling
 */
async function fetchStock(symbol: string): Promise<{symbol: string, ltp: number | null}> {
  try {
    // Adding a timeout to the individual fetch to prevent hanging the whole function
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    
    const res = await fetch(`${BASE_URL}?symbol=${symbol}`, { 
      signal: controller.signal,
      headers: { 'Accept': 'application/json' }
    });
    
    clearTimeout(timeoutId);
    
    if (!res.ok) throw new Error(`Status ${res.status}`);
    
    const data = await res.json();
    const price = Number(data?.ltp);
    
    if (isNaN(price) || price <= 0) {
      console.warn(`[SYNC] Invalid price for ${symbol}:`, data?.ltp);
      return { symbol, ltp: null };
    }
    
    return { symbol, ltp: price };
  } catch (err) {
    console.error(`[SYNC ERROR] ${symbol}:`, err instanceof Error ? err.message : err);
    return { symbol, ltp: null };
  }
}

/**
 * Main Handler for Vercel Cron
 */
export default async function handler(req: any, res: any) {
  const startTime = Date.now();
  console.log(`[${new Date().toISOString()}] Starting Batch Sync...`);
  
  try {
    const finalSnapshot: Record<string, any> = {};
    let successCount = 0;

    // Process symbols in sequential batches of BATCH_SIZE
    for (let i = 0; i < SYMBOLS.length; i += BATCH_SIZE) {
      const batch = SYMBOLS.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(batch.map(s => fetchStock(s)));
      
      batchResults.forEach(r => {
        if (r.ltp !== null) {
          finalSnapshot[r.symbol] = { 
            ltp: r.ltp, 
            updatedAt: Date.now(),
            source: 'Vercel_Cron'
          };
          successCount++;
        }
      });

      // Small throttle to avoid hitting worker rate limits or Vercel network limits
      if (i + BATCH_SIZE < SYMBOLS.length) {
        await new Promise(r => setTimeout(r, 300));
      }
      
      console.log(`[SYNC] Completed batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(SYMBOLS.length/BATCH_SIZE)}`);
    }

    // Single atomic update to Firebase Realtime Database
    if (successCount > 0) {
      await update(ref(rtdb, 'market/snapshot/stocks'), finalSnapshot);
    }

    const duration = (Date.now() - startTime) / 1000;
    console.log(`[SYNC DONE] ${successCount}/${SYMBOLS.length} symbols updated in ${duration}s`);

    return res.status(200).json({ 
      success: true, 
      count: successCount, 
      total: SYMBOLS.length,
      durationSeconds: duration 
    });
  } catch (err: any) {
    console.error("[CRITICAL] Sync Function Crashed:", err);
    // Returning 500 with a clean JSON body for Vercel logs
    return res.status(500).json({ 
      success: false, 
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
}
