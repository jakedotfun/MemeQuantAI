export const SOLANA_RPC_URL =
  process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";

export const JUPITER_API = "https://quote-api.jup.ag/v6";
export const GOPLUS_API = "https://api.gopluslabs.com/api/v1";
export const BIRDEYE_API = "https://public-api.birdeye.so";
export const DEXSCREENER_API = "https://api.dexscreener.com";

export const DEFAULT_RISK_PARAMS = {
  maxPositionPct: 5,
  stopLossPct: 20,
  takeProfitPct: 100,
  dailyDrawdownPct: 15,
  maxOpenPositions: 5,
  safetyThreshold: 50,
};
