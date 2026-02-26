import { Router } from "express";
import db from "../database/db.js";
import { getAgentBalance } from "../services/walletService.js";
import priceService from "../services/priceService.js";

const router = Router();

// GET /api/portfolio/:userAddress — Full portfolio overview
router.get("/:userAddress", async (req, res) => {
  try {
    const userAddress = req.params.userAddress;

    // Get wallet balance
    let balance = { sol: 0, lamports: 0 };
    try {
      balance = await getAgentBalance(userAddress);
    } catch (e) {
      // Wallet might not exist yet
    }

    // Get open positions
    const openTrades = db.prepare(
      "SELECT * FROM trades WHERE user_address = ? AND status = 'OPEN' ORDER BY created_at DESC"
    ).all(userAddress);

    // Add live PnL to each position
    const positions = openTrades.map(trade => {
      const currentPrice = priceService.getPrice(trade.token_mint);
      const pnlPct = currentPrice
        ? ((currentPrice.price - trade.entry_price) / trade.entry_price) * 100
        : null;
      const pnlUsd = pnlPct && trade.amount_usd
        ? (trade.amount_usd * pnlPct / 100)
        : null;

      return {
        ...trade,
        current_price: currentPrice?.price || null,
        pnl_pct: pnlPct,
        pnl_usd: pnlUsd
      };
    });

    // Get recent closed trades
    const closedTrades = db.prepare(
      "SELECT * FROM trades WHERE user_address = ? AND status = 'CLOSED' ORDER BY closed_at DESC LIMIT 20"
    ).all(userAddress);

    // Get active automations count
    const activeAutomations = db.prepare(
      "SELECT COUNT(*) as count FROM automations WHERE user_address = ? AND enabled = 1"
    ).get(userAddress);

    // Calculate daily PnL
    const todayTrades = db.prepare(
      "SELECT SUM(pnl_usd) as total_pnl FROM trades WHERE user_address = ? AND status = 'CLOSED' AND date(closed_at) = date('now')"
    ).get(userAddress);

    res.json({
      success: true,
      portfolio: {
        balance,
        positions,
        closedTrades,
        activeAutomations: activeAutomations.count,
        dailyPnl: todayTrades?.total_pnl || 0,
        totalOpenPositions: positions.length
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/portfolio/:userAddress/history — Full trade history
router.get("/:userAddress/history", (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const trades = db.prepare(
      "SELECT * FROM trades WHERE user_address = ? ORDER BY created_at DESC LIMIT ?"
    ).all(req.params.userAddress, limit);

    res.json({ success: true, trades });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
