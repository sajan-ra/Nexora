
import { Stock } from '../types';

const NEPSE_API_URL = "https://nepseapi.surajrimal.dev/PriceVolume";

export async function fetchMarketData(): Promise<Stock[]> {
  try {
    const response = await fetch(NEPSE_API_URL);
    if (!response.ok) throw new Error('Network response was not ok');
    const data = await response.json();
    
    // Mapping based on the provided JSON format:
    // { "symbol": "ACLBSL", "lastTradedPrice": 905.0, "percentageChange": -0.65, "totalTradeQuantity": 437, ... }
    return data.map((item: any) => ({
      Symbol: item.symbol || 'N/A',
      LTP: parseFloat(item.lastTradedPrice || item.closePrice || 0),
      Change: parseFloat(item.percentageChange || 0),
      // Defaulting O/H/L to LTP since the specific PriceVolume endpoint 
      // primarily provides last traded price and volume
      Open: parseFloat(item.previousClose || item.lastTradedPrice || 0),
      High: parseFloat(item.lastTradedPrice || 0),
      Low: parseFloat(item.lastTradedPrice || 0),
      Volume: parseInt(item.totalTradeQuantity || 0),
      Amount: parseFloat(item.totalTurnover || 0),
    }));
  } catch (error) {
    console.error("Failed to fetch NEPSE data:", error);
    return [];
  }
}
