"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

export default function CopyAddress({ address, size = 13 }: { address: string; size?: number }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="p-1.5 text-text-secondary hover:text-white transition-colors flex-shrink-0"
    >
      {copied ? <Check size={size} className="text-positive" /> : <Copy size={size} />}
    </button>
  );
}
