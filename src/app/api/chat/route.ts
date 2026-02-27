import Anthropic from "@anthropic-ai/sdk";
import { fetchWalletBalance, type WalletBalanceData } from "@/lib/solana";
import {
  searchToken,
  lookupByAddress,
  type TokenResult,
} from "@/lib/dexscreener-lookup";
import { executeSwap, SOL_MINT } from "@/lib/jupiter-swap";
import { executeTransfer } from "@/lib/transfer";
import { saveTrade } from "@/lib/trade-store";
import {
  checkTokenSafety,
  safetyEmoji,
  type SafetyResult,
} from "@/lib/token-safety";

/* ── Tool definitions ── */
const TOOLS: Anthropic.Messages.Tool[] = [
  {
    name: "search_token",
    description:
      "Search for a Solana token by name, symbol, or contract address. Returns real-time price, liquidity, market cap, and safety info from DexScreener + GoPlus.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "Token name, ticker symbol, or Solana contract address",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "execute_swap",
    description:
      "Execute a REAL token swap on Solana via Jupiter DEX. Sends a real transaction to the blockchain. Returns a real tx hash on success or a real error on failure. Use when the user has CONFIRMED a buy or sell.",
    input_schema: {
      type: "object" as const,
      properties: {
        tokenMint: {
          type: "string",
          description: "The Solana mint address of the token to trade",
        },
        action: {
          type: "string",
          enum: ["buy", "sell"],
          description: "Whether to buy or sell the token",
        },
        amountUsd: {
          type: "number",
          description: "Amount in USD to spend (for buys)",
        },
        amountSol: {
          type: "number",
          description: "Amount in SOL to spend (for buys, if user specified SOL)",
        },
        sellPercent: {
          type: "number",
          description: "Percentage of holdings to sell (for sells, default 100)",
        },
        tokenSymbol: {
          type: "string",
          description: "The token's ticker symbol (e.g. 'BONK', 'WIF'). Always include this from search_token results.",
        },
      },
      required: ["tokenMint", "action", "tokenSymbol"],
    },
  },
  {
    name: "execute_transfer",
    description:
      "Transfer SOL or SPL tokens to another Solana wallet. Sends a real transaction to the blockchain. Use when the user has CONFIRMED a transfer.",
    input_schema: {
      type: "object" as const,
      properties: {
        recipient: {
          type: "string",
          description: "Recipient Solana wallet address",
        },
        amount: {
          type: "number",
          description: "Amount to transfer (in SOL for native, or token units for SPL)",
        },
        tokenMint: {
          type: "string",
          description: "Token mint address (omit for SOL transfer)",
        },
        tokenDecimals: {
          type: "number",
          description: "Token decimals (omit for SOL transfer)",
        },
        tokenSymbol: {
          type: "string",
          description: "The token's ticker symbol (e.g. 'BONK', 'SOL'). Use 'SOL' for native SOL transfers.",
        },
      },
      required: ["recipient", "amount"],
    },
  },
  {
    name: "check_balance",
    description:
      "Check the agent wallet's SOL balance and SPL token holdings. Returns real on-chain data.",
    input_schema: {
      type: "object" as const,
      properties: {},
    },
  },
];

/* ── System prompt ── */
function buildSystemPrompt(name: string): string {
  return `You are ${name}, an AI trading agent on MemeQuant — a Solana memecoin trading platform.

You have access to REAL tools that interact with the Solana blockchain:
- search_token: Look up any token's price, contract address, and safety score
- execute_swap: Execute real token swaps via Jupiter DEX
- execute_transfer: Send SOL or tokens to another wallet
- check_balance: Check wallet balances

USE THESE TOOLS — do not simulate or fake tool calls. When you need information or want to execute a trade, call the appropriate tool and wait for its result.

WORKFLOW for trades:
1. When user asks about a token → call search_token to get real data
2. Show the token info, price, safety score, and ask for confirmation
3. When user confirms → call execute_swap with the token's mint address
4. Report the EXACT result from the tool — the real tx hash or real error

WORKFLOW for transfers:
1. Confirm recipient address, amount, and token with the user
2. When user confirms → call execute_transfer
3. Report the EXACT result from the tool

CRITICAL RULES:
1. Tool results are the ONLY source of truth. Report exactly what they return.
2. If a tool returns status "SUCCESS" with a txHash → show that EXACT hash and Solscan link.
3. If a tool returns status "FAILED" → tell the user it failed with the EXACT error.
4. NEVER fabricate transaction hashes. You cannot create them.
5. NEVER simulate tool calls with XML tags or fake function calls.
6. Always use search_token BEFORE execute_swap to get the correct mint address.

SAFETY: GoPlus security data is included in search_token results.
- If safetyLevel is "BLOCK" (score > 80): REFUSE the trade, explain the risks.
- If safetyLevel is "HIGH" (51-80): Warn the user and ask if they want to proceed.
- Otherwise: Show the safety score and proceed.

Keep responses concise (2-3 sentences max). Be friendly, use casual crypto language.
Never mention you are Claude or an AI. You are ${name}.

UI ACTIONS (include in response text, invisible to user):
[ACTION:NAVIGATE:portfolio] [ACTION:NAVIGATE:market] [ACTION:REFRESH_BALANCE]
[ACTION:UPDATE_RISK:stopLoss:15] [ACTION:UPDATE_RISK:takeProfit:50] [ACTION:OPEN_DEPOSIT]`;
}

/* ── Tool execution functions ── */

async function handleSearchToken(
  query: string,
): Promise<Record<string, unknown>> {
  console.log("[TOOL:search_token] Searching for:", query);

  try {
    const isAddress = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(query);
    const results: TokenResult[] = isAddress
      ? await lookupByAddress(query)
      : await searchToken(query);

    if (results.length === 0) {
      return { error: `No Solana tokens found for "${query}"` };
    }

    // Get safety for top result
    let safety: SafetyResult | null = null;
    try {
      safety = await checkTokenSafety(results[0].address);
    } catch {
      // non-critical
    }

    const tokens = results.slice(0, 3).map((t) => ({
      name: t.name,
      symbol: t.symbol,
      mint: t.address,
      priceUsd: t.priceUsd,
      marketCap: t.marketCap,
      volume24h: t.volume24h,
      priceChange24h: t.priceChange24h,
      liquidity: t.liquidity,
      jupiterVerified: t.jupiterVerified ?? false,
      dexscreenerUrl: t.dexscreenerUrl,
    }));

    const result: Record<string, unknown> = { tokens };
    if (safety) {
      result.safety = {
        score: safety.score,
        level: safety.level,
        label: safety.label,
        risks: safety.risks,
        holderCount: safety.holderCount,
        top10HolderPct: safety.top10HolderPct,
        creatorHoldPct: safety.creatorHoldPct,
        totalLiquidity: safety.totalLiquidity,
        checks: safety.checks.map((c) => ({
          label: c.label,
          ok: c.ok,
          detail: c.detail,
        })),
      };
    }

    console.log(
      "[TOOL:search_token] Found:",
      tokens[0].symbol,
      tokens[0].mint.slice(0, 12) + "...",
      safety ? `Safety: ${safety.score}/${safety.level}` : "",
    );
    return result;
  } catch (err) {
    console.error("[TOOL:search_token] Error:", err);
    return {
      error: `Token search failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

async function handleExecuteSwap(
  input: Record<string, unknown>,
  walletAddress: string,
): Promise<Record<string, unknown>> {
  const { tokenMint, action, amountUsd, amountSol, sellPercent, tokenSymbol } = input as {
    tokenMint: string;
    action: string;
    amountUsd?: number;
    amountSol?: number;
    sellPercent?: number;
    tokenSymbol?: string;
  };

  const symbol = tokenSymbol || tokenMint.slice(0, 6) + "...";

  console.log("[TOOL:execute_swap] ═══════════════════════════════════");
  console.log("[TOOL:execute_swap] Action:", action, "Token:", tokenMint);
  console.log("[TOOL:execute_swap] amountUsd:", amountUsd, "amountSol:", amountSol);

  // Safety check
  let safety: SafetyResult | null = null;
  try {
    safety = await checkTokenSafety(tokenMint);
    console.log("[TOOL:execute_swap] Safety:", safety.score, safety.level);
    if (safety.level === "BLOCK") {
      saveTrade({
        walletAddress,
        token: symbol,
        tokenMint,
        side: action === "sell" ? "SELL" : "BUY",
        amountSol: 0,
        amountUsd: 0,
        entryPrice: "0",
        txHash: "",
        solscanUrl: "",
        status: "FAILED",
        safetyScore: safety.score,
        safetyLevel: safety.level,
        safetyRisks: safety.risks,
      });
      return {
        status: "BLOCKED",
        error: `Token blocked by safety check (score: ${safety.score}/100). Risks: ${safety.risks.join(", ")}`,
        safetyScore: safety.score,
        safetyLevel: safety.level,
        safetyRisks: safety.risks,
      };
    }
  } catch {
    console.log("[TOOL:execute_swap] Safety check failed, proceeding with caution");
  }

  // Get wallet balance for amount calculation
  let walletData: WalletBalanceData;
  try {
    walletData = await fetchWalletBalance(walletAddress);
  } catch (err) {
    return {
      status: "FAILED",
      error: `Could not fetch wallet balance: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  if (action === "buy") {
    // Calculate lamports
    let amountLamports: number | null = null;
    if (amountSol && amountSol > 0) {
      amountLamports = Math.floor(amountSol * 1e9);
    } else if (amountUsd && amountUsd > 0 && walletData.solUsdPrice) {
      amountLamports = Math.floor((amountUsd / walletData.solUsdPrice) * 1e9);
    }

    if (!amountLamports || amountLamports <= 0) {
      return {
        status: "FAILED",
        error: "Could not calculate trade amount. Ask the user to specify amount in USD or SOL.",
      };
    }

    console.log("[TOOL:execute_swap] BUY amountLamports:", amountLamports);
    console.log("[TOOL:execute_swap] Calling executeSwap...");

    const result = await executeSwap({
      walletAddress,
      inputMint: SOL_MINT,
      outputMint: tokenMint,
      amountLamports,
    });

    console.log("[TOOL:execute_swap] RESULT:", result.status);
    if (result.txHash) console.log("[TOOL:execute_swap] REAL TX HASH:", result.txHash);
    if (result.error) console.log("[TOOL:execute_swap] ERROR:", result.error);

    const tradeAmountSol = amountLamports / 1e9;
    const tradeAmountUsd = amountUsd ?? (walletData.solUsdPrice ? tradeAmountSol * walletData.solUsdPrice : 0);

    // Look up token price at trade time
    let entryPrice = "0";
    try {
      const priceResults = await lookupByAddress(tokenMint);
      if (priceResults.length > 0 && priceResults[0].priceUsd) {
        entryPrice = priceResults[0].priceUsd;
      }
    } catch { /* non-critical */ }

    saveTrade({
      walletAddress,
      token: symbol,
      tokenMint,
      side: "BUY",
      amountSol: tradeAmountSol,
      amountUsd: tradeAmountUsd,
      entryPrice,
      txHash: result.txHash ?? "",
      solscanUrl: result.solscanUrl ?? "",
      status: result.status,
      safetyScore: safety?.score,
      safetyLevel: safety?.level,
      safetyRisks: safety?.risks,
    });

    return {
      status: result.status,
      txHash: result.txHash || null,
      solscanUrl: result.solscanUrl || null,
      error: result.error || null,
      amountSol: tradeAmountSol,
      amountUsd: tradeAmountUsd,
    };
  } else if (action === "sell") {
    // Find token in wallet
    const tokenAccount = walletData.tokens.find((t) => t.mint === tokenMint);
    if (!tokenAccount) {
      return {
        status: "FAILED",
        error: "You don't hold this token in your wallet.",
      };
    }

    const pct = sellPercent ?? 100;
    const rawAmount = Math.floor(
      tokenAccount.balance * Math.pow(10, tokenAccount.decimals) * (pct / 100),
    );

    if (rawAmount <= 0) {
      return { status: "FAILED", error: "Token balance too small to sell." };
    }

    console.log("[TOOL:execute_swap] SELL rawAmount:", rawAmount, "pct:", pct);
    console.log("[TOOL:execute_swap] Calling executeSwap...");

    const result = await executeSwap({
      walletAddress,
      inputMint: tokenMint,
      outputMint: SOL_MINT,
      amountLamports: rawAmount,
    });

    console.log("[TOOL:execute_swap] RESULT:", result.status);
    if (result.txHash) console.log("[TOOL:execute_swap] REAL TX HASH:", result.txHash);
    if (result.error) console.log("[TOOL:execute_swap] ERROR:", result.error);

    // Look up token price at trade time
    let sellPrice = "0";
    try {
      const priceResults = await lookupByAddress(tokenMint);
      if (priceResults.length > 0 && priceResults[0].priceUsd) {
        sellPrice = priceResults[0].priceUsd;
      }
    } catch { /* non-critical */ }

    saveTrade({
      walletAddress,
      token: symbol,
      tokenMint,
      side: "SELL",
      amountSol: 0,
      amountUsd: 0,
      entryPrice: sellPrice,
      txHash: result.txHash ?? "",
      solscanUrl: result.solscanUrl ?? "",
      status: result.status,
      safetyScore: safety?.score,
      safetyLevel: safety?.level,
      safetyRisks: safety?.risks,
    });

    return {
      status: result.status,
      txHash: result.txHash || null,
      solscanUrl: result.solscanUrl || null,
      error: result.error || null,
    };
  }

  return { status: "FAILED", error: "Invalid action. Use 'buy' or 'sell'." };
}

async function handleExecuteTransfer(
  input: Record<string, unknown>,
  walletAddress: string,
): Promise<Record<string, unknown>> {
  const { recipient, amount, tokenMint, tokenDecimals, tokenSymbol } = input as {
    recipient: string;
    amount: number;
    tokenMint?: string;
    tokenDecimals?: number;
    tokenSymbol?: string;
  };

  const symbol = tokenSymbol || (tokenMint ? tokenMint.slice(0, 6) + "..." : "SOL");

  console.log("[TOOL:execute_transfer] ═══════════════════════════════════");
  console.log("[TOOL:execute_transfer] To:", recipient, "Amount:", amount, tokenMint ? `Token: ${tokenMint}` : "SOL");

  const result = await executeTransfer({
    walletAddress,
    toAddress: recipient,
    amount,
    tokenMint: tokenMint || undefined,
    tokenDecimals: tokenDecimals ?? undefined,
  });

  console.log("[TOOL:execute_transfer] RESULT:", result.status);
  if (result.txHash) console.log("[TOOL:execute_transfer] REAL TX HASH:", result.txHash);
  if (result.error) console.log("[TOOL:execute_transfer] ERROR:", result.error);

  // Log transfer in activity
  if (result.status === "SUCCESS") {
    saveTrade({
      walletAddress,
      token: symbol,
      tokenMint: tokenMint || "SOL",
      side: "TRANSFER",
      amountSol: tokenMint ? 0 : amount,
      amountUsd: 0,
      entryPrice: "0",
      txHash: result.txHash ?? "",
      solscanUrl: result.solscanUrl ?? "",
      status: "SUCCESS",
      recipient,
      transferAmount: amount,
    });
  }

  return {
    status: result.status,
    txHash: result.txHash || null,
    solscanUrl: result.solscanUrl || null,
    error: result.error || null,
  };
}

async function handleCheckBalance(
  walletAddress: string,
): Promise<Record<string, unknown>> {
  console.log("[TOOL:check_balance] Checking balance for:", walletAddress);
  try {
    const data = await fetchWalletBalance(walletAddress);
    return {
      solBalance: data.solBalance,
      solUsdPrice: data.solUsdPrice,
      solUsdValue: data.solUsdValue,
      tokens: data.tokens,
    };
  } catch (err) {
    return {
      error: `Failed to fetch balance: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

/* ── Process a single tool call ── */
async function processToolCall(
  name: string,
  input: Record<string, unknown>,
  walletAddress: string,
): Promise<string> {
  let result: Record<string, unknown>;

  switch (name) {
    case "search_token":
      result = await handleSearchToken(input.query as string);
      break;
    case "execute_swap":
      result = await handleExecuteSwap(input, walletAddress);
      break;
    case "execute_transfer":
      result = await handleExecuteTransfer(input, walletAddress);
      break;
    case "check_balance":
      result = await handleCheckBalance(walletAddress);
      break;
    default:
      result = { error: `Unknown tool: ${name}` };
  }

  return JSON.stringify(result);
}

/* ── Main handler ── */
export async function POST(req: Request) {
  try {
    const { messages, walletAddress, agentName } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return Response.json({ error: "messages array required" }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return Response.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
    }

    const displayName = agentName && typeof agentName === "string" ? agentName : "Testie";
    const systemPrompt = buildSystemPrompt(displayName);

    // Convert frontend messages to Anthropic format
    const conversationMessages: Anthropic.Messages.MessageParam[] = messages.map(
      (msg: { role: string; content: string }) => ({
        role: (msg.role === "agent" ? "assistant" : "user") as "assistant" | "user",
        content: msg.content,
      }),
    );

    console.log("[CHAT] ── Request ──");
    console.log("[CHAT] Agent:", displayName, "Wallet:", walletAddress || "none");
    console.log("[CHAT] Messages:", conversationMessages.length);
    console.log("[CHAT] Tools defined:", TOOLS.map((t) => t.name).join(", "));

    const anthropic = new Anthropic({ apiKey });

    // ── Tool use loop (non-streaming) ──
    const MAX_TOOL_ROUNDS = 5;
    let finalText = "";

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      console.log(`[CHAT] Round ${round + 1}/${MAX_TOOL_ROUNDS}`);

      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: systemPrompt,
        tools: TOOLS,
        messages: conversationMessages,
      });

      console.log("[CHAT] Stop reason:", response.stop_reason);

      if (response.stop_reason === "tool_use") {
        // Claude wants to call tool(s) — add its response to conversation
        conversationMessages.push({
          role: "assistant",
          content: response.content,
        });

        // Process each tool call
        const toolResults: Anthropic.Messages.ToolResultBlockParam[] = [];
        for (const block of response.content) {
          if (block.type === "tool_use") {
            console.log("[CHAT] Tool called:", block.name, JSON.stringify(block.input).substring(0, 200));

            let resultStr: string;
            try {
              resultStr = await processToolCall(
                block.name,
                block.input as Record<string, unknown>,
                walletAddress || "",
              );
            } catch (err) {
              resultStr = JSON.stringify({
                error: err instanceof Error ? err.message : String(err),
              });
            }

            console.log("[CHAT] Tool result:", resultStr.substring(0, 300));

            toolResults.push({
              type: "tool_result",
              tool_use_id: block.id,
              content: resultStr,
            });
          }
        }

        // Add tool results to conversation
        conversationMessages.push({
          role: "user",
          content: toolResults,
        });

        // Continue loop — Claude will process results
        continue;
      }

      // Claude responded with text (end_turn or max_tokens)
      finalText = response.content
        .filter((block): block is Anthropic.Messages.TextBlock => block.type === "text")
        .map((block) => block.text)
        .join("");

      console.log("[CHAT] Final text length:", finalText.length);
      break;
    }

    if (!finalText) {
      finalText = "Sorry, I couldn't process that request. Please try again.";
    }

    // Return as SSE (to stay compatible with existing frontend streaming parser)
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      start(controller) {
        // Send the complete text as a single SSE event
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ text: finalText })}\n\n`),
        );
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    console.error("[CHAT] UNHANDLED ERROR:", err);
    if (err instanceof Error) console.error("[CHAT] Stack:", err.stack);
    const message = err instanceof Error ? err.message : "Internal server error";
    return Response.json({ error: message }, { status: 500 });
  }
}
