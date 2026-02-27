import { Keypair, Connection, PublicKey, LAMPORTS_PER_SOL, Transaction, SystemProgram, sendAndConfirmTransaction } from "@solana/web3.js";
import { encrypt, decrypt } from "../utils/encryption.js";
import db from "../database/db.js";
import { SOLANA_RPC_URL } from "../utils/constants.js";

const connection = new Connection(SOLANA_RPC_URL);
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"; // 64 hex chars = 32 bytes for AES-256

// Generate a new agent wallet for a user
export function createAgentWallet(userAddress) {
  // Check if user already has a wallet
  const existing = db.prepare("SELECT * FROM agent_wallets WHERE user_address = ?").get(userAddress);
  if (existing) {
    return { publicKey: existing.agent_public_key, alreadyExists: true };
  }

  // Generate new Solana keypair
  const keypair = Keypair.generate();
  const publicKey = keypair.publicKey.toBase58();
  const privateKeyBytes = Buffer.from(keypair.secretKey).toString("base64");

  // Encrypt private key
  const { encrypted, iv, authTag } = encrypt(privateKeyBytes, ENCRYPTION_KEY);

  // Store in database
  db.prepare(
    "INSERT INTO agent_wallets (user_address, agent_public_key, encrypted_private_key, iv, auth_tag) VALUES (?, ?, ?, ?, ?)"
  ).run(userAddress, publicKey, encrypted, iv, authTag);

  return { publicKey, alreadyExists: false };
}

// Get agent wallet info for a user
export function getAgentWallet(userAddress) {
  return db.prepare("SELECT * FROM agent_wallets WHERE user_address = ?").get(userAddress);
}

// Get the keypair (for signing transactions)
export function getAgentKeypair(userAddress) {
  const wallet = getAgentWallet(userAddress);
  if (!wallet) throw new Error("No agent wallet found");

  const privateKeyBase64 = decrypt(wallet.encrypted_private_key, ENCRYPTION_KEY, wallet.iv, wallet.auth_tag);
  const secretKey = new Uint8Array(Buffer.from(privateKeyBase64, "base64"));
  return Keypair.fromSecretKey(secretKey);
}

// Get SOL balance of agent wallet
export async function getAgentBalance(userAddress) {
  const wallet = getAgentWallet(userAddress);
  if (!wallet) throw new Error("No agent wallet found");

  const publicKey = new PublicKey(wallet.agent_public_key);
  const balanceLamports = await connection.getBalance(publicKey);
  const balanceSol = balanceLamports / LAMPORTS_PER_SOL;

  return {
    sol: balanceSol,
    lamports: balanceLamports,
    address: wallet.agent_public_key
  };
}

// Transfer SOL from agent wallet to another address
export async function transferSOL(userAddress, toAddress, amountSol) {
  const keypair = getAgentKeypair(userAddress);

  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: keypair.publicKey,
      toPubkey: new PublicKey(toAddress),
      lamports: Math.floor(amountSol * LAMPORTS_PER_SOL)
    })
  );

  const signature = await sendAndConfirmTransaction(connection, transaction, [keypair]);

  return {
    success: true,
    signature,
    amount: amountSol,
    from: keypair.publicKey.toBase58(),
    to: toAddress
  };
}

export default { createAgentWallet, getAgentWallet, getAgentKeypair, getAgentBalance, transferSOL };
