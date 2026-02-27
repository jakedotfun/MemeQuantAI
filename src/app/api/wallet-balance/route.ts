import { NextRequest } from "next/server";
import { fetchWalletBalance } from "@/lib/solana";

export async function GET(req: NextRequest) {
  try {
    const walletAddress = req.nextUrl.searchParams.get("address");

    if (!walletAddress || typeof walletAddress !== "string") {
      return Response.json({ error: "address query param required" }, { status: 400 });
    }

    const data = await fetchWalletBalance(walletAddress);
    return Response.json(data);
  } catch (err) {
    console.error("wallet-balance error:", err);
    return Response.json({ solBalance: 0, solUsdPrice: null, solUsdValue: null, tokens: [] });
  }
}

export async function POST(req: Request) {
  try {
    const { walletAddress } = await req.json();

    if (!walletAddress || typeof walletAddress !== "string") {
      return Response.json({ error: "walletAddress required" }, { status: 400 });
    }

    const data = await fetchWalletBalance(walletAddress);
    return Response.json(data);
  } catch (err) {
    console.error("wallet-balance error:", err);
    return Response.json({ solBalance: 0, solUsdPrice: null, solUsdValue: null, tokens: [] });
  }
}
