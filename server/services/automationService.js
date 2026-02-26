import db from "../database/db.js";
import priceService from "./priceService.js";
import { executeSell } from "./tradeService.js";
import { DEFAULT_RISK_PARAMS } from "../utils/constants.js";

// Default playbook definitions
const PLAYBOOK_DEFINITIONS = [
  {
    id: "stop_loss_guard",
    name: "Stop-Loss Guard",
    description: "Auto-sell when price drops below threshold from entry",
    trigger_type: "PRICE_DROP",
    default_params: { threshold_pct: 20 },
    action_type: "SELL",
    action_params: { sell_pct: 100 }
  },
  {
    id: "take_profit",
    name: "Take-Profit",
    description: "Auto-sell when price rises above threshold from entry",
    trigger_type: "PRICE_RISE",
    default_params: { threshold_pct: 100 },
    action_type: "SELL",
    action_params: { sell_pct: 50 }
  },
  {
    id: "rug_pull_exit",
    name: "Rug Pull Exit",
    description: "Emergency sell when liquidity drops sharply",
    trigger_type: "LIQUIDITY_DROP",
    default_params: { threshold_pct: 50, timeframe_min: 5 },
    action_type: "SELL",
    action_params: { sell_pct: 100 }
  },
  {
    id: "alpha_buy",
    name: "Alpha Buy",
    description: "Auto-buy when 5min volume surges vs 1h average",
    trigger_type: "VOLUME_SURGE",
    default_params: { threshold_pct: 30 },
    action_type: "BUY",
    action_params: { portfolio_pct: 2 }
  },
  {
    id: "momentum_sell",
    name: "Momentum Sell",
    description: "Sell 50% when price surges 100%+ from entry",
    trigger_type: "PRICE_RISE",
    default_params: { threshold_pct: 100 },
    action_type: "SELL",
    action_params: { sell_pct: 50 }
  },
  {
    id: "whale_follow",
    name: "Whale Follow",
    description: "Auto-buy when top-100 wallet buys a token",
    trigger_type: "WHALE_BUY",
    default_params: { min_amount_usd: 10000 },
    action_type: "BUY",
    action_params: { portfolio_pct: 1 }
  },
  {
    id: "new_token_snipe",
    name: "New Token Snipe",
    description: "Auto-buy newly deployed tokens with LP added",
    trigger_type: "NEW_TOKEN",
    default_params: { max_age_seconds: 60 },
    action_type: "BUY",
    action_params: { portfolio_pct: 0.5 }
  },
  {
    id: "smart_money_alert",
    name: "Smart Money Alert",
    description: "Follow top-100 profitable traders",
    trigger_type: "SMART_MONEY",
    default_params: { min_profit_pct: 50 },
    action_type: "BUY",
    action_params: { portfolio_pct: 1 }
  },
  {
    id: "pumpfun_graduation",
    name: "Pump.fun Graduation Snipe",
    description: "Auto-buy tokens that graduate from pump.fun to Raydium",
    trigger_type: "GRADUATION",
    default_params: { max_delay_seconds: 30 },
    action_type: "BUY",
    action_params: { portfolio_pct: 1 }
  },
  {
    id: "concentrated_sell_protection",
    name: "Concentrated Sell Protection",
    description: "Exit when whale starts dumping large holdings",
    trigger_type: "WHALE_SELL",
    default_params: { holder_threshold_pct: 10 },
    action_type: "SELL",
    action_params: { sell_pct: 100 }
  }
];

class AutomationEngine {
  constructor() {
    this.isRunning = false;
    this.activeMonitors = new Map(); // tradeId -> monitor config
  }

  // Get all playbook definitions
  getPlaybooks() {
    return PLAYBOOK_DEFINITIONS;
  }

  // Get user's active automations from DB
  getUserAutomations(userAddress) {
    return db.prepare("SELECT * FROM automations WHERE user_address = ?").all(userAddress);
  }

  // Activate a playbook for a user
  activatePlaybook(userAddress, playbookId, customParams = {}) {
    const playbook = PLAYBOOK_DEFINITIONS.find(p => p.id === playbookId);
    if (!playbook) throw new Error("Playbook not found: " + playbookId);

    // Check if already active
    const existing = db.prepare(
      "SELECT * FROM automations WHERE user_address = ? AND playbook_id = ?"
    ).get(userAddress, playbookId);

    if (existing) {
      // Update existing
      db.prepare(
        "UPDATE automations SET enabled = 1, trigger_params = ?, action_params = ? WHERE id = ?"
      ).run(
        JSON.stringify({ ...playbook.default_params, ...customParams }),
        JSON.stringify(playbook.action_params),
        existing.id
      );
      return { id: existing.id, updated: true };
    }

    // Create new
    const result = db.prepare(
      `INSERT INTO automations (user_address, name, playbook_id, trigger_type, trigger_params, action_type, action_params)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      userAddress,
      playbook.name,
      playbookId,
      playbook.trigger_type,
      JSON.stringify({ ...playbook.default_params, ...customParams }),
      playbook.action_type,
      JSON.stringify(playbook.action_params)
    );

    // Log activity
    db.prepare(
      "INSERT INTO activity_log (user_address, type, title, description) VALUES (?, ?, ?, ?)"
    ).run(userAddress, "AUTOMATION", `Activated ${playbook.name}`,
      `Playbook ${playbook.name} enabled with ${JSON.stringify(customParams)}`);

    return { id: result.lastInsertRowid, created: true };
  }

  // Deactivate a playbook
  deactivatePlaybook(userAddress, playbookId) {
    db.prepare(
      "UPDATE automations SET enabled = 0 WHERE user_address = ? AND playbook_id = ?"
    ).run(userAddress, playbookId);

    return { success: true };
  }

  // Start monitoring open positions for stop-loss / take-profit
  startMonitoring(userAddress) {
    const openTrades = db.prepare(
      "SELECT * FROM trades WHERE user_address = ? AND status = 'OPEN'"
    ).all(userAddress);

    const automations = db.prepare(
      "SELECT * FROM automations WHERE user_address = ? AND enabled = 1"
    ).all(userAddress);

    for (const trade of openTrades) {
      // Watch token price
      priceService.watchToken(trade.token_mint);

      this.activeMonitors.set(trade.id, {
        trade,
        automations,
        userAddress
      });
    }

    // Listen for price updates
    priceService.removeAllListeners("priceUpdate");
    priceService.on("priceUpdate", (update) => this.handlePriceUpdate(update));

    if (openTrades.length > 0 && !priceService.isRunning) {
      priceService.startPolling();
    }

    this.isRunning = true;
    console.log(`[AutomationEngine] Monitoring ${openTrades.length} positions for ${userAddress}`);

    return { monitoring: openTrades.length };
  }

  // Handle price update — check stop-loss / take-profit
  async handlePriceUpdate(update) {
    const { tokenMint, price } = update;

    for (const [tradeId, monitor] of this.activeMonitors) {
      const { trade, userAddress } = monitor;

      if (trade.token_mint !== tokenMint) continue;
      if (trade.status !== "OPEN") continue;

      const entryPrice = trade.entry_price;
      const pnlPct = ((price - entryPrice) / entryPrice) * 100;

      // Check stop-loss
      if (trade.stop_loss_pct && pnlPct <= -trade.stop_loss_pct) {
        console.log(`[AutomationEngine] STOP-LOSS triggered for trade ${tradeId}: ${pnlPct.toFixed(2)}%`);

        try {
          await this.executeAutoSell(userAddress, trade, "STOP_LOSS", pnlPct);
        } catch (error) {
          console.error(`[AutomationEngine] Stop-loss execution failed:`, error.message);
        }
      }

      // Check take-profit
      if (trade.take_profit_pct && pnlPct >= trade.take_profit_pct) {
        console.log(`[AutomationEngine] TAKE-PROFIT triggered for trade ${tradeId}: ${pnlPct.toFixed(2)}%`);

        try {
          await this.executeAutoSell(userAddress, trade, "TAKE_PROFIT", pnlPct);
        } catch (error) {
          console.error(`[AutomationEngine] Take-profit execution failed:`, error.message);
        }
      }
    }
  }

  // Execute automated sell
  async executeAutoSell(userAddress, trade, reason, pnlPct) {
    // Update trade status
    db.prepare(
      "UPDATE trades SET status = 'CLOSED', exit_price = ?, pnl_pct = ?, closed_at = CURRENT_TIMESTAMP WHERE id = ?"
    ).run(
      priceService.getPrice(trade.token_mint)?.price || 0,
      pnlPct,
      trade.id
    );

    // Log activity
    const title = reason === "STOP_LOSS"
      ? `Stop-Loss triggered: ${trade.token_symbol}`
      : `Take-Profit triggered: ${trade.token_symbol}`;

    db.prepare(
      "INSERT INTO activity_log (user_address, type, title, description, metadata) VALUES (?, ?, ?, ?, ?)"
    ).run(
      userAddress, "AUTO_SELL", title,
      `${reason} at ${pnlPct.toFixed(2)}% PnL`,
      JSON.stringify({ tradeId: trade.id, reason, pnlPct })
    );

    // Remove from active monitors
    this.activeMonitors.delete(trade.id);
    priceService.unwatchToken(trade.token_mint);

    // Update automation execution count
    const playbookId = reason === "STOP_LOSS" ? "stop_loss_guard" : "take_profit";
    db.prepare(
      "UPDATE automations SET total_executions = total_executions + 1, last_triggered = CURRENT_TIMESTAMP WHERE user_address = ? AND playbook_id = ?"
    ).run(userAddress, playbookId);

    return { success: true, reason, pnlPct };
  }

  // Get activity log
  getActivityLog(userAddress, limit = 50) {
    return db.prepare(
      "SELECT * FROM activity_log WHERE user_address = ? ORDER BY created_at DESC LIMIT ?"
    ).all(userAddress, limit);
  }

  // Stop all monitoring
  stopMonitoring() {
    priceService.stopPolling();
    this.activeMonitors.clear();
    this.isRunning = false;
    console.log("[AutomationEngine] Stopped all monitoring");
  }
}

const automationEngine = new AutomationEngine();
export default automationEngine;
