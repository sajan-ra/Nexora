
import { Stock } from '../types';

// Using a public CORS proxy to bypass "Failed to fetch" / CORS errors
const BASE_URL = "https://nepsetty.kokomo.workers.dev/api/stock";
const PROXY_URL = "https://api.allorigins.win/raw?url="; 

/**
 * Single stock fetch with correct parser for the specific API response structure
 * Note: The API returns { symbol: "...", ltp: "..." } directly, not in a results array.
 */
export async function fetchLiveLtp(symbol: string): Promise<number | null> {
  const cleanSymbol = symbol.trim().toUpperCase();
  const targetUrl = `${BASE_URL}?symbol=${cleanSymbol}`;
  const finalProxiedUrl = `${PROXY_URL}${encodeURIComponent(targetUrl)}`;
  
  try {
    const res = await fetch(finalProxiedUrl, {
      method: "GET",
      cache: "no-store"
    });
    
    if (!res.ok) return null;

    const data = await res.json();
    
    // The specific API returns a single object with 'ltp' as a string
    // Example: { "symbol": "NABIL", "ltp": "498.00", ... }
    const price = Number(data?.ltp);
    
    if (isNaN(price) || price <= 0) {
      return null;
    }
    
    return price;
  } catch (err) {
    // Silent catch for bulk sync to avoid console flooding
    return null;
  }
}

/**
 * Helper to retry a fetch task if the proxy drops the connection
 */
async function retryFetch(symbol: string, attempts = 2): Promise<number | null> {
  for (let i = 0; i < attempts; i++) {
    const ltp = await fetchLiveLtp(symbol);
    if (ltp !== null) return ltp;
    // Exponential-ish backoff
    await new Promise(r => setTimeout(r, 400 * (i + 1)));
  }
  return null;
}

/**
 * Sequential fetcher with throttled execution and retries.
 * Optimized for professional stability during live demos.
 */
export async function fetchAllMarketLtp(symbols: string[]): Promise<Record<string, number>> {
  const results: Record<string, number> = {};
  console.log(`Nexora Pro Engine: Initiating Production-Grade Sync for ${symbols.length} instruments...`);
  
  // Sequential processing with increased delay to respect Public Proxy rate limits
  for (const symbol of symbols) {
    const ltp = await retryFetch(symbol);
    
    if (ltp !== null) {
      results[symbol] = ltp;
      // Log success for visibility in dev tools
      console.debug(`[SYNC SUCCESS] ${symbol}: NPR ${ltp}`);
    } else {
      console.warn(`[SYNC FAIL] ${symbol}: Proxy Timeout or CORS Block`);
    }

    // Delay between requests to prevent "Failed to Fetch" from proxy congestion
    await new Promise(r => setTimeout(r, 450));
  }
  
  const successCount = Object.keys(results).length;
  console.log(`Nexora Pro Engine: Sync Cycle Complete. ${successCount}/${symbols.length} instruments live.`);
  return results;
}
