export interface MarketToken {
  tokenAddress: string;
  pairAddress: string;
  symbol: string;
  name: string;
  imageUrl: string | null;
  priceUsd: number;
  marketCap: number;
  fdv: number;
  liquidityUsd: number;
  volumeH24: number;
  volumeH1: number;
  volumeH6: number;
  volumeM5: number;
  txnsBuysH24: number;
  txnsSellsH24: number;
  txnsBuysH1: number;
  txnsSellsH1: number;
  priceChangeH1: number | null;
  priceChangeH6: number | null;
  priceChangeH24: number | null;
  priceChangeM5: number | null;
  pairCreatedAt: number;
  priceNative: number;
  websites: { url: string; label: string }[];
  socials: { url: string; type: string }[];
}

export type FilterTab = "Trending" | "Top" | "Gainers" | "New Pairs";
export type Timeframe = "1H" | "24H" | "7D" | "1M";

// Module-level cache
const cache: Map<string, { tokens: MarketToken[]; fetchedAt: number }> = new Map();
const CACHE_TTL = 30_000; // 30 seconds
const FETCH_TIMEOUT = 10_000; // 10 seconds

function fetchWithTimeout(url: string, timeoutMs: number = FETCH_TIMEOUT): Promise<Response> {
  return fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
}

interface BoostToken {
  tokenAddress: string;
  chainId: string;
}

interface DexPair {
  pairAddress: string;
  baseToken: { address: string; symbol: string; name: string };
  priceUsd?: string;
  priceNative?: string;
  marketCap?: number;
  fdv?: number;
  liquidity?: { usd?: number };
  volume?: { h24?: number; h6?: number; h1?: number; m5?: number };
  txns?: {
    h24?: { buys?: number; sells?: number };
    h1?: { buys?: number; sells?: number };
  };
  priceChange?: { h1?: number; h6?: number; h24?: number; m5?: number };
  pairCreatedAt?: number;
  info?: {
    imageUrl?: string;
    websites?: { url: string; label: string }[];
    socials?: { url: string; type: string }[];
  };
}

function mapPairToToken(pair: DexPair): MarketToken {
  return {
    tokenAddress: pair.baseToken.address,
    pairAddress: pair.pairAddress,
    symbol: pair.baseToken.symbol,
    name: pair.baseToken.name,
    imageUrl: pair.info?.imageUrl ?? null,
    priceUsd: Number(pair.priceUsd) || 0,
    marketCap: pair.marketCap ?? 0,
    fdv: pair.fdv ?? 0,
    liquidityUsd: pair.liquidity?.usd ?? 0,
    volumeH24: pair.volume?.h24 ?? 0,
    volumeH1: pair.volume?.h1 ?? 0,
    volumeH6: pair.volume?.h6 ?? 0,
    volumeM5: pair.volume?.m5 ?? 0,
    txnsBuysH24: pair.txns?.h24?.buys ?? 0,
    txnsSellsH24: pair.txns?.h24?.sells ?? 0,
    txnsBuysH1: pair.txns?.h1?.buys ?? 0,
    txnsSellsH1: pair.txns?.h1?.sells ?? 0,
    priceChangeH1: pair.priceChange?.h1 ?? null,
    priceChangeH6: pair.priceChange?.h6 ?? null,
    priceChangeH24: pair.priceChange?.h24 ?? null,
    priceChangeM5: pair.priceChange?.m5 ?? null,
    pairCreatedAt: pair.pairCreatedAt ?? 0,
    priceNative: Number(pair.priceNative) || 0,
    websites: pair.info?.websites ?? [],
    socials: pair.info?.socials ?? [],
  };
}

const FALLBACK_TOKENS: MarketToken[] = [
  { tokenAddress: "So11111111111111111111111111111111111111112", pairAddress: "sol-usdc-raydium", symbol: "SOL", name: "Wrapped SOL", imageUrl: null, priceUsd: 148.35, marketCap: 72_400_000_000, fdv: 72_400_000_000, liquidityUsd: 45_000_000, volumeH24: 3_200_000_000, volumeH1: 180_000_000, volumeH6: 800_000_000, volumeM5: 12_000_000, txnsBuysH24: 450_000, txnsSellsH24: 380_000, txnsBuysH1: 22_000, txnsSellsH1: 18_000, priceChangeH1: 1.2, priceChangeH6: 3.5, priceChangeH24: -2.1, priceChangeM5: 0.3, pairCreatedAt: 1678000000000, priceNative: 1, websites: [], socials: [] },
  { tokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", pairAddress: "usdc-sol-raydium", symbol: "USDC", name: "USD Coin", imageUrl: null, priceUsd: 1.0, marketCap: 44_000_000_000, fdv: 44_000_000_000, liquidityUsd: 120_000_000, volumeH24: 800_000_000, volumeH1: 40_000_000, volumeH6: 200_000_000, volumeM5: 3_000_000, txnsBuysH24: 320_000, txnsSellsH24: 310_000, txnsBuysH1: 15_000, txnsSellsH1: 14_500, priceChangeH1: 0, priceChangeH6: 0, priceChangeH24: 0, priceChangeM5: 0, pairCreatedAt: 1678000000000, priceNative: 0.0067, websites: [], socials: [] },
  { tokenAddress: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", pairAddress: "bonk-sol-raydium", symbol: "BONK", name: "Bonk", imageUrl: null, priceUsd: 0.0000234, marketCap: 1_560_000_000, fdv: 1_560_000_000, liquidityUsd: 8_500_000, volumeH24: 95_000_000, volumeH1: 5_200_000, volumeH6: 28_000_000, volumeM5: 850_000, txnsBuysH24: 85_000, txnsSellsH24: 72_000, txnsBuysH1: 4_200, txnsSellsH1: 3_600, priceChangeH1: 2.8, priceChangeH6: 5.1, priceChangeH24: 12.4, priceChangeM5: 0.6, pairCreatedAt: 1672000000000, priceNative: 0.000000158, websites: [], socials: [] },
  { tokenAddress: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm", pairAddress: "wif-sol-raydium", symbol: "WIF", name: "dogwifhat", imageUrl: null, priceUsd: 1.85, marketCap: 1_850_000_000, fdv: 1_850_000_000, liquidityUsd: 12_000_000, volumeH24: 210_000_000, volumeH1: 11_000_000, volumeH6: 55_000_000, volumeM5: 1_800_000, txnsBuysH24: 62_000, txnsSellsH24: 55_000, txnsBuysH1: 3_100, txnsSellsH1: 2_700, priceChangeH1: -0.5, priceChangeH6: 1.2, priceChangeH24: 8.3, priceChangeM5: -0.1, pairCreatedAt: 1701000000000, priceNative: 0.0125, websites: [], socials: [] },
  { tokenAddress: "7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr", pairAddress: "popcat-sol-raydium", symbol: "POPCAT", name: "Popcat", imageUrl: null, priceUsd: 0.72, marketCap: 705_000_000, fdv: 705_000_000, liquidityUsd: 4_800_000, volumeH24: 68_000_000, volumeH1: 3_500_000, volumeH6: 18_000_000, volumeM5: 520_000, txnsBuysH24: 41_000, txnsSellsH24: 35_000, txnsBuysH1: 2_000, txnsSellsH1: 1_700, priceChangeH1: 3.2, priceChangeH6: 7.8, priceChangeH24: 15.6, priceChangeM5: 1.1, pairCreatedAt: 1706000000000, priceNative: 0.00486, websites: [], socials: [] },
  { tokenAddress: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN", pairAddress: "jup-sol-raydium", symbol: "JUP", name: "Jupiter", imageUrl: null, priceUsd: 0.95, marketCap: 1_280_000_000, fdv: 1_280_000_000, liquidityUsd: 9_500_000, volumeH24: 145_000_000, volumeH1: 7_800_000, volumeH6: 38_000_000, volumeM5: 1_200_000, txnsBuysH24: 52_000, txnsSellsH24: 48_000, txnsBuysH1: 2_600, txnsSellsH1: 2_400, priceChangeH1: -1.1, priceChangeH6: -0.3, priceChangeH24: 4.2, priceChangeM5: -0.2, pairCreatedAt: 1706500000000, priceNative: 0.00641, websites: [], socials: [] },
  { tokenAddress: "MEW1gQWJ3nEXg2qgERiKu7FAFj79PHvQVREQUzScPP5", pairAddress: "mew-sol-raydium", symbol: "MEW", name: "cat in a dogs world", imageUrl: null, priceUsd: 0.0058, marketCap: 510_000_000, fdv: 510_000_000, liquidityUsd: 3_200_000, volumeH24: 42_000_000, volumeH1: 2_100_000, volumeH6: 12_000_000, volumeM5: 350_000, txnsBuysH24: 38_000, txnsSellsH24: 32_000, txnsBuysH1: 1_800, txnsSellsH1: 1_500, priceChangeH1: 4.5, priceChangeH6: 9.2, priceChangeH24: -3.1, priceChangeM5: 1.8, pairCreatedAt: 1710000000000, priceNative: 0.0000391, websites: [], socials: [] },
  { tokenAddress: "rndrizKT3MK1iimdxRdWabcF7Zg7AR5T4nud4EkHBof", pairAddress: "rndr-sol-raydium", symbol: "RENDER", name: "Render Token", imageUrl: null, priceUsd: 7.42, marketCap: 3_850_000_000, fdv: 3_850_000_000, liquidityUsd: 6_800_000, volumeH24: 125_000_000, volumeH1: 6_500_000, volumeH6: 32_000_000, volumeM5: 980_000, txnsBuysH24: 28_000, txnsSellsH24: 25_000, txnsBuysH1: 1_400, txnsSellsH1: 1_200, priceChangeH1: 0.8, priceChangeH6: 2.1, priceChangeH24: 5.7, priceChangeM5: 0.2, pairCreatedAt: 1690000000000, priceNative: 0.0501, websites: [], socials: [] },
  { tokenAddress: "HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3", pairAddress: "pyth-sol-raydium", symbol: "PYTH", name: "Pyth Network", imageUrl: null, priceUsd: 0.38, marketCap: 1_370_000_000, fdv: 1_370_000_000, liquidityUsd: 5_100_000, volumeH24: 78_000_000, volumeH1: 4_000_000, volumeH6: 20_000_000, volumeM5: 600_000, txnsBuysH24: 35_000, txnsSellsH24: 30_000, txnsBuysH1: 1_700, txnsSellsH1: 1_400, priceChangeH1: -0.7, priceChangeH6: 1.5, priceChangeH24: 3.9, priceChangeM5: 0.1, pairCreatedAt: 1700000000000, priceNative: 0.00256, websites: [], socials: [] },
  { tokenAddress: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", pairAddress: "usdt-sol-raydium", symbol: "USDT", name: "Tether USD", imageUrl: null, priceUsd: 1.0, marketCap: 35_000_000_000, fdv: 35_000_000_000, liquidityUsd: 85_000_000, volumeH24: 520_000_000, volumeH1: 25_000_000, volumeH6: 130_000_000, volumeM5: 2_000_000, txnsBuysH24: 280_000, txnsSellsH24: 275_000, txnsBuysH1: 13_000, txnsSellsH1: 12_800, priceChangeH1: 0, priceChangeH6: 0, priceChangeH24: 0.01, priceChangeM5: 0, pairCreatedAt: 1678000000000, priceNative: 0.0067, websites: [], socials: [] },
  { tokenAddress: "A3eME5CetyZPBoWbRUwY3tSe25S6tb18ba9ZPbWk9eFJ", pairAddress: "peng-sol-raydium", symbol: "PENG", name: "Peng", imageUrl: null, priceUsd: 0.45, marketCap: 420_000_000, fdv: 420_000_000, liquidityUsd: 2_800_000, volumeH24: 35_000_000, volumeH1: 1_800_000, volumeH6: 9_500_000, volumeM5: 280_000, txnsBuysH24: 28_000, txnsSellsH24: 24_000, txnsBuysH1: 1_300, txnsSellsH1: 1_100, priceChangeH1: 6.2, priceChangeH6: 14.5, priceChangeH24: 22.1, priceChangeM5: 2.3, pairCreatedAt: 1712000000000, priceNative: 0.00304, websites: [], socials: [] },
  { tokenAddress: "orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE", pairAddress: "orca-sol-raydium", symbol: "ORCA", name: "Orca", imageUrl: null, priceUsd: 3.85, marketCap: 195_000_000, fdv: 195_000_000, liquidityUsd: 3_500_000, volumeH24: 22_000_000, volumeH1: 1_100_000, volumeH6: 5_800_000, volumeM5: 170_000, txnsBuysH24: 18_000, txnsSellsH24: 15_000, txnsBuysH1: 850, txnsSellsH1: 720, priceChangeH1: -2.3, priceChangeH6: -1.1, priceChangeH24: 1.8, priceChangeM5: -0.5, pairCreatedAt: 1680000000000, priceNative: 0.026, websites: [], socials: [] },
];

const TAB_PARAM: Record<FilterTab, string> = {
  "Trending": "trending",
  "Top": "top",
  "Gainers": "gainers",
  "New Pairs": "new_pairs",
};

/**
 * Fetch tokens for a specific tab from the server-side /api/market-tokens route.
 * The server handles DexScreener calls + 60s caching.
 */
export async function fetchTabTokens(tab: FilterTab): Promise<MarketToken[]> {
  const res = await fetchWithTimeout(`/api/market-tokens?tab=${TAB_PARAM[tab]}`);
  if (!res.ok) throw new Error(`Market tokens API error: ${res.status}`);
  const data = await res.json();
  return data.tokens ?? [];
}

export async function fetchTrendingTokens(): Promise<MarketToken[]> {
  const cached = cache.get("trending");
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
    return cached.tokens;
  }

  try {
    // Step 1: Get boosted tokens (via local proxy to avoid CORS)
    const boostRes = await fetchWithTimeout("/api/dexscreener?type=boosts");
    if (!boostRes.ok) throw new Error(`Boost API error: ${boostRes.status}`);
    const boosts: BoostToken[] = await boostRes.json();

    // Filter Solana tokens and deduplicate addresses
    const seen = new Set<string>();
    const solanaAddresses: string[] = [];
    for (const b of boosts) {
      if (b.chainId === "solana" && !seen.has(b.tokenAddress)) {
        seen.add(b.tokenAddress);
        solanaAddresses.push(b.tokenAddress);
      }
    }

    if (solanaAddresses.length === 0) {
      throw new Error("No Solana tokens found in boost data");
    }

    // Step 2: Batch fetch pair data (max 30 per request)
    const allTokens: MarketToken[] = [];
    const seenBaseAddresses = new Set<string>();

    for (let i = 0; i < solanaAddresses.length; i += 30) {
      const batch = solanaAddresses.slice(i, i + 30);
      try {
        const pairRes = await fetchWithTimeout(
          `/api/dexscreener?type=pairs&addresses=${batch.join(",")}`
        );
        if (!pairRes.ok) continue;
        const pairData = await pairRes.json();
        const pairs: DexPair[] = pairData.pairs ?? [];

        for (const pair of pairs) {
          const addr = pair.baseToken.address;
          if (!seenBaseAddresses.has(addr)) {
            seenBaseAddresses.add(addr);
            allTokens.push(mapPairToToken(pair));
          }
        }
      } catch {
        // Skip failed batches
        continue;
      }
    }

    if (allTokens.length === 0) {
      throw new Error("No token data returned from API");
    }

    cache.set("trending", { tokens: allTokens, fetchedAt: Date.now() });
    return allTokens;
  } catch (e) {
    // If we have stale cache, use it rather than showing fallback
    const stale = cache.get("trending");
    if (stale && stale.tokens.length > 0) {
      return stale.tokens;
    }
    // Use fallback mock data so the page isn't empty
    console.warn("DexScreener API unavailable, using fallback data:", e instanceof Error ? e.message : e);
    return FALLBACK_TOKENS;
  }
}

const SOLANA_ADDRESS_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

/**
 * Search DexScreener for tokens by name/symbol/address.
 * Returns Solana-only results mapped to MarketToken[].
 */
export async function searchMarketTokens(query: string): Promise<MarketToken[]> {
  const q = query.trim();
  if (!q) return [];

  // If it looks like a Solana address, fetch pair data by address
  if (SOLANA_ADDRESS_RE.test(q)) {
    const res = await fetchWithTimeout(`/api/dexscreener?type=pairs&addresses=${q}`);
    if (!res.ok) return [];
    const data = await res.json();
    const pairs: DexPair[] = data.pairs ?? [];
    const solPairs = pairs.filter((p: DexPair & { chainId?: string }) =>
      (p as DexPair & { chainId?: string }).chainId === "solana" || !("chainId" in p)
    );
    const seen = new Set<string>();
    const tokens: MarketToken[] = [];
    for (const pair of solPairs) {
      if (!seen.has(pair.baseToken.address)) {
        seen.add(pair.baseToken.address);
        tokens.push(mapPairToToken(pair));
      }
    }
    return tokens;
  }

  // Otherwise, search by name/symbol
  const res = await fetchWithTimeout(`/api/dexscreener?type=search&q=${encodeURIComponent(q)}`);
  if (!res.ok) return [];
  const data = await res.json();
  const pairs: (DexPair & { chainId?: string })[] = data.pairs ?? [];

  const solPairs = pairs.filter((p) => p.chainId === "solana");
  const seen = new Set<string>();
  const tokens: MarketToken[] = [];
  for (const pair of solPairs) {
    if (!seen.has(pair.baseToken.address)) {
      seen.add(pair.baseToken.address);
      tokens.push(mapPairToToken(pair));
    }
  }
  return tokens;
}

interface ProfileToken {
  tokenAddress: string;
  chainId: string;
}

/**
 * Fetch latest token profiles from DexScreener, then batch-load pair data.
 * Used for the "New Pairs" tab.
 */
export async function fetchNewPairs(): Promise<MarketToken[]> {
  const cached = cache.get("newpairs");
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
    return cached.tokens;
  }

  const profileRes = await fetchWithTimeout("/api/dexscreener?type=profiles");
  if (!profileRes.ok) throw new Error(`Profiles API error: ${profileRes.status}`);
  const profiles: ProfileToken[] = await profileRes.json();

  const seen = new Set<string>();
  const solAddresses: string[] = [];
  for (const p of profiles) {
    if (p.chainId === "solana" && !seen.has(p.tokenAddress)) {
      seen.add(p.tokenAddress);
      solAddresses.push(p.tokenAddress);
    }
  }

  if (solAddresses.length === 0) throw new Error("No Solana tokens in profiles");

  const allTokens: MarketToken[] = [];
  const seenBase = new Set<string>();

  for (let i = 0; i < Math.min(solAddresses.length, 60); i += 30) {
    const batch = solAddresses.slice(i, i + 30);
    try {
      const pairRes = await fetchWithTimeout(
        `/api/dexscreener?type=pairs&addresses=${batch.join(",")}`
      );
      if (!pairRes.ok) continue;
      const pairData = await pairRes.json();
      const pairs: DexPair[] = pairData.pairs ?? [];
      for (const pair of pairs) {
        if (!seenBase.has(pair.baseToken.address)) {
          seenBase.add(pair.baseToken.address);
          allTokens.push(mapPairToToken(pair));
        }
      }
    } catch {
      continue;
    }
  }

  // Sort newest first
  allTokens.sort((a, b) => b.pairCreatedAt - a.pairCreatedAt);

  if (allTokens.length > 0) {
    cache.set("newpairs", { tokens: allTokens, fetchedAt: Date.now() });
  }
  return allTokens;
}

function getPriceChangeForTimeframe(token: MarketToken, timeframe: Timeframe): number {
  switch (timeframe) {
    case "1H": return token.priceChangeH1 ?? 0;
    case "24H": return token.priceChangeH24 ?? 0;
    // 7D and 1M not available — fall back to 24H
    case "7D": return token.priceChangeH24 ?? 0;
    case "1M": return token.priceChangeH24 ?? 0;
  }
}

export function getTokensForTab(
  tokens: MarketToken[],
  tab: FilterTab,
  timeframe: Timeframe
): MarketToken[] {
  const sorted = [...tokens];
  switch (tab) {
    case "Trending":
      // Keep original boost order
      return sorted;
    case "Top":
      return sorted.sort((a, b) => b.marketCap - a.marketCap);
    case "Gainers":
      return sorted.sort(
        (a, b) => getPriceChangeForTimeframe(b, timeframe) - getPriceChangeForTimeframe(a, timeframe)
      );
    case "New Pairs":
      return sorted.sort((a, b) => b.pairCreatedAt - a.pairCreatedAt);
  }
}
