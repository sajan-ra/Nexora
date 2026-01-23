
import { Stock } from '../types';

// Using corsproxy.io for better stability than allorigins
const BASE_URL = "https://nepsetty.kokomo.workers.dev/api/stock";
const PROXY_URL = "https://corsproxy.io/?"; 

/**
 * Single stock fetch with correct parser for the specific API response structure
 */
export async function fetchLiveLtp(symbol: string): Promise<number | null> {
  const cleanSymbol = symbol.trim().toUpperCase();
  // Add random timestamp to prevent caching from the proxy or browser
  const targetUrl = `${BASE_URL}?symbol=${cleanSymbol}&_t=${Date.now()}`;
  const finalProxiedUrl = `${PROXY_URL}${encodeURIComponent(targetUrl)}`;
  
  try {
    const res = await fetch(finalProxiedUrl, {
      method: "GET",
      // Remove cache: "no-store" as it sometimes causes CORS preflight issues with simple proxies
    });
    
    if (!res.ok) {
      console.warn(`[API] Failed to fetch ${cleanSymbol}: ${res.status} ${res.statusText}`);
      return null;
    }

    const text = await res.text();
    // Handle empty responses
    if (!text) return null;

    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.warn(`[API] Invalid JSON for ${cleanSymbol}`, text.substring(0, 50));
      return null;
    }
    
    // Support multiple field names that NEPSE APIs commonly use
    const rawPrice = data?.ltp || data?.LTP || data?.price || data?.closingPrice;
    const price = Number(rawPrice);
    
    if (isNaN(price) || price <= 0) {
      // Only warn if we actually got data but no price
      if (data && Object.keys(data).length > 0) {
         console.warn(`[API] No valid price found for ${cleanSymbol}:`, data);
      }
      return null;
    }
    
    return price;
  } catch (err) {
    console.error(`[API ERROR] ${cleanSymbol}:`, err);
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
    await new Promise(r => setTimeout(r, 800 * (i + 1)));
  }
  return null;
}

/**
 * Sequential fetcher with throttled execution and retries.
 */
export async function fetchAllMarketLtp(symbols: string[]): Promise<Record<string, number>> {
  const results: Record<string, number> = {};
  console.log(`Nexora Pro Engine: Initiating Production-Grade Sync for ${symbols.length} instruments...`);
  
  for (const symbol of symbols) {
    const ltp = await retryFetch(symbol);
    
    if (ltp !== null) {
      results[symbol] = ltp;
      console.debug(`[SYNC SUCCESS] ${symbol}: NPR ${ltp}`);
    } else {
      console.warn(`[SYNC FAIL] ${symbol}: Proxy Timeout or Data Missing`);
    }

    // Increased delay to 600ms to be gentler on the free worker
    await new Promise(r => setTimeout(r, 600));
  }
  
  const successCount = Object.keys(results).length;
  console.log(`Nexora Pro Engine: Sync Cycle Complete. ${successCount}/${symbols.length} instruments live.`);
  return results;
}
