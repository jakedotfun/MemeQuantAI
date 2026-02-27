"use client";

import { useState, useEffect } from "react";
import { Shield, Activity, Package, AlertTriangle, Sparkles, Info, Wallet, Copy, Check, ArrowUpRight, KeyRound, X } from "lucide-react";
import CopyAddress from "@/components/CopyAddress";

interface TradeRecord {
  id: string;
  walletAddress: string;
  token: string;
  tokenMint: string;
  side: "BUY" | "SELL" | "TRANSFER";
  amountSol: number;
  amountUsd: number;
  entryPrice: string;
  txHash: string;
  solscanUrl: string;
  timestamp: string;
  status: "SUCCESS" | "FAILED";
  recipient?: string;
  transferAmount?: number;
}

const statCards = [
  { label: "Total Value", value: "$0.00" },
  { label: "PnL Today", value: "$0.00", color: "text-text-secondary" },
  { label: "Win Rate", value: "0%" },
  { label: "Active Positions", value: "0" },
];

interface RiskParam {
  key: string;
  label: string;
  unit: string;
  defaultValue: number;
  min: number;
  max: number;
  step: number;
}

const riskParams: RiskParam[] = [
  { key: "maxPosition", label: "Max Position Size", unit: "% of portfolio", defaultValue: 5, min: 1, max: 25, step: 1 },
  { key: "stopLoss", label: "Stop-Loss", unit: "%", defaultValue: 20, min: 5, max: 50, step: 1 },
  { key: "takeProfit", label: "Take-Profit", unit: "%", defaultValue: 100, min: 25, max: 500, step: 25 },
  { key: "dailyDrawdown", label: "Daily Drawdown Limit", unit: "% of portfolio", defaultValue: 15, min: 5, max: 50, step: 1 },
  { key: "maxPositions", label: "Max Open Positions", unit: "", defaultValue: 5, min: 1, max: 20, step: 1 },
  { key: "safetyThreshold", label: "Token Safety Threshold", unit: " risk score", defaultValue: 50, min: 20, max: 80, step: 5 },
];

function computeRiskScore(values: Record<string, number>): { score: number; label: string; color: string } {
  let score = 0;
  // Wider stop-loss = more risk
  score += Math.min(30, ((values.stopLoss ?? 20) / 50) * 30);
  // Bigger positions = more risk
  score += Math.min(25, ((values.maxPosition ?? 5) / 25) * 25);
  // More open positions = more risk
  score += Math.min(20, ((values.maxPositions ?? 5) / 20) * 20);
  // Wider drawdown tolerance = more risk
  score += Math.min(15, ((values.dailyDrawdown ?? 15) / 50) * 15);
  // Lower safety threshold = more risk
  score += Math.min(10, ((80 - (values.safetyThreshold ?? 50)) / 60) * 10);

  score = Math.round(score);

  if (score <= 30) return { score, label: "Conservative", color: "text-positive" };
  if (score <= 60) return { score, label: "Moderate", color: "text-yellow-400" };
  if (score <= 85) return { score, label: "Aggressive", color: "text-orange-400" };
  return { score, label: "Maximum Risk", color: "text-negative" };
}

function riskBarColor(score: number): string {
  if (score <= 30) return "bg-positive";
  if (score <= 60) return "bg-yellow-400";
  if (score <= 85) return "bg-orange-400";
  return "bg-negative";
}

interface DisplayTrade {
  token: string;
  side: "BUY" | "SELL" | "TRANSFER";
  amount: string;
  entryPrice: number;
  currentPrice: number;
  pnl: string;
  pnlPositive: boolean;
  time: string;
  txHash: string;
  solscanUrl: string;
}

interface ActivityItem {
  text: string;
  type: "trade" | "info";
  time: string;
}

function formatTimeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function FormatSmallPrice({ price }: { price: number }) {
  if (!price || price === 0) return <span>$0</span>;
  if (price >= 1) return <span>${price.toFixed(2)}</span>;
  if (price >= 0.01) return <span>${price.toFixed(4)}</span>;
  const str = price.toFixed(20).replace(/0+$/, "");
  const match = str.match(/^0\.(0*)/);
  if (!match) return <span>${price.toFixed(6)}</span>;
  const zeros = match[1].length;
  const significant = str.replace(/^0\.0*/, "").slice(0, 4);
  return (
    <span>$0.0<sub className="text-[9px] opacity-70">{zeros}</sub>{significant}</span>
  );
}


function ExportKeyModal({ onClose, walletAddress }: { onClose: () => void; walletAddress: string }) {
  const [confirmed, setConfirmed] = useState(false);
  const [privateKey, setPrivateKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/wallet/export-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress }),
      });
      const data = await res.json();
      if (data.privateKey) {
        setPrivateKey(data.privateKey);
      } else {
        setError(data.error || "Failed to export key");
      }
    } catch {
      setError("Cannot export key. Please try again.");
    }
    setLoading(false);
  };

  const handleCopy = () => {
    if (privateKey) {
      navigator.clipboard.writeText(privateKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-bg-card border border-border rounded-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-white font-semibold text-lg flex items-center gap-2">
            <AlertTriangle size={18} className="text-yellow-400" />
            Export Private Key
          </h2>
          <button onClick={onClose} className="text-text-secondary hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {!privateKey ? (
            <>
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                <p className="text-yellow-300 text-sm font-medium mb-3">
                  Your private key gives FULL ACCESS to your agent wallet. Anyone with this key can steal all your funds.
                </p>
                <ul className="space-y-2 text-yellow-200/80 text-xs">
                  <li className="flex items-start gap-2">
                    <span className="mt-1 w-1 h-1 rounded-full bg-yellow-400 flex-shrink-0" />
                    Never share your private key with anyone
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 w-1 h-1 rounded-full bg-yellow-400 flex-shrink-0" />
                    Never paste it on any website
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 w-1 h-1 rounded-full bg-yellow-400 flex-shrink-0" />
                    Store it securely offline
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 w-1 h-1 rounded-full bg-yellow-400 flex-shrink-0" />
                    Use it to import your wallet into Phantom or Solflare
                  </li>
                </ul>
              </div>

              <label className="flex items-start gap-2.5 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-border bg-bg-secondary accent-accent cursor-pointer"
                />
                <span className="text-text-secondary text-xs group-hover:text-white transition-colors">
                  I understand the risks and want to proceed
                </span>
              </label>

              {error && <p className="text-negative text-xs">{error}</p>}

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 bg-bg-secondary hover:bg-white/5 text-text-secondary hover:text-white border border-border rounded-lg text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  disabled={!confirmed || loading}
                  onClick={handleExport}
                  className="flex-1 py-2.5 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/40 text-yellow-300 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {loading ? "Exporting..." : "Export Key"}
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-text-secondary text-xs">Your private key (click to copy):</p>
              <div
                onClick={handleCopy}
                className="bg-bg-secondary rounded-lg p-3 border border-border cursor-pointer hover:border-accent/50 transition-colors"
              >
                <p className="text-white text-[11px] font-mono break-all leading-relaxed">{privateKey}</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleCopy}
                  className="flex-1 py-2.5 bg-accent/10 hover:bg-accent/20 border border-accent/30 text-accent rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1.5"
                >
                  {copied ? <><Check size={14} /> Copied!</> : <><Copy size={14} /> Copy Key</>}
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 bg-bg-secondary hover:bg-white/5 text-text-secondary hover:text-white border border-border rounded-lg text-sm font-medium transition-colors"
                >
                  Done
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function DepositCard({ address, onExportKey }: { address: string; onExportKey: () => void }) {
  return (
    <div className="bg-bg-card rounded-xl border border-border p-5">
      <div className="flex items-center gap-2 mb-1">
        <Wallet size={18} className="text-accent" />
        <h2 className="text-white font-semibold text-sm">Deposit</h2>
      </div>
      <p className="text-text-secondary text-xs mb-4">Deposit funds to start trading</p>
      <div className="bg-bg-secondary rounded-lg p-3">
        <span className="text-text-secondary text-[11px] block mb-1.5">Solana (SOL / USDC)</span>
        <div className="flex items-center gap-1.5">
          <span className="text-white text-xs font-mono break-all">{address}</span>
          <CopyAddress address={address} />
        </div>
      </div>
      <button
        onClick={onExportKey}
        className="mt-3 flex items-center gap-1.5 text-text-secondary hover:text-white text-xs transition-colors"
      >
        <KeyRound size={12} />
        Export Private Key
      </button>
    </div>
  );
}

export default function PortfolioTab({
  agentDeployed = false,
  onDeployClick,
  walletAddress = "",
  portfolioUsdValue = 0,
  walletTokenCount = 0,
  onRefreshBalance,
}: {
  agentDeployed?: boolean;
  onDeployClick?: () => void;
  walletAddress?: string;
  portfolioUsdValue?: number;
  walletTokenCount?: number;
  onRefreshBalance?: () => void;
}) {
  const [values, setValues] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    riskParams.forEach((p) => { init[p.key] = p.defaultValue; });
    return init;
  });
  const [liveStats, setLiveStats] = useState(statCards);
  const [liveActivity, setLiveActivity] = useState<ActivityItem[]>([]);
  const [liveTrades, setLiveTrades] = useState<DisplayTrade[]>([]);
  const [showExportKey, setShowExportKey] = useState(false);

  // Refresh balance on mount when tab opens
  useEffect(() => {
    onRefreshBalance?.();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch trades and compute PnL / Win Rate stats
  useEffect(() => {
    if (!walletAddress) return;
    let cancelled = false;

    (async () => {
      const tradesRes = await fetch(`/api/trades?walletAddress=${encodeURIComponent(walletAddress)}`).catch(() => null);
      if (cancelled) return;

      // If no trades, set defaults using props for Total Value and Active Positions
      if (!tradesRes || !tradesRes.ok) {
        if (!cancelled) {
          setLiveStats([
            { label: "Total Value", value: `$${portfolioUsdValue.toFixed(2)}` },
            { label: "PnL Today", value: "$0.00", color: "text-text-secondary" },
            { label: "Win Rate", value: "0%" },
            { label: "Active Positions", value: String(walletTokenCount) },
          ]);
        }
        return;
      }

      const { trades } = (await tradesRes.json()) as { trades: TradeRecord[] };
      if (cancelled) return;

      if (!trades || trades.length === 0) {
        if (!cancelled) {
          setLiveStats([
            { label: "Total Value", value: `$${portfolioUsdValue.toFixed(2)}` },
            { label: "PnL Today", value: "$0.00", color: "text-text-secondary" },
            { label: "Win Rate", value: "0%" },
            { label: "Active Positions", value: String(walletTokenCount) },
          ]);
        }
        return;
      }

      const successTrades = trades.filter((t) => t.status === "SUCCESS");

      // Build activity feed from trades
      const activity: ActivityItem[] = successTrades.map((t) => {
        if (t.side === "TRANSFER") {
          const shortAddr = t.recipient ? `${t.recipient.slice(0, 4)}...${t.recipient.slice(-4)}` : "???";
          const amt = t.transferAmount ?? t.amountSol;
          return {
            text: `Transferred ${amt} ${t.token} to ${shortAddr}`,
            type: "trade" as const,
            time: formatTimeAgo(t.timestamp),
          };
        }
        return {
          text: `${t.side === "BUY" ? "Bought" : "Sold"} $${t.amountUsd.toFixed(2)} of ${t.token} via chat command`,
          type: "trade" as const,
          time: formatTimeAgo(t.timestamp),
        };
      });
      if (!cancelled) setLiveActivity(activity);

      // Fetch current prices for unique tokens (for PnL calculation) — skip transfers
      const swapTrades = successTrades.filter((t) => t.side !== "TRANSFER");
      const uniqueMints = Array.from(new Set(swapTrades.map((t) => t.tokenMint).filter(Boolean)));
      const currentPrices: Record<string, string> = {};

      await Promise.all(
        uniqueMints.map(async (mint) => {
          try {
            const dexRes = await fetch(`/api/dexscreener?address=${mint}`);
            if (dexRes.ok) {
              const data = await dexRes.json();
              if (data.results?.[0]?.priceUsd) {
                currentPrices[mint] = data.results[0].priceUsd;
              }
            }
          } catch {
            // skip — no current price available
          }
        }),
      );
      if (cancelled) return;

      // ── Compute PnL Today ──
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayMs = todayStart.getTime();

      let pnlTodayUsd = 0;
      const todayBuys = successTrades.filter(
        (t) => t.side === "BUY" && new Date(t.timestamp).getTime() >= todayMs,
      );
      for (const t of todayBuys) {
        const entry = parseFloat(t.entryPrice) || 0;
        const current = parseFloat(currentPrices[t.tokenMint] ?? t.entryPrice) || 0;
        if (entry > 0) {
          pnlTodayUsd += t.amountUsd * ((current - entry) / entry);
        }
      }

      // ── Compute Win Rate (all-time BUY trades) ──
      const allBuys = successTrades.filter((t) => t.side === "BUY");
      let winCount = 0;
      for (const t of allBuys) {
        const entry = parseFloat(t.entryPrice) || 0;
        const current = parseFloat(currentPrices[t.tokenMint] ?? "0") || 0;
        if (current > entry && entry > 0) winCount++;
      }
      const winRate = allBuys.length > 0 ? Math.round((winCount / allBuys.length) * 100) : 0;

      // ── Update stats ──
      const pnlSign = pnlTodayUsd >= 0 ? "+" : "";
      const pnlColor = pnlTodayUsd > 0 ? "text-positive" : pnlTodayUsd < 0 ? "text-negative" : "text-text-secondary";
      if (!cancelled) {
        setLiveStats([
          { label: "Total Value", value: `$${portfolioUsdValue.toFixed(2)}` },
          { label: "PnL Today", value: `${pnlSign}$${Math.abs(pnlTodayUsd).toFixed(2)}`, color: pnlColor },
          { label: "Win Rate", value: `${winRate}%` },
          { label: "Active Positions", value: String(walletTokenCount) },
        ]);
      }

      // Build display trades (swaps only, not transfers)
      const display: DisplayTrade[] = swapTrades.map((t) => {
        const entry = parseFloat(t.entryPrice) || 0;
        const current = parseFloat(currentPrices[t.tokenMint] ?? t.entryPrice) || 0;
        const pnlPct = entry > 0 ? ((current - entry) / entry) * 100 : 0;

        return {
          token: t.token,
          side: t.side,
          amount: `$${t.amountUsd.toFixed(2)}`,
          entryPrice: entry,
          currentPrice: current,
          pnl: `${pnlPct >= 0 ? "+" : ""}${pnlPct.toFixed(1)}%`,
          pnlPositive: pnlPct >= 0,
          time: formatTimeAgo(t.timestamp),
          txHash: t.txHash,
          solscanUrl: t.solscanUrl,
        };
      });
      if (!cancelled) setLiveTrades(display);
    })();

    return () => { cancelled = true; };
  }, [walletAddress, portfolioUsdValue, walletTokenCount]);

  const risk = computeRiskScore(values);

  const updateValue = (key: string, val: number) =>
    setValues((prev) => ({ ...prev, [key]: val }));

  if (!agentDeployed) {
    return (
      <div className="h-full flex flex-col items-center justify-center px-6 text-center">
        <div className="w-20 h-20 rounded-2xl bg-accent flex items-center justify-center text-white font-bold text-3xl mb-6">
          M
        </div>
        <h1 className="text-white font-semibold text-xl mb-2">Deploy Your AI Agent</h1>
        <p className="text-text-secondary text-sm mb-8 max-w-sm">
          Create and configure your trading agent to start automated trading on Solana
        </p>
        <button
          onClick={onDeployClick}
          className="px-8 py-3 bg-accent hover:bg-accent/90 text-white font-semibold rounded-xl transition-colors text-sm"
        >
          🚀 Deploy Your Agent
        </button>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-6 space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-4">
        {liveStats.map((card) => (
          <div key={card.label} className="bg-bg-card rounded-xl border border-border p-4">
            <p className="text-text-secondary text-xs mb-1">{card.label}</p>
            <p className={`text-xl font-semibold ${card.color || "text-white"}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Deposit */}
      <DepositCard address={walletAddress} onExportKey={() => setShowExportKey(true)} />

      {/* Risk Constitution */}
      <div className="bg-bg-card rounded-xl border border-border p-5">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Shield size={18} className="text-accent" />
            <h2 className="text-white font-semibold text-sm">Risk Constitution</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const autoValues: Record<string, number> = {
                  maxPosition: 3, stopLoss: 15, takeProfit: 75,
                  dailyDrawdown: 10, maxPositions: 4, safetyThreshold: 60,
                };
                setValues(autoValues);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-accent/10 hover:bg-accent/20 border border-accent/30 rounded-lg text-accent text-xs font-medium transition-colors"
            >
              <Sparkles size={12} />
              AI Auto-Tune
            </button>
            <div className="relative group">
              <Info size={14} className="text-text-secondary hover:text-white cursor-help transition-colors" />
              <div className="absolute right-0 top-full mt-2 w-56 bg-bg-primary border border-border rounded-lg px-3 py-2 text-[11px] text-text-secondary leading-relaxed opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 shadow-lg">
                Let the AI agent automatically optimize all risk parameters based on current market conditions and your portfolio size.
              </div>
            </div>
          </div>
        </div>

        {/* Risk Score bar */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-1.5">
            <span className={`text-xs font-semibold ${risk.color}`}>
              Risk Score: {risk.score} — {risk.label}
            </span>
          </div>
          <div className="w-full h-2 bg-bg-secondary rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${riskBarColor(risk.score)}`}
              style={{ width: `${risk.score}%` }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[10px] text-text-secondary">Conservative</span>
            <span className="text-[10px] text-text-secondary">Maximum</span>
          </div>
        </div>

        {/* Parameter sliders */}
        <div className="grid grid-cols-2 gap-4 mb-5">
          {riskParams.map((p) => (
            <div key={p.key} className="bg-bg-secondary rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-text-secondary text-xs">{p.label}</span>
                <span className="text-white text-xs font-semibold font-mono">
                  {p.key === "stopLoss" || p.key === "dailyDrawdown" ? "-" : ""}
                  {values[p.key]}{p.unit}
                </span>
              </div>
              <input
                type="range"
                min={p.min}
                max={p.max}
                step={p.step}
                value={values[p.key]}
                onChange={(e) => updateValue(p.key, Number(e.target.value))}
                className="w-full h-1.5 bg-bg-primary rounded-full appearance-none cursor-pointer accent-accent"
              />
            </div>
          ))}
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => window.alert("All trading halted. Agent stopped.")}
            className="py-2.5 bg-negative/10 hover:bg-negative/20 border border-negative/30 text-negative font-semibold rounded-lg transition-colors text-xs"
          >
            KILL SWITCH
          </button>
          <button
            onClick={() => window.alert("Risk configuration saved.")}
            className="py-2.5 bg-accent/10 hover:bg-accent/20 border border-accent/30 text-accent font-semibold rounded-lg transition-colors text-xs"
          >
            Save Config
          </button>
        </div>
      </div>

      {/* Agent Activity Feed */}
      <div className="bg-bg-card rounded-xl border border-border p-5">
        <div className="flex items-center gap-2 mb-4">
          <Activity size={18} className="text-accent" />
          <h2 className="text-white font-semibold text-sm">Agent Activity</h2>
        </div>
        {liveActivity.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-text-secondary">
            <Activity size={32} className="mb-2 opacity-40" />
            <p className="text-sm">No activity yet. Start trading to see your agent&apos;s activity here.</p>
          </div>
        ) : (
          <div className="space-y-0">
            {liveActivity.map((item, i) => (
              <div
                key={i}
                className={`flex items-start justify-between py-2.5 border-b border-border/50 last:border-b-0 pl-3 border-l-2 ${
                  item.type === "info" ? "border-l-blue-500" :
                  item.type === "trade" ? "border-l-positive" :
                  "border-l-positive"
                }`}
              >
                <div className="flex items-start gap-2 min-w-0">
                  <div className="mt-0.5 flex-shrink-0">
                    {item.type === "info" && <Shield size={12} className="text-blue-500" />}
                    {item.type === "trade" && <ArrowUpRight size={12} className="text-positive" />}
                  </div>
                  <span className="text-white text-sm">{item.text}</span>
                </div>
                <span className="text-text-secondary text-xs flex-shrink-0 ml-4">{item.time}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Open Positions */}
      <div className="bg-bg-card rounded-xl border border-border p-5">
        <h2 className="text-white font-semibold text-sm mb-4">Open Positions</h2>
        <div className="flex flex-col items-center justify-center py-8 text-text-secondary">
          <Package size={32} className="mb-2 opacity-40" />
          <p className="text-sm">No open positions yet</p>
        </div>
      </div>

      {/* Recent Trades */}
      <div className="bg-bg-card rounded-xl border border-border p-5">
        <h2 className="text-white font-semibold text-sm mb-4">Recent Trades</h2>
        {liveTrades.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-text-secondary">
            <Package size={32} className="mb-2 opacity-40" />
            <p className="text-sm">No trades yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-text-secondary text-xs">
                  <th className="text-left py-2 font-medium">TOKEN</th>
                  <th className="text-left py-2 font-medium">SIDE</th>
                  <th className="text-right py-2 font-medium">AMOUNT</th>
                  <th className="text-right py-2 font-medium">ENTRY PRICE</th>
                  <th className="text-right py-2 font-medium">CURRENT</th>
                  <th className="text-right py-2 font-medium">PnL</th>
                  <th className="text-right py-2 font-medium">TIME</th>
                </tr>
              </thead>
              <tbody>
                {liveTrades.map((trade, i) => (
                  <tr key={i} className="border-t border-border/50 group">
                    <td className="py-2.5 font-semibold text-white">
                      {trade.solscanUrl ? (
                        <a href={trade.solscanUrl} target="_blank" rel="noopener noreferrer" className="hover:text-accent transition-colors">
                          {trade.token}
                        </a>
                      ) : trade.token}
                    </td>
                    <td className="py-2.5">
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded ${
                          trade.side === "BUY"
                            ? "bg-positive/10 text-positive"
                            : "bg-negative/10 text-negative"
                        }`}
                      >
                        {trade.side}
                      </span>
                    </td>
                    <td className="py-2.5 text-right text-white">{trade.amount}</td>
                    <td className="py-2.5 text-right text-text-secondary font-mono text-xs"><FormatSmallPrice price={trade.entryPrice} /></td>
                    <td className="py-2.5 text-right text-text-secondary font-mono text-xs"><FormatSmallPrice price={trade.currentPrice} /></td>
                    <td className={`py-2.5 text-right font-semibold ${trade.pnlPositive ? "text-positive" : "text-negative"}`}>
                      {trade.pnl}
                    </td>
                    <td className="py-2.5 text-right text-text-secondary">{trade.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Export Key Modal */}
      {showExportKey && <ExportKeyModal onClose={() => setShowExportKey(false)} walletAddress={walletAddress} />}
    </div>
  );
}
