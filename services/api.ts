
import { Stock } from '../types';

const BASE_URL = "https://nepsetty.kokomo.workers.dev/api/stock";

export async function fetchStockBySymbol(symbol: string): Promise<Partial<Stock> | null> {
  try {
    const response = await fetch(`${BASE_URL}?symbol=${symbol.toUpperCase()}`);
    if (!response.ok) throw new Error(`Failed to fetch ${symbol}`);
    const data = await response.json();
    
    // Mapping from the Nepsetty Worker API structure
    return {
      Symbol: data.symbol || symbol,
      LTP: parseFloat(data.lastTradedPrice || 0),
      Change: parseFloat(data.percentageChange || 0),
      Open: parseFloat(data.previousClose || data.lastTradedPrice || 0),
      High: parseFloat(data.highPrice || data.lastTradedPrice || 0),
      Low: parseFloat(data.lowPrice || data.lastTradedPrice || 0),
      Volume: parseInt(data.totalTradeQuantity || 0),
      Amount: parseFloat(data.totalTurnover || 0),
    };
  } catch (error) {
    console.error(`Error fetching ${symbol}:`, error);
    return null;
  }
}

export async function fetchMarketData(): Promise<Stock[]> {
  // Legacy function - we now use on-demand symbol fetching in App.tsx
  return [];
}
