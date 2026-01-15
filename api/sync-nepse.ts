
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

async function fetchStock(symbol: string) {
  try {
    const res = await fetch(`${BASE_URL}?symbol=${symbol}`);
    const data = await res.json();
    return { symbol, ltp: Number(data?.ltp) || 0 };
  } catch {
    return { symbol, ltp: 0 };
  }
}

export default async function handler(req: any, res: any) {
  try {
    const results = await Promise.all(SYMBOLS.map(fetchStock));
    const snapshot: Record<string, any> = {};
    
    results.forEach(s => {
      if (s.ltp > 0) {
        snapshot[s.symbol] = { ltp: s.ltp, updatedAt: Date.now() };
      }
    });

    await update(ref(rtdb, 'market/snapshot/stocks'), snapshot);

    return res.status(200).json({ success: true, count: results.length });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
