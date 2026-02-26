import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type");

  try {
    if (type === "boosts") {
      const res = await fetch("https://api.dexscreener.com/token-boosts/top/v1", {
        cache: "no-store",
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
        { cache: "no-store" }
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

    return NextResponse.json({ error: "Invalid type parameter" }, { status: 400 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 }
    );
  }
}
