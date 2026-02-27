const FETCH_TIMEOUT = 8000;
const SOL_MINT = "So11111111111111111111111111111111111111112";

export interface TokenResult {
  name: string;
  symbol: string;
  address: string;
  priceUsd: string;
  marketCap: number;
  volume24h: number;
  priceChange24h: number;
  liquidity: number;
  pairAddress: string;
  dexscreenerUrl: string;
  jupiterVerified?: boolean;
}

interface DexPair {
  chainId: string;
  pairAddress: string;
  baseToken: { address: string; symbol: string; name: string };
  quoteToken?: { address: string; symbol: string; name: string };
  priceUsd?: string;
  marketCap?: number;
  fdv?: number;
  liquidity?: { usd?: number };
  volume?: { h24?: number };
  priceChange?: { h24?: number };
  url?: string;
}

/**
 * Extract the non-SOL token mint from a pair.
 * If baseToken is SOL → the real token is quoteToken.
 * If baseToken is NOT SOL → the real token is baseToken.
 */
function extractTokenFromPair(pair: DexPair): { address: string; symbol: string; name: string } {
  if (pair.baseToken.address === SOL_MINT && pair.quoteToken) {
    return pair.quoteToken;
  }
  return pair.baseToken;
}

function mapPair(pair: DexPair): TokenResult {
  const token = extractTokenFromPair(pair);
  return {
    name: token.name,
    symbol: token.symbol,
    address: token.address,
    priceUsd: pair.priceUsd ?? "0",
    marketCap: pair.marketCap ?? pair.fdv ?? 0,
    volume24h: pair.volume?.h24 ?? 0,
    priceChange24h: pair.priceChange?.h24 ?? 0,
    liquidity: pair.liquidity?.usd ?? 0,
    pairAddress: pair.pairAddress,
    dexscreenerUrl: pair.url ?? `https://dexscreener.com/solana/${pair.pairAddress}`,
  };
}

function dedupeByAddress(tokens: TokenResult[]): TokenResult[] {
  const seen = new Set<string>();
  return tokens.filter((t) => {
    // Never return SOL mint as a "token" result
    if (t.address === SOL_MINT) return false;
    if (seen.has(t.address)) return false;
    seen.add(t.address);
    return true;
  });
}

/**
 * Validate a token mint is tradeable on Jupiter by requesting a quote.
 * Returns true if Jupiter can route a trade for this token.
 */
async function validateWithJupiter(mintAddress: string): Promise<boolean> {
  try {
    const headers: Record<string, string> = {};
    const apiKey = process.env.JUPITER_API_KEY;
    if (apiKey) headers["x-api-key"] = apiKey;

    const url = `https://api.jup.ag/swap/v1/quote?inputMint=${SOL_MINT}&outputMint=${mintAddress}&amount=10000000&slippageBps=300`;
    const res = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(8000),
    });

    if (res.status !== 200) return false;
    const data = await res.json();
    return !!data.outAmount && data.outAmount !== "0";
  } catch {
    // On timeout/error, don't block — just skip validation
    return true;
  }
}

export async function searchToken(query: string): Promise<TokenResult[]> {
  const res = await fetch(
    `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(query)}`,
    { cache: "no-store", signal: AbortSignal.timeout(FETCH_TIMEOUT) }
  );
  if (!res.ok) return [];
  const data = await res.json();
  const pairs: DexPair[] = data.pairs ?? [];

  const solPairs = pairs
    .filter((p) => p.chainId === "solana")
    .sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0));

  const candidates = dedupeByAddress(solPairs.map(mapPair)).slice(0, 5);

  // Validate top candidates with Jupiter (try up to 3 tradeable)
  const verified: TokenResult[] = [];
  for (const token of candidates) {
    if (verified.length >= 3) break;
    const tradeable = await validateWithJupiter(token.address);
    if (tradeable) {
      token.jupiterVerified = true;
      verified.push(token);
    } else {
      console.log(`[DexLookup] Skipping ${token.symbol} (${token.address.slice(0, 8)}...) — not tradeable on Jupiter`);
    }
  }

  // If Jupiter validation filtered everything out, return unvalidated candidates as fallback
  if (verified.length === 0 && candidates.length > 0) {
    return candidates.slice(0, 3);
  }

  return verified;
}

export async function lookupByAddress(address: string): Promise<TokenResult[]> {
  const res = await fetch(
    `https://api.dexscreener.com/tokens/v1/solana/${address}`,
    { cache: "no-store", signal: AbortSignal.timeout(FETCH_TIMEOUT) }
  );
  if (!res.ok) return [];
  const pairs: DexPair[] = await res.json();

  const solPairs = (Array.isArray(pairs) ? pairs : [])
    .filter((p) => p.chainId === "solana")
    .sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0));

  return dedupeByAddress(solPairs.map(mapPair)).slice(0, 3);
}

/**
 * Detect if a user message is asking about a token and extract the query.
 * Returns null if no token lookup is needed.
 */
export function extractTokenQuery(message: string): { query: string; isAddress: boolean } | null {
  // $TICKER pattern (e.g. "$BONK", "$WIF", "$MARIOCOIN")
  const tickerMatch = message.match(/\$([A-Za-z][A-Za-z0-9]{0,19})\b/);
  if (tickerMatch) {
    return { query: tickerMatch[1], isAddress: false };
  }

  // Solana address pattern (base58, 32-44 chars)
  const addrMatch = message.match(/\b([1-9A-HJ-NP-Za-km-z]{32,44})\b/);
  if (addrMatch) {
    return { query: addrMatch[1], isAddress: true };
  }

  // "price of X", "check X", "look up X", "what is X", "tell me about X"
  const phraseMatch = message.match(
    /(?:price\s+of|check|look\s*up|search|what(?:'s| is)\s+(?:the\s+)?(?:price\s+(?:of|for)\s+)?|tell\s+me\s+about|info\s+on)\s+([A-Za-z][A-Za-z0-9\s]{0,29})/i
  );
  if (phraseMatch) {
    const token = phraseMatch[1].trim();
    // Skip generic phrases that aren't token names
    if (token.length >= 2 && !/^(my|the|this|that|it|a|an)\b/i.test(token)) {
      return { query: token, isAddress: false };
    }
  }

  // "CA" or "contract address" followed by something
  const caMatch = message.match(/(?:CA|contract\s+address)\s+(?:of|for)\s+([A-Za-z][A-Za-z0-9]{0,19})/i);
  if (caMatch) {
    return { query: caMatch[1], isAddress: false };
  }

  return null;
}

export function formatTokenContext(tokens: TokenResult[]): string {
  if (tokens.length === 0) {
    return "\nTOKEN LOOKUP: No matching Solana token found on DexScreener. Let the user know you couldn't find it.";
  }

  const entries = tokens.map((t, i) => {
    const changeSign = t.priceChange24h >= 0 ? "+" : "";
    const verified = t.jupiterVerified ? " [Jupiter verified]" : "";
    return `Result ${i + 1}:
  Name: ${t.name}
  Symbol: ${t.symbol}
  Contract Address: ${t.address}${verified}
  Price: $${t.priceUsd}
  Market Cap: $${t.marketCap.toLocaleString()}
  24h Volume: $${t.volume24h.toLocaleString()}
  24h Change: ${changeSign}${t.priceChange24h.toFixed(2)}%
  Liquidity: $${t.liquidity.toLocaleString()}
  DexScreener: ${t.dexscreenerUrl}`;
  });

  return `

TOKEN LOOKUP (real-time data from DexScreener):
${entries.join("\n\n")}

IMPORTANT: When trading, use the EXACT contract address shown above. The first result is the best match (highest liquidity, Jupiter-verified). NEVER modify or fabricate addresses.`;
}

// ─── Trade intent helpers ────────────────────────────────────────────

export interface TradeIntent {
  action: "BUY" | "SELL";
  token: string;        // ticker or address extracted from the message
  amountUsd?: number;
  amountSol?: number;
  amountPct?: number;   // e.g. "sell 50% of BONK"
}

/**
 * Detect buy/sell intent from a user message.
 * Examples: "buy $5 of BONK", "sell BONK", "swap 0.1 SOL for WIF"
 */
export function extractTradeIntent(message: string): TradeIntent | null {
  const msg = message.trim();

  // "buy $5 of BONK" / "buy 5 usd of BONK" / "buy $5 BONK"
  const buyUsd = msg.match(
    /\b(?:buy|purchase|get|grab|ape(?:\s+into)?)\s+\$?([\d.]+)\s*(?:usd|dollars?)?\s*(?:of|worth\s+of)?\s+\$?([A-Za-z][A-Za-z0-9]{0,19})\b/i
  );
  if (buyUsd) {
    return { action: "BUY", token: buyUsd[2], amountUsd: parseFloat(buyUsd[1]) };
  }

  // "buy 0.1 SOL of BONK" / "swap 0.5 sol for WIF"
  const buySol = msg.match(
    /\b(?:buy|purchase|swap|get)\s+([\d.]+)\s*sol\s*(?:of|for|into|worth\s+of)\s+\$?([A-Za-z][A-Za-z0-9]{0,19})\b/i
  );
  if (buySol) {
    return { action: "BUY", token: buySol[2], amountSol: parseFloat(buySol[1]) };
  }

  // "sell BONK" / "sell 50% of BONK" / "sell all BONK"
  const sell = msg.match(
    /\b(?:sell|dump|exit)\s+(?:(all|\d+%?)\s+(?:of\s+)?)?\$?([A-Za-z][A-Za-z0-9]{0,19})\b/i
  );
  if (sell) {
    const pctRaw = sell[1];
    let amountPct = 100;
    if (pctRaw && pctRaw.toLowerCase() !== "all") {
      amountPct = parseInt(pctRaw, 10);
    }
    return { action: "SELL", token: sell[2], amountPct };
  }

  // "buy BONK" with no amount (agent should ask for amount)
  const buyBare = msg.match(
    /\b(?:buy|purchase|get|grab|ape(?:\s+into)?)\s+\$?([A-Za-z][A-Za-z0-9]{0,19})\b/i
  );
  if (buyBare) {
    return { action: "BUY", token: buyBare[1] };
  }

  return null;
}

// ─── Transfer intent helpers ─────────────────────────────────────────

export interface TransferIntent {
  toAddress: string;
  amount: number;
  tokenSymbol?: string;  // if undefined → SOL transfer
}

const SOLANA_ADDR_RE = /[1-9A-HJ-NP-Za-km-z]{32,44}/;

/**
 * Detect transfer/send intent from a user message.
 * Examples:
 *   "send 0.05 SOL to CyZUM4a..."
 *   "transfer 100 BONK to 9xEz..."
 *   "withdraw 0.5 sol to CyZUM4a..."
 */
export function extractTransferIntent(message: string): TransferIntent | null {
  const msg = message.trim();

  // "send/transfer/withdraw <amount> <TOKEN> to <address>"
  const match = msg.match(
    new RegExp(
      `\\b(?:send|transfer|withdraw)\\s+([\\d.]+)\\s+([A-Za-z][A-Za-z0-9]{0,19})\\s+to\\s+(${SOLANA_ADDR_RE.source})`,
      "i",
    ),
  );
  if (match) {
    const amount = parseFloat(match[1]);
    const token = match[2].toUpperCase();
    const toAddress = match[3];
    if (amount > 0 && toAddress) {
      if (token === "SOL") {
        return { toAddress, amount };
      }
      return { toAddress, amount, tokenSymbol: token };
    }
  }

  return null;
}

const CONFIRM_WORDS = /^(?:yes|yeah|yep|yup|confirm|do\s+it|go\s+ahead|sure|execute|send\s+it|let'?s?\s+go|ok|okay|proceed|absolutely|affirmative)$/i;

/**
 * Check if a message is a short confirmation.
 */
export function extractConfirmation(message: string): boolean {
  return CONFIRM_WORDS.test(message.trim());
}
