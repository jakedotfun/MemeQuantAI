import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are a Solana memecoin trading assistant for MemeQuant AI.
Parse the user's message and return ONLY a valid JSON object (no markdown, no backticks, no explanation).

JSON format:
{
  "intent": "BUY" | "SELL" | "SET_AUTOMATION" | "CHECK_PORTFOLIO" | "CHECK_PRICE" | "INFO",
  "token_query": "string or null (token symbol or mint address)",
  "amount_usd": number or null,
  "amount_sol": number or null,
  "amount_pct": number or null (e.g. "sell half" = 50),
  "stop_loss_pct": number or null,
  "take_profit_pct": number or null,
  "confidence": 0-100,
  "clarification_needed": "string or null"
}

Rules:
- If user says "buy $50 of PEPE" → intent BUY, token_query PEPE, amount_usd 50
- If user says "sell all my BONK" → intent SELL, token_query BONK, amount_pct 100
- If user says "sell half my WIF" → intent SELL, token_query WIF, amount_pct 50
- If user mentions stop-loss, extract the percentage
- If ambiguous, set confidence < 80 and fill clarification_needed
- Default stop_loss_pct to 20 if user says "buy" without specifying stop-loss
- Return ONLY the JSON object, nothing else`;

export async function parseTradeIntent(userMessage) {
  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 300,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }]
    });

    const text = response.content[0].text.trim();
    // Remove any markdown fences if present
    const clean = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(clean);

    return { success: true, data: parsed };
  } catch (error) {
    console.error("Claude API error:", error.message);
    return {
      success: false,
      error: error.message,
      data: null
    };
  }
}

// Generate a human-readable response for the user
export async function generateTradeResponse(tradeResult) {
  const { intent, token, amount, result, safetyCheck } = tradeResult;

  if (result.status === "BLOCKED") {
    return `Trade blocked: ${token.symbol} failed safety check (Risk Score: ${safetyCheck.riskScore}/100).\n${safetyCheck.risks.join("\n")}`;
  }

  if (result.status === "FAILED") {
    return `Trade failed: ${result.error}`;
  }

  if (intent === "BUY") {
    return `Bought ${token.symbol} for ${amount} SOL.\nEntry price: ${result.entryPrice}\nStop-loss: -${result.stopLoss}%\nTx: ${result.txHash}`;
  }

  if (intent === "SELL") {
    return `Sold ${token.symbol}.\nExit price: ${result.exitPrice}\nP&L: ${result.pnl > 0 ? "+" : ""}${result.pnl}%\nTx: ${result.txHash}`;
  }

  return "Action completed.";
}

export default { parseTradeIntent, generateTradeResponse };
