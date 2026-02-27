import { executeTransfer } from "@/lib/transfer";

export async function POST(req: Request) {
  console.log("[API /transfer] ── Request received ──");
  try {
    const body = await req.json();
    const { walletAddress, toAddress, amount, tokenMint, tokenDecimals } = body;

    console.log("[API /transfer] Params:", {
      walletAddress,
      toAddress,
      amount,
      tokenMint: tokenMint || "SOL (native)",
      tokenDecimals,
    });

    if (!walletAddress || !toAddress || amount === undefined) {
      console.error("[API /transfer] FAIL: Missing required fields");
      return Response.json(
        { error: "Missing required fields: walletAddress, toAddress, amount" },
        { status: 400 },
      );
    }

    const result = await executeTransfer({
      walletAddress,
      toAddress,
      amount: Number(amount),
      tokenMint: tokenMint || undefined,
      tokenDecimals: tokenDecimals !== undefined ? Number(tokenDecimals) : undefined,
    });

    console.log("[API /transfer] Result:", result.status, result.error || "OK", result.txHash || "");
    const status = result.status === "SUCCESS" ? 200 : 400;
    return Response.json(result, { status });
  } catch (err) {
    console.error("[API /transfer] UNHANDLED ERROR:", err);
    if (err instanceof Error) console.error("[API /transfer] Stack:", err.stack);
    const message = err instanceof Error ? err.message : "Transfer failed";
    return Response.json({ status: "FAILED", error: message }, { status: 500 });
  }
}
