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

export async function fetchTrendingTokens(): Promise<MarketToken[]> {
  const cached = cache.get("trending");
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
    return cached.tokens;
  }

  // Step 1: Get boosted tokens (via local proxy to avoid CORS)
  const boostRes = await fetch("/api/dexscreener?type=boosts");
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

  // Step 2: Batch fetch pair data (max 30 per request)
  const allTokens: MarketToken[] = [];
  const seenBaseAddresses = new Set<string>();

  for (let i = 0; i < solanaAddresses.length; i += 30) {
    const batch = solanaAddresses.slice(i, i + 30);
    const pairRes = await fetch(
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
  }

  cache.set("trending", { tokens: allTokens, fetchedAt: Date.now() });
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
