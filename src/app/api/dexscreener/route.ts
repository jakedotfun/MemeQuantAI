import { NextRequest, NextResponse } from "next/server";
import { searchToken, lookupByAddress } from "@/lib/dexscreener-lookup";

export const dynamic = "force-dynamic";

const FETCH_TIMEOUT = 8000; // 8 seconds

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type");
  const q = req.nextUrl.searchParams.get("q");
  const address = req.nextUrl.searchParams.get("address");

  try {
    // Full pair-data search (for Market tab table)
    if (type === "search") {
      const query = req.nextUrl.searchParams.get("q");
      if (!query) {
        return NextResponse.json({ error: "Missing q parameter" }, { status: 400 });
      }
      const res = await fetch(
        `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(query)}`,
        { cache: "no-store", signal: AbortSignal.timeout(FETCH_TIMEOUT) },
      );
      if (!res.ok) {
        return NextResponse.json({ error: `Search API error: ${res.status}` }, { status: res.status });
      }
      const data = await res.json();
      return NextResponse.json(data);
    }

    // Latest token profiles (for New Pairs tab)
    if (type === "profiles") {
      const res = await fetch(
        "https://api.dexscreener.com/token-profiles/latest/v1",
        { cache: "no-store", signal: AbortSignal.timeout(FETCH_TIMEOUT) },
      );
      if (!res.ok) {
        return NextResponse.json({ error: `Profiles API error: ${res.status}` }, { status: res.status });
      }
      const data = await res.json();
      return NextResponse.json(data);
    }

    if (type === "boosts") {
      const res = await fetch("https://api.dexscreener.com/token-boosts/top/v1", {
        cache: "no-store",
        signal: AbortSignal.timeout(FETCH_TIMEOUT),
      });
      if (!res.ok) {
        return NextResponse.json(
          { error: `Boost API error: ${res.status}` },
          { status: res.status }
        );
      }
      const data = await res.json();
      return NextResponse.json(data);
    }

    if (type === "pairs") {
      const addresses = req.nextUrl.searchParams.get("addresses");
      if (!addresses) {
        return NextResponse.json(
          { error: "Missing addresses parameter" },
          { status: 400 }
        );
      }
      const res = await fetch(
        `https://api.dexscreener.com/latest/dex/tokens/${addresses}`,
        {
          cache: "no-store",
          signal: AbortSignal.timeout(FETCH_TIMEOUT),
        }
      );
      if (!res.ok) {
        return NextResponse.json(
          { error: `Pairs API error: ${res.status}` },
          { status: res.status }
        );
      }
      const data = await res.json();
      return NextResponse.json(data);
    }

    // Chat-route token search by name/symbol (no type param, bare ?q=)
    if (q) {
      const results = await searchToken(q);
      return NextResponse.json({ results });
    }

    // Chat-route token lookup by contract address (no type param, bare ?address=)
    if (address) {
      const results = await lookupByAddress(address);
      return NextResponse.json({ results });
    }

    return NextResponse.json({ error: "Invalid request parameters" }, { status: 400 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 }
    );
  }
}
