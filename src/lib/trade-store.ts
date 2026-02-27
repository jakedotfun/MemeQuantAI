import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";

const DATA_DIR = join(process.cwd(), "server", "data");
const TRADES_FILE = join(DATA_DIR, "trades.json");

export interface TradeRecord {
  id: string;
  walletAddress: string;
  token: string;         // symbol, e.g. "BONK"
  tokenMint: string;     // contract address
  side: "BUY" | "SELL" | "TRANSFER";
  amountSol: number;
  amountUsd: number;
  entryPrice: string;    // token price at time of trade (USD string)
  txHash: string;
  solscanUrl: string;
  timestamp: string;     // ISO 8601
  status: "SUCCESS" | "FAILED";
  recipient?: string;    // for transfers: destination address
  transferAmount?: number; // for transfers: amount transferred
  safetyScore?: number;
  safetyLevel?: string;
  safetyRisks?: string[];
}

function ensureDataDir() {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readTrades(): TradeRecord[] {
  ensureDataDir();
  if (!existsSync(TRADES_FILE)) return [];
  try {
    const raw = readFileSync(TRADES_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeTrades(trades: TradeRecord[]) {
  ensureDataDir();
  writeFileSync(TRADES_FILE, JSON.stringify(trades, null, 2));
}

export function getAllTrades(walletAddress?: string): TradeRecord[] {
  const trades = readTrades();
  if (!walletAddress) return trades;
  return trades.filter((t) => t.walletAddress === walletAddress);
}

export function saveTrade(trade: Omit<TradeRecord, "id" | "timestamp">): TradeRecord {
  const trades = readTrades();
  const record: TradeRecord = {
    ...trade,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
  };
  trades.unshift(record); // newest first
  writeTrades(trades);
  return record;
}
