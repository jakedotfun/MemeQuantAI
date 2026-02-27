import { Connection, PublicKey } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

export const RPC_URL = process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
const COINGECKO_URL = "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd";

/**
 * Shared connection singleton — reuses one Connection across all modules
 * to avoid creating multiple WebSocket/HTTP connections to the same RPC.
 */
let _connection: Connection | null = null;
export function getConnection(): Connection {
  if (!_connection) {
    _connection = new Connection(RPC_URL, {
      commitment: "confirmed",
      confirmTransactionInitialTimeout: 60_000,
    });
    console.log("[RPC] Created shared Connection →", RPC_URL);
  }
  return _connection;
}

/**
 * Retry wrapper — retries an async operation up to `maxRetries` times
 * with a `delayMs` pause between attempts. Logs each attempt.
 */
export async function withRetry<T>(
  label: string,
  fn: () => Promise<T>,
  maxRetries = 3,
  delayMs = 1000,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[RETRY] ${label} attempt ${attempt}/${maxRetries} failed: ${msg}`);
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
  }
  throw lastError;
}

let cachedSolPrice: { price: number; timestamp: number } | null = null;
const PRICE_CACHE_MS = 60_000;

async function getSolPrice(): Promise<number | null> {
  if (cachedSolPrice && Date.now() - cachedSolPrice.timestamp < PRICE_CACHE_MS) {
    return cachedSolPrice.price;
  }
  try {
    const res = await fetch(COINGECKO_URL);
    if (!res.ok) return cachedSolPrice?.price ?? null;
    const data = await res.json();
    const price = data.solana?.usd ?? null;
    if (price !== null) {
      cachedSolPrice = { price, timestamp: Date.now() };
    }
    return price;
  } catch {
    return cachedSolPrice?.price ?? null;
  }
}

export interface TokenBalance {
  mint: string;
  balance: number;
  decimals: number;
  usdPrice: number | null;
  usdValue: number | null;
}

export interface WalletBalanceData {
  solBalance: number;
  solUsdPrice: number | null;
  solUsdValue: number | null;
  totalUsdValue: number | null;
  tokens: TokenBalance[];
}

export async function fetchWalletBalance(walletAddress: string): Promise<WalletBalanceData> {
  const connection = getConnection();
  const pubkey = new PublicKey(walletAddress);

  const [lamports, solPrice, tokenAccounts] = await Promise.all([
    connection.getBalance(pubkey),
    getSolPrice(),
    connection.getParsedTokenAccountsByOwner(pubkey, { programId: TOKEN_PROGRAM_ID }),
  ]);

  const solBalance = lamports / 1e9;
  const solUsdValue = solPrice !== null ? solBalance * solPrice : null;

  const tokens: TokenBalance[] = tokenAccounts.value
    .map((acct) => {
      const info = acct.account.data.parsed?.info;
      if (!info) return null;
      const amount = Number(info.tokenAmount?.uiAmount ?? 0);
      if (amount === 0) return null;
      return {
        mint: info.mint as string,
        balance: amount,
        decimals: info.tokenAmount?.decimals ?? 0,
        usdPrice: null as number | null,
        usdValue: null as number | null,
      };
    })
    .filter((t): t is NonNullable<typeof t> => t !== null);

  // Fetch SPL token prices from Jupiter Price API v2
  if (tokens.length > 0) {
    try {
      const mints = tokens.map((t) => t.mint).join(",");
      const priceRes = await fetch(`https://api.jup.ag/price/v2?ids=${mints}`);
      if (priceRes.ok) {
        const priceData = await priceRes.json();
        for (const token of tokens) {
          const entry = priceData.data?.[token.mint];
          if (entry?.price) {
            token.usdPrice = Number(entry.price);
            token.usdValue = token.balance * token.usdPrice;
          }
        }
      }
    } catch (err) {
      console.error("[WALLET] Jupiter price fetch failed:", err);
    }
  }

  // Total = SOL USD + all token USD values
  const tokenTotalUsd = tokens.reduce((sum, t) => sum + (t.usdValue ?? 0), 0);
  const totalUsdValue = solUsdValue !== null ? solUsdValue + tokenTotalUsd : tokenTotalUsd > 0 ? tokenTotalUsd : null;

  return {
    solBalance,
    solUsdPrice: solPrice,
    solUsdValue,
    totalUsdValue,
    tokens,
  };
}
