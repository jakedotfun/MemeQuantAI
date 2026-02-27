"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { Search, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import TokenIcon from "@/components/TokenIcon";
import CopyAddress from "@/components/CopyAddress";
import { useMarketTokens, PAGE_SIZE } from "@/hooks/useMarketTokens";
import { fmtCurrency, fmtPrice, fmtNumber, fmtAge } from "@/lib/format";
import type { MarketToken, FilterTab, Timeframe } from "@/lib/dexscreener";
import { fetchTokenSafety, type SafetyResult } from "@/lib/token-safety";

const filters: FilterTab[] = ["Trending", "Top", "Gainers", "New Pairs"];
const timeframes: Timeframe[] = ["1H", "24H", "7D", "1M"];

/** Tiny colored dot showing safety level. */
function SafetyDot({ level }: { level?: SafetyResult["level"] }) {
  if (!level) return null;
  const cls = level === "SAFE" ? "bg-positive"
    : level === "WARN" ? "bg-yellow-400"
    : level === "HIGH" ? "bg-orange-400"
    : "bg-negative";
  const title = level === "SAFE" ? "Low Risk"
    : level === "WARN" ? "Medium Risk"
    : level === "HIGH" ? "High Risk"
    : "Scam";
  return <div className={`w-2 h-2 rounded-full flex-shrink-0 ${cls}`} title={title} />;
}

/** Batch-fetch safety data for visible tokens (with caching). */
function useSafetyBatch(tokens: MarketToken[]) {
  const [safetyMap, setSafetyMap] = useState<Record<string, SafetyResult>>({});
  const cacheRef = useRef<Record<string, SafetyResult>>({});

  useEffect(() => {
    if (tokens.length === 0) return;

    // Only fetch tokens not already cached
    const toFetch = tokens.filter((t) => !cacheRef.current[t.tokenAddress]);
    if (toFetch.length === 0) {
      // All cached, just update state
      const map: Record<string, SafetyResult> = {};
      for (const t of tokens) {
        if (cacheRef.current[t.tokenAddress]) map[t.tokenAddress] = cacheRef.current[t.tokenAddress];
      }
      setSafetyMap(map);
      return;
    }

    let cancelled = false;

    // Fetch in batches of 5 to avoid overwhelming the API
    async function fetchBatch() {
      for (let i = 0; i < toFetch.length; i += 5) {
        if (cancelled) return;
        const batch = toFetch.slice(i, i + 5);
        const results = await Promise.allSettled(
          batch.map((t) => fetchTokenSafety(t.tokenAddress, t.pairCreatedAt > 0 ? t.pairCreatedAt : undefined)),
        );
        if (cancelled) return;

        const newEntries: Record<string, SafetyResult> = {};
        results.forEach((r, idx) => {
          if (r.status === "fulfilled") {
            const addr = batch[idx].tokenAddress;
            cacheRef.current[addr] = r.value;
            newEntries[addr] = r.value;
          }
        });

        setSafetyMap((prev) => ({ ...prev, ...newEntries }));
      }
    }

    fetchBatch();
    return () => { cancelled = true; };
  }, [tokens]);

  return safetyMap;
}

function PctCell({ value }: { value: number | null }) {
  if (value === null) return <span className="text-text-secondary">{"\u2014"}</span>;
  const positive = value >= 0;
  return (
    <span className={positive ? "text-positive" : "text-negative"}>
      {positive ? "+" : ""}{value.toFixed(1)}%
    </span>
  );
}

function colorFromSymbol(symbol: string): string {
  let hash = 0;
  for (let i = 0; i < symbol.length; i++) {
    hash = symbol.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 70%, 50%)`;
}

export default function MarketTab({
  onSearchClick,
  highlightedToken,
  onTokenClick,
  portfolioUsdValue = 0,
}: {
  onSearchClick: () => void;
  highlightedToken: string | null;
  onTokenClick: (token: MarketToken) => void;
  portfolioUsdValue?: number;
}) {
  const {
    tokens,
    loading,
    error,
    retry,
    page,
    totalPages,
    totalFiltered,
    setPage,
    searchQuery,
    setSearchQuery,
    activeFilter,
    setActiveFilter,
    activeTimeframe,
    setActiveTimeframe,
  } = useMarketTokens();

  const safetyMap = useSafetyBatch(tokens);
  const highlightRef = useRef<HTMLTableRowElement>(null);

  // Scroll highlighted row into view
  useEffect(() => {
    if (highlightedToken && highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlightedToken]);

  // "/" keyboard shortcut to open search modal
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (
        e.key === "/" &&
        !e.metaKey &&
        !e.ctrlKey &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement)
      ) {
        e.preventDefault();
        onSearchClick();
      }
    },
    [onSearchClick]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-4 px-4 py-3 border-b border-border flex-shrink-0 min-w-0">
        {/* Filters */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                activeFilter === f
                  ? "bg-accent text-white"
                  : "bg-bg-card text-text-secondary hover:text-white"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Inline search input */}
        <div className="flex items-center gap-1.5 bg-bg-card rounded-md px-2.5 py-1 border border-border text-text-secondary hover:border-accent/50 transition-colors flex-1 min-w-0">
          <Search size={13} className="flex-shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tokens..."
            className="bg-transparent text-xs text-white placeholder:text-text-secondary outline-none flex-1 min-w-0"
          />
          <kbd
            onClick={onSearchClick}
            className="text-[9px] bg-bg-secondary rounded px-1 py-px text-text-secondary border border-border flex-shrink-0 ml-auto cursor-pointer hover:text-white"
          >
            /
          </kbd>
        </div>

        {/* Timeframes */}
        <div className="flex items-center gap-0.5 bg-bg-card rounded-md p-0.5 flex-shrink-0">
          {timeframes.map((t) => (
            <button
              key={t}
              onClick={() => setActiveTimeframe(t)}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                activeTimeframe === t
                  ? "bg-accent text-white"
                  : "text-text-secondary hover:text-white"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Portfolio */}
        <div className="flex items-center gap-1.5 bg-bg-card rounded-md px-2.5 py-1 border border-border flex-shrink-0">
          <div className="w-1.5 h-1.5 rounded-full bg-positive" />
          <span className="text-text-secondary text-[11px] hidden lg:inline">Portfolio:</span>
          <span className="text-white text-[11px] font-semibold font-mono">${portfolioUsdValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
      </div>

      {/* Loading state */}
      {loading && tokens.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw size={24} className="text-accent animate-spin" />
            <span className="text-text-secondary text-sm">Loading tokens...</span>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && tokens.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <span className="text-negative text-sm">Unable to load tokens. Try again.</span>
            <button
              onClick={retry}
              className="px-3 py-1.5 bg-accent text-white text-xs rounded-md hover:bg-accent/80 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      {tokens.length > 0 && (
        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-bg-secondary z-10">
              <tr className="text-text-secondary text-xs">
                <th className="text-left py-3 px-4 font-medium w-10">#</th>
                <th className="text-left py-3 px-2 font-medium">TOKEN</th>
                <th className="text-right py-3 px-2 font-medium">PRICE</th>
                <th className="text-right py-3 px-2 font-medium">AGE</th>
                <th className="text-right py-3 px-2 font-medium">TXNS</th>
                <th className="text-right py-3 px-2 font-medium">VOLUME</th>
                <th className="text-right py-3 px-2 font-medium">BUYS</th>
                <th className="text-right py-3 px-2 font-medium">1H</th>
                <th className="text-right py-3 px-2 font-medium">24H</th>
                <th className="text-right py-3 px-2 font-medium">LIQUIDITY</th>
                <th className="text-right py-3 px-4 font-medium">MCAP</th>
              </tr>
            </thead>
            <tbody>
              {tokens.map((token, idx) => {
                const isHighlighted = highlightedToken === token.symbol;
                const rank = (page - 1) * PAGE_SIZE + idx + 1;
                return (
                  <tr
                    key={token.tokenAddress}
                    ref={isHighlighted ? highlightRef : undefined}
                    onClick={() => onTokenClick(token)}
                    className={`border-t border-border/50 transition-colors cursor-pointer ${
                      isHighlighted
                        ? "bg-accent/10 ring-1 ring-inset ring-accent/40"
                        : "hover:bg-white/[0.02]"
                    }`}
                  >
                    <td className="py-3 px-4 text-text-secondary">{rank}</td>
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2.5">
                        <SafetyDot level={safetyMap[token.tokenAddress]?.level} />
                        <TokenIcon
                          symbol={token.symbol}
                          color={colorFromSymbol(token.symbol)}
                          name={token.name}
                          imageUrl={token.imageUrl ?? undefined}
                        />
                        <span className="font-semibold text-white">{token.symbol}</span>
                        <CopyAddress address={token.tokenAddress} />
                      </div>
                    </td>
                    <td className="py-3 px-2 text-right text-white text-xs">{fmtPrice(token.priceUsd)}</td>
                    <td className="py-3 px-2 text-right text-text-secondary">
                      {token.pairCreatedAt > 0 ? fmtAge(token.pairCreatedAt) : "\u2014"}
                    </td>
                    <td className="py-3 px-2 text-right text-text-secondary">
                      {fmtNumber(token.txnsBuysH24 + token.txnsSellsH24)}
                    </td>
                    <td className="py-3 px-2 text-right text-white">{fmtCurrency(token.volumeH24)}</td>
                    <td className="py-3 px-2 text-right text-text-secondary">{fmtNumber(token.txnsBuysH24)}</td>
                    <td className="py-3 px-2 text-right text-xs">
                      <PctCell value={token.priceChangeH1} />
                    </td>
                    <td className="py-3 px-2 text-right text-xs">
                      <PctCell value={token.priceChangeH24} />
                    </td>
                    <td className="py-3 px-2 text-right text-text-secondary">{fmtCurrency(token.liquidityUsd)}</td>
                    <td className="py-3 px-4 text-right text-white">{fmtCurrency(token.marketCap)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty state (no results after search) */}
      {!loading && !error && tokens.length === 0 && searchQuery.trim() && (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-text-secondary text-sm">No tokens found on Solana</span>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 px-4 py-2 border-t border-border flex-shrink-0">
          <button
            onClick={() => setPage(page - 1)}
            disabled={page <= 1}
            className="flex items-center gap-0.5 px-2 py-1 rounded text-xs font-medium text-text-secondary hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={13} /> Previous
          </button>
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-7 h-7 rounded text-xs font-medium transition-colors ${
                  p === page
                    ? "bg-accent text-white"
                    : "text-text-secondary hover:text-white hover:bg-bg-card"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <button
            onClick={() => setPage(page + 1)}
            disabled={page >= totalPages}
            className="flex items-center gap-0.5 px-2 py-1 rounded text-xs font-medium text-text-secondary hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Next <ChevronRight size={13} />
          </button>
          <span className="text-text-secondary text-[11px] ml-2">
            Showing pairs {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, totalFiltered)} of {totalFiltered}
          </span>
        </div>
      )}
    </div>
  );
}
