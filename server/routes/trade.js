import { Router } from "express";
import { parseTradeIntent, generateTradeResponse } from "../services/chatService.js";
import { processTradeCommand, resolveToken } from "../services/tradeService.js";
import { checkTokenSafety } from "../services/safetyService.js";
import { transferSOL } from "../services/walletService.js";
import db from "../database/db.js";

const router = Router();

// POST /api/trade/chat — Full chat-to-trade pipeline
router.post("/chat", async (req, res) => {
  try {
    const { userAddress, message } = req.body;
    if (!userAddress || !message) {
      return res.status(400).json({ error: "userAddress and message required" });
    }

    // Step 1: Send to Claude (conversational + trade detection)
    const result = await parseTradeIntent(message);

    if (!result.success) {
      return res.json({ success: false, type: "chat", reply: "Sorry, I'm having trouble right now. Try again in a moment!" });
    }

    // Pure conversation — no trade action detected
    if (result.type === "chat") {
      return res.json({ success: true, type: "chat", reply: result.message });
    }

    // Trade action detected — execute it
    const parsed = result.data;
    const agentMessage = result.message; // conversational preamble from Claude

    // Handle CHECK_PORTFOLIO
    if (parsed.intent === "CHECK_PORTFOLIO") {
      try {
        const openTrades = db.prepare(
          "SELECT * FROM trades WHERE user_address = ? AND status = 'OPEN' ORDER BY created_at DESC"
        ).all(userAddress);
        const closedToday = db.prepare(
          "SELECT SUM(pnl_usd) as total_pnl, COUNT(*) as count FROM trades WHERE user_address = ? AND status = 'CLOSED' AND date(closed_at) = date('now')"
        ).get(userAddress);

        const portfolioSummary = agentMessage || `You have ${openTrades.length} open position(s). Today's P&L: $${(closedToday?.total_pnl || 0).toFixed(2)} from ${closedToday?.count || 0} closed trade(s). Check the Portfolio tab for full details!`;

        return res.json({ success: true, type: "chat", reply: portfolioSummary });
      } catch {
        return res.json({ success: true, type: "chat", reply: agentMessage || "Check the Portfolio tab for your full balance and positions!" });
      }
    }

    // Handle low confidence
    if (parsed.confidence < 80 && !parsed.token_query && !parsed.to_address) {
      return res.json({ success: true, type: "chat", reply: agentMessage || "I'm not sure I understood that trade command. Could you be more specific?" });
    }

    // Handle WITHDRAW
    if (parsed.intent === "WITHDRAW") {
      if (!parsed.to_address) {
        return res.json({ success: true, type: "chat", reply: agentMessage || "Where should I send the SOL? Please provide a destination wallet address." });
      }
      if (!parsed.amount_sol || parsed.amount_sol <= 0) {
        return res.json({ success: true, type: "chat", reply: agentMessage || "How much SOL do you want to withdraw?" });
      }

      try {
        const txResult = await transferSOL(userAddress, parsed.to_address, parsed.amount_sol);

        db.prepare(
          "INSERT INTO activity_log (user_address, type, title, description, metadata) VALUES (?, ?, ?, ?, ?)"
        ).run(
          userAddress, "WITHDRAW",
          `Withdrew ${parsed.amount_sol} SOL`,
          `Sent ${parsed.amount_sol} SOL to ${parsed.to_address}`,
          JSON.stringify(txResult)
        );

        const reply = agentMessage
          ? `${agentMessage}\n\nSent ${parsed.amount_sol} SOL to ${parsed.to_address}.\nTx: ${txResult.signature}`
          : `Sent ${parsed.amount_sol} SOL to ${parsed.to_address}.\nTx: ${txResult.signature}`;

        return res.json({ success: true, type: "trade", reply });
      } catch (error) {
        return res.json({ success: false, type: "chat", reply: `${agentMessage ? agentMessage + "\n\n" : ""}Withdrawal failed: ${error.message}` });
      }
    }

    // Handle BUY / SELL
    if (parsed.intent === "BUY" || parsed.intent === "SELL") {
      const tradeResult = await processTradeCommand(userAddress, parsed);
      const tradeReply = await generateTradeResponse({ intent: parsed.intent, token: tradeResult.token, amount: parsed.amount_sol, result: tradeResult, safetyCheck: tradeResult.safetyCheck });

      const fullReply = agentMessage
        ? `${agentMessage}\n\n${tradeReply}`
        : tradeReply;

      return res.json({ success: tradeResult.status === "SUCCESS", type: "trade", reply: fullReply });
    }

    // Fallback — return the conversational message
    return res.json({ success: true, type: "chat", reply: agentMessage || "I'm not sure what to do with that. Try 'buy $50 of PEPE' or just ask me anything!" });
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
