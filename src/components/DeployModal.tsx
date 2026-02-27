"use client";

import { useState } from "react";
import {
  X,
  ChevronRight,
  CheckCircle2,
  Copy,
  Check,
  Loader2,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
interface DeployModalProps {
  onClose: () => void;
  onDone: (agentName: string, walletAddress: string) => void;
}

type Step = 1 | 2;

function CopyableAddress({ label, icons, address }: { label: string; icons: React.ReactNode; address: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-bg-secondary rounded-xl p-4 border border-border">
      <div className="flex items-center gap-2 mb-3">
        {icons}
        <span className="text-white text-sm font-medium">{label}</span>
      </div>
      <div className="flex items-start gap-2">
        <div className="flex-1 bg-bg-primary rounded-lg px-3 py-2 text-[11px] font-mono border border-border break-all leading-relaxed">
          <span className="text-white">{address.slice(0, 4)}</span>
          <span className="text-gray-500">{address.slice(4, -4)}</span>
          <span className="text-white">{address.slice(-4)}</span>
        </div>
        <button
          onClick={handleCopy}
          className="p-2 bg-bg-primary hover:bg-white/5 rounded-lg transition-colors text-text-secondary hover:text-white border border-border flex-shrink-0"
        >
          {copied ? <Check size={14} className="text-positive" /> : <Copy size={14} />}
        </button>
      </div>
      {copied && <p className="text-positive text-xs mt-1">Copied!</p>}
      <div className="mt-4 flex justify-center">
        <div className="bg-white rounded-xl p-3">
          <QRCodeSVG value={address} size={200} level="M" />
        </div>
      </div>
    </div>
  );
}

function ChainIcon({ letter, color }: { letter: string; color: string }) {
  return (
    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white ${color}`}>
      {letter}
    </div>
  );
}

export default function DeployModal({ onClose, onDone }: DeployModalProps) {
  const [step, setStep] = useState<Step>(1);
  const [agentName, setAgentName] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [deploying, setDeploying] = useState(false);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (step === 2) return;
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
      onClick={handleOverlayClick}
    >
      <div className="bg-bg-card border border-border rounded-2xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-white font-semibold text-lg">
            {step === 1 ? "Deploy Your Agent" : "Fund Your Agent"}
          </h2>
          {step === 1 && (
            <button onClick={onClose} className="text-text-secondary hover:text-white transition-colors">
              <X size={18} />
            </button>
          )}
        </div>

        <div className="p-5">
          {/* ===== STEP 1 ===== */}
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-text-secondary text-sm -mt-1">
                Your agent will automatically get a Solana wallet upon deployment.
              </p>
              <div>
                <label className="text-text-secondary text-xs block mb-1.5">Agent Name</label>
                <input
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  placeholder="My Trading Agent"
                  className="w-full bg-bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-accent transition-colors placeholder:text-text-secondary/50"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 bg-bg-secondary hover:bg-white/5 text-text-secondary hover:text-white border border-border rounded-lg text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  disabled={deploying}
                  onClick={async () => {
                    setDeploying(true);
                    try {
                      const res = await fetch("/api/wallet/create", { method: "POST" });
                      const data = await res.json();
                      if (data.publicKey) {
                        setWalletAddress(data.publicKey);
                        setStep(2);
                      } else {
                        alert(data.error || "Failed to create wallet. Please try again.");
                      }
                    } catch {
                      alert("Failed to create wallet. Please try again.");
                    }
                    setDeploying(false);
                  }}
                  className="flex-1 py-2.5 bg-accent hover:bg-accent/90 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                >
                  {deploying ? <><Loader2 size={14} className="animate-spin" /> Deploying...</> : <>Next <ChevronRight size={14} /></>}
                </button>
              </div>
            </div>
          )}

          {/* ===== STEP 2 ===== */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 -mt-1">
                <CheckCircle2 size={18} className="text-positive" />
                <p className="text-text-secondary text-sm">Your agent is ready! Deposit funds to start trading.</p>
              </div>

              <CopyableAddress
                label="Solana Wallet (SOL / SPL Tokens)"
                icons={<ChainIcon letter="S" color="bg-purple-500" />}
                address={walletAddress}
              />

              <ul className="space-y-1.5 text-text-secondary text-xs leading-relaxed">
                <li className="flex items-start gap-2"><span className="mt-1.5 w-1 h-1 rounded-full bg-text-secondary flex-shrink-0" />Only send SOL or SPL tokens to this address</li>
                <li className="flex items-start gap-2"><span className="mt-1.5 w-1 h-1 rounded-full bg-text-secondary flex-shrink-0" />Sending wrong assets may result in permanent loss</li>
                <li className="flex items-start gap-2"><span className="mt-1.5 w-1 h-1 rounded-full bg-text-secondary flex-shrink-0" />Your agent is live — deposit funds to start trading</li>
              </ul>

              <button
                onClick={() => onDone(agentName.trim(), walletAddress)}
                className="w-full py-2.5 bg-accent hover:bg-accent/90 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Done
              </button>
            </div>
          )}
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 pb-5">
          {[1, 2].map((s) => (
            <div
              key={s}
              className={`w-2 h-2 rounded-full transition-colors ${
                s === step ? "bg-accent" : "bg-border"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
