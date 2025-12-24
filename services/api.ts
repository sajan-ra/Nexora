
import { Stock } from '../types';

/**
 * External fetching removed as per user request.
 * All market data is now managed internally via Firestore and local simulation.
 */
export async function fetchStockBySymbol(symbol: string): Promise<Partial<Stock> | null> {
  return null;
}

export async function fetchMarketData(): Promise<Stock[]> {
  return [];
}
