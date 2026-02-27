import { DEXSCREENER_API, JUPITER_API } from "../utils/constants.js";
import { EventEmitter } from "events";

/** Headers for Jupiter API calls */
function jupiterHeaders() {
  const headers = {};
  if (process.env.JUPITER_API_KEY) {
    headers["x-api-key"] = process.env.JUPITER_API_KEY;
  }
  return headers;
}

class PriceService extends EventEmitter {
  constructor() {
    super();
    this.prices = new Map(); // tokenMint -> { price, timestamp }
    this.watchedTokens = new Set();
    this.pollInterval = null;
    this.isRunning = false;
  }

  // Add a token to watch list
  watchToken(tokenMint) {
    this.watchedTokens.add(tokenMint);
    if (this.isRunning && this.watchedTokens.size === 1) {
      this.startPolling();
    }
  }

  // Remove token from watch list
  unwatchToken(tokenMint) {
    this.watchedTokens.delete(tokenMint);
    if (this.watchedTokens.size === 0) {
      this.stopPolling();
    }
  }

  // Start polling prices every 3 seconds
  startPolling() {
    if (this.pollInterval) return;
    this.isRunning = true;

    console.log("[PriceService] Starting price polling...");

    // Poll immediately, then every 3 seconds
    this.pollPrices();
    this.pollInterval = setInterval(() => this.pollPrices(), 3000);
  }

  stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    this.isRunning = false;
    console.log("[PriceService] Stopped price polling");
  }

  async pollPrices() {
    if (this.watchedTokens.size === 0) return;

    for (const tokenMint of this.watchedTokens) {
      try {
        // Use Jupiter price API v3
        const response = await fetch(
          `https://api.jup.ag/price/v3?ids=${tokenMint}`,
          { headers: jupiterHeaders() }
        );
        const data = await response.json();

        if (data[tokenMint]) {
          const price = parseFloat(data[tokenMint].usdPrice);
          const oldPrice = this.prices.get(tokenMint)?.price;

          this.prices.set(tokenMint, {
            price,
            timestamp: Date.now()
          });

          // Emit price update event
          this.emit("priceUpdate", {
            tokenMint,
            price,
            oldPrice,
            timestamp: Date.now()
          });
        }
      } catch (error) {
        console.error(`[PriceService] Error fetching price for ${tokenMint}:`, error.message);
      }
    }
  }

  // Get current price for a token
  getPrice(tokenMint) {
    return this.prices.get(tokenMint) || null;
  }

  // Get all current prices
  getAllPrices() {
    return Object.fromEntries(this.prices);
  }
}

// Singleton instance
const priceService = new PriceService();
export default priceService;
