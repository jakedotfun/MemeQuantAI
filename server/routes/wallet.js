import { Router } from "express";
import { PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import { createAgentWallet, getAgentWallet, getAgentBalance, getAgentKeypair, transferSOL } from "../services/walletService.js";
import db from "../database/db.js";

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

// POST /api/wallet/withdraw — Withdraw SOL to external address
router.post("/withdraw", async (req, res) => {
  try {
    const { userAddress, toAddress, amountSol } = req.body;
    if (!userAddress || !toAddress || !amountSol) {
      return res.status(400).json({ error: "userAddress, toAddress, and amountSol required" });
    }

    if (amountSol <= 0) {
      return res.status(400).json({ error: "Amount must be greater than 0" });
    }

    try {
      new PublicKey(toAddress);
    } catch {
      return res.status(400).json({ error: "Invalid Solana address" });
    }

    const balance = await getAgentBalance(userAddress);
    if (balance.sol < amountSol + 0.001) {
      return res.status(400).json({
        error: `Insufficient balance. Have ${balance.sol} SOL, need ${amountSol} + 0.001 fee`
      });
    }

    const result = await transferSOL(userAddress, toAddress, amountSol);

    db.prepare(
      "INSERT INTO activity_log (user_address, type, title, description, metadata) VALUES (?, ?, ?, ?, ?)"
    ).run(
      userAddress, "WITHDRAW",
      `Withdrew ${amountSol} SOL`,
      `Sent ${amountSol} SOL to ${toAddress}`,
      JSON.stringify(result)
    );

    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/wallet/export-key — Export private key (dangerous!)
router.post("/export-key", async (req, res) => {
  const { userAddress, confirmExport } = req.body;
  if (!userAddress) return res.status(400).json({ error: "userAddress required" });
  if (!confirmExport) return res.status(400).json({
    error: "Must confirm export. Set confirmExport: true",
    warning: "Exporting your private key is dangerous. Anyone with this key can steal all funds. Never share it with anyone."
  });

  try {
    const keypair = getAgentKeypair(userAddress);
    const privateKeyBase58 = bs58.encode(keypair.secretKey);

    res.json({
      success: true,
      privateKey: privateKeyBase58,
      warning: "NEVER share this key. Anyone with it can steal your funds. Import into Phantom: Settings > Add Wallet > Import Private Key"
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
