"use client";

import { useState, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import MarketTab from "@/components/MarketTab";
import PortfolioTab from "@/components/PortfolioTab";
import AutomationsTab from "@/components/AutomationsTab";
import ReferralTab from "@/components/ReferralTab";
import PricingTab from "@/components/PricingTab";
import StatsTab from "@/components/StatsTab";
import TokenDetail from "@/components/TokenDetail";
import RightPanel from "@/components/RightPanel";
import DeployModal from "@/components/DeployModal";
import SearchModal from "@/components/SearchModal";
import DeployPromptModal from "@/components/DeployPromptModal";
import type { MarketToken } from "@/lib/dexscreener";

type Tab = "market" | "portfolio" | "automations" | "referral" | "pricing" | "stats";

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("market");
  const [showDeployModal, setShowDeployModal] = useState(false);
  const [agentDeployed, setAgentDeployed] = useState(false);
  const [agentName, setAgentName] = useState("");

  // Token detail state
  const [selectedToken, setSelectedToken] = useState<MarketToken | null>(null);

  // Search modal state
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [highlightedToken, setHighlightedToken] = useState<string | null>(null);
  const [pendingBuyMessage, setPendingBuyMessage] = useState<string | null>(null);
  const [buyPromptToken, setBuyPromptToken] = useState<string | null>(null);

  const handleDeployDone = (name: string) => {
    setShowDeployModal(false);
    setAgentDeployed(true);
    setAgentName(name);
  };

  const handleSelectToken = useCallback((symbol: string) => {
    setShowSearchModal(false);
    setActiveTab("market");
    setHighlightedToken(symbol);
    // Auto-clear highlight after 3 seconds
    setTimeout(() => setHighlightedToken(null), 3000);
  }, []);

  const handleBuyToken = useCallback((symbol: string) => {
    setShowSearchModal(false);
    if (agentDeployed) {
      setPendingBuyMessage(`Buy ${symbol}`);
    } else {
      setBuyPromptToken(symbol);
    }
  }, [agentDeployed]);

  const handlePendingBuyConsumed = useCallback(() => {
    setPendingBuyMessage(null);
  }, []);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-bg-primary">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="flex-1 min-w-0 bg-bg-primary overflow-hidden">
        {activeTab === "market" && (
          selectedToken ? (
            <TokenDetail
              token={selectedToken}
              onBack={() => setSelectedToken(null)}
            />
          ) : (
            <MarketTab
              onSearchClick={() => setShowSearchModal(true)}
              highlightedToken={highlightedToken}
              onTokenClick={(token) => setSelectedToken(token)}
            />
          )
        )}
        {activeTab === "portfolio" && <PortfolioTab />}
        {activeTab === "automations" && <AutomationsTab />}
        {activeTab === "referral" && <ReferralTab />}
        {activeTab === "pricing" && <PricingTab />}
        {activeTab === "stats" && <StatsTab />}
      </main>

      <RightPanel
        onDeployClick={() => setShowDeployModal(true)}
        agentDeployed={agentDeployed}
        agentName={agentName}
        pendingBuyMessage={pendingBuyMessage}
        onPendingBuyConsumed={handlePendingBuyConsumed}
      />

      {showDeployModal && (
        <DeployModal
          onClose={() => setShowDeployModal(false)}
          onDone={handleDeployDone}
        />
      )}

      {showSearchModal && (
        <SearchModal
          onClose={() => setShowSearchModal(false)}
          onSelectToken={handleSelectToken}
          onBuyToken={handleBuyToken}
        />
      )}

      {buyPromptToken && (
        <DeployPromptModal
          tokenName={buyPromptToken}
          onDeploy={() => {
            setBuyPromptToken(null);
            setShowDeployModal(true);
          }}
          onClose={() => setBuyPromptToken(null)}
        />
      )}
    </div>
  );
}
