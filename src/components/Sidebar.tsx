"use client";

import {
  TrendingUp,
  Briefcase,
  Zap,
  Users,
  CreditCard,
  BarChart3,
} from "lucide-react";

/* eslint-disable @next/next/no-img-element */

type Tab = "market" | "portfolio" | "automations" | "referral" | "pricing" | "stats";

const navItems: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "market", label: "Market", icon: TrendingUp },
  { id: "portfolio", label: "Portfolio", icon: Briefcase },
  { id: "automations", label: "Automations", icon: Zap },
  { id: "referral", label: "Referral", icon: Users },
  { id: "pricing", label: "Pricing", icon: CreditCard },
  { id: "stats", label: "Protocol Stats", icon: BarChart3 },
];

export default function Sidebar({
  activeTab,
  setActiveTab,
}: {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
}) {
  return (
    <aside className="w-[220px] min-w-[220px] h-screen bg-bg-secondary border-r border-border flex flex-col justify-between">
      <div>
        {/* Logo */}
        <div className="px-4 py-4">
          <img
            src="/MemeQuantLogo.svg"
            alt="MemeQuant"
            className="h-6 w-auto"
          />
        </div>

        <nav className="mt-2 flex flex-col gap-0.5">
          {navItems.map((item) => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-3 px-5 py-2.5 text-sm transition-colors relative ${
                  active
                    ? "text-accent bg-accent/5"
                    : "text-text-secondary hover:text-white hover:bg-white/[0.02]"
                }`}
              >
                {active && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-accent rounded-r" />
                )}
                <item.icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="px-5 py-4 border-t border-border flex items-center gap-3">
        {/* Docs (open book) */}
        <a href="#" className="text-text-secondary hover:text-white transition-colors">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2V3z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7V3z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </a>
        {/* X (Twitter) */}
        <a href="#" className="text-text-secondary hover:text-white transition-colors">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" fill="currentColor"/>
          </svg>
        </a>
        {/* Telegram */}
        <a href="#" className="text-text-secondary hover:text-white transition-colors">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12.056 0h-.112zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" fill="currentColor"/>
          </svg>
        </a>
      </div>
    </aside>
  );
}
