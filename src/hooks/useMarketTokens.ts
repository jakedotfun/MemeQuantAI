"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  fetchTabTokens,
  searchMarketTokens,
  getTokensForTab,
  type MarketToken,
  type FilterTab,
  type Timeframe,
} from "@/lib/dexscreener";

export const PAGE_SIZE = 50;
const MAX_PAGES = 3;
const SEARCH_DEBOUNCE_MS = 300;

export function useMarketTokens() {
  const [tabTokens, setTabTokens] = useState<MarketToken[]>([]);
  const [searchResults, setSearchResults] = useState<MarketToken[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterTab>("Trending");
  const [activeTimeframe, setActiveTimeframe] = useState<Timeframe>("1H");

  // Track search version to ignore stale results
  const searchVersionRef = useRef(0);

  // ── Load tab data (now via /api/market-tokens) ──
  const loadTab = useCallback(async (tab: FilterTab) => {
    setLoading(true);
    setError(null);
    try {
      const tokens = await fetchTabTokens(tab);
      setTabTokens(tokens);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load tokens. Try again.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadTab(activeFilter);
  }, [activeFilter, loadTab]);

  // ── Debounced search ──
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      setSearchResults(null);
      setSearching(false);
      return;
    }

    setSearching(true);
    const version = ++searchVersionRef.current;

    const timer = setTimeout(async () => {
      try {
        const results = await searchMarketTokens(q);
        // Only apply if this is still the latest search
        if (searchVersionRef.current === version) {
          setSearchResults(results);
          setSearching(false);
        }
      } catch {
        if (searchVersionRef.current === version) {
          setSearchResults([]);
          setSearching(false);
        }
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // ── Sort tab data (frontend re-sorts for timeframe changes) ──
  const sorted = useMemo(
    () => getTokensForTab(tabTokens, activeFilter, activeTimeframe),
    [tabTokens, activeFilter, activeTimeframe],
  );

  // Active dataset: search results override tab data
  const activeData = searchResults !== null ? searchResults : sorted;

  // Paginate (cap at MAX_PAGES)
  const totalPages = Math.min(MAX_PAGES, Math.max(1, Math.ceil(activeData.length / PAGE_SIZE)));
  const safePage = Math.min(page, totalPages);
  const tokens = useMemo(
    () => activeData.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [activeData, safePage],
  );

  // Reset page when filter/search/timeframe changes
  useEffect(() => {
    setPage(1);
  }, [activeFilter, activeTimeframe, searchQuery]);

  const totalFiltered = Math.min(activeData.length, MAX_PAGES * PAGE_SIZE);

  const isSearching = searching && searchQuery.trim().length > 0;
  const isLoading = searchQuery.trim() ? isSearching : loading;

  return {
    allTokens: tabTokens,
    tokens,
    loading: isLoading,
    error,
    retry: () => loadTab(activeFilter),
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
