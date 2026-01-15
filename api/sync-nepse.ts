
import { initializeApp } from "firebase/app";
import { getDatabase, ref, update } from "firebase/database";

const SYMBOLS = ["NABIL","NMB","NICA","GBIME","EBL","HBL","NIBL","PCBL","SBL","SCB","ADBL","CZBIL","MBL","KBL","LBL","SANIMA","PRVU","BOKL","MEGA","SRBL","MNBBL","JBBL","GBBL","SHINE","SADBL","CORBL","SAPDBL","MLBL","KSBBL","UDBL","GUFL","PFL","MFIL","CFCL","ICFC","BFCL","SFCL","NLIC","LICN","ALICL","PLIC","RLICL","SLICL","SNLI","ILI","ULI","NICL","SICL","NIL","PRIN","IGI","SALICO","SGIC","SPIL","HEI","RBCL","CHCL","BPCL","NHPC","SHPC","RADHI","SAHAS","UPCL","UNHPL","AKPL","API","NGPL","NYADI","DHPL","RHPL","HPPL","CIT","HIDCL","NIFRA","NRN","HATHY","ENL","UNL","HDL","SHIVM","BNT","BNL","SARBTM","GCIL","SONA","NLO","OMPL","STC","BBC","NTC","OHL","TRH","YHL","AHPC"];

// CRITICAL: Ensure FIREBASE_API_KEY is set in Vercel Environment Variables.
// For PERMISSION_DENIED errors, ensure the RTDB Rules allow writes from the IP or
// use a Firebase Admin SDK approach if the public API key is restricted by domain.
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  databaseURL: "https://nexoo-91eb6-default-rtdb.firebaseio.com/",
  projectId: "nexoo-91eb6",
};

const app = initializeApp(firebaseConfig);
const rtdb = getDatabase(app);
const BASE_URL = "https://nepsetty.kokomo.workers.dev/api/stock";
const BATCH_SIZE = 10; 

/**
 * Robust fetch for a single stock with individual error handling and retry
 */
async function fetchStock(symbol: string, retries = 2): Promise<{symbol: string, ltp: number | null}> {
  for (let i = 0; i <= retries; i++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const res = await fetch(`${BASE_URL}?symbol=${symbol}`, { 
        signal: controller.signal,
        headers: { 'Accept': 'application/json' }
      });
      
      clearTimeout(timeoutId);
      
      if (!res.ok) throw new Error(`Status ${res.status}`);
      
      const data = await res.json();
      const price = Number(data?.ltp);
      
      if (isNaN(price) || price <= 0) return { symbol, ltp: null };
      
      return { symbol, ltp: price };
    } catch (err) {
      if (i === retries) {
        console.error(`[SYNC ERROR] Final attempt failed for ${symbol}:`, err instanceof Error ? err.message : err);
        return { symbol, ltp: null };
      }
      await new Promise(r => setTimeout(r, 500));
    }
  }
  return { symbol, ltp: null };
}

/**
 * Main Handler for Vercel Cron
 */
export default async function handler(req: any, res: any) {
  const startTime = Date.now();
  
  // Basic security: Only allow GET (Vercel Crons use GET)
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  console.log(`[${new Date().toISOString()}] Starting Batch Sync (Vercel Engine)...`);
  
  try {
    const finalSnapshot: Record<string, any> = {};
    let successCount = 0;

    for (let i = 0; i < SYMBOLS.length; i += BATCH_SIZE) {
      const batch = SYMBOLS.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(batch.map(s => fetchStock(s)));
      
      batchResults.forEach(r => {
        if (r.ltp !== null) {
          finalSnapshot[r.symbol] = { 
            ltp: r.ltp, 
            updatedAt: Date.now(),
            source: 'Vercel_Cron_Worker'
          };
          successCount++;
        }
      });

      if (i + BATCH_SIZE < SYMBOLS.length) {
        await new Promise(r => setTimeout(r, 400));
      }
      
      console.log(`[SYNC] Progress: ${Math.min(i + BATCH_SIZE, SYMBOLS.length)}/${SYMBOLS.length}`);
    }

    // Solve PERMISSION_DENIED: Ensure the database update is handled correctly
    // If using the Client SDK in a Node environment, ensure the 'auth' state is handled
    // or the database rules allow this operation.
    if (successCount > 0) {
      await update(ref(rtdb, 'market/snapshot/stocks'), finalSnapshot);
      console.log(`[SYNC SUCCESS] Broadcasted ${successCount} symbols to RTDB.`);
    }

    const duration = (Date.now() - startTime) / 1000;
    
    return res.status(200).json({ 
      success: true, 
      count: successCount, 
      total: SYMBOLS.length,
      duration: `${duration}s`
    });
  } catch (err: any) {
    console.error("[CRITICAL FAILURE] PERMISSION_DENIED or CONNECTION_ERROR:", err);
    return res.status(500).json({ 
      success: false, 
      error: "Database Sync Failed. Check Environment Variables and RTDB Rules.",
      details: err.message
    });
  }
}
