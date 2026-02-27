"use client";

import { useState, useEffect, useCallback, useRef } from "react";

const REFRESH_INTERVAL = 30_000; // 30 seconds

export interface WalletBalance {
  solBalance: number;
  solUsdPrice: number | null;
  usdValue: number;
  tokens: { mint: string; balance: number; decimals: number; usdPrice: number | null; usdValue: number | null }[];
  isLoading: boolean;
  refresh: () => void;
}

export function useWalletBalance(walletAddress: string): WalletBalance {
  const [solBalance, setSolBalance] = useState(0);
  const [solUsdPrice, setSolUsdPrice] = useState<number | null>(null);
  const [usdValue, setUsdValue] = useState(0);
  const [tokens, setTokens] = useState<WalletBalance["tokens"]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Track the latest address to avoid stale fetches
  const addressRef = useRef(walletAddress);
  addressRef.current = walletAddress;

  const fetchBalance = useCallback(async () => {
    const addr = addressRef.current;
    if (!addr) {
      setSolBalance(0);
      setSolUsdPrice(null);
      setUsdValue(0);
      setTokens([]);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/wallet-balance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: addr }),
      });
      if (!res.ok) return;

      const data = await res.json();
      // Only apply if address hasn't changed during the fetch
      if (addressRef.current !== addr) return;

      setSolBalance(data.solBalance ?? 0);
      setSolUsdPrice(data.solUsdPrice ?? null);
      setUsdValue(data.totalUsdValue ?? data.solUsdValue ?? 0);
      setTokens(data.tokens ?? []);
    } catch {
      // keep existing values
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch on mount and when address changes
  useEffect(() => {
    fetchBalance();
  }, [walletAddress, fetchBalance]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!walletAddress) return;
    const id = setInterval(fetchBalance, REFRESH_INTERVAL);
    return () => clearInterval(id);
  }, [walletAddress, fetchBalance]);

  return { solBalance, solUsdPrice, usdValue, tokens, isLoading, refresh: fetchBalance };
}
