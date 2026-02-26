"use client";

import { useEffect } from "react";

export default function DeployPromptModal({
  tokenName,
  onDeploy,
  onClose,
}: {
  tokenName: string;
  onDeploy: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-bg-card rounded-2xl w-full max-w-md border border-border shadow-2xl p-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-accent flex items-center justify-center text-white font-bold text-xl mx-auto mb-5">
          M
        </div>
        <h2 className="text-white font-semibold text-lg mb-2">
          Deploy Your Agent to Start Trading
        </h2>
        <p className="text-text-secondary text-sm mb-6">
          You need an active agent to buy {tokenName}. Deploy one in seconds.
        </p>
        <div className="flex flex-col gap-2.5">
          <button
            onClick={onDeploy}
            className="w-full py-3 bg-accent hover:bg-accent/90 text-white font-semibold rounded-xl transition-colors text-sm"
          >
            🚀 Deploy Agent
          </button>
          <button
            onClick={onClose}
            className="w-full py-3 text-text-secondary hover:text-white font-medium rounded-xl transition-colors text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
