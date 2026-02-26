"use client";

import { Check, X } from "lucide-react";

interface PlanFeature {
  label: string;
  starter: string | boolean;
  pro: string | boolean;
  max: string | boolean;
}

const features: PlanFeature[] = [
  { label: "Credits", starter: "100/mo", pro: "1,000/mo", max: "5,000/mo" },
  { label: "Max Agents", starter: "1", pro: "3", max: "Unlimited" },
  { label: "Chains", starter: "Solana", pro: "Solana", max: "Solana + more (soon)" },
  { label: "Automations", starter: "2 max", pro: "20 max", max: "Unlimited" },
  { label: "Stop-loss", starter: "Basic", pro: "Advanced + Trailing", max: "Full Risk Suite" },
  { label: "Copy Trade", starter: false, pro: true, max: true },
  { label: "Priority Execution", starter: false, pro: false, max: true },
];

function FeatureValue({ value }: { value: string | boolean }) {
  if (typeof value === "boolean") {
    return value ? (
      <Check size={14} className="text-positive" />
    ) : (
      <X size={14} className="text-text-secondary opacity-40" />
    );
  }
  return <span>{value}</span>;
}

interface PlanCardProps {
  name: string;
  price: string;
  badge?: { text: string; color: string };
  highlighted?: boolean;
  buttonText: string;
  buttonDisabled?: boolean;
  features: (string | boolean)[];
}

function PlanCard({ name, price, badge, highlighted, buttonText, buttonDisabled, features: featureValues }: PlanCardProps) {
  return (
    <div
      className={`bg-bg-card rounded-xl border p-6 flex flex-col ${
        highlighted ? "border-accent" : "border-border"
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        <h3 className="text-white font-semibold">{name}</h3>
        {badge && (
          <span
            className={`text-[10px] font-medium px-2 py-0.5 rounded ${badge.color}`}
          >
            {badge.text}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-white mb-5">{price}</p>

      <div className="space-y-3 flex-1 mb-6">
        {features.map((f, i) => (
          <div key={f.label} className="flex items-center justify-between text-sm">
            <span className="text-text-secondary">{f.label}</span>
            <span className="text-white">
              <FeatureValue value={featureValues[i]} />
            </span>
          </div>
        ))}
      </div>

      <button
        disabled={buttonDisabled}
        className={`w-full py-2.5 rounded-lg text-sm font-medium transition-colors ${
          buttonDisabled
            ? "bg-bg-secondary text-text-secondary cursor-not-allowed"
            : "bg-accent hover:bg-accent/90 text-white"
        }`}
      >
        {buttonText}
      </button>
    </div>
  );
}

export default function PricingTab() {
  return (
    <div className="h-full overflow-auto p-6">
      <h1 className="text-white font-semibold text-lg mb-6">Pricing</h1>

      <div className="grid grid-cols-3 gap-5">
        <PlanCard
          name="Starter"
          price="$0/mo"
          badge={{ text: "Current Plan", color: "bg-positive/10 text-positive" }}
          buttonText="Current Plan"
          buttonDisabled
          features={features.map((f) => f.starter)}
        />
        <PlanCard
          name="Pro"
          price="$49/mo"
          highlighted
          buttonText="Upgrade to Pro"
          features={features.map((f) => f.pro)}
        />
        <PlanCard
          name="Max"
          price="$119/mo"
          badge={{ text: "Most Popular", color: "bg-orange-500/10 text-orange-400" }}
          buttonText="Upgrade to Max"
          features={features.map((f) => f.max)}
        />
      </div>
    </div>
  );
}
