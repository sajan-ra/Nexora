
import OpenAI from "openai";
import { Stock } from "../types";

// Initializing the client with the provided DeepSeek-Terminus configuration via NVIDIA infrastructure
const client = new OpenAI({
  apiKey: "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",
  baseURL: "https://integrate.api.nvidia.com/v1",
  dangerouslyAllowBrowser: true
});

export interface AIChunk {
  reasoning?: string;
  content?: string;
}

/**
 * Streams market analysis from DeepSeek-V3.1-Terminus.
 * Uses 'thinking' mode to provide deep reasoning before the final market sentiment.
 */
export async function streamAnalysis(stocks: Stock[], onChunk: (chunk: AIChunk) => void) {
  // Extract market data to provide context to the model
  const topGainers = [...stocks].sort((a, b) => b.Change - a.Change).slice(0, 5);
  const topVol = [...stocks].sort((a, b) => b.Volume - a.Volume).slice(0, 5);
  const marketSent = stocks.reduce((acc, s) => acc + s.Change, 0) / stocks.length;

  const prompt = `You are the Nexora Pro Financial Intelligence Engine. 
Analyze the current Nepal Stock Market (NEPSE) snapshot:
- Top Gainers: ${topGainers.map(s => `${s.Symbol} (${s.Change.toFixed(2)}%)`).join(', ')}
- High Volume Assets: ${topVol.map(s => s.Symbol).join(', ')}
- Overall Market Drift: ${marketSent.toFixed(4)}%

Provide:
1. "Neural Sentiment": A brief summary of the mood (Bullish/Bearish/Neutral).
2. "Sector Heatmap": Identification of which sectors look strongest.
3. "Deep Analysis": Advanced pattern recognition for the top symbols.
4. "Risk Assessment": Quantitative warning for the current volatility levels.

Use professional Markdown. Keep descriptions high-impact and concise.`;

  try {
    const stream = await client.chat.completions.create({
      model: "deepseek-ai/deepseek-v3.1-terminus",
      messages: [
        { 
          role: "system", 
          content: "You are a professional financial analyst specialized in technical analysis and high-frequency trading patterns. You always use data-driven insights." 
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.2, // Low temperature for consistent financial logic
      top_p: 0.7,
      max_tokens: 8192,
      // @ts-ignore - 'thinking' is a specific feature of this model endpoint
      chat_template_kwargs: { thinking: true },
      stream: true
    });

    for await (const chunk of stream) {
      const choice = chunk.choices[0];
      const delta = choice?.delta as any;
      
      if (!delta) continue;

      // The 'Terminus' model provides reasoning_content while it is 'thinking'
      onChunk({
        reasoning: delta.reasoning_content || "",
        content: delta.content || ""
      });
    }
  } catch (error) {
    console.error("Nexora AI Engine Error:", error);
    onChunk({ content: "### ⚠️ Sync Failure\nThe AI Neural Link was disrupted. Please check your network or try a 'Deep Sync' again." });
  }
}
