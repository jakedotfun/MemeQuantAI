import { Connection, PublicKey, VersionedTransaction } from "@solana/web3.js";
import { getAgentKeypair, getAgentBalance } from "./walletService.js";
import { checkTokenSafety } from "./safetyService.js";
import db from "../database/db.js";
import { SOLANA_RPC_URL, JUPITER_API, DEFAULT_RISK_PARAMS } from "../utils/constants.js";

const connection = new Connection(SOLANA_RPC_URL);
const SOL_MINT = "So11111111111111111111111111111111111111112";

/** Headers for all Jupiter API calls */
function jupiterHeaders(extra = {}) {
  const headers = {};
  if (process.env.JUPITER_API_KEY) {
    headers["x-api-key"] = process.env.JUPITER_API_KEY;
  }
  return { ...headers, ...extra };
}

// Resolve token symbol to mint address using Jupiter Token List
export async function resolveToken(query) {
  try {
    // First try: exact match from Jupiter strict list
    const response = await fetch("https://token.jup.ag/strict");
    const tokens = await response.json();

    // Search by symbol (case-insensitive)
    const matches = tokens.filter(t =>
      t.symbol.toLowerCase() === query.toLowerCase()
    );

    if (matches.length === 1) {
      return { success: true, token: matches[0], duplicates: false };
    }

    if (matches.length > 1) {
      // Multiple tokens with same ticker — return the first one (highest priority in Jupiter's list)
      return {
        success: true,
        token: matches[0],
        duplicates: true,
        allMatches: matches.slice(0, 5).map(m => ({
          symbol: m.symbol,
          name: m.name,
          mint: m.address
        }))
      };
    }

    // Try as mint address directly
    if (query.length > 30) {
      const directMatch = tokens.find(t => t.address === query);
      if (directMatch) {
        return { success: true, token: directMatch, duplicates: false };
      }
      // Even if not in Jupiter list, accept the mint address
      return {
        success: true,
        token: { address: query, symbol: "UNKNOWN", name: "Unknown Token", decimals: 9 },
        duplicates: false
      };
    }

    // Try all list (not just strict)
    const allResponse = await fetch("https://token.jup.ag/all");
    const allTokens = await allResponse.json();
    const allMatches = allTokens.filter(t =>
      t.symbol.toLowerCase() === query.toLowerCase()
    );

    if (allMatches.length > 0) {
      return { success: true, token: allMatches[0], duplicates: allMatches.length > 1 };
    }

    return { success: false, error: `Token "${query}" not found` };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Get dynamic slippage based on trade size (from spec)
function getDynamicSlippage(amountUsd) {
  if (amountUsd < 50) return 500;      // 5%
  if (amountUsd <= 200) return 300;     // 3%
  return 100;                            // 1%
}

// Execute a buy trade via Jupiter
export async function executeBuy(userAddress, tokenMint, amountSol, stopLossPct = 20, takeProfitPct = 100) {
  try {
    const keypair = getAgentKeypair(userAddress);
    const balance = await getAgentBalance(userAddress);

    // Check if enough balance
    if (balance.sol < amountSol + 0.01) { // 0.01 SOL for fees
      return { status: "FAILED", error: "Insufficient SOL balance" };
    }

    // Check position size limit (max 5% of portfolio)
    const maxPositionSol = balance.sol * (DEFAULT_RISK_PARAMS.maxPositionPct / 100);
    if (amountSol > maxPositionSol) {
      return {
        status: "FAILED",
        error: `Amount exceeds max position size (${DEFAULT_RISK_PARAMS.maxPositionPct}% = ${maxPositionSol.toFixed(4)} SOL)`
      };
    }

    // Convert SOL to lamports
    const amountLamports = Math.floor(amountSol * 1e9);
    const slippageBps = getDynamicSlippage(amountSol * 150); // rough SOL→USD estimate

    // Get quote from Jupiter (with API key header)
    const quoteUrl = `${JUPITER_API}/quote?inputMint=${SOL_MINT}&outputMint=${tokenMint}&amount=${amountLamports}&slippageBps=${slippageBps}&restrictIntermediateTokens=true`;
    const quoteRes = await fetch(quoteUrl, { headers: jupiterHeaders() });
    if (!quoteRes.ok) {
      const body = await quoteRes.text().catch(() => "");
      console.error("[tradeService] Quote error:", quoteRes.status, body);
      return { status: "FAILED", error: `Jupiter quote failed: ${quoteRes.status} ${body}` };
    }
    const quote = await quoteRes.json();

    // Get swap transaction (official docs format with API key)
    const swapRes = await fetch(`${JUPITER_API}/swap`, {
      method: "POST",
      headers: jupiterHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
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
      }),
    });
    if (!swapRes.ok) {
      const body = await swapRes.text().catch(() => "");
      console.error("[tradeService] Swap error:", swapRes.status, body);
      return { status: "FAILED", error: `Jupiter swap failed: ${swapRes.status} ${body}` };
    }
    const swapData = await swapRes.json();

    // Deserialize, sign, and send transaction
    const txBuf = Buffer.from(swapData.swapTransaction, "base64");
    const tx = VersionedTransaction.deserialize(txBuf);
    tx.sign([keypair]);

    const txHash = await connection.sendRawTransaction(tx.serialize(), {
      skipPreflight: true,
      maxRetries: 3,
    });

    // Confirm transaction (use lastValidBlockHeight from swap response if available)
    const latestBlockhash = await connection.getLatestBlockhash("confirmed");
    await connection.confirmTransaction({
      signature: txHash,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: swapData.lastValidBlockHeight || latestBlockhash.lastValidBlockHeight,
    }, "confirmed");

    // Calculate entry price
    const outputAmount = parseInt(quote.outAmount);
    const tokenDecimals = quote.outputMint?.decimals || 9;
    const tokensReceived = outputAmount / Math.pow(10, tokenDecimals);
    const entryPrice = amountSol / tokensReceived;

    // Record trade in database
    db.prepare(`
      INSERT INTO trades (user_address, token_symbol, token_mint, direction, amount_sol, amount_tokens, entry_price, stop_loss_pct, take_profit_pct, status, tx_hash)
      VALUES (?, ?, ?, 'BUY', ?, ?, ?, ?, ?, 'OPEN', ?)
    `).run(userAddress, quote.outputMint?.symbol || "UNKNOWN", tokenMint, amountSol, tokensReceived, entryPrice, stopLossPct, takeProfitPct, txHash);

    // Log activity
    db.prepare(`
      INSERT INTO activity_log (user_address, type, title, description, metadata)
      VALUES (?, 'TRADE', ?, ?, ?)
    `).run(
      userAddress,
      `Bought token`,
      `Bought for ${amountSol} SOL via Jupiter`,
      JSON.stringify({ txHash, tokenMint, amountSol, tokensReceived, entryPrice })
    );

    return {
      status: "SUCCESS",
      txHash,
      entryPrice,
      tokensReceived,
      amountSol,
      stopLoss: stopLossPct,
      takeProfit: takeProfitPct,
    };
  } catch (error) {
    console.error("Buy execution error:", error.message);
    return { status: "FAILED", error: error.message };
  }
}

// Execute a sell trade via Jupiter
export async function executeSell(userAddress, tokenMint, amountPct = 100) {
  try {
    const keypair = getAgentKeypair(userAddress);

    // Get token account balance
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      keypair.publicKey,
      { mint: new PublicKey(tokenMint) }
    );

    if (!tokenAccounts.value.length) {
      return { status: "FAILED", error: "No token balance found" };
    }

    const tokenAccount = tokenAccounts.value[0].account.data.parsed.info;
    const totalAmount = parseInt(tokenAccount.tokenAmount.amount);
    const decimals = tokenAccount.tokenAmount.decimals;
    const sellAmount = Math.floor(totalAmount * (amountPct / 100));

    if (sellAmount === 0) {
      return { status: "FAILED", error: "Amount too small to sell" };
    }

    const slippageBps = 300; // 3% default for sells

    // Get quote from Jupiter (with API key header)
    const quoteUrl = `${JUPITER_API}/quote?inputMint=${tokenMint}&outputMint=${SOL_MINT}&amount=${sellAmount}&slippageBps=${slippageBps}&restrictIntermediateTokens=true`;
    const quoteRes = await fetch(quoteUrl, { headers: jupiterHeaders() });
    if (!quoteRes.ok) {
      const body = await quoteRes.text().catch(() => "");
      console.error("[tradeService] Sell quote error:", quoteRes.status, body);
      return { status: "FAILED", error: `Jupiter quote failed: ${quoteRes.status} ${body}` };
    }
    const quote = await quoteRes.json();

    // Get swap transaction (official docs format with API key)
    const swapRes = await fetch(`${JUPITER_API}/swap`, {
      method: "POST",
      headers: jupiterHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
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
      }),
    });
    if (!swapRes.ok) {
      const body = await swapRes.text().catch(() => "");
      console.error("[tradeService] Sell swap error:", swapRes.status, body);
      return { status: "FAILED", error: `Jupiter swap failed: ${swapRes.status} ${body}` };
    }
    const swapData = await swapRes.json();

    // Deserialize, sign, and send
    const txBuf = Buffer.from(swapData.swapTransaction, "base64");
    const tx = VersionedTransaction.deserialize(txBuf);
    tx.sign([keypair]);

    const txHash = await connection.sendRawTransaction(tx.serialize(), {
      skipPreflight: true,
      maxRetries: 3,
    });

    const latestBlockhash = await connection.getLatestBlockhash("confirmed");
    await connection.confirmTransaction({
      signature: txHash,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: swapData.lastValidBlockHeight || latestBlockhash.lastValidBlockHeight,
    }, "confirmed");

    // Calculate exit price and P&L
    const solReceived = parseInt(quote.outAmount) / 1e9;
    const tokensSold = sellAmount / Math.pow(10, decimals);
    const exitPrice = solReceived / tokensSold;

    // Find the open trade to calculate P&L
    const openTrade = db.prepare(
      "SELECT * FROM trades WHERE user_address = ? AND token_mint = ? AND status = 'OPEN' ORDER BY created_at DESC LIMIT 1"
    ).get(userAddress, tokenMint);

    let pnlPct = null;
    let pnlUsd = null;
    if (openTrade && openTrade.entry_price) {
      pnlPct = ((exitPrice - openTrade.entry_price) / openTrade.entry_price) * 100;
    }

    // Update trade record
    if (openTrade && amountPct === 100) {
      db.prepare(
        "UPDATE trades SET status = 'CLOSED', exit_price = ?, pnl_pct = ?, closed_at = CURRENT_TIMESTAMP WHERE id = ?"
      ).run(exitPrice, pnlPct, openTrade.id);
    }

    // Record sell trade
    db.prepare(`
      INSERT INTO trades (user_address, token_symbol, token_mint, direction, amount_sol, amount_tokens, exit_price, status, tx_hash, pnl_pct)
      VALUES (?, ?, ?, 'SELL', ?, ?, ?, 'CLOSED', ?, ?)
    `).run(userAddress, openTrade?.token_symbol || "UNKNOWN", tokenMint, solReceived, tokensSold, exitPrice, txHash, pnlPct);

    // Log activity
    db.prepare(`
      INSERT INTO activity_log (user_address, type, title, description, metadata)
      VALUES (?, 'TRADE', ?, ?, ?)
    `).run(
      userAddress,
      `Sold token`,
      `Sold ${amountPct}% for ${solReceived.toFixed(4)} SOL`,
      JSON.stringify({ txHash, tokenMint, solReceived, tokensSold, exitPrice, pnlPct })
    );

    return {
      status: "SUCCESS",
      txHash,
      exitPrice,
      solReceived,
      tokensSold,
      pnl: pnlPct,
    };
  } catch (error) {
    console.error("Sell execution error:", error.message);
    return { status: "FAILED", error: error.message };
  }
}

// Full trade pipeline: parse → safety check → execute
export async function processTradeCommand(userAddress, parsedIntent) {
  const { intent, token_query, amount_sol, amount_usd, amount_pct, stop_loss_pct, take_profit_pct } = parsedIntent;

  // Step 1: Resolve token
  const resolved = await resolveToken(token_query);
  if (!resolved.success) {
    return { status: "FAILED", error: resolved.error };
  }
  const token = resolved.token;

  // Step 2: Safety check
  const safety = await checkTokenSafety(token.address);
  if (safety.level === "BLOCK") {
    // Log blocked trade
    db.prepare(`
      INSERT INTO activity_log (user_address, type, title, description, metadata)
      VALUES (?, 'BLOCKED', ?, ?, ?)
    `).run(
      userAddress,
      `Blocked: ${token.symbol}`,
      `Safety score ${safety.riskScore}/100 — trade blocked`,
      JSON.stringify({ token: token.address, safety })
    );

    return {
      status: "BLOCKED",
      token,
      safetyCheck: safety,
      error: `Token ${token.symbol} failed safety check (score: ${safety.riskScore})`,
    };
  }

  // Step 3: Execute trade
  if (intent === "BUY") {
    // Convert amount_usd to SOL if needed (rough estimate)
    let solAmount = amount_sol;
    if (!solAmount && amount_usd) {
      // Fetch SOL price for conversion
      try {
        const priceRes = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd");
        const priceData = await priceRes.json();
        const solPrice = priceData.solana.usd;
        solAmount = amount_usd / solPrice;
      } catch {
        solAmount = amount_usd / 150; // fallback estimate
      }
    }

    if (!solAmount) {
      return { status: "FAILED", error: "No amount specified" };
    }

    const result = await executeBuy(
      userAddress,
      token.address,
      solAmount,
      stop_loss_pct || DEFAULT_RISK_PARAMS.stopLossPct,
      take_profit_pct || DEFAULT_RISK_PARAMS.takeProfitPct
    );

    return { ...result, token, safetyCheck: safety, intent };
  }

  if (intent === "SELL") {
    const result = await executeSell(
      userAddress,
      token.address,
      amount_pct || 100
    );

    return { ...result, token, safetyCheck: safety, intent };
  }

  return { status: "FAILED", error: `Unsupported intent: ${intent}` };
}

export default { resolveToken, executeBuy, executeSell, processTradeCommand };
