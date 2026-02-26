"use client";

import { useState } from "react";
import { Shield, Activity, Package, AlertTriangle, Sparkles, Info, Wallet, Copy, Check, ArrowUpRight } from "lucide-react";

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

interface Trade {
  token: string;
  side: "BUY" | "SELL";
  amount: string;
  entry: string;
  exit: string;
  pnl: string;
  pnlPositive: boolean;
  time: string;
}

const recentTrades: Trade[] = [
  { token: "PEPE", side: "BUY", amount: "$50", entry: "$0.00001234", exit: "$0.00001580", pnl: "+$14.02", pnlPositive: true, time: "2h ago" },
  { token: "WIF", side: "SELL", amount: "$100", entry: "$2.45", exit: "$2.21", pnl: "-$9.80", pnlPositive: false, time: "5h ago" },
  { token: "BONK", side: "BUY", amount: "$30", entry: "$0.0000312", exit: "$0.0000401", pnl: "+$8.56", pnlPositive: true, time: "1d ago" },
  { token: "POPCAT", side: "SELL", amount: "$60", entry: "$1.12", exit: "$0.98", pnl: "-$7.50", pnlPositive: false, time: "2d ago" },
  { token: "MOODENG", side: "BUY", amount: "$40", entry: "$0.0521", exit: "$0.0634", pnl: "+$8.67", pnlPositive: true, time: "3d ago" },
  { token: "GOAT", side: "BUY", amount: "$25", entry: "$0.892", exit: "$1.024", pnl: "+$3.70", pnlPositive: true, time: "3d ago" },
];

const activityFeed = [
  { text: "\u26d4 Blocked: SCAM token \u2014 GoPlus risk score 85 (honeypot detected)", type: "blocked" as const, time: "8 min ago" },
  { text: "\u26a0\ufe0f DOGE trade paused \u2014 daily drawdown limit reached (-15.2%)", type: "warning" as const, time: "25 min ago" },
  { text: "Stop-loss triggered on WIF at -20%", type: "risk" as const, time: "45 min ago" },
  { text: "Bought $50 of PEPE via chat command", type: "trade" as const, time: "1h ago" },
  { text: "\ud83d\udee1\ufe0f Duplicate ticker: Found 3 PEPE tokens \u2192 selected verified with highest LP ($2.1M)", type: "info" as const, time: "1h ago" },
  { text: "Rug Pull Exit: sold FWOG (liquidity -62%)", type: "risk" as const, time: "3h ago" },
  { text: "Bought $30 of BONK via chat command", type: "trade" as const, time: "5h ago" },
];

function CopyAddr({ address }: { address: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="p-1.5 text-text-secondary hover:text-white transition-colors flex-shrink-0"
    >
      {copied ? <Check size={13} className="text-positive" /> : <Copy size={13} />}
    </button>
  );
}

function DepositCard() {
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
          <span className="text-white text-xs font-mono break-all">7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU</span>
          <CopyAddr address="7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU" />
        </div>
      </div>
    </div>
  );
}

export default function PortfolioTab() {
  const [values, setValues] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    riskParams.forEach((p) => { init[p.key] = p.defaultValue; });
    return init;
  });

  const risk = computeRiskScore(values);

  const updateValue = (key: string, val: number) =>
    setValues((prev) => ({ ...prev, [key]: val }));

  return (
    <div className="h-full overflow-auto p-6 space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className="bg-bg-card rounded-xl border border-border p-4">
            <p className="text-text-secondary text-xs mb-1">{card.label}</p>
            <p className={`text-xl font-semibold ${card.color || "text-white"}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Deposit */}
      <DepositCard />

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
        <div className="space-y-0">
          {activityFeed.map((item, i) => (
            <div
              key={i}
              className={`flex items-start justify-between py-2.5 border-b border-border/50 last:border-b-0 pl-3 border-l-2 ${
                item.type === "blocked" ? "border-l-red-500" :
                item.type === "warning" ? "border-l-yellow-500" :
                item.type === "info" ? "border-l-blue-500" :
                item.type === "risk" ? "border-l-orange-500" :
                item.type === "trade" ? "border-l-positive" :
                "border-l-positive"
              }`}
            >
              <div className="flex items-start gap-2 min-w-0">
                <div className="mt-0.5 flex-shrink-0">
                  {item.type === "blocked" && <AlertTriangle size={12} className="text-red-500" />}
                  {item.type === "warning" && <AlertTriangle size={12} className="text-yellow-500" />}
                  {item.type === "info" && <Shield size={12} className="text-blue-500" />}
                  {item.type === "risk" && <Shield size={12} className="text-orange-500" />}
                  {item.type === "trade" && <ArrowUpRight size={12} className="text-positive" />}
                </div>
                <span className="text-white text-sm">{item.text}</span>
              </div>
              <span className="text-text-secondary text-xs flex-shrink-0 ml-4">{item.time}</span>
            </div>
          ))}
        </div>
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
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-text-secondary text-xs">
                <th className="text-left py-2 font-medium">TOKEN</th>
                <th className="text-left py-2 font-medium">SIDE</th>
                <th className="text-right py-2 font-medium">AMOUNT</th>
                <th className="text-right py-2 font-medium">ENTRY PRICE</th>
                <th className="text-right py-2 font-medium">EXIT PRICE</th>
                <th className="text-right py-2 font-medium">PnL</th>
                <th className="text-right py-2 font-medium">TIME</th>
              </tr>
            </thead>
            <tbody>
              {recentTrades.map((trade, i) => (
                <tr key={i} className="border-t border-border/50">
                  <td className="py-2.5 font-semibold text-white">{trade.token}</td>
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
                  <td className="py-2.5 text-right text-text-secondary font-mono text-xs">{trade.entry}</td>
                  <td className="py-2.5 text-right text-text-secondary font-mono text-xs">{trade.exit}</td>
                  <td className={`py-2.5 text-right font-semibold ${trade.pnlPositive ? "text-positive" : "text-negative"}`}>
                    {trade.pnl}
                  </td>
                  <td className="py-2.5 text-right text-text-secondary">{trade.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
