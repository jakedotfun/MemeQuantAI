import { VersionedTransaction } from "@solana/web3.js";
import { getAgentKeypair } from "@/lib/agent-wallet";
import { getConnection, withRetry } from "@/lib/solana";

// Official Jupiter paid API (requires x-api-key header)
const JUPITER_API = "https://api.jup.ag/swap/v1";
const SOL_MINT = "So11111111111111111111111111111111111111112";
const MIN_TRADE_LAMPORTS = 10_000; // ~$0.001 SOL — practical minimum

export { SOL_MINT };

export interface SwapParams {
  walletAddress: string;
  inputMint: string;
  outputMint: string;
  amountLamports: number;
  slippageBps?: number;
}

export interface SwapResult {
  status: "SUCCESS" | "FAILED";
  txHash?: string;
  solscanUrl?: string;
  error?: string;
}

/** Headers for all Jupiter API calls — includes API key for paid tier. */
function jupiterHeaders(extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = {};
  const apiKey = process.env.JUPITER_API_KEY;
  if (apiKey) {
    headers["x-api-key"] = apiKey;
  }
  if (extra) Object.assign(headers, extra);
  return headers;
}

/** Fetch with 30s timeout — avoids hanging forever on DNS/network issues. */
async function jupiterFetch(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    const existingHeaders = (init?.headers as Record<string, string>) ?? {};
    return await fetch(url, {
      ...init,
      headers: { ...jupiterHeaders(), ...existingHeaders },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Try Jupiter quote with escalating slippage: 300 → 500 → 1000 bps.
 * Returns the quote + actual slippage used.
 */
async function getQuoteWithSlippageEscalation(
  inputMint: string,
  outputMint: string,
  amount: number,
  initialSlippage: number,
): Promise<{ quote: Record<string, unknown>; slippageBps: number }> {
  const slippageLevels = [initialSlippage, 500, 1000].filter(
    (s, i, arr) => i === 0 || s > arr[i - 1],
  );

  for (const slippageBps of slippageLevels) {
    const quoteUrl = `${JUPITER_API}/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=${slippageBps}&restrictIntermediateTokens=true`;
    console.log(`[SWAP]   Trying quote with slippage=${slippageBps}bps...`);
    console.log(`[SWAP]   URL: ${quoteUrl}`);

    try {
      const res = await withRetry(`Jupiter quote (${slippageBps}bps)`, async () => {
        const r = await jupiterFetch(quoteUrl);
        if (!r.ok) {
          const body = await r.text().catch(() => "");
          console.error(`[SWAP]   Quote response ${r.status}: ${body}`);
          // "No route" means the token isn't tradeable on Jupiter
          if (r.status === 400 && (body.includes("No route") || body.includes("ROUTE_NOT_FOUND") || body.includes("could not find any routes"))) {
            throw new NoRouteError(body);
          }
          throw new Error(`HTTP ${r.status}: ${body}`);
        }
        return r;
      }, 3, 2000);

      const quote = await res.json();
      console.log(`[SWAP]   Full quote response keys: ${Object.keys(quote).join(", ")}`);

      if (!quote.outAmount || quote.outAmount === "0") {
        console.log(`[SWAP]   Quote returned 0 output at ${slippageBps}bps, trying higher slippage...`);
        continue;
      }

      return { quote, slippageBps };
    } catch (err) {
      if (err instanceof NoRouteError) throw err;
      // If this slippage level failed, try the next one
      if (slippageBps === slippageLevels[slippageLevels.length - 1]) throw err;
      console.log(`[SWAP]   Quote failed at ${slippageBps}bps, escalating...`);
    }
  }

  throw new Error("All slippage levels exhausted — could not get a valid Jupiter quote.");
}

/** Sentinel error for "no Jupiter route" so we can give a specific message. */
class NoRouteError extends Error {
  constructor(detail: string) {
    super(detail);
    this.name = "NoRouteError";
  }
}

export async function executeSwap(params: SwapParams): Promise<SwapResult> {
  const { walletAddress, inputMint, outputMint, amountLamports, slippageBps = 300 } = params;

  console.log("[SWAP] ════════════════════════════════════════");
  console.log("[SWAP] Starting swap");
  console.log("[SWAP]   Wallet:", walletAddress);
  console.log("[SWAP]   Input mint:", inputMint);
  console.log("[SWAP]   Output mint:", outputMint);
  console.log("[SWAP]   Amount (lamports):", amountLamports);
  console.log("[SWAP]   Slippage (bps):", slippageBps);
  console.log("[SWAP]   Jupiter API:", JUPITER_API);
  console.log("[SWAP]   API key present:", !!process.env.JUPITER_API_KEY);

  // ── Validate amount ──
  if (amountLamports < MIN_TRADE_LAMPORTS) {
    return { status: "FAILED", error: `Trade amount too small. Minimum is ${MIN_TRADE_LAMPORTS} lamports (~$0.001). Please try a larger amount.` };
  }

  // ── Step 1: Load keypair ──
  console.log("[SWAP] Step 1: Loading keypair...");
  const keypair = getAgentKeypair(walletAddress);
  if (!keypair) {
    console.error("[SWAP] FAIL Step 1: Wallet not found for:", walletAddress);
    return { status: "FAILED", error: "Wallet not found. Deploy your agent first." };
  }
  const derivedAddress = keypair.publicKey.toBase58();
  console.log("[SWAP] Step 1 OK: Keypair loaded, pubkey =", derivedAddress);
  if (derivedAddress !== walletAddress) {
    console.error("[SWAP] FAIL Step 1: KEY MISMATCH! Stored:", walletAddress, "Derived:", derivedAddress);
    return { status: "FAILED", error: "Wallet keypair mismatch." };
  }

  // ── Step 2: Check balance ──
  console.log("[SWAP] Step 2: Checking SOL balance...");
  const connection = getConnection();
  let balanceLamports: number;
  try {
    balanceLamports = await withRetry("getBalance", () => connection.getBalance(keypair.publicKey));
  } catch (err) {
    console.error("[SWAP] FAIL Step 2: RPC getBalance error:", err);
    return { status: "FAILED", error: `RPC error checking balance: ${err instanceof Error ? err.message : String(err)}` };
  }
  const solBalance = balanceLamports / 1e9;
  const tradeAmountSol = amountLamports / 1e9;
  const gasReserve = 0.005;
  console.log("[SWAP] Step 2 OK: Balance =", solBalance, "SOL, trade =", tradeAmountSol, "SOL");

  if (inputMint === SOL_MINT) {
    if (solBalance < tradeAmountSol + gasReserve) {
      const needed = tradeAmountSol + gasReserve;
      const maxTrade = Math.max(0, solBalance - gasReserve);
      return {
        status: "FAILED",
        error: `Insufficient SOL balance. You have ${solBalance.toFixed(4)} SOL but need ${needed.toFixed(4)} SOL (trade + gas). Max you can trade: ${maxTrade.toFixed(4)} SOL.`,
      };
    }
    if (tradeAmountSol > solBalance * 0.5) {
      return {
        status: "FAILED",
        error: `Trade exceeds 50% of wallet balance (${solBalance.toFixed(4)} SOL). Max per trade: ${(solBalance * 0.5).toFixed(4)} SOL.`,
      };
    }
  }

  // ── Step 3: Jupiter Quote (with slippage escalation) ──
  console.log("[SWAP] Step 3: Fetching Jupiter quote...");
  let quote: Record<string, unknown>;
  let usedSlippage: number;
  try {
    const result = await getQuoteWithSlippageEscalation(inputMint, outputMint, amountLamports, slippageBps);
    quote = result.quote;
    usedSlippage = result.slippageBps;
  } catch (err) {
    console.error("[SWAP] FAIL Step 3: Jupiter quote error:", err);
    if (err instanceof NoRouteError) {
      return {
        status: "FAILED",
        error: "This token isn't available on Jupiter yet. It may be too new or only on pump.fun.",
      };
    }
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("fetch failed") || msg.includes("ENOTFOUND") || msg.includes("ECONNREFUSED")) {
      return { status: "FAILED", error: `Cannot reach Jupiter API. Network error: ${msg}` };
    }
    return { status: "FAILED", error: `Jupiter quote failed: ${msg}` };
  }
  console.log("[SWAP] Step 3 OK: Got quote, outAmount =", quote.outAmount, ", slippage =", usedSlippage, "bps");

  // ── Step 4: Jupiter Swap transaction (official docs format) ──
  console.log("[SWAP] Step 4: Requesting swap transaction...");
  let swapData: Record<string, unknown>;
  try {
    const swapBody = {
      userPublicKey: keypair.publicKey.toBase58(),
      quoteResponse: quote,
      wrapAndUnwrapSol: true,
      dynamicComputeUnitLimit: true,
      dynamicSlippage: true,
      prioritizationFeeLamports: {
        priorityLevelWithMaxLamports: {
          priorityLevel: "veryHigh",
          maxLamports: 1000000,
        },
      },
    };

    console.log("[SWAP]   Swap body keys:", Object.keys(swapBody).join(", "));

    const swapRes = await withRetry("Jupiter swap tx", async () => {
      const res = await jupiterFetch(`${JUPITER_API}/swap`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(swapBody),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        console.error(`[SWAP]   Swap response ${res.status}: ${body}`);
        throw new Error(`HTTP ${res.status}: ${body}`);
      }
      return res;
    }, 3, 2000);
    swapData = await swapRes.json();
  } catch (err) {
    console.error("[SWAP] FAIL Step 4: Jupiter swap transaction error:", err);
    return { status: "FAILED", error: `Jupiter swap transaction failed: ${err instanceof Error ? err.message : String(err)}` };
  }
  if (!swapData.swapTransaction) {
    console.error("[SWAP] FAIL Step 4: No swapTransaction. Full response:", JSON.stringify(swapData).substring(0, 500));
    return { status: "FAILED", error: "Jupiter returned no swap transaction." };
  }
  console.log("[SWAP] Step 4 OK: Got swapTransaction (base64 length:", (swapData.swapTransaction as string).length, ")");
  console.log("[SWAP]   lastValidBlockHeight:", swapData.lastValidBlockHeight);

  // ── Step 5: Deserialize, sign, send ──
  console.log("[SWAP] Step 5: Deserializing, signing, sending...");
  let txHash: string;
  try {
    const txBuf = Buffer.from(swapData.swapTransaction as string, "base64");
    const tx = VersionedTransaction.deserialize(txBuf);
    console.log("[SWAP]   Deserialized OK, version:", tx.version);

    tx.sign([keypair]);
    console.log("[SWAP]   Signed OK");

    const rawTx = tx.serialize();
    console.log("[SWAP]   Sending to RPC... (", rawTx.length, "bytes)");

    txHash = await withRetry("sendRawTransaction", () =>
      connection.sendRawTransaction(rawTx, {
        skipPreflight: true,
        maxRetries: 3,
      }),
    );
  } catch (err) {
    console.error("[SWAP] FAIL Step 5:", err);
    if (err instanceof Error) {
      console.error("[SWAP]   Stack:", err.stack);
      if (err.message.includes("Blockhash not found")) {
        return { status: "FAILED", error: "Transaction expired (blockhash not found). Please try again." };
      }
      if (err.message.includes("insufficient") || err.message.includes("0x1")) {
        return { status: "FAILED", error: `Insufficient funds for this trade: ${err.message}` };
      }
      if (err.message.includes("SlippageToleranceExceeded") || err.message.includes("0x1771")) {
        return { status: "FAILED", error: "Transaction failed: slippage exceeded. The token price moved too fast. Try again." };
      }
    }
    return { status: "FAILED", error: `Transaction send failed: ${err instanceof Error ? err.message : String(err)}` };
  }
  console.log("[SWAP] Step 5 OK: Sent! Signature:", txHash);

  // ── Step 6: Confirm (use lastValidBlockHeight from swap response if available) ──
  console.log("[SWAP] Step 6: Confirming transaction...");
  try {
    const lastValidBlockHeight = swapData.lastValidBlockHeight as number | undefined;
    let confirmParams: { signature: string; blockhash: string; lastValidBlockHeight: number };

    if (lastValidBlockHeight) {
      // Use the blockhash/height from Jupiter's swap response for more reliable confirmation
      const latestBlockhash = await withRetry("getLatestBlockhash", () =>
        connection.getLatestBlockhash("confirmed"),
      );
      confirmParams = {
        signature: txHash,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight,
      };
    } else {
      const latestBlockhash = await withRetry("getLatestBlockhash", () =>
        connection.getLatestBlockhash("confirmed"),
      );
      confirmParams = {
        signature: txHash,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      };
    }

    const confirmation = await connection.confirmTransaction(confirmParams, "confirmed");

    if (confirmation.value.err) {
      const errStr = JSON.stringify(confirmation.value.err);
      console.error("[SWAP] FAIL Step 6: On-chain error:", errStr);
      if (errStr.includes("0x1771") || errStr.includes("6001")) {
        return {
          status: "FAILED",
          txHash,
          solscanUrl: `https://solscan.io/tx/${txHash}`,
          error: "Transaction failed: slippage exceeded. The token price moved too fast. Try again.",
        };
      }
      return {
        status: "FAILED",
        txHash,
        solscanUrl: `https://solscan.io/tx/${txHash}`,
        error: `Transaction failed on-chain: ${errStr}`,
      };
    }
  } catch (err) {
    // Confirmation failed — report as FAILED (never claim success without confirmation)
    console.error("[SWAP] FAIL Step 6: Confirmation failed:", err instanceof Error ? err.message : err);
    return {
      status: "FAILED",
      txHash,
      solscanUrl: `https://solscan.io/tx/${txHash}`,
      error: `Swap confirmation failed: ${err instanceof Error ? err.message : String(err)}. Check Solscan to verify.`,
    };
  }

  console.log("[SWAP] Step 6 OK: Confirmed!");
  console.log("[SWAP] ════════════════════════════════════════");
  console.log("[SWAP] SWAP COMPLETE:", txHash);

  return {
    status: "SUCCESS",
    txHash,
    solscanUrl: `https://solscan.io/tx/${txHash}`,
  };
}
