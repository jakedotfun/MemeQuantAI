/**
 * Token safety checker — calls GoPlus API via /api/token-security.
 * Used by both client components (TokenDetail, MarketTab) and server routes (chat).
 */

export interface SafetyResult {
  score: number;
  label: string;
  level: "SAFE" | "WARN" | "HIGH" | "BLOCK";
  risks: string[];
  checks: SafetyCheck[];
  holderCount: number;
  top10HolderPct: number;
  creatorHoldPct: number;
  totalLiquidity: number;
  tokenName: string;
  tokenSymbol: string;
}

export interface SafetyCheck {
  label: string;
  ok: boolean;
  detail?: string;
}

// ── Client-side fetch (calls our API route) ────────────────────────

export async function fetchTokenSafety(
  address: string,
  pairCreatedAt?: number,
): Promise<SafetyResult> {
  const params = new URLSearchParams({ address });
  if (pairCreatedAt) params.set("pairCreatedAt", String(pairCreatedAt));

  const res = await fetch(`/api/token-security?${params}`, {
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) throw new Error(`Safety check failed: ${res.status}`);
  return res.json();
}

// ── Server-side direct fetch (for chat route — no HTTP roundtrip) ──

const GOPLUS_API = "https://api.gopluslabs.io/api/v1";
const CACHE_TTL = 5 * 60_000;

interface CacheEntry {
  data: SafetyResult;
  fetchedAt: number;
}
const serverCache = new Map<string, CacheEntry>();

export async function checkTokenSafety(
  address: string,
  pairCreatedAt?: number,
): Promise<SafetyResult> {
  // Check cache
  const cached = serverCache.get(address);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
    return cached.data;
  }

  try {
    const res = await fetch(
      `${GOPLUS_API}/solana/token_security?contract_addresses=${address}`,
      { signal: AbortSignal.timeout(10_000) },
    );

    if (!res.ok) {
      return unknownResult();
    }

    const data = await res.json();
    const tokenData = data.result?.[address] || data.result?.[address.toLowerCase()];

    if (!tokenData) {
      const result = unknownResult();
      serverCache.set(address, { data: result, fetchedAt: Date.now() });
      return result;
    }

    const result = analyzeToken(tokenData, pairCreatedAt);
    serverCache.set(address, { data: result, fetchedAt: Date.now() });
    return result;
  } catch {
    return unknownResult();
  }
}

// ── Analysis logic (mirrors the API route) ─────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function analyzeToken(token: any, tokenAge?: number): SafetyResult {
  let score = 0;
  const risks: string[] = [];
  const checks: SafetyCheck[] = [];

  // Honeypot detection
  const isClosable = token.closable?.status === "1";
  const isNonTransferable = token.non_transferable === "1";
  const hasTransferHook = Array.isArray(token.transfer_hook) && token.transfer_hook.length > 0;
  const balanceMutable = token.balance_mutable_authority?.status === "1";

  if (isClosable || isNonTransferable || hasTransferHook || balanceMutable) {
    score = 100;
    risks.push("Honeypot detected — cannot sell this token");
    checks.push({ label: "Not a Honeypot", ok: false, detail: "Token can be frozen/drained/closed" });
  } else {
    checks.push({ label: "Not a Honeypot", ok: true });
  }

  // Mintable → +30
  if (token.mintable?.status === "1") {
    score += 30;
    risks.push("Mint authority active — supply can be inflated");
    checks.push({ label: "Mint Revoked", ok: false, detail: "Mint authority still active" });
  } else {
    checks.push({ label: "Mint Revoked", ok: true });
  }

  // Freezable → +20
  if (token.freezable?.status === "1") {
    score += 20;
    risks.push("Freeze authority active — tokens can be frozen");
    checks.push({ label: "Freeze Revoked", ok: false, detail: "Freeze authority still active" });
  } else {
    checks.push({ label: "Freeze Revoked", ok: true });
  }

  // Top 10 holders > 50% → +20
  let top10Pct = 0;
  if (token.holders?.length > 0) {
    top10Pct = token.holders
      .slice(0, 10)
      .reduce((sum: number, h: { percent: string }) => sum + (parseFloat(h.percent) || 0), 0) * 100;
  }
  if (top10Pct > 50) {
    score += 20;
    risks.push(`Top 10 holders own ${top10Pct.toFixed(1)}% of supply`);
    checks.push({ label: "Holder Distribution", ok: false, detail: `Top 10 own ${top10Pct.toFixed(1)}%` });
  } else {
    checks.push({ label: "Holder Distribution", ok: true, detail: `Top 10 own ${top10Pct.toFixed(1)}%` });
  }

  // Creator holds > 10% → +15
  let creatorPct = 0;
  if (token.creators?.length > 0 && token.holders) {
    const creatorAddrs = new Set(token.creators.map((c: { address: string }) => c.address));
    creatorPct = token.holders
      .filter((h: { address: string }) => creatorAddrs.has(h.address))
      .reduce((sum: number, h: { percent: string }) => sum + (parseFloat(h.percent) || 0), 0) * 100;
  }
  if (creatorPct > 10) {
    score += 15;
    risks.push(`Creator holds ${creatorPct.toFixed(1)}% of supply`);
    checks.push({ label: "Creator Holdings", ok: false, detail: `${creatorPct.toFixed(1)}%` });
  } else {
    checks.push({ label: "Creator Holdings", ok: true, detail: creatorPct > 0 ? `${creatorPct.toFixed(1)}%` : "0%" });
  }

  // No LP locked → +15
  let totalLiquidity = 0;
  let hasLockedLP = false;
  if (token.dex?.length > 0) {
    for (const dex of token.dex) {
      totalLiquidity += parseFloat(String(dex.tvl || 0));
      if (dex.burn_percent && dex.burn_percent > 50) hasLockedLP = true;
    }
  }
  if (!hasLockedLP && totalLiquidity > 0) {
    score += 15;
    risks.push("No liquidity locked/burned");
    checks.push({ label: "LP Locked/Burned", ok: false, detail: "LP not burned" });
  } else if (hasLockedLP) {
    checks.push({ label: "LP Locked/Burned", ok: true });
  } else {
    checks.push({ label: "LP Locked/Burned", ok: false, detail: "No DEX data" });
  }

  // Token age < 24h → +10
  if (tokenAge && tokenAge > 0) {
    const ageHours = (Date.now() - tokenAge) / (1000 * 60 * 60);
    if (ageHours < 24) {
      score += 10;
      risks.push(`Token is less than 24 hours old`);
    }
  }

  score = Math.min(100, score);

  let label: string;
  let level: SafetyResult["level"];
  if (score <= 20) { label = "Low Risk"; level = "SAFE"; }
  else if (score <= 50) { label = "Medium Risk"; level = "WARN"; }
  else if (score <= 80) { label = "High Risk"; level = "HIGH"; }
  else { label = "SCAM — Blocked"; level = "BLOCK"; }

  return {
    score, label, level, risks, checks,
    holderCount: parseInt(token.holder_count) || 0,
    top10HolderPct: Math.round(top10Pct * 10) / 10,
    creatorHoldPct: Math.round(creatorPct * 10) / 10,
    totalLiquidity: Math.round(totalLiquidity),
    tokenName: token.metadata?.name || "",
    tokenSymbol: token.metadata?.symbol || "",
  };
}

function unknownResult(): SafetyResult {
  return {
    score: 25, label: "Unknown", level: "WARN",
    risks: ["Safety data unavailable — proceed with caution"],
    checks: [
      { label: "Not a Honeypot", ok: true, detail: "Unable to verify" },
      { label: "Mint Revoked", ok: true, detail: "Unable to verify" },
      { label: "Freeze Revoked", ok: true, detail: "Unable to verify" },
      { label: "Holder Distribution", ok: true, detail: "No data" },
      { label: "Creator Holdings", ok: true, detail: "No data" },
      { label: "LP Locked/Burned", ok: true, detail: "No data" },
    ],
    holderCount: 0, top10HolderPct: 0, creatorHoldPct: 0,
    totalLiquidity: 0, tokenName: "", tokenSymbol: "",
  };
}

// ── Emoji helpers for chat formatting ──────────────────────────────

export function safetyEmoji(level: SafetyResult["level"]): string {
  switch (level) {
    case "SAFE": return "\u2705";  // ✅
    case "WARN": return "\u26A0\uFE0F";  // ⚠️
    case "HIGH": return "\uD83D\uDD34";  // 🔴
    case "BLOCK": return "\uD83D\uDEAB"; // 🚫
  }
}

export function formatSafetyForChat(safety: SafetyResult): string {
  const emoji = safetyEmoji(safety.level);
  const checksStr = safety.checks
    .map((c) => `  ${c.ok ? "\u2705" : "\u26A0\uFE0F"} ${c.label}${c.detail ? ` (${c.detail})` : ""}`)
    .join("\n");
  return `Safety Score: ${safety.score}/100 ${emoji} ${safety.label}\n${checksStr}`;
}
