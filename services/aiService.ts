
import OpenAI from "openai";
import { Stock } from "../types";

const client = new OpenAI({
  apiKey: "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",
  baseURL: "https://integrate.api.nvidia.com/v1",
  dangerouslyAllowBrowser: true
});

export interface AIChunk {
  reasoning?: string;
  content?: string;
}

export async function streamAnalysis(stocks: Stock[], onChunk: (chunk: AIChunk) => void) {
  const topGainers = [...stocks].sort((a, b) => b.Change - a.Change).slice(0, 5);
  const topVol = [...stocks].sort((a, b) => b.Volume - a.Volume).slice(0, 5);

  const prompt = `Analyze current Nexora Market:
  Top Gainers: ${topGainers.map(s => s.Symbol).join(', ')}
  Top Volume: ${topVol.map(s => s.Symbol).join(', ')}
  Provide sentiment, sector outlook, and risk warning in professional Markdown.`;

  try {
    const stream = await client.chat.completions.create({
      model: "deepseek-ai/deepseek-v3.2",
      messages: [{ role: "user", content: prompt }],
      temperature: 1,
      top_p: 0.95,
      max_tokens: 4096,
      // @ts-ignore
      extra_body: { chat_template_kwargs: { thinking: true } },
      stream: true
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta as any;
      if (!delta) continue;

      onChunk({
        reasoning: delta.reasoning_content,
        content: delta.content
      });
    }
  } catch (error) {
    console.error("DeepSeek Analysis failed:", error);
    onChunk({ content: "Neural sync disrupted. Attempting reconnection..." });
  }
}
