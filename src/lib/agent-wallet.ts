import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";

const DATA_DIR = join(process.cwd(), "server", "data");
const WALLETS_FILE = join(DATA_DIR, "wallets.json");

// Log resolved path once on first import
let _pathLogged = false;
function logWalletPath() {
  if (_pathLogged) return;
  _pathLogged = true;
  console.log("[WALLET] Resolved wallets path:", WALLETS_FILE);
  console.log("[WALLET] File exists:", existsSync(WALLETS_FILE));
}

interface WalletData {
  secretKey: number[];
  agentName: string;
  createdAt: string;
}

// In-memory cache — avoids reading disk on every call.
const walletStore = new Map<string, Keypair>();

function ensureDataDir() {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readWallets(): Record<string, WalletData> {
  ensureDataDir();
  if (!existsSync(WALLETS_FILE)) return {};
  try {
    const raw = readFileSync(WALLETS_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function writeWallets(data: Record<string, WalletData>) {
  ensureDataDir();
  writeFileSync(WALLETS_FILE, JSON.stringify(data, null, 2));
}

export function generateAgentWallet(agentName?: string): { publicKey: string } {
  const keypair = Keypair.generate();
  const publicKey = keypair.publicKey.toBase58();

  // Cache in memory
  walletStore.set(publicKey, keypair);

  // Persist to disk
  const wallets = readWallets();
  wallets[publicKey] = {
    secretKey: Array.from(keypair.secretKey),
    agentName: agentName ?? "",
    createdAt: new Date().toISOString(),
  };
  writeWallets(wallets);

  return { publicKey };
}

export function getAgentKeypair(walletAddress: string): Keypair | null {
  logWalletPath();

  // Check in-memory cache first
  const cached = walletStore.get(walletAddress);
  if (cached) {
    console.log("[WALLET] Keypair found in memory cache for:", walletAddress);
    return cached;
  }

  // Fall back to disk
  const wallets = readWallets();
  console.log("[WALLET] Loaded", Object.keys(wallets).length, "wallets from disk. Looking for:", walletAddress);
  const entry = wallets[walletAddress];
  if (!entry) return null;

  const keypair = Keypair.fromSecretKey(Uint8Array.from(entry.secretKey));
  walletStore.set(walletAddress, keypair);
  return keypair;
}

/**
 * Returns the secret key as a Base58-encoded string (compatible with Phantom/Solflare import).
 * Returns null if the wallet isn't in the store.
 */
export function getAgentSecretKey(walletAddress: string): string | null {
  const keypair = getAgentKeypair(walletAddress);
  if (!keypair) return null;
  return bs58.encode(keypair.secretKey);
}
