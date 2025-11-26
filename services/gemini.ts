import { GoogleGenAI } from "@google/genai";
import { Trade, TradeStats } from '../types';

// Initialize Gemini
// Note: In a real production build, ensure process.env.API_KEY is available.
// For this demo environment, we assume the environment variable is injected.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const generateTraderReport = async (trades: Trade[], stats: TradeStats): Promise<string> => {
  if (!process.env.API_KEY) {
    return "AI Analysis Unavailable: Missing API Key.";
  }

  try {
    const recentTrades = trades.slice(0, 10).map(t => ({
        pair: t.pair,
        outcome: t.outcome,
        r: t.rMultiple?.toFixed(2),
        reason: t.reason,
        mistakes: t.notes
    }));

    const prompt = `
      You are a professional trading psychology coach and risk manager.
      Analyze this trader's recent performance and provide a "Trader Report Card".
      
      Stats:
      Win Rate: ${stats.winRate}%
      Profit Factor: ${stats.profitFactor}
      Avg R-Multiple: ${stats.averageR}

      Recent 10 Trades Summary:
      ${JSON.stringify(recentTrades)}

      Please provide:
      1. A letter grade (A+ to F).
      2. Key Strengths (bullet points).
      3. Critical Weaknesses / Patterns (e.g., revenge trading, cutting winners early).
      4. One actionable specific goal for the next week.

      Format the output in clean Markdown. Keep it concise but punchy.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "Could not generate report.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Error generating report. Please try again later.";
  }
};