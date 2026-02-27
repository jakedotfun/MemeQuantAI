import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const GOPLUS_API = "https://api.gopluslabs.io/api/v1";
const FETCH_TIMEOUT = 10_000;
const CACHE_TTL = 5 * 60_000; // 5 minutes

// ── Types ──────────────────────────────────────────────────────────

export interface SafetyResult {
  score: number;            // 0-100 (higher = more risky)
  label: string;            // "Low Risk" | "Medium Risk" | "High Risk" | "SCAM — Blocked"
  level: "SAFE" | "WARN" | "HIGH" | "BLOCK";
  risks: string[];          // Human-readable risk factors
  checks: SafetyCheck[];    // Individual check results for UI
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

// ── In-memory cache ────────────────────────────────────────────────

interface CacheEntry {
  data: SafetyResult;
  fetchedAt: number;
}

const cache = new Map<string, CacheEntry>();

// ── GoPlus response types ──────────────────────────────────────────

interface GoPlusAuthority {
  status: string;
  authority: { address: string; malicious_address?: number }[];
}

interface GoPlusHolder {
  address: string;
  balance: string;
  percent: string;
  is_locked?: number;
  tag?: string;
}

interface GoPlusDex {
  tvl?: number | string;
  burn_percent?: number;
  lp_amount?: string | null;
}

interface GoPlusToken {
  mintable: GoPlusAuthority;
  freezable: GoPlusAuthority;
  closable: GoPlusAuthority;
  balance_mutable_authority: GoPlusAuthority;
  non_transferable: string;
  transfer_hook: unknown[];
  transfer_hook_upgradable: GoPlusAuthority;
  holders: GoPlusHolder[];
  holder_count: string;
  total_supply: string;
  creators: { address: string; malicious_address?: number }[];
  dex: GoPlusDex[];
  metadata: { name: string; symbol: string; description?: string };
  metadata_mutable: GoPlusAuthority;
  trusted_token: number;
}

// ── Scoring logic (per user spec) ──────────────────────────────────

function analyzeToken(token: GoPlusToken, tokenAge?: number): SafetyResult {
  let score = 0;
  const risks: string[] = [];
  const checks: SafetyCheck[] = [];

  // 1. Honeypot detection (closable, non-transferable, transfer_hook, balance_mutable)
  const isClosable = token.closable?.status === "1";
  const isNonTransferable = token.non_transferable === "1";
  const hasTransferHook = Array.isArray(token.transfer_hook) && token.transfer_hook.length > 0;
  const balanceMutable = token.balance_mutable_authority?.status === "1";

  const isHoneypot = isClosable || isNonTransferable || hasTransferHook || balanceMutable;
  if (isHoneypot) {
    score = 100; // Instant block
    risks.push("Honeypot detected — cannot sell this token");
    checks.push({ label: "Not a Honeypot", ok: false, detail: "Token can be frozen/drained/closed" });
  } else {
    checks.push({ label: "Not a Honeypot", ok: true });
  }

  // 2. Mintable (mint authority not revoked) → +30 risk
  const isMintable = token.mintable?.status === "1";
  if (isMintable) {
    score += 30;
    risks.push("Mint authority active — supply can be inflated");
    checks.push({ label: "Mint Revoked", ok: false, detail: "Mint authority still active" });
  } else {
    checks.push({ label: "Mint Revoked", ok: true });
  }

  // 3. Freezable (freeze authority not revoked) → +20 risk
  const isFreezable = token.freezable?.status === "1";
  if (isFreezable) {
    score += 20;
    risks.push("Freeze authority active — tokens can be frozen");
    checks.push({ label: "Freeze Revoked", ok: false, detail: "Freeze authority still active" });
  } else {
    checks.push({ label: "Freeze Revoked", ok: true });
  }

  // 4. Top 10 holders own > 50% supply → +20 risk
  let top10Pct = 0;
  if (token.holders && token.holders.length > 0) {
    top10Pct = token.holders
      .slice(0, 10)
      .reduce((sum, h) => sum + (parseFloat(h.percent) || 0), 0) * 100;
  }
  if (top10Pct > 50) {
    score += 20;
    risks.push(`Top 10 holders own ${top10Pct.toFixed(1)}% of supply`);
    checks.push({ label: "Holder Distribution", ok: false, detail: `Top 10 own ${top10Pct.toFixed(1)}%` });
  } else {
    checks.push({ label: "Holder Distribution", ok: true, detail: `Top 10 own ${top10Pct.toFixed(1)}%` });
  }

  // 5. Creator holds > 10% supply → +15 risk
  let creatorPct = 0;
  if (token.creators && token.creators.length > 0 && token.holders) {
    const creatorAddresses = new Set(token.creators.map((c) => c.address));
    creatorPct = token.holders
      .filter((h) => creatorAddresses.has(h.address))
      .reduce((sum, h) => sum + (parseFloat(h.percent) || 0), 0) * 100;
  }
  if (creatorPct > 10) {
    score += 15;
    risks.push(`Creator holds ${creatorPct.toFixed(1)}% of supply`);
    checks.push({ label: "Creator Holdings", ok: false, detail: `Creator holds ${creatorPct.toFixed(1)}%` });
  } else {
    checks.push({ label: "Creator Holdings", ok: true, detail: creatorPct > 0 ? `${creatorPct.toFixed(1)}%` : "0%" });
  }

  // 6. No liquidity locked → +15 risk (check if LP burn > 50% or locked)
  let totalLiquidity = 0;
  let hasLockedLP = false;
  if (token.dex && token.dex.length > 0) {
    for (const dex of token.dex) {
      totalLiquidity += parseFloat(String(dex.tvl || 0));
      if (dex.burn_percent && dex.burn_percent > 50) {
        hasLockedLP = true;
      }
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

  // 7. Token age < 24 hours → +10 risk
  if (tokenAge !== undefined && tokenAge > 0) {
    const ageMs = Date.now() - tokenAge;
    const ageHours = ageMs / (1000 * 60 * 60);
    if (ageHours < 24) {
      score += 10;
      risks.push(`Token is less than 24 hours old (${ageHours.toFixed(1)}h)`);
    }
  }

  // Cap score at 100
  score = Math.min(100, score);

  // Determine label and level
  let label: string;
  let level: SafetyResult["level"];
  if (score <= 20) {
    label = "Low Risk";
    level = "SAFE";
  } else if (score <= 50) {
    label = "Medium Risk";
    level = "WARN";
  } else if (score <= 80) {
    label = "High Risk";
    level = "HIGH";
  } else {
    label = "SCAM — Blocked";
    level = "BLOCK";
  }

  return {
    score,
    label,
    level,
    risks,
    checks,
    holderCount: parseInt(token.holder_count) || 0,
    top10HolderPct: Math.round(top10Pct * 10) / 10,
    creatorHoldPct: Math.round(creatorPct * 10) / 10,
    totalLiquidity: Math.round(totalLiquidity),
    tokenName: token.metadata?.name || "",
    tokenSymbol: token.metadata?.symbol || "",
  };
}

// ── Route handler ──────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address");
  const tokenAge = req.nextUrl.searchParams.get("pairCreatedAt");

  if (!address) {
    return NextResponse.json({ error: "address parameter required" }, { status: 400 });
  }

  // Check cache
  const cached = cache.get(address);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
    return NextResponse.json(cached.data);
  }

  try {
    const res = await fetch(
      `${GOPLUS_API}/solana/token_security?contract_addresses=${address}`,
      { signal: AbortSignal.timeout(FETCH_TIMEOUT) },
    );

    if (!res.ok) {
      console.error(`[GoPlus] API error: ${res.status}`);
      return NextResponse.json(unknownResult(address));
    }

    const data = await res.json();

    // GoPlus returns lowercase keys
    const tokenData = data.result?.[address] || data.result?.[address.toLowerCase()];
    if (!tokenData) {
      // Token not in GoPlus database — return cautious unknown
      const result = unknownResult(address);
      cache.set(address, { data: result, fetchedAt: Date.now() });
      return NextResponse.json(result);
    }

    const result = analyzeToken(
      tokenData as GoPlusToken,
      tokenAge ? parseInt(tokenAge) : undefined,
    );

    cache.set(address, { data: result, fetchedAt: Date.now() });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[GoPlus] Fetch error:", err);
    return NextResponse.json(unknownResult(address));
  }
}

function unknownResult(address: string): SafetyResult {
  return {
    score: 25,
    label: "Unknown",
    level: "WARN",
    risks: ["Safety data unavailable — proceed with caution"],
    checks: [
      { label: "Not a Honeypot", ok: true, detail: "Unable to verify" },
      { label: "Mint Revoked", ok: true, detail: "Unable to verify" },
      { label: "Freeze Revoked", ok: true, detail: "Unable to verify" },
      { label: "Holder Distribution", ok: true, detail: "No data" },
      { label: "Creator Holdings", ok: true, detail: "No data" },
      { label: "LP Locked/Burned", ok: true, detail: "No data" },
    ],
    holderCount: 0,
    top10HolderPct: 0,
    creatorHoldPct: 0,
    totalLiquidity: 0,
    tokenName: "",
    tokenSymbol: "",
  };
}
