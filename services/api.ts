
import { Stock } from '../types';

const BASE_URL = "https://nepsetty.kokomo.workers.dev/api/stock";

export async function fetchStockBySymbol(symbol: string): Promise<Partial<Stock> | null> {
  const cleanSymbol = symbol?.trim().toUpperCase();
  if (!cleanSymbol) return null;

  try {
    // Using URL object for robust construction
    const url = new URL(BASE_URL);
    url.searchParams.set('symbol', cleanSymbol);

    // Using a 'simple request' configuration to avoid OPTIONS preflight if possible
    const response = await fetch(url.toString(), {
      method: 'GET',
      mode: 'cors',
      credentials: 'omit'
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    
    // The worker returns lowercase keys: ltp, symbol, company_name
    if (!data || typeof data.ltp === 'undefined') return null;

    return {
      Symbol: data.symbol || cleanSymbol,
      LTP: Number(data.ltp),
      Open: Number(data.ltp),
      High: Number(data.ltp),
      Low: Number(data.ltp),
      Volume: 0,
      Amount: 0
    };
  } catch (error) {
    // If the browser blocks the request (CORS), we return null 
    // and let the internal engine take over.
    return null;
  }
}

export async function fetchMarketData(): Promise<Stock[]> {
  // Bulk fetch is not supported by this API. 
  // App.tsx handles sequential individual fetches.
  return [];
}
