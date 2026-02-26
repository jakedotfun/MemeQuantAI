"use client";

import { ArrowLeft, CheckCircle2, Lock, Globe, ExternalLink } from "lucide-react";
import TokenIcon from "@/components/TokenIcon";
import { fmtCurrency, fmtPrice, fmtAge } from "@/lib/format";
import type { MarketToken } from "@/lib/dexscreener";

// --- Mock trades ---

const mockTrades = [
  { age: "2s", type: "Buy" as const, mc: "$5.2B", amount: "1.2M", total: "$14.8K", maker: "7xK..f3Q" },
  { age: "5s", type: "Sell" as const, mc: "$5.2B", amount: "500K", total: "$6.2K", maker: "9pL..m2R" },
  { age: "12s", type: "Buy" as const, mc: "$5.1B", amount: "3.4M", total: "$42.1K", maker: "2bN..x8W" },
  { age: "18s", type: "Add" as const, mc: "$5.1B", amount: "800K", total: "$9.9K", maker: "4dR..k1P" },
  { age: "25s", type: "Buy" as const, mc: "$5.1B", amount: "2.1M", total: "$26.0K", maker: "6hT..v5J" },
  { age: "31s", type: "Sell" as const, mc: "$5.0B", amount: "4.5M", total: "$55.7K", maker: "8mY..a9L" },
  { age: "42s", type: "Buy" as const, mc: "$5.0B", amount: "750K", total: "$9.3K", maker: "1cF..w4H" },
  { age: "55s", type: "Sell" as const, mc: "$5.0B", amount: "1.8M", total: "$22.3K", maker: "3eG..z7N" },
  { age: "1m", type: "Buy" as const, mc: "$4.9B", amount: "5.0M", total: "$61.9K", maker: "5jK..b2S" },
  { age: "1m", type: "Buy" as const, mc: "$4.9B", amount: "900K", total: "$11.1K", maker: "0aW..p6D" },
  { age: "2m", type: "Sell" as const, mc: "$4.9B", amount: "2.3M", total: "$28.5K", maker: "7xK..f3Q" },
  { age: "3m", type: "Add" as const, mc: "$4.8B", amount: "1.5M", total: "$18.6K", maker: "9pL..m2R" },
  { age: "3m", type: "Buy" as const, mc: "$4.8B", amount: "3.8M", total: "$47.1K", maker: "4nQ..g8T" },
  { age: "4m", type: "Sell" as const, mc: "$4.8B", amount: "1.1M", total: "$13.6K", maker: "6rS..j2V" },
  { age: "5m", type: "Buy" as const, mc: "$4.7B", amount: "620K", total: "$7.7K", maker: "8tU..l4X" },
  { age: "5m", type: "Buy" as const, mc: "$4.7B", amount: "2.7M", total: "$33.5K", maker: "2vW..n6Z" },
  { age: "6m", type: "Sell" as const, mc: "$4.7B", amount: "4.0M", total: "$49.6K", maker: "3aB..q1C" },
  { age: "7m", type: "Add" as const, mc: "$4.6B", amount: "950K", total: "$11.8K", maker: "5cD..s3E" },
  { age: "8m", type: "Buy" as const, mc: "$4.6B", amount: "1.6M", total: "$19.8K", maker: "7eF..u5G" },
  { age: "9m", type: "Sell" as const, mc: "$4.6B", amount: "3.2M", total: "$39.7K", maker: "9gH..w7I" },
];

// --- Helpers ---

function pctClass(v: number | null) {
  if (v === null) return "text-text-secondary";
  return v >= 0 ? "text-positive" : "text-negative";
}

function pctStr(v: number | null) {
  if (v === null) return "\u2014";
  return `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;
}

function colorFromSymbol(symbol: string): string {
  let hash = 0;
  for (let i = 0; i < symbol.length; i++) {
    hash = symbol.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 70%, 50%)`;
}

function ProgressBar({ a, b }: { a: number; b: number }) {
  const total = a + b;
  const pct = total > 0 ? (a / total) * 100 : 50;
  return (
    <div className="flex h-1.5 rounded-full overflow-hidden bg-bg-secondary">
      <div className="bg-positive rounded-l-full" style={{ width: `${pct}%` }} />
      <div className="bg-negative rounded-r-full" style={{ width: `${100 - pct}%` }} />
    </div>
  );
}

// --- Component ---

export default function TokenDetail({
  token,
  onBack,
}: {
  token: MarketToken;
  onBack: () => void;
}) {
  const typeColor = (t: string) =>
    t === "Buy" ? "text-positive" : t === "Sell" ? "text-negative" : "text-accent";

  const totalTxns = token.txnsBuysH24 + token.txnsSellsH24;
  const color = colorFromSymbol(token.symbol);

  return (
    <div className="flex flex-col h-full overflow-auto">
      {/* ── Header ── */}
      <div className="px-4 py-3 border-b border-border flex-shrink-0 space-y-2">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1 rounded hover:bg-bg-card text-text-secondary hover:text-white transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <TokenIcon symbol={token.symbol} color={color} name={token.name} size={36} imageUrl={token.imageUrl ?? undefined} />
          <div className="flex items-baseline gap-2">
            <span className="text-white font-semibold text-lg">{token.name}</span>
            <span className="text-text-secondary text-sm">{token.symbol}</span>
            {token.pairCreatedAt > 0 && (
              <span className="bg-bg-card rounded px-2 text-xs text-text-secondary">{fmtAge(token.pairCreatedAt)}</span>
            )}
          </div>
          <div className="ml-auto flex items-baseline gap-3">
            <span className="text-white text-2xl font-bold">
              {fmtPrice(token.priceUsd)}
            </span>
            <span className="text-text-secondary text-xs">
              MC {fmtCurrency(token.marketCap)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {[
            { label: "24h Vol", value: fmtCurrency(token.volumeH24) },
            { label: "Liquidity", value: fmtCurrency(token.liquidityUsd) },
            { label: "Holders", value: "\u2014" },
            { label: "Txns", value: totalTxns.toLocaleString() },
          ].map((s) => (
            <span key={s.label} className="bg-bg-card rounded px-2 py-0.5 text-xs text-text-secondary">
              {s.label}: <span className="text-white">{s.value}</span>
            </span>
          ))}

          <div className="w-px h-4 bg-border mx-1" />

          {[
            { label: "1h", value: token.priceChangeH1 },
            { label: "6h", value: token.priceChangeH6 },
            { label: "24h", value: token.priceChangeH24 },
          ].map((pc) => (
            <span
              key={pc.label}
              className={`rounded px-2 py-0.5 text-xs font-medium ${
                (pc.value ?? 0) >= 0
                  ? "bg-positive/10 text-positive"
                  : "bg-negative/10 text-negative"
              }`}
            >
              {pc.label}: {pctStr(pc.value)}
            </span>
          ))}
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="flex gap-4 p-4 flex-shrink-0">
        {/* Chart */}
        <div className="flex-[65] bg-bg-card rounded-xl border border-border overflow-hidden">
          <iframe
            key={token.pairAddress}
            src={`https://dexscreener.com/solana/${token.pairAddress}?embed=1&theme=dark&trades=0&info=0`}
            style={{ width: "100%", height: "400px", border: "none", display: "block" }}
            title="DexScreener Chart"
          />
        </div>

        {/* Info Panel */}
        <div className="flex-[35] flex flex-col gap-3 overflow-y-auto max-h-[400px]">
          {/* Token image + socials */}
          {(token.imageUrl || token.websites.length > 0 || token.socials.length > 0) && (
            <div className="bg-bg-card rounded-xl border border-border p-4">
              <div className="flex items-center gap-3 mb-3">
                {token.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={token.imageUrl}
                    alt={token.symbol}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                )}
                <div className="min-w-0">
                  <div className="text-white text-sm font-semibold truncate">{token.name}</div>
                  <div className="text-text-secondary text-xs">{token.symbol} / SOL</div>
                </div>
              </div>
              {(token.websites.length > 0 || token.socials.length > 0) && (
                <div className="flex items-center gap-2 flex-wrap">
                  {token.websites.map((w) => (
                    <a
                      key={w.url}
                      href={w.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[10px] text-accent hover:text-white bg-accent/10 rounded px-1.5 py-0.5"
                    >
                      <Globe size={10} /> {w.label}
                    </a>
                  ))}
                  {token.socials.map((s) => (
                    <a
                      key={s.url}
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[10px] text-accent hover:text-white bg-accent/10 rounded px-1.5 py-0.5 capitalize"
                    >
                      <ExternalLink size={10} /> {s.type}
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Price & Market Data */}
          <div className="bg-bg-card rounded-xl border border-border p-4 space-y-2">
            {/* Price */}
            <div className="flex justify-between text-xs">
              <span className="text-text-secondary">PRICE USD</span>
              <span className="text-white font-medium">{fmtPrice(token.priceUsd)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-text-secondary">PRICE SOL</span>
              <span className="text-white font-medium">{token.priceNative.toPrecision(4)}</span>
            </div>

            <div className="border-t border-border/50 my-1" />

            {/* Liquidity */}
            <div className="flex justify-between items-center text-xs">
              <span className="text-text-secondary flex items-center gap-1">
                LIQUIDITY
                {token.liquidityUsd > 10000 && <Lock size={10} className="text-positive" />}
              </span>
              <span className="text-white font-medium">{fmtCurrency(token.liquidityUsd)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-text-secondary">FDV</span>
              <span className="text-white font-medium">{fmtCurrency(token.fdv)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-text-secondary">MKT CAP</span>
              <span className="text-white font-medium">{fmtCurrency(token.marketCap)}</span>
            </div>

            <div className="border-t border-border/50 my-1" />

            {/* Price Changes */}
            <div className="text-[10px] text-text-secondary mb-1">PRICE CHANGE</div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              {[
                { label: "1H", v: token.priceChangeH1 },
                { label: "6H", v: token.priceChangeH6 },
                { label: "24H", v: token.priceChangeH24 },
              ].map((pc) => (
                <div key={pc.label} className="bg-bg-secondary rounded px-2 py-1 text-center">
                  <div className="text-text-secondary text-[10px]">{pc.label}</div>
                  <div className={`font-medium ${pctClass(pc.v)}`}>{pctStr(pc.v)}</div>
                </div>
              ))}
            </div>

            <div className="border-t border-border/50 my-1" />

            {/* Txns */}
            <div className="flex justify-between text-xs">
              <span className="text-text-secondary">TXNS (24H)</span>
              <span className="text-white font-medium">{totalTxns.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-positive text-[10px]">Buys {token.txnsBuysH24.toLocaleString()}</span>
              <span className="text-negative text-[10px]">Sells {token.txnsSellsH24.toLocaleString()}</span>
            </div>
            <ProgressBar a={token.txnsBuysH24} b={token.txnsSellsH24} />

            <div className="border-t border-border/50 my-1" />

            {/* Volume */}
            <div className="flex justify-between text-xs">
              <span className="text-text-secondary">VOLUME (24H)</span>
              <span className="text-white font-medium">{fmtCurrency(token.volumeH24)}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs mt-1">
              {[
                { label: "5M", v: token.volumeM5 },
                { label: "1H", v: token.volumeH1 },
                { label: "6H", v: token.volumeH6 },
              ].map((vol) => (
                <div key={vol.label} className="bg-bg-secondary rounded px-2 py-1 text-center">
                  <div className="text-text-secondary text-[10px]">{vol.label}</div>
                  <div className="text-white font-medium">{fmtCurrency(vol.v)}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Token Audit (GoPlus) — mock */}
          <div className="bg-bg-card rounded-xl border border-border p-4">
            <h3 className="text-white text-sm font-semibold mb-2">Token Audit (GoPlus)</h3>
            {[
              { label: "No Mint", ok: true },
              { label: "No Blacklist", ok: true },
              { label: "Burnt LP", ok: true },
              { label: "Top 10 Holders", ok: true, extra: "16.94%" },
            ].map((row) => (
              <div key={row.label} className="flex justify-between items-center py-1 text-xs">
                <span className="text-text-secondary">{row.label}</span>
                <div className="flex items-center gap-1.5">
                  {row.extra && <span className="text-white">{row.extra}</span>}
                  <CheckCircle2 size={14} className="text-positive" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Trades Table (full width) ── */}
      <div className="px-4 pb-4 flex-shrink-0">
        <div className="bg-bg-card rounded-xl border border-border overflow-hidden">
          <div className="max-h-[300px] overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-bg-secondary z-10">
                <tr className="text-text-secondary">
                  <th className="text-left py-2 px-3 font-medium">Age</th>
                  <th className="text-left py-2 px-3 font-medium">Type</th>
                  <th className="text-right py-2 px-3 font-medium">MC</th>
                  <th className="text-right py-2 px-3 font-medium">Amount</th>
                  <th className="text-right py-2 px-3 font-medium">Total USD</th>
                  <th className="text-right py-2 px-3 font-medium">Maker</th>
                </tr>
              </thead>
              <tbody>
                {mockTrades.map((trade, i) => (
                  <tr key={i} className="border-t border-border/50 hover:bg-white/[0.02]">
                    <td className="py-2 px-3 text-text-secondary">{trade.age}</td>
                    <td className={`py-2 px-3 font-medium ${typeColor(trade.type)}`}>{trade.type}</td>
                    <td className="py-2 px-3 text-right text-white">{trade.mc}</td>
                    <td className="py-2 px-3 text-right text-white">{trade.amount}</td>
                    <td className="py-2 px-3 text-right text-white">{trade.total}</td>
                    <td className="py-2 px-3 text-right text-text-secondary font-mono">{trade.maker}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
