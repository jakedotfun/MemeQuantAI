import { generateAgentWallet } from "@/lib/agent-wallet";

export async function POST() {
  try {
    const { publicKey } = generateAgentWallet();
    return Response.json({ publicKey });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create wallet";
    return Response.json({ error: message }, { status: 500 });
  }
}
