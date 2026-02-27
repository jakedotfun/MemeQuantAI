import { getAllTrades, saveTrade } from "@/lib/trade-store";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const walletAddress = searchParams.get("walletAddress") ?? undefined;
  const trades = getAllTrades(walletAddress);
  return Response.json({ trades });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { walletAddress, token, tokenMint, side, amountSol, amountUsd, entryPrice, txHash, solscanUrl, status } = body;

    if (!walletAddress || !token || !side || !txHash) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    const record = saveTrade({
      walletAddress,
      token: token ?? "UNKNOWN",
      tokenMint: tokenMint ?? "",
      side: side === "SELL" ? "SELL" : "BUY",
      amountSol: Number(amountSol) || 0,
      amountUsd: Number(amountUsd) || 0,
      entryPrice: String(entryPrice ?? "0"),
      txHash,
      solscanUrl: solscanUrl ?? `https://solscan.io/tx/${txHash}`,
      status: status === "FAILED" ? "FAILED" : "SUCCESS",
    });

    return Response.json({ trade: record });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save trade";
    return Response.json({ error: message }, { status: 500 });
  }
}
