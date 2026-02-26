"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Search, Zap } from "lucide-react";
import { getSearchTokens, type SearchToken } from "@/data/tokens";
import TokenIcon from "@/components/TokenIcon";

function SearchTokenRow({
  token,
  onSelect,
  onBuy,
}: {
  token: SearchToken;
  onSelect: (symbol: string) => void;
  onBuy: (symbol: string) => void;
}) {
  const positive = token.h24 >= 0;
  return (
    <button
      onClick={() => onSelect(token.symbol)}
      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.04] transition-colors text-left group"
    >
      <TokenIcon symbol={token.symbol} color={token.color} name={token.name} size={32} />

      {/* Name + ticker */}
      <div className="min-w-0 w-28 flex-shrink-0">
        <p className="text-white text-sm font-semibold truncate">{token.symbol}</p>
        <p className="text-text-secondary text-xs truncate">{token.name}</p>
      </div>

      {/* Age / CA / Holders */}
      <div className="hidden md:flex flex-col text-[11px] text-text-secondary min-w-0 w-32 flex-shrink-0">
        <span>{token.age} old</span>
        <span className="truncate font-mono">{token.contractAddress.slice(0, 4)}...{token.contractAddress.slice(-4)} &middot; {token.holders} holders</span>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 ml-auto text-xs text-right flex-shrink-0">
        <div className="hidden lg:block">
          <p className="text-text-secondary">MC</p>
          <p className="text-white font-medium">{token.mcap}</p>
        </div>
        <div className="hidden lg:block">
          <p className="text-text-secondary">VOL</p>
          <p className="text-white font-medium">{token.volume}</p>
        </div>
        <div className="hidden sm:block">
          <p className="text-text-secondary">LIQ</p>
          <p className="text-white font-medium">{token.liquidity}</p>
        </div>
        <div>
          <p className="text-text-secondary">24H</p>
          <p className={positive ? "text-positive font-medium" : "text-negative font-medium"}>
            {positive ? "+" : ""}{token.h24.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Buy button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onBuy(token.symbol);
        }}
        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-positive/10 text-positive text-xs font-semibold hover:bg-positive/20 transition-colors flex-shrink-0"
      >
        <Zap size={12} />
        Buy
      </button>
    </button>
  );
}

export default function SearchModal({
  onClose,
  onSelectToken,
  onBuyToken,
}: {
  onClose: () => void;
  onSelectToken: (symbol: string) => void;
  onBuyToken: (symbol: string) => void;
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const allTokens = useMemo(() => getSearchTokens(), []);

  const filtered = useMemo(() => {
    if (!query.trim()) return allTokens;
    const q = query.trim().toLowerCase();
    return allTokens.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.symbol.toLowerCase().includes(q) ||
        t.contractAddress.toLowerCase().includes(q)
    );
  }, [query, allTokens]);

  // Auto-focus
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Escape key
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
      <div className="bg-bg-card rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col border border-border shadow-2xl">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search size={18} className="text-text-secondary flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by token name, ticker, or contract address..."
            className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-text-secondary"
          />
          <kbd className="text-[10px] bg-bg-secondary rounded px-1.5 py-0.5 text-text-secondary border border-border flex-shrink-0">
            Esc
          </kbd>
        </div>

        {/* Section label */}
        <div className="px-4 py-2 border-b border-border/50">
          <span className="text-text-secondary text-xs font-medium">
            {query.trim() ? "Results" : "24h Trending"}
          </span>
          {query.trim() && (
            <span className="text-text-secondary text-xs ml-2">
              ({filtered.length})
            </span>
          )}
        </div>

        {/* Token list */}
        <div className="flex-1 overflow-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-text-secondary">
              <Search size={32} className="mb-3 opacity-30" />
              <p className="text-sm">No tokens found</p>
              <p className="text-xs mt-1">Try a different search term</p>
            </div>
          ) : (
            filtered.map((token) => (
              <SearchTokenRow
                key={token.symbol}
                token={token}
                onSelect={onSelectToken}
                onBuy={onBuyToken}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
