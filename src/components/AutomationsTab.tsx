"use client";

import { useState, useEffect, useCallback } from "react";
import {
  TrendingUp,
  ArrowUpRight,
  Copy,
  Droplets,
  Wallet,
  ShieldOff,
  Rocket,
  Eye,
  Zap,
  ShieldAlert,
} from "lucide-react";
import api from "@/lib/api";

interface Playbook {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  iconColor: string;
  trigger: string;
  action: string;
  defaultThreshold: number;
  thresholdLabel: string;
  thresholdUnit: string;
  min: number;
  max: number;
  step: number;
  lastTriggered: string | null;
  executions: number;
  defaultEnabled: boolean;
}

const playbooks: Playbook[] = [
  {
    id: "alpha-buy",
    name: "Alpha Buy",
    description: "Buy on early volume surge signals",
    icon: TrendingUp,
    iconColor: "text-blue-400",
    trigger: "Volume (5m) surges vs 1h avg",
    action: "Buy with 2% of portfolio",
    defaultThreshold: 30,
    thresholdLabel: "Volume Surge",
    thresholdUnit: "%",
    min: 10,
    max: 100,
    step: 5,
    lastTriggered: "12 min ago",
    executions: 23,
    defaultEnabled: true,
  },
  {
    id: "momentum-sell",
    name: "Momentum Sell",
    description: "Lock partial profit at price surge",
    icon: ArrowUpRight,
    iconColor: "text-positive",
    trigger: "Price surges from entry",
    action: "Sell 50% of position",
    defaultThreshold: 100,
    thresholdLabel: "Price Surge",
    thresholdUnit: "%",
    min: 25,
    max: 500,
    step: 25,
    lastTriggered: "3h ago",
    executions: 8,
    defaultEnabled: true,
  },
  {
    id: "duplicate-ticker",
    name: "Duplicate Ticker Shield",
    description: "Avoid copycat and scam tokens",
    icon: Copy,
    iconColor: "text-yellow-400",
    trigger: "Multiple tokens share same ticker",
    action: "Select verified token with highest LP",
    defaultThreshold: 1,
    thresholdLabel: "Duplicates",
    thresholdUnit: " min",
    min: 1,
    max: 1,
    step: 1,
    lastTriggered: "1d ago",
    executions: 41,
    defaultEnabled: true,
  },
  {
    id: "rug-exit",
    name: "Rug Pull Exit",
    description: "Emergency exit on liquidity removal",
    icon: Droplets,
    iconColor: "text-negative",
    trigger: "Liquidity drops in 5 min",
    action: "Sell 100% immediately",
    defaultThreshold: 50,
    thresholdLabel: "Liquidity Drop",
    thresholdUnit: "%",
    min: 20,
    max: 80,
    step: 5,
    lastTriggered: null,
    executions: 2,
    defaultEnabled: true,
  },
  {
    id: "whale-follow",
    name: "Whale Follow",
    description: "Mirror smart money buys",
    icon: Wallet,
    iconColor: "text-purple-400",
    trigger: "Top-100 holder wallet buys token",
    action: "Buy with 1% of portfolio",
    defaultThreshold: 100,
    thresholdLabel: "Holder Rank",
    thresholdUnit: "",
    min: 10,
    max: 500,
    step: 10,
    lastTriggered: "45 min ago",
    executions: 15,
    defaultEnabled: false,
  },
  {
    id: "stop-loss",
    name: "Stop-Loss Guard",
    description: "Auto-sell to preserve capital",
    icon: ShieldOff,
    iconColor: "text-orange-400",
    trigger: "Price drops from entry",
    action: "Sell 100% of position",
    defaultThreshold: 20,
    thresholdLabel: "Max Loss",
    thresholdUnit: "%",
    min: 5,
    max: 50,
    step: 1,
    lastTriggered: "5h ago",
    executions: 11,
    defaultEnabled: true,
  },
  {
    id: "new-token-snipe",
    name: "New Token Snipe",
    description: "Early entry on fresh launches",
    icon: Rocket,
    iconColor: "text-cyan-400",
    trigger: "Token deployed + LP added",
    action: "Buy with 0.5% of portfolio",
    defaultThreshold: 60,
    thresholdLabel: "Max Age",
    thresholdUnit: "s",
    min: 10,
    max: 300,
    step: 10,
    lastTriggered: "2h ago",
    executions: 34,
    defaultEnabled: false,
  },
  {
    id: "smart-money-alert",
    name: "Smart Money Alert",
    description: "Follow top profitable wallets",
    icon: Eye,
    iconColor: "text-emerald-400",
    trigger: "Top-100 profitable trader buys > threshold",
    action: "Alert + auto-buy with 1% of portfolio",
    defaultThreshold: 1000,
    thresholdLabel: "Min Buy Size",
    thresholdUnit: "",
    min: 100,
    max: 10000,
    step: 100,
    lastTriggered: "18 min ago",
    executions: 47,
    defaultEnabled: true,
  },
  {
    id: "pumpfun-graduation",
    name: "Pump.fun Graduation Snipe",
    description: "Snipe tokens migrating to Raydium",
    icon: Zap,
    iconColor: "text-amber-400",
    trigger: "Token completes bonding curve → Raydium",
    action: "Auto-buy within 30s of migration",
    defaultThreshold: 50,
    thresholdLabel: "Portfolio Allocation",
    thresholdUnit: "%",
    min: 10,
    max: 200,
    step: 5,
    lastTriggered: "1h ago",
    executions: 19,
    defaultEnabled: false,
  },
  {
    id: "concentrated-sell-protection",
    name: "Concentrated Sell Protection",
    description: "Exit before whale dumps crash price",
    icon: ShieldAlert,
    iconColor: "text-rose-400",
    trigger: "Wallet holding > threshold of your token sells",
    action: "Auto-sell 100% of position immediately",
    defaultThreshold: 5,
    thresholdLabel: "Whale Threshold",
    thresholdUnit: "%",
    min: 2,
    max: 20,
    step: 1,
    lastTriggered: "6h ago",
    executions: 5,
    defaultEnabled: true,
  },
];

interface PlaybookState {
  enabled: boolean;
  threshold: number;
}

// Map frontend playbook IDs to backend playbook IDs
const backendIdMap: Record<string, string> = {
  "alpha-buy": "alpha_buy",
  "momentum-sell": "momentum_sell",
  "rug-exit": "rug_pull_exit",
  "whale-follow": "whale_follow",
  "stop-loss": "stop_loss_guard",
  "new-token-snipe": "new_token_snipe",
  "smart-money-alert": "smart_money_alert",
  "pumpfun-graduation": "pumpfun_graduation",
  "concentrated-sell-protection": "concentrated_sell_protection",
};

export default function AutomationsTab() {
  const [states, setStates] = useState<Record<string, PlaybookState>>(() => {
    const init: Record<string, PlaybookState> = {};
    playbooks.forEach((p) => {
      init[p.id] = { enabled: p.defaultEnabled, threshold: p.defaultThreshold };
    });
    return init;
  });

  // Sync with backend on mount
  useEffect(() => {
    (async () => {
      try {
        const data = await api.getUserAutomations("DemoUser123");
        if (data.automations && data.automations.length > 0) {
          setStates((prev) => {
            const next = { ...prev };
            for (const auto of data.automations) {
              // Find the frontend ID for this backend playbook_id
              const frontendId = Object.entries(backendIdMap).find(
                ([, v]) => v === auto.playbook_id
              )?.[0];
              if (frontendId && next[frontendId]) {
                next[frontendId] = {
                  ...next[frontendId],
                  enabled: auto.enabled === 1,
                };
              }
            }
            return next;
          });
        }
      } catch {
        // Backend offline — keep defaults
      }
    })();
  }, []);

  const toggle = useCallback(async (id: string) => {
    const currentlyEnabled = states[id]?.enabled;
    // Optimistic UI update
    setStates((prev) => ({
      ...prev,
      [id]: { ...prev[id], enabled: !prev[id].enabled },
    }));

    const backendId = backendIdMap[id];
    if (!backendId) return;

    try {
      if (currentlyEnabled) {
        await api.deactivatePlaybook("DemoUser123", backendId);
      } else {
        await api.activatePlaybook("DemoUser123", backendId, {
          threshold_pct: states[id]?.threshold,
        });
      }
    } catch {
      // Backend offline — keep optimistic state
    }
  }, [states]);

  const setThreshold = (id: string, value: number) =>
    setStates((prev) => ({
      ...prev,
      [id]: { ...prev[id], threshold: value },
    }));

  const activeCount = Object.values(states).filter((s) => s.enabled).length;

  return (
    <div className="h-full overflow-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-white font-semibold text-lg">Automation Playbooks</h1>
          <p className="text-text-secondary text-sm mt-1">
            {activeCount} of {playbooks.length} playbooks active
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {playbooks.map((p) => {
          const state = states[p.id];
          const isFixed = p.id === "duplicate-ticker";
          return (
            <div
              key={p.id}
              className={`bg-bg-card rounded-xl border p-5 transition-colors ${
                state.enabled ? "border-border" : "border-border/50 opacity-60"
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-bg-secondary flex items-center justify-center">
                    <p.icon size={16} className={p.iconColor} />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-sm">{p.name}</h3>
                    <p className="text-text-secondary text-xs">{p.description}</p>
                  </div>
                </div>
                <button
                  onClick={() => toggle(p.id)}
                  className={`relative w-10 h-[22px] rounded-full transition-colors flex-shrink-0 ${
                    state.enabled ? "bg-positive" : "bg-bg-secondary"
                  }`}
                >
                  <div
                    className={`absolute top-[3px] w-4 h-4 rounded-full bg-white transition-all ${
                      state.enabled ? "left-[22px]" : "left-[3px]"
                    }`}
                  />
                </button>
              </div>

              {/* Trigger / Action */}
              <div className="flex gap-2 mb-3 text-xs">
                <span className="text-text-secondary">Trigger:</span>
                <span className="text-white">{p.trigger}</span>
              </div>
              <div className="flex gap-2 mb-4 text-xs">
                <span className="text-text-secondary">Action:</span>
                <span className="text-white">{p.action}</span>
              </div>

              {/* Threshold slider */}
              {!isFixed && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-text-secondary text-xs">{p.thresholdLabel}</span>
                    <span className="text-white text-xs font-semibold font-mono">
                      {p.id === "whale-follow"
                        ? `Top ${state.threshold}`
                        : p.id === "smart-money-alert"
                          ? `$${state.threshold.toLocaleString()}`
                          : p.id === "pumpfun-graduation"
                            ? `${(state.threshold / 100).toFixed(2)}${p.thresholdUnit}`
                            : `${state.threshold}${p.thresholdUnit}`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={p.min}
                    max={p.max}
                    step={p.step}
                    value={state.threshold}
                    onChange={(e) => setThreshold(p.id, Number(e.target.value))}
                    className="w-full h-1.5 bg-bg-secondary rounded-full appearance-none cursor-pointer accent-accent"
                  />
                </div>
              )}

              {/* Stats row */}
              <div className="flex items-center justify-between text-xs pt-3 border-t border-border/50">
                <span className="text-text-secondary">
                  {p.lastTriggered ? `Last: ${p.lastTriggered}` : "Never triggered"}
                </span>
                <span className="text-text-secondary">
                  {p.executions} execution{p.executions !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
