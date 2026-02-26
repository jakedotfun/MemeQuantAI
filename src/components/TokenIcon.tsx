"use client";

import { useState } from "react";
import { tokenLogos } from "@/data/tokens";

export default function TokenIcon({
  symbol,
  color,
  name,
  size = 28,
  imageUrl,
}: {
  symbol: string;
  color: string;
  name: string;
  size?: number;
  imageUrl?: string;
}) {
  const [errored, setErrored] = useState(false);
  const src = imageUrl || tokenLogos[symbol];

  if (!src || errored) {
    return (
      <div
        className="rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold"
        style={{ backgroundColor: color, width: size, height: size }}
      >
        {name.charAt(0)}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={symbol}
      width={size}
      height={size}
      className="rounded-full flex-shrink-0 object-cover"
      style={{ width: size, height: size }}
      onError={() => setErrored(true)}
    />
  );
}
