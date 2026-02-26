import { Router } from "express";
import { createAgentWallet, getAgentWallet, getAgentBalance } from "../services/walletService.js";

const router = Router();

// POST /api/wallet/create — Create agent wallet for user
router.post("/create", async (req, res) => {
  try {
    const { userAddress } = req.body;
    if (!userAddress) return res.status(400).json({ error: "userAddress required" });

    const result = createAgentWallet(userAddress);

    res.json({
      success: true,
      agentWallet: result.publicKey,
      alreadyExists: result.alreadyExists,
      message: result.alreadyExists
        ? "Agent wallet already exists"
        : "Agent wallet created successfully. Deposit SOL to this address to start trading."
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/wallet/:userAddress — Get wallet info + balance
router.get("/:userAddress", async (req, res) => {
  try {
    const wallet = getAgentWallet(req.params.userAddress);
    if (!wallet) return res.status(404).json({ error: "No agent wallet found" });

    const balance = await getAgentBalance(req.params.userAddress);

    res.json({
      success: true,
      wallet: {
        agentAddress: wallet.agent_public_key,
        balance: balance,
        createdAt: wallet.created_at
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/wallet/:userAddress/balance — Get balance only
router.get("/:userAddress/balance", async (req, res) => {
  try {
    const balance = await getAgentBalance(req.params.userAddress);
    res.json({ success: true, balance });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
