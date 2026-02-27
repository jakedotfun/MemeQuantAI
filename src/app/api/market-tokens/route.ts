import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const FETCH_TIMEOUT = 10_000;
const CACHE_TTL = 60_000; // 60 seconds
const MAX_TOKENS = 150;

// ── Types (same shape as frontend MarketToken) ─────────────────────

interface MarketToken {
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

interface DexPair {
  chainId?: string;
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

// ── Helpers ─────────────────────────────────────────────────────────

function mapPair(pair: DexPair): MarketToken {
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

function dedupeByAddress(tokens: MarketToken[]): MarketToken[] {
  const seen = new Set<string>();
  return tokens.filter((t) => {
    if (seen.has(t.tokenAddress)) return false;
    seen.add(t.tokenAddress);
    return true;
  });
}

function fetchDS(url: string): Promise<Response> {
  return fetch(url, { cache: "no-store", signal: AbortSignal.timeout(FETCH_TIMEOUT) });
}

/** Batch-fetch pair data for a list of token addresses (30 at a time). */
async function batchFetchPairs(addresses: string[]): Promise<MarketToken[]> {
  const allTokens: MarketToken[] = [];
  for (let i = 0; i < addresses.length; i += 30) {
    const batch = addresses.slice(i, i + 30);
    try {
      const res = await fetchDS(
        `https://api.dexscreener.com/latest/dex/tokens/${batch.join(",")}`,
      );
      if (!res.ok) continue;
      const data = await res.json();
      const pairs: DexPair[] = data.pairs ?? [];
      for (const pair of pairs) {
        allTokens.push(mapPair(pair));
      }
    } catch {
      continue;
    }
  }
  return dedupeByAddress(allTokens);
}

// ── Shared: extract Solana addresses from boost/profile lists ────────

async function fetchSolanaBoostAddresses(): Promise<string[]> {
  const res = await fetchDS("https://api.dexscreener.com/token-boosts/top/v1");
  if (!res.ok) throw new Error(`Boost API error: ${res.status}`);
  const boosts: { tokenAddress: string; chainId: string }[] = await res.json();

  const seen = new Set<string>();
  const addresses: string[] = [];
  for (const b of boosts) {
    if (b.chainId === "solana" && !seen.has(b.tokenAddress)) {
      seen.add(b.tokenAddress);
      addresses.push(b.tokenAddress);
    }
  }
  return addresses;
}

async function fetchSolanaProfileAddresses(): Promise<string[]> {
  const res = await fetchDS("https://api.dexscreener.com/token-profiles/latest/v1");
  if (!res.ok) throw new Error(`Profiles API error: ${res.status}`);
  const profiles: { tokenAddress: string; chainId: string }[] = await res.json();

  const seen = new Set<string>();
  const addresses: string[] = [];
  for (const p of profiles) {
    if (p.chainId === "solana" && !seen.has(p.tokenAddress)) {
      seen.add(p.tokenAddress);
      addresses.push(p.tokenAddress);
    }
  }
  return addresses;
}

// ── Per-tab fetchers ────────────────────────────────────────────────

async function fetchTrending(): Promise<MarketToken[]> {
  const addresses = await fetchSolanaBoostAddresses();
  if (addresses.length === 0) return [];
  // Keep original boost ordering (most boosted first)
  return batchFetchPairs(addresses.slice(0, MAX_TOKENS));
}

async function fetchTop(): Promise<MarketToken[]> {
  // Combine boosts + profiles for a larger pool, then sort by volume
  const [boostAddrs, profileAddrs] = await Promise.all([
    fetchSolanaBoostAddresses().catch(() => [] as string[]),
    fetchSolanaProfileAddresses().catch(() => [] as string[]),
  ]);

  const seen = new Set<string>();
  const combined: string[] = [];
  for (const addr of [...boostAddrs, ...profileAddrs]) {
    if (!seen.has(addr)) {
      seen.add(addr);
      combined.push(addr);
    }
  }
  if (combined.length === 0) return [];

  const tokens = await batchFetchPairs(combined.slice(0, MAX_TOKENS));
  tokens.sort((a, b) => b.volumeH24 - a.volumeH24);
  return tokens;
}

async function fetchGainers(): Promise<MarketToken[]> {
  // Same large pool, sorted by 24h price change
  const [boostAddrs, profileAddrs] = await Promise.all([
    fetchSolanaBoostAddresses().catch(() => [] as string[]),
    fetchSolanaProfileAddresses().catch(() => [] as string[]),
  ]);

  const seen = new Set<string>();
  const combined: string[] = [];
  for (const addr of [...boostAddrs, ...profileAddrs]) {
    if (!seen.has(addr)) {
      seen.add(addr);
      combined.push(addr);
    }
  }
  if (combined.length === 0) return [];

  const tokens = await batchFetchPairs(combined.slice(0, MAX_TOKENS));
  tokens.sort((a, b) => (b.priceChangeH24 ?? 0) - (a.priceChangeH24 ?? 0));
  return tokens;
}

async function fetchNewPairs(): Promise<MarketToken[]> {
  const addresses = await fetchSolanaProfileAddresses();
  if (addresses.length === 0) return [];

  const tokens = await batchFetchPairs(addresses.slice(0, MAX_TOKENS));
  tokens.sort((a, b) => b.pairCreatedAt - a.pairCreatedAt);
  return tokens;
}

// ── Cache ───────────────────────────────────────────────────────────

interface CacheEntry {
  data: MarketToken[];
  fetchedAt: number;
}

const tabCache = new Map<string, CacheEntry>();

// ── Route handler ───────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const tab = req.nextUrl.searchParams.get("tab") || "trending";

  // Return cache if fresh
  const cached = tabCache.get(tab);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
    return NextResponse.json({ tokens: cached.data });
  }

  try {
    let tokens: MarketToken[];
    switch (tab) {
      case "trending":  tokens = await fetchTrending();  break;
      case "top":       tokens = await fetchTop();       break;
      case "gainers":   tokens = await fetchGainers();   break;
      case "new_pairs": tokens = await fetchNewPairs();  break;
      default:          tokens = await fetchTrending();  break;
    }

    tabCache.set(tab, { data: tokens, fetchedAt: Date.now() });
    return NextResponse.json({ tokens });
  } catch (err) {
    console.error(`[market-tokens] Error fetching tab="${tab}":`, err);
    // Return stale cache if available
    if (cached) {
      return NextResponse.json({ tokens: cached.data });
    }
    return NextResponse.json({
      tokens: [],
      error: err instanceof Error ? err.message : "Failed to load tokens",
    });
  }
}
