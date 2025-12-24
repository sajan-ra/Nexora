
import { GoogleGenAI } from "@google/genai";
import { Stock } from "../types";

// Always use process.env.API_KEY directly for initializing GoogleGenAI
export async function analyzeMarket(stocks: Stock[]): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Pick top movers or interesting stocks to keep the prompt concise
  const topGainers = [...stocks].sort((a, b) => b.Change - a.Change).slice(0, 5);
  const topVol = [...stocks].sort((a, b) => b.Volume - a.Volume).slice(0, 5);

  const prompt = `
    You are Nexora AI, a professional financial analyst specializing in the Nepal Stock Exchange (NEPSE).
    Here is a summary of the current market data:
    
    Top Gainers: ${topGainers.map(s => `${s.Symbol} (LTP: ${s.LTP}, Change: ${s.Change}%)`).join(', ')}
    Top Volume: ${topVol.map(s => `${s.Symbol} (Volume: ${s.Volume})`).join(', ')}

    Please provide:
    1. A brief overview of current market sentiment in Nepal.
    2. Specific advice for paper traders on which sectors might be promising.
    3. Potential risks to watch out for in the current session.
    Keep the response professional, encouraging, and formatted in clean Markdown.
  `;

  try {
    // Correct way to call generateContent is directly via ai.models.generateContent
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
    });
    // Access .text property directly, do not call as a method
    return response.text || "I'm unable to provide analysis at the moment. Please try again later.";
  } catch (error) {
    console.error("AI Analysis failed:", error);
    return "The AI analyst is currently offline. Ensure your market data is loaded and try again.";
  }
}
