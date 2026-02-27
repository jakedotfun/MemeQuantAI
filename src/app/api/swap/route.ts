import { executeSwap } from "@/lib/jupiter-swap";

export async function POST(req: Request) {
  console.log("[API /swap] ── Request received ──");
  try {
    const body = await req.json();
    const { walletAddress, inputMint, outputMint, amountLamports, slippageBps } = body;

    console.log("[API /swap] Params:", {
      walletAddress,
      inputMint,
      outputMint,
      amountLamports,
      slippageBps,
    });

    if (!walletAddress || !inputMint || !outputMint || !amountLamports) {
      console.error("[API /swap] FAIL: Missing required fields");
      return Response.json(
        { error: "Missing required fields: walletAddress, inputMint, outputMint, amountLamports" },
        { status: 400 },
      );
    }

    const result = await executeSwap({
      walletAddress,
      inputMint,
      outputMint,
      amountLamports: Number(amountLamports),
      slippageBps: slippageBps ? Number(slippageBps) : undefined,
    });

    console.log("[API /swap] Result:", result.status, result.error || "OK", result.txHash || "");
    const status = result.status === "SUCCESS" ? 200 : 400;
    return Response.json(result, { status });
  } catch (err) {
    console.error("[API /swap] UNHANDLED ERROR:", err);
    if (err instanceof Error) console.error("[API /swap] Stack:", err.stack);
    const message = err instanceof Error ? err.message : "Swap failed";
    return Response.json({ status: "FAILED", error: message }, { status: 500 });
  }
}
