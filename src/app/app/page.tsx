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
import { useWalletBalance } from "@/hooks/useWalletBalance";
import type { AgentAction } from "@/components/RightPanel";
import type { MarketToken } from "@/lib/dexscreener";

type Tab = "market" | "portfolio" | "automations" | "referral" | "pricing" | "stats";

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("market");
  const [showDeployModal, setShowDeployModal] = useState(false);
  const [agentDeployed, setAgentDeployed] = useState(false);
  const [agentName, setAgentName] = useState("");
  const [walletAddress, setWalletAddress] = useState("");

  // Shared wallet balance — auto-refreshes every 30s, works for any address
  const walletBalance = useWalletBalance(walletAddress);
  const portfolioUsdValue = walletBalance.usdValue;

  // Token detail state
  const [selectedToken, setSelectedToken] = useState<MarketToken | null>(null);

  // Search modal state
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [highlightedToken, setHighlightedToken] = useState<string | null>(null);
  const [pendingBuyMessage, setPendingBuyMessage] = useState<string | null>(null);
  const [buyPromptToken, setBuyPromptToken] = useState<string | null>(null);

  const handleDeployDone = (name: string, address: string) => {
    setShowDeployModal(false);
    setAgentDeployed(true);
    setAgentName(name);
    setWalletAddress(address);
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

  const handleAgentAction = useCallback((action: AgentAction) => {
    switch (action.type) {
      case "NAVIGATE":
        if (action.target && ["market", "portfolio", "automations", "referral", "pricing", "stats"].includes(action.target)) {
          setActiveTab(action.target as Tab);
          setSelectedToken(null); // exit token detail if in it
        }
        break;
      case "REFRESH_BALANCE":
        walletBalance.refresh();
        break;
      case "OPEN_DEPOSIT":
        // Navigate to portfolio which shows the deposit/wallet section
        setActiveTab("portfolio");
        setSelectedToken(null);
        break;
      case "UPDATE_RISK":
        // Risk settings are handled within AutomationsTab — navigate there
        // The setting and value are logged for future use when risk state is lifted
        console.log("[AGENT ACTION] UPDATE_RISK:", action.setting, "=", action.value);
        setActiveTab("automations");
        setSelectedToken(null);
        break;
    }
  }, [walletBalance]);

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
              portfolioUsdValue={portfolioUsdValue}
            />
          )
        )}
        {activeTab === "portfolio" && <PortfolioTab agentDeployed={agentDeployed} onDeployClick={() => setShowDeployModal(true)} walletAddress={walletAddress} portfolioUsdValue={portfolioUsdValue} walletTokenCount={walletBalance.tokens.length} onRefreshBalance={walletBalance.refresh} />}
        {activeTab === "automations" && <AutomationsTab />}
        {activeTab === "referral" && <ReferralTab />}
        {activeTab === "pricing" && <PricingTab />}
        {activeTab === "stats" && <StatsTab />}
      </main>

      <RightPanel
        onDeployClick={() => setShowDeployModal(true)}
        agentDeployed={agentDeployed}
        agentName={agentName}
        walletAddress={walletAddress}
        pendingBuyMessage={pendingBuyMessage}
        onPendingBuyConsumed={handlePendingBuyConsumed}
        onBalanceRefresh={walletBalance.refresh}
        onAgentAction={handleAgentAction}
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
