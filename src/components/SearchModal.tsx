"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, Zap, RefreshCw } from "lucide-react";
import TokenIcon from "@/components/TokenIcon";
import CopyAddress from "@/components/CopyAddress";
import { searchMarketTokens, fetchTrendingTokens, type MarketToken } from "@/lib/dexscreener";
import { fmtCurrency, fmtPrice } from "@/lib/format";

function colorFromSymbol(symbol: string): string {
  let hash = 0;
  for (let i = 0; i < symbol.length; i++) {
    hash = symbol.charCodeAt(i) + ((hash << 5) - hash);
  }
  return `hsl(${Math.abs(hash) % 360}, 70%, 50%)`;
}

function SearchTokenRow({
  token,
  onSelect,
  onBuy,
}: {
  token: MarketToken;
  onSelect: (symbol: string) => void;
  onBuy: (symbol: string) => void;
}) {
  const change = token.priceChangeH24;
  const positive = change !== null && change >= 0;
  return (
    <button
      onClick={() => onSelect(token.symbol)}
      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.04] transition-colors text-left group"
    >
      <TokenIcon
        symbol={token.symbol}
        color={colorFromSymbol(token.symbol)}
        name={token.name}
        imageUrl={token.imageUrl ?? undefined}
        size={32}
      />

      {/* Name + ticker */}
      <div className="min-w-0 w-28 flex-shrink-0 flex items-center gap-1">
        <div>
          <p className="text-white text-sm font-semibold truncate">{token.symbol}</p>
          <p className="text-text-secondary text-xs truncate">{token.name}</p>
        </div>
        <CopyAddress address={token.tokenAddress} size={11} />
      </div>

      {/* Contract address */}
      <div className="hidden md:flex flex-col text-[11px] text-text-secondary min-w-0 w-32 flex-shrink-0">
        <span className="truncate font-mono">
          {token.tokenAddress.slice(0, 4)}...{token.tokenAddress.slice(-4)}
        </span>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 ml-auto text-xs text-right flex-shrink-0">
        <div className="hidden lg:block">
          <p className="text-text-secondary">MC</p>
          <p className="text-white font-medium">{fmtCurrency(token.marketCap)}</p>
        </div>
        <div className="hidden lg:block">
          <p className="text-text-secondary">VOL</p>
          <p className="text-white font-medium">{fmtCurrency(token.volumeH24)}</p>
        </div>
        <div className="hidden sm:block">
          <p className="text-text-secondary">LIQ</p>
          <p className="text-white font-medium">{fmtCurrency(token.liquidityUsd)}</p>
        </div>
        <div>
          <p className="text-text-secondary">PRICE</p>
          <p className="text-white font-medium">{fmtPrice(token.priceUsd)}</p>
        </div>
        <div>
          <p className="text-text-secondary">24H</p>
          <p className={positive ? "text-positive font-medium" : "text-negative font-medium"}>
            {change !== null ? `${positive ? "+" : ""}${change.toFixed(1)}%` : "\u2014"}
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
  const [results, setResults] = useState<MarketToken[]>([]);
  const [trending, setTrending] = useState<MarketToken[]>([]);
  const [loading, setLoading] = useState(false);
  const [trendingLoading, setTrendingLoading] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchVersionRef = useRef(0);

  // Load trending tokens on mount
  useEffect(() => {
    fetchTrendingTokens()
      .then((tokens) => setTrending(tokens.slice(0, 20)))
      .catch(() => {})
      .finally(() => setTrendingLoading(false));
  }, []);

  // Debounced search
  const doSearch = useCallback((q: string) => {
    const trimmed = q.trim();
    if (!trimmed) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const version = ++searchVersionRef.current;

    const timer = setTimeout(async () => {
      try {
        const tokens = await searchMarketTokens(trimmed);
        if (searchVersionRef.current === version) {
          setResults(tokens);
          setLoading(false);
        }
      } catch {
        if (searchVersionRef.current === version) {
          setResults([]);
          setLoading(false);
        }
      }
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const cleanup = doSearch(query);
    return cleanup;
  }, [query, doSearch]);

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

  const isSearching = query.trim().length > 0;
  const displayTokens = isSearching ? results : trending;
  const isLoading = isSearching ? loading : trendingLoading;

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
            {isSearching ? "Results" : "Trending"}
          </span>
          {isSearching && !isLoading && (
            <span className="text-text-secondary text-xs ml-2">
              ({results.length})
            </span>
          )}
        </div>

        {/* Token list */}
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-text-secondary">
              <RefreshCw size={24} className="mb-3 text-accent animate-spin" />
              <p className="text-sm">{isSearching ? "Searching..." : "Loading trending tokens..."}</p>
            </div>
          ) : displayTokens.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-text-secondary">
              <Search size={32} className="mb-3 opacity-30" />
              <p className="text-sm">No tokens found on Solana</p>
              <p className="text-xs mt-1">Try a different search term</p>
            </div>
          ) : (
            displayTokens.map((token) => (
              <SearchTokenRow
                key={token.tokenAddress + token.pairAddress}
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
