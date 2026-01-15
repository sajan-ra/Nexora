
import { GoogleGenAI } from "@google/genai";
import { Stock } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export interface AIChunk {
  reasoning?: string;
  content?: string;
}

export interface TacticalSignal {
  symbol: string;
  signal: 'BUY' | 'SELL' | 'NEUTRAL';
  confidence: number;
  pattern: string;
  advice: string;
}

export async function getTacticalSignal(stock: Stock, history: any[]): Promise<TacticalSignal> {
  const prompt = `Analyze this specific stock for an immediate 5-minute trade:
Symbol: ${stock.Symbol}
Current Price: ${stock.LTP}
Change: ${stock.Change}%
Recent OHLC History (last 5 bars): ${JSON.stringify(history.slice(-5))}

Identify the dominant candlestick pattern and suggest a tactical action. 
Return ONLY a JSON object: 
{"symbol": "${stock.Symbol}", "signal": "BUY|SELL|NEUTRAL", "confidence": 0-100, "pattern": "string", "advice": "short sentence"}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });
    
    return JSON.parse(response.text || '{}');
  } catch (err) {
    console.error("Tactical AI Error:", err);
    return { 
      symbol: stock.Symbol, 
      signal: 'NEUTRAL', 
      confidence: 0, 
      pattern: 'Analyzing...', 
      advice: 'Neural link unstable.' 
    };
  }
}

export async function streamAnalysis(stocks: Stock[], onChunk: (chunk: AIChunk) => void) {
  if (!stocks || stocks.length === 0) {
    onChunk({ content: "No market data available for analysis." });
    return;
  }

  const topGainers = [...stocks].sort((a, b) => (b.Change || 0) - (a.Change || 0)).slice(0, 5);
  const highVolume = [...stocks].sort((a, b) => (b.Volume || 0) - (a.Volume || 0)).slice(0, 5);
  const marketDrift = stocks.reduce((acc, s) => acc + (s.Change || 0), 0) / stocks.length;

  const prompt = `You are the Nexora Pro Financial Intelligence Engine. 
Analyze the current NEPSE data:
- Top Performers: ${topGainers.map(s => `${s.Symbol} (${s.Change.toFixed(2)}%)`).join(', ')}
- Liquidity Leaders: ${highVolume.map(s => s.Symbol).join(', ')}
- Market Velocity: ${marketDrift.toFixed(4)}%

Structure your response with:
1. # Neural Sentiment: Bullish/Bearish/Neutral summary.
2. # Sector Momentum: Which areas are attracting capital.
3. # Risk Parameters: Critical volatility warnings.
4. # Strategic Outlook: High-probability pattern observations.`;

  try {
    const responseStream = await ai.models.generateContentStream({
      model: 'gemini-3-pro-preview',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        systemInstruction: "You are an expert quantitative analyst. You provide structured Markdown reports.",
        temperature: 0.15,
        thinkingConfig: { thinkingBudget: 16000 }
      },
    });

    for await (const chunk of responseStream) {
      if (chunk.text) onChunk({ content: chunk.text });
    }
  } catch (error: any) {
    onChunk({ content: "### ⚠️ Sync Failure\nAI Engine Offline." });
  }
}
