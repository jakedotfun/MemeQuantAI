"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  fetchTrendingTokens,
  getTokensForTab,
  type MarketToken,
  type FilterTab,
  type Timeframe,
} from "@/lib/dexscreener";

const PAGE_SIZE = 20;
const MAX_PAGES = 5;

export function useMarketTokens() {
  const [allTokens, setAllTokens] = useState<MarketToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterTab>("Trending");
  const [activeTimeframe, setActiveTimeframe] = useState<Timeframe>("1H");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const tokens = await fetchTrendingTokens();
      setAllTokens(tokens);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch tokens");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Sort by tab
  const sorted = useMemo(
    () => getTokensForTab(allTokens, activeFilter, activeTimeframe),
    [allTokens, activeFilter, activeTimeframe]
  );

  // Filter by search
  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return sorted;
    const q = searchQuery.toLowerCase();
    return sorted.filter(
      (t) =>
        t.symbol.toLowerCase().includes(q) ||
        t.name.toLowerCase().includes(q)
    );
  }, [sorted, searchQuery]);

  // Paginate (cap at MAX_PAGES)
  const totalPages = Math.min(MAX_PAGES, Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)));
  const safePage = Math.min(page, totalPages);
  const tokens = useMemo(
    () => filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [filtered, safePage]
  );

  // Reset page when filter/search changes
  useEffect(() => {
    setPage(1);
  }, [activeFilter, activeTimeframe, searchQuery]);

  const totalFiltered = Math.min(filtered.length, MAX_PAGES * PAGE_SIZE);

  return {
    allTokens,
    tokens,
    loading,
    error,
    retry: load,
    page: safePage,
    totalPages,
    totalFiltered,
    setPage,
    searchQuery,
    setSearchQuery,
    activeFilter,
    setActiveFilter,
    activeTimeframe,
    setActiveTimeframe,
  };
}
