const GOPLUS_API = "https://api.gopluslabs.io/api/v1";

// Check token safety using GoPlus API
export async function checkTokenSafety(tokenMint) {
  try {
    const response = await fetch(
      `${GOPLUS_API}/solana/token_security?contract_addresses=${tokenMint}`
    );
    const data = await response.json();

    if (!data.result || !data.result[tokenMint.toLowerCase()]) {
      // GoPlus has no data — return unknown risk
      return {
        riskScore: 25,
        level: "UNKNOWN",
        details: { message: "No safety data available for this token" },
        raw: null
      };
    }

    const token = data.result[tokenMint.toLowerCase()];

    // Calculate risk score based on spec formula
    let riskScore = 0;
    const risks = [];

    // Honeypot detection (+40)
    if (token.is_honeypot === "1") {
      riskScore += 40;
      risks.push("Honeypot detected — cannot sell this token");
    }

    // Mint authority still active (+25)
    if (token.mintable === "1") {
      riskScore += 25;
      risks.push("Mint authority active — supply can be inflated");
    }

    // Top 10 holders own > 50% (+20)
    const top10Pct = parseFloat(token.holder_top10_rate || 0) * 100;
    if (top10Pct > 50) {
      riskScore += 20;
      risks.push(`Top 10 holders own ${top10Pct.toFixed(1)}% of supply`);
    }

    // Low liquidity (+15)
    const totalLP = parseFloat(token.total_supply_lp || 0);
    if (totalLP < 10000) {
      riskScore += 15;
      risks.push("Low liquidity pool — high slippage risk");
    }

    // Determine risk level
    let level;
    if (riskScore >= 50) level = "BLOCK";
    else if (riskScore >= 25) level = "WARN";
    else level = "SAFE";

    return {
      riskScore,
      level,
      risks,
      details: {
        isHoneypot: token.is_honeypot === "1",
        mintable: token.mintable === "1",
        top10HolderPct: top10Pct,
        hasBlacklist: token.transfer_pausable === "1",
        isTrueToken: token.is_true_token === "1",
      },
      raw: token
    };
  } catch (error) {
    console.error("GoPlus API error:", error.message);
    // On API failure, return cautious unknown score
    return {
      riskScore: 30,
      level: "WARN",
      risks: ["Safety check unavailable — proceed with caution"],
      details: { error: error.message },
      raw: null
    };
  }
}

export default { checkTokenSafety };
