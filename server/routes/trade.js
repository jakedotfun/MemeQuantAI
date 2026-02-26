import { Router } from "express";
import { parseTradeIntent, generateTradeResponse } from "../services/chatService.js";
import { processTradeCommand, resolveToken } from "../services/tradeService.js";
import { checkTokenSafety } from "../services/safetyService.js";
import db from "../database/db.js";

const router = Router();

// POST /api/trade/chat — Full chat-to-trade pipeline
router.post("/chat", async (req, res) => {
  try {
    const { userAddress, message } = req.body;
    if (!userAddress || !message) {
      return res.status(400).json({ error: "userAddress and message required" });
    }

    // Step 1: Parse intent with Claude
    const intent = await parseTradeIntent(message);
    if (!intent.success) {
      return res.json({ success: false, reply: "I couldn't understand that. Try something like: 'Buy $50 of BONK'" });
    }

    const parsed = intent.data;

    // Handle non-trade intents
    if (parsed.intent === "CHECK_PORTFOLIO" || parsed.intent === "CHECK_PRICE" || parsed.intent === "INFO") {
      return res.json({ success: true, intent: parsed, reply: "Intent recognized but not a trade action.", action: parsed.intent });
    }

    // Check confidence
    if (parsed.confidence < 80 && parsed.clarification_needed) {
      return res.json({ success: true, intent: parsed, reply: parsed.clarification_needed, needsClarification: true });
    }

    // Step 2-3: Safety check + Execute
    if (parsed.intent === "BUY" || parsed.intent === "SELL") {
      const result = await processTradeCommand(userAddress, parsed);
      const reply = await generateTradeResponse({ intent: parsed.intent, token: result.token, amount: parsed.amount_sol, result, safetyCheck: result.safetyCheck });

      return res.json({ success: result.status === "SUCCESS", intent: parsed, result, reply });
    }

    return res.json({ success: false, reply: "Unsupported action." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/trade/execute — Direct trade execution (no NLP)
router.post("/execute", async (req, res) => {
  try {
    const { userAddress, intent, tokenMint, amountSol, amountPct, stopLossPct, takeProfitPct } = req.body;
    if (!userAddress || !intent || !tokenMint) {
      return res.status(400).json({ error: "userAddress, intent, and tokenMint required" });
    }

    const result = await processTradeCommand(userAddress, {
      intent,
      token_query: tokenMint,
      amount_sol: amountSol,
      amount_pct: amountPct,
      stop_loss_pct: stopLossPct,
      take_profit_pct: takeProfitPct,
    });

    res.json({ success: result.status === "SUCCESS", result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/trade/history/:address — Trade history
router.get("/history/:address", (req, res) => {
  try {
    const trades = db.prepare(
      "SELECT * FROM trades WHERE user_address = ? ORDER BY created_at DESC LIMIT 50"
    ).all(req.params.address);

    res.json({ success: true, trades });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/trade/safety-check — Check token safety only
router.post("/safety-check", async (req, res) => {
  try {
    const { tokenMint } = req.body;
    if (!tokenMint) return res.status(400).json({ error: "tokenMint required" });

    const result = await checkTokenSafety(tokenMint);
    res.json({ success: true, safety: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/trade/resolve — Resolve token symbol to mint
router.post("/resolve", async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) return res.status(400).json({ error: "query required" });

    const result = await resolveToken(query);
    res.json({ success: result.success, ...result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
