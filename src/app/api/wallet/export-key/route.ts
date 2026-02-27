import { getAgentSecretKey } from "@/lib/agent-wallet";

export async function POST(request: Request) {
  try {
    const { walletAddress } = await request.json();

    if (!walletAddress || typeof walletAddress !== "string") {
      return Response.json({ error: "walletAddress is required" }, { status: 400 });
    }

    const secretKey = getAgentSecretKey(walletAddress);

    if (!secretKey) {
      return Response.json(
        { error: "Wallet not found. It may have been lost after a server restart." },
        { status: 404 },
      );
    }

    return Response.json({ privateKey: secretKey });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to export key";
    return Response.json({ error: message }, { status: 500 });
  }
}
