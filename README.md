# 👾 MemeQuant AI — Risk-Managed Autonomous Trading Terminal

> **Deploy self-sovereign AI agents that monitor, strategize, and execute on-chain trades 24/7 — with built-in risk management as the core primitive.**

---

## 📖 Table of Contents

- [Product Description](#product-description)
- [Target Users](#target-users)
- [Problems We Solve](#problems-we-solve)
- [Competitive Landscape](#competitive-landscape)
- [Core Features](#core-features)
- [Technical Architecture](#technical-architecture)
- [UI Elements](#ui-elements)
- [Core Flow](#core-flow)
- [Risk Framework](#risk-framework)
- [Honest Assessment](#honest-assessment)
- [Scope Definition (2-Day Constraint)](#scope-definition)
- [Implementation Plan](#implementation-plan)
- [Demo Script](#demo-script)
- [Prepared Q&A](#prepared-qa)
- [Business Model](#business-model)
- [Roadmap](#roadmap)
- [Tech Stack](#tech-stack)
- [Risk Disclosure](#risk-disclosure)

---

## 🧠 Product Description

**MemeQuant AI** is an AI-powered autonomous trading terminal built for the Solana memecoin economy. It enables users to deploy personal AI agents that operate as self-sovereign economic entities — monitoring markets, architecting risk-aware strategies, and executing on-chain trades 24/7 without human intervention.

At its core, MemeQuant AI is built around **Angle 5: the Risk-Managed Trading Agent**. Every agent deployed on the platform is not just an executor — it is a disciplined, rule-bound risk manager. Each agent enforces position sizing, stop-loss logic, take-profit triggers, and drawdown limits autonomously, ensuring that capital preservation is always prioritized alongside alpha generation.

Unlike traditional trading bots that require users to manually configure slippage, gas settings, and execution parameters, MemeQuant AI agents accept **natural language commands** and come with **pre-built automation playbooks** — making on-chain trading accessible to users who have never touched a DEX.

> **Core Insight:** The best trade is not the fastest trade — it's the trade that survives. MemeQuant AI agents are built to *not blow up* first, and *capture upside* second. **The agent that survives first, profits second.**

---

## 👥 Target Users

### Primary Persona: The Crypto-Curious Non-Technical User

**Profile:**
- Holds a small amount of crypto ($50–$2,000 in SOL/USDC)
- Has heard about memecoin trading and seen others profit, but doesn't know where to start
- Cannot configure trading bot parameters (slippage, MEV, RPC nodes)
- Finds existing tools like Banana Gun or Photon intimidating — too many settings, too much jargon
- Wants to participate but **fears losing everything due to scams, rugs, or emotional decisions**

### Secondary Personas

| Persona | Need | How MemeQuant AI Serves Them |
|---------|------|------------------------------|
| **Passive Investors** | Participate without 24/7 monitoring | Configure playbooks once, let agent work. Sleep-friendly trading. |
| **Copy Traders** | Mirror proven strategies without expertise | Follow top agent profiles with personal risk overrides (V2.0) |
| **KOLs & Referrers** | Build recurring revenue from audience | 10% permanent fee share from referred users (V2.0) |

### Explicitly NOT Targeting (MVP)

- Professional quant traders (they build custom infra)
- High-frequency arbitrage bots (we can't compete on latency)
- Users who need multi-chain execution today (MVP is Solana-only)

### Why This User Matters (Market Context)

Solana's memecoin launchpad ecosystem processes thousands of new token launches daily. At its peak (Sep 2025), pump.fun alone saw **18,446 tokens deployed in a single day** *(LBank, Sep 2025)*. However, activity has contracted significantly — as of Feb 2026, daily launches have declined from peak levels, with graduation rates averaging ~1.15% of new launches *(Cryptopolitan, Feb 2026; Dune Analytics)*. Pump.fun retains ~95% market share of token graduations *(The Block, Oct 2025)* and has generated **$800M+ in cumulative revenue** since inception *(Wikipedia)*. Over **12.5M+ tokens** have been launched on the platform lifetime. Platforms like pump.fun have made token creation trivially easy, creating massive retail interest. But the gap between "wanting to trade memecoins" and "successfully trading memecoins" is enormous — existing tools assume technical competence that most new users don't have.

Our agent targets exactly this gap: retail users who need **accessible automation and risk management** — not a power terminal, but a conversational co-pilot.

---

## 🔥 Problems We Solve

### 1. Complexity Barrier — "I Don't Know How to Configure a Trading Bot"

Banana Gun requires setting: slippage tolerance, gas tip, buy amount, anti-MEV toggle, RPC endpoint, per-token settings. Photon presents a full trading terminal with candlestick charts and order books. For a user who has never used a DEX, this is a wall.

**MemeQuant AI solution:** Say "buy $50 of PEPE with a 20% stop-loss" in plain English. The agent handles the rest.

### 2. Zero Risk Management by Default

Current on-chain trading tools offer no native risk guardrails. Users either ape in blind or write custom scripts that break. There is no platform that bakes disciplined risk management (stop-loss, position sizing, drawdown caps) directly into the autonomous execution loop as a **default, not an opt-in**.

**MemeQuant AI solution:** Every trade runs through a Risk Constitution. Stop-loss is not optional — it's enforced by code.

### 3. No Pre-Built Strategies for Beginners

Existing bots give users a blank canvas. "Set your parameters." But new users don't know what parameters to set. What's a good stop-loss percentage? What volume threshold signals a breakout? These require experience that beginners don't have.

**MemeQuant AI solution:** Pre-built automation playbooks (Alpha Buy, Rug Exit, Stop-Loss Guard, etc.) that encode best practices from experienced traders. One-click activation.

### 4. Scam Exposure — "I Bought a Honeypot"

The Solana memecoin ecosystem is filled with fraudulent tokens. New users lack the tools and knowledge to identify honeypots, rug pulls, and scam tokens before buying.

**MemeQuant AI solution:** GoPlus safety check runs automatically before every trade. Tokens with high risk scores are blocked or flagged with warnings.

### 5. Emotional Trading — "I Panic Sold / I FOMO'd In"

The #1 destroyer of retail portfolios is not bad picks — it's bad behavior. Panic selling at the bottom, FOMO buying at the top, revenge trading after a loss. Humans are wired to make these mistakes.

**MemeQuant AI solution:** Agents don't feel emotions. Stop-loss triggers at the configured level. Take-profit executes at the configured level. No FOMO, no panic, no revenge.

---

## 🏆 Competitive Landscape

### Existing Players

| Product | Chain | Users (Lifetime) | Core Features | Key Limitation |
|---------|-------|-------------------|---------------|----------------|
| **Banana Gun** | Solana, Base, ETH, BNB, Sonic | 1M+ lifetime *(SecureBlitz, Feb 2025; ~12.7K weekly active wallets per Banana Gun blog, May 2025)* | Sniper bot, limit orders, anti-rug, auto-sell, anti-MEV (Jito), $16B+ total volume | Rule-based only — no NLP, no pre-built strategies. Users must manually configure every parameter per trade. Steep learning curve. |
| **Photon** | Solana (primary), ETH, Base, Tron | 1.3M+ lifetime *(99Bitcoins, Dec 2025; $40B+ all-time volume, $421M fees generated)* | Web trading terminal, stop-loss, take-profit, Memescope, MEV protection | UI-heavy terminal designed for experienced traders. No conversational interface. No automation templates. 1% fee per tx. |
| **BonkBot** | Solana | 519K+ lifetime *(CoinGecko/Dune, Jul 2025; $13.8B lifetime volume)* | Telegram-based buy/sell, limit orders, Jupiter routing, MEV protection | Text-command Telegram bot. No intelligence layer — purely executes literal commands. No risk management defaults. 1% fee. |
| **GMGN** | Solana, Base, ETH | 200K+ *(estimated)* | Wallet tracking, smart money signals, sniper, cross-chain swaps | Analytics-first platform. Gives signals but user must still execute manually. No autonomous agent. |
| **Maestro** | Multi-chain (10+ chains) | 573K+ lifetime *(CoinGecko/Dune, Jul 2025; $12.8B lifetime volume)* | Sniper, anti-MEV, portfolio tracking, Whale Bot | Similar to Banana Gun — powerful but config-heavy. $200/month premium tier. Targets power users. |

> **⚠️ Data Note:** User counts are *lifetime cumulative* from Dune Analytics / official sources, not monthly active users. The memecoin market has contracted significantly from its Jan 2025 peak — weekly active wallets across all bots are ~42K–52K total (Dune, mid-2025), down from peaks of 100K+. Banana Gun reports ~10-12K weekly active wallets as of May 2025. These numbers reflect market-wide contraction, not platform-specific decline.

### Our Differentiators

**Differentiator 1 — Pre-Built Automation Playbooks**

When a new user opens the Automations tab, they see ready-to-activate playbooks — not a blank config screen:

| Playbook | Trigger Condition | Action | Rationale |
|----------|------------------|--------|-----------|
| **Alpha Buy** | Volume (5m) surges ≥ 30% vs 1h avg | Buy with 2% of portfolio | Early volume spike = potential breakout signal |
| **Momentum Sell** | Price surges ≥ 100% from entry | Sell 50% position | Lock partial profit at 2x |
| **Duplicate Ticker Shield** | Multiple tokens share same ticker | Prioritize Jupiter verified/strict list, then sort by highest LP | Avoid copycat/scam tokens — earliest deploy may be abandoned/rugged |
| **Rug Pull Exit** | Liquidity drops ≥ 50% in 5 min | Sell 100% immediately | Liquidity removal = likely rug |
| **Whale Follow** | Wallet in top-100 holders buys token | Buy with 1% of portfolio | Smart money signal |
| **Stop-Loss Guard** | Price drops ≥ 20% from entry | Sell 100% position | Capital preservation |
| **New Token Snipe** | Token deployed < 60s ago + LP added | Buy with 0.5% of portfolio | Early entry on new launches |

Users activate playbooks with one click, customize thresholds, or combine multiple playbooks into a strategy stack. No other Solana trading bot provides this.

**Differentiator 2 — Chat-to-Trade (Natural Language → On-Chain Action)**

No competitor offers conversational AI as the primary trading interface:

```
Banana Gun:  /buy <token_address> <amount> <slippage> <gas_tip>
BonkBot:     /buy <token_address>
Photon:      Click token → Set amount → Set slippage → Confirm

MemeQuant:   "Buy $50 of PEPE with a 20% stop-loss"
             → Agent resolves token, checks safety, executes, sets automation
```

**Differentiator 3 — Safety-First by Default**

| Capability | Banana Gun | Photon | BonkBot | MemeQuant AI |
|-----------|-----------|--------|---------|-------------|
| GoPlus safety check (auto) | ❌ | ❌ | ❌ | ✅ Every trade |
| Pre-trade risk scoring | ❌ | ❌ | ❌ | ✅ Block/warn on high risk |
| Default stop-loss | ❌ Optional | ❌ Optional | ❌ None | ✅ Enforced by default |
| Duplicate ticker protection | ❌ | ❌ | ❌ | ✅ Verified list + highest LP |

### Honest Positioning

**Banana Gun and Photon likely win for:** raw execution speed, MEV protection (Jito bundles), multi-chain support, and battle-tested reliability with millions of transactions.

**We potentially win for:** accessibility (chat vs. config screens), pre-built playbooks (one-click vs. blank slate), and safety-first defaults (GoPlus auto-check, enforced stop-loss).

**The honest pitch is not "we're better than Banana Gun."** It's: **"Banana Gun is built for power users who know exactly what they want. We're built for the next million users who don't."**

---

## ⚙️ Core Features (MVP Scope)

### 🗣️ Chat-to-Trade
Convert natural language commands into on-chain execution on Solana:
- *"Buy $50 of PEPE, set 20% stop-loss"*
- *"Sell half my BONK position"*
- *"What's my portfolio looking like?"*

### 🛡️ Risk-Managed Execution *(Angle 5 Core)*
Every trade is evaluated against the agent's **Risk Constitution** before execution:

| Risk Parameter | Default Value | Description |
|---|---|---|
| **Max Position Size** | 5% of portfolio | Cap on capital deployed per single trade |
| **Stop-Loss (Fixed)** | -20% from entry | Auto-sell trigger — enforced, not optional |
| **Take-Profit** | +100% from entry | Auto-sell at 2x (configurable) |
| **Daily Drawdown Limit** | -15% of portfolio | Agent pauses all trading if daily loss exceeds threshold |
| **Max Open Positions** | 5 concurrent | Hard cap on simultaneous active trades |
| **Token Safety Threshold** | Risk score < 50 | GoPlus safety check — block trades on high-risk tokens |

### 📋 Pre-Built Automation Playbooks
7 ready-to-activate playbooks (see Competitive Landscape section for full list). Users activate with one click, customize thresholds, or stack multiple playbooks.

### 🔍 Token Safety Analysis (GoPlus)
Automatic pre-trade safety check on every buy:
- Honeypot detection
- Mint authority status
- Top-10 holder concentration
- Liquidity pool depth

### 💼 Portfolio Dashboard
Real-time view of:
- Active positions with live PnL
- Active automations and their status
- Trade history (every action logged)
- Agent status: 🟢 ACTIVE / ⏸️ PAUSED / 🔴 STOPPED

---

## 🔧 Technical Architecture

### Chat-to-Trade NLP Pipeline

```
User message (natural language)
       ↓
┌─────────────────────────────────────────────────────┐
│  STEP 1: Intent Classification (Claude API)         │
│                                                     │
│  System prompt extracts structured JSON:            │
│  {                                                  │
│    "intent": "BUY" | "SELL" | "SET_AUTOMATION"      │
│              | "CHECK_PORTFOLIO" | "INFO",           │
│    "token_query": "PEPE",                           │
│    "amount_usd": 50,                                │
│    "stop_loss_pct": 20,                             │
│    "take_profit_pct": null,                         │
│    "confidence": 95                                 │
│  }                                                  │
│                                                     │
│  Confidence < 80% → agent asks clarifying question  │
│  Confidence ≥ 80% → proceed to execution pipeline   │
└─────────────────────────────────────────────────────┘
       ↓
┌─────────────────────────────────────────────────────┐
│  STEP 2: Token Resolution (Jupiter Token List API)  │
│                                                     │
│  Query: "PEPE" on Solana                            │
│  → Search Jupiter token registry by symbol          │
│  → If multiple tokens with same ticker:             │
│      1. Filter for Jupiter verified/strict list     │
│      2. Sort remaining by largest LP size           │
│      3. Select top result (highest liquidity)       │
│      Warn user: "Found 3 tokens named PEPE.         │
│      Using the verified token with highest LP."     │
│  → Return: { mint, symbol, decimals, lp_address }   │
└─────────────────────────────────────────────────────┘
       ↓
┌─────────────────────────────────────────────────────┐
│  STEP 3: Safety Check (GoPlus API)                  │
│                                                     │
│  GET https://api.gopluslabs.com/api/v1/             │
│      solana/token_security?contract_addresses={mint} │
│                                                     │
│  Risk Score Computation:                            │
│  riskScore = 0                                      │
│  if (is_honeypot)            riskScore += 40        │
│  if (mint_authority != null) riskScore += 25        │
│  if (top10_holder_pct > 50%) riskScore += 20        │
│  if (lp_total_supply < $10K) riskScore += 15        │
│                                                     │
│  riskScore ≥ 50 → BLOCK trade, explain to user      │
│  riskScore 25–49 → WARN user, require confirmation  │
│  riskScore < 25  → PROCEED                          │
└─────────────────────────────────────────────────────┘
       ↓
┌─────────────────────────────────────────────────────┐
│  STEP 4: Trade Execution (Jupiter Swap API v6)      │
│                                                     │
│  1. GET /quote                                      │
│     inputMint = SOL                                 │
│     outputMint = {resolved_token_mint}              │
│     amount = {lamports}                             │
│     slippageBps = dynamic:                          │
│       trade < $50  → 500 (5%)                       │
│       trade $50-200 → 300 (3%)                      │
│       trade > $200 → 100 (1%) + warn user           │
│     maxTradeSize = $200 (MVP cap — no MEV protect)  │
│                                                     │
│  2. POST /swap                                      │
│     Sign transaction with agent wallet keypair      │
│                                                     │
│  3. Confirm on Solana RPC (confirmTransaction)      │
│                                                     │
│  4. Record in DB:                                   │
│     { token, entry_price, amount, timestamp,        │
│       tx_hash, stop_loss_pct, take_profit_pct }     │
└─────────────────────────────────────────────────────┘
       ↓
Agent responds: "✅ Bought 12.5M PEPE at $0.00004.
                 Stop-loss set at -20%. Tx: abc123..."
```

**Claude API Prompt (Intent Extraction):**

```
SYSTEM: You are a Solana memecoin trading assistant. Parse the user's
message and return ONLY a JSON object:
- intent: "BUY" | "SELL" | "SET_AUTOMATION" | "CHECK_PORTFOLIO" | "INFO"
- token_query: string (token symbol or contract address)
- amount_usd: number or null
- amount_pct: number or null (e.g., "sell half" = 50)
- stop_loss_pct: number or null
- take_profit_pct: number or null
- confidence: 0-100

If ambiguous, set confidence < 80 and add "clarification_needed" field.

USER: "buy 50 bucks of pepe and set a stop loss at 20%"

OUTPUT:
{
  "intent": "BUY",
  "token_query": "PEPE",
  "amount_usd": 50,
  "amount_pct": null,
  "stop_loss_pct": 20,
  "take_profit_pct": null,
  "confidence": 95
}
```

### Automation Engine Architecture

```
┌──────────────────────────────────────────────┐
│           AUTOMATION ENGINE (Node.js)         │
│                                               │
│  WebSocket connections:                       │
│  ├── Birdeye Price WS: real-time token prices  │
│  │   (wss://public-api.birdeye.so/socket/solana)│
│  ├── Helius WS: transaction monitoring        │
│  └── Fallback: Jupiter /price REST polling 3s │
│                                               │
│  Event Loop (per price update, ~400ms):       │
│  1. Receive new price data                    │
│  2. For each active automation rule:          │
│     a. Evaluate trigger condition             │
│     b. If triggered → execute action          │
│     c. Log result to DB                       │
│  3. Rate limit: max 1 action per token        │
│     per 30s (prevent double-execution)        │
└──────────────────────────────────────────────┘
```

**Automation Rule Schema:**

```javascript
{
  id: "auto_001",
  user_id: "user_abc",
  name: "Alpha Buy",
  enabled: true,
  trigger: {
    type: "VOLUME_SURGE",       // VOLUME_SURGE | PRICE_CHANGE |
                                 // LIQUIDITY_DROP | WHALE_BUY |
                                 // NEW_TOKEN | TIME_BASED
    params: {
      metric: "volume_5m",
      operator: ">=",
      threshold: 30,             // 30% surge vs baseline
      baseline: "avg_1h"
    }
  },
  action: {
    type: "BUY",                 // BUY | SELL | ALERT
    params: {
      amount_pct: 2,             // 2% of portfolio
      slippage_bps: "dynamic",   // see dynamic slippage rules
      stop_loss_pct: 20,
      max_position_usd: 200     // MVP cap: no MEV protection
    }
  },
  cooldown_seconds: 300,         // no re-trigger within 5 min
  created_at: "2026-02-24T10:00:00Z"
}
```

### Stop-Loss / Take-Profit Monitor

```
┌──────────────────────────────────────────────────┐
│         PRICE MONITOR SERVICE (Node.js)           │
│                                                   │
│  Primary: Birdeye WebSocket (SUBSCRIBE_PRICE) │
│  (supports 1s intervals on Solana)            │
│  Fallback: Jupiter /price REST API polling 3s │
│                                                   │
│  For each open position:                          │
│  ┌───────────────────────────────────────────┐    │
│  │ current_price = ws_price_feed[token_mint] │    │
│  │ entry_price   = position.entry_price      │    │
│  │                                           │    │
│  │ pnl_pct = ((current - entry) / entry) × 100   │
│  │                                           │    │
│  │ if pnl_pct ≤ -stop_loss_pct:             │    │
│  │   → Execute SELL via Jupiter Swap API     │    │
│  │   → Log: "⛔ Stop-loss triggered at -20%" │    │
│  │                                           │    │
│  │ if pnl_pct ≥ take_profit_pct:            │    │
│  │   → Execute SELL via Jupiter Swap API     │    │
│  │   → Log: "✅ Take-profit at +100%"        │    │
│  │                                           │    │
│  │ Latency target: < 2s trigger-to-tx        │    │
│  └───────────────────────────────────────────┘    │
│                                                   │
│  Auto-reconnect: exponential backoff              │
│  (1s → 2s → 4s → max 30s)                        │
│  On WS disconnect: fallback to polling instantly   │
└──────────────────────────────────────────────────┘
```

### Agent Wallet Architecture

```
User connects Phantom / Solflare
       ↓
Server generates agent wallet (Keypair.generate())
       ↓
Private key encrypted (AES-256-GCM), stored server-side
       ↓
User deposits SOL + USDC to agent wallet address
       ↓
Agent wallet signs all trade transactions autonomously
       ↓
User can withdraw 100% at any time → funds return to connected wallet
```

---

## 🖥️ UI Elements

### Quant Command Center
Dark-mode terminal interface with neon accent colors (electric green / cyan on deep navy/black). Monospace typography creates a "hacker-quant" aesthetic. Every element is designed for speed and clarity.

### AI Chat Terminal
The central command stream. Users interact with agents in natural language. Live execution logs stream in real-time — users see what the agent is doing and why, including risk evaluation reasoning for each trade.

### Risk Constitution Panel
Dedicated UI module for configuring the agent's Risk Constitution. Visual sliders, threshold inputs, and a real-time **Risk Score (0–100)** indicator showing how aggressive/conservative the current configuration is.

### Automation Playbooks Panel
Grid of 7 pre-built playbooks, each with:
- Toggle ON/OFF switch
- Customizable threshold sliders
- Last triggered timestamp
- Total executions counter

### Portfolio Dashboard
- Active positions with live PnL (red when negative — no sugar-coating)
- Stop-loss and take-profit levels per position
- Agent activity feed: recent actions, decisions blocked by risk rules
- Trade history table: every action logged with timestamp, direction, amount, result

---

## 🔄 Core Flow

```
[User] → Open MemeQuant AI → Connect Phantom wallet (Solana)
              ↓
[User] → Deposit SOL/USDC into Agent Wallet
              ↓
[User] → Review Risk Constitution defaults
         + Max position: 5% of portfolio
         + Stop-loss: -20% (enforced)
         + Daily drawdown limit: -15%
         + Max open positions: 5
              ↓
[User] → Activate Playbooks (optional):
         Toggle ON: "Stop-Loss Guard" + "Rug Pull Exit"
              ↓
[User] → Chat: "Buy $50 of PEPE with 20% stop-loss"
              ↓
[Agent] → Pipeline:
         1. Claude API: parse intent → {BUY, PEPE, $50, SL 20%}
         2. Jupiter Token List: resolve PEPE mint address
            (if duplicates → prioritize verified list + highest LP, warn user)
         3. GoPlus: safety check → riskScore = 15 (SAFE)
         4. Jupiter Swap: execute buy → confirm on Solana
         5. Set stop-loss automation at -20%
              ↓
[Agent] → Dashboard updates:
         - New position: PEPE, $50, entry price, live PnL
         - Automation active: stop-loss at -20%
              ↓
[Agent] → Price Monitor (WebSocket):
         - Continuously tracks PEPE price
         - Price drops 20% → auto-sell triggered
         - "⛔ Stop-loss triggered: sold PEPE at -20% ($40 recovered)"
              ↓
[User] → At any time: "Stop agent" or "Withdraw all"
         → Agent stops → funds return to user wallet
```

---

## 🛡️ Risk Framework

> **Angle 5: Risk-Managed Trading Agent**

MemeQuant AI's core thesis is that **risk management IS the alpha** in volatile memecoin markets. Most participants blow up their portfolios not from missing entries, but from missing exits.

### The Risk Constitution (Per Agent)
Every agent operates under a user-defined Risk Constitution — a set of rules governing all trading decisions. The agent cannot override this constitution; it can only operate within it.

### Agent Risk Scoring
Each agent configuration is assigned a **Risk Score (0–100)**:

| Score Range | Profile | Characteristics |
|-------------|---------|-----------------|
| **0–30** | Conservative | Tight stops (-10%), small positions (2%), max 3 open positions |
| **31–60** | Moderate | Balanced stops (-20%), medium positions (5%), max 5 open positions |
| **61–85** | Aggressive | Wide stops (-35%), larger positions (8%), max 8 open positions |
| **86–100** | Maximum Risk | Near-autonomous sniping mode. Requires explicit user acknowledgment |

### Circuit Breakers
Platform-level safeguards that activate automatically:

| Circuit Breaker | Trigger | Action |
|----------------|---------|--------|
| **Daily Drawdown** | Portfolio drops > X% in 24h | Agent pauses all trading |
| **Liquidity Circuit Breaker** | Token liquidity drops below $5K mid-trade | Cancel execution |
| **Consecutive Loss Pause** | 4 losses in a row | Pause 1 hour, then resume |
| **Gas Spike Protector** | Network fee > 3x baseline | Pause execution until normalized |

### Pre-Trade Token Safety Analysis (GoPlus)

Every buy order runs through a multi-factor safety check:

```
Risk Score Calculation:
───────────────────────────────────────────
Factor                      Weight    Condition
───────────────────────────────────────────
Honeypot detected            +40      is_honeypot == true
Mint authority active        +25      mint_authority != null
Top-10 holders > 50%         +20      top10_holder_pct > 50
Liquidity pool < $10K        +15      lp_value_usd < 10000
───────────────────────────────────────────
Total Risk Score: 0–100

Score ≥ 50  → ⛔ BLOCK trade (explain why)
Score 25–49 → ⚠️ WARN (require user confirmation)
Score < 25  → ✅ PROCEED
```

---

## 🔍 Honest Assessment

### What the MVP Can Do (Realistically)

- ✅ Deploy a personal agent wallet on Solana
- ✅ Chat-to-trade: parse natural language → execute buy/sell via Jupiter
- ✅ Activate pre-built automation playbooks (stop-loss, rug exit, volume surge buy)
- ✅ Real-time price monitoring via WebSocket for stop-loss/take-profit
- ✅ GoPlus safety check before every trade
- ✅ Dashboard showing portfolio, positions, automation status, trade history

### What the MVP Cannot Do (Honest Limitations)

- ❌ **NLP is not perfect.** Complex multi-step instructions (e.g., "buy PEPE if it dips 10% then sell half at 2x and the rest at 5x") may be misinterpreted. MVP handles single-intent messages reliably; multi-intent requires iteration post-MVP.
- ❌ **Automation playbooks are hypothesis-based.** "Buy on 30% volume surge" is a common heuristic in memecoin trading, but it is NOT a proven edge. Win rate is unknown without backtesting against historical data. The playbooks encode commonly-observed patterns — not guaranteed alpha.
- ❌ **Latency is a real constraint.** Banana Gun and Photon have optimized infrastructure with dedicated RPC nodes and sub-second execution. Our MVP uses standard RPC endpoints — execution latency will be 3-5 seconds for chat-to-trade, 1.5-2.5 seconds for automation triggers. This matters in fast-moving memecoin markets.
- ❌ **No MEV protection in MVP.** Banana Gun has anti-MEV via Jito bundles and private transactions. Our MVP submits standard Solana transactions — susceptible to sandwich attacks on larger trades. **Mitigation: MVP caps max trade size at $200 and uses dynamic slippage** (5% for <$50, 3% for $50-200, 1% for >$200 with user warning). For trades under $100, sandwich risk is low (attacker profit doesn't justify gas cost). For larger trades, this is a real vulnerability — V1.5 adds Jito bundle support.
- ❌ **Single-chain only.** Competitors like Banana Gun and Photon already support Solana + Base + ETH. MVP is Solana-only. Multi-chain is V2.0 — the architecture is designed for it, but shipping one chain well beats five chains poorly.
- ❌ **GoPlus is not infallible.** Token safety scoring catches known rug patterns but cannot detect novel scam mechanisms. Users should still DYOR (Do Your Own Research).
- ❌ **No copy trade in MVP.** GMGN and Photon offer wallet tracking / copy trading. Not in MVP scope.
- ❌ **Server-side key custody is a known risk.** The MVP stores agent wallet private keys encrypted (AES-256-GCM) server-side. This is a centralization risk — if the server is compromised, all agent wallets are exposed. Production deployment requires: HSM (Hardware Security Module) for key storage, withdrawal address whitelisting, rate-limited withdrawals, and a full security audit. The MVP accepts this trade-off for hackathon velocity but it is NOT production-ready as-is.

### Competitive Honesty

**Banana Gun and Photon likely win for:** raw execution speed, MEV protection, multi-chain support, and battle-tested reliability with millions of transactions processed.

**We potentially win for:** accessibility (chat interface vs. config screens), pre-built automations (playbooks vs. blank slate), and lower learning curve for non-technical users entering memecoin trading for the first time.

---

## 📐 Scope Definition (3-Day Constraint — Day 2 to Day 4)

### ✅ In Scope (Day 2–4)

- **Single chain:** Solana only
- **Agent wallet:** Generate on Solana, deposit/withdraw SOL
- **Chat-to-trade:** Natural language → buy/sell via Jupiter Swap API
- **Pre-built automations:** 4 playbooks — Stop-Loss Guard, Take-Profit, Alpha Buy (volume surge), Rug Pull Exit
- **Token safety:** GoPlus API check before every trade
- **Price monitoring:** Birdeye WebSocket real-time price feed (fallback: Jupiter REST polling)
- **Dashboard:** Portfolio view, active positions, automation status, trade history
- **1 happy path demo:** Chat → buy token on Solana → stop-loss triggers → auto-sell

### ❌ Out of Scope (Post-MVP)

| Feature | Phase | Rationale |
|---------|-------|-----------|
| Multi-chain (Base, ETH, BNB) | V2.0 | Depth over breadth — Solana has highest memecoin volume |
| Copy trade / wallet tracking | V2.0 | Requires social layer + leaderboard infra |
| DCA engine | V1.5 | Good feature but not core to the happy path demo |
| Cross-chain bridging | V3.0 | Significant complexity (Li.Fi integration) |
| MEV protection (Jito bundles) | V1.5 | Industry standard on Solana, must-have for production |
| Custom automation builder | V2.0 | Pre-built playbooks first, custom later |
| Trailing stop-loss | V1.5 | Fixed stop-loss in MVP, trailing is enhancement |
| Portfolio analytics (Sharpe, Sortino) | V2.0 | Nice-to-have, not demo-critical |
| Mobile app | V3.0 | Web-first |
| Backtesting playbooks | V1.5 | **Must complete before claiming any win rate** |

### Scope Decision Rationale

**1 happy path that works end-to-end > 10 features that are half-built.** With 3 days remaining (Day 2–4), the MVP must prove one thing: a user can chat with an AI agent, execute a real trade on Solana, and have automated risk controls (stop-loss) protect their position — all without touching a single config screen. Day 4 is dedicated to testing, polish, and demo preparation.

---

## 📅 Implementation Plan (3 Days — Day 2 to Day 4)

### Day 2 — Foundation + Core Trading

**Morning (4h):**
- Project setup: Next.js 14 + Express + @solana/web3.js
- Agent wallet module: `Keypair.generate()`, encrypt private key (AES-256-GCM), store server-side
- Phantom wallet connection (Solana Wallet Adapter)
- Deposit flow: user wallet → agent wallet (SOL transfer)

**Afternoon (4h):**
- Chat-to-trade backend:
  - Claude API integration for intent parsing (system prompt + JSON extraction)
  - Jupiter Swap API integration (GET /quote → POST /swap → confirmTransaction)
  - Token resolution: Jupiter Token List API + duplicate ticker logic (verified list + highest LP)
  - GoPlus safety check middleware (risk score calculation)
- Unit tests: intent parsing, token resolution, safety scoring

**Evening: Push to GitHub ✅**

### Day 3 — Automations + Dashboard

**Morning (4h):**
- Automation engine:
  - Pre-built playbook definitions (4 playbooks as JSON configs)
  - Birdeye WebSocket price monitor (SUBSCRIBE_PRICE)
  - Stop-loss / take-profit execution loop
  - Dynamic slippage logic + $200 max trade cap
  - Automation activation UI (toggle on/off per playbook, threshold sliders)

**Afternoon (4h):**
- Dashboard UI:
  - Portfolio card (total balance, positions with live PnL)
  - Active automations panel (status, last triggered, total executions)
  - Trade history table (timestamp, direction, amount, result, tx hash)
- Withdraw flow: agent wallet → user wallet
- End-to-end integration test: chat → buy → position appears → stop-loss triggers

**Evening: Push to GitHub ✅**

### Day 4 — Polish + Demo Prep + Testing

**Morning (4h):**
- End-to-end happy path testing:
  - Chat "buy $10 of [token]" → agent executes → position appears in dashboard
  - Price drops → stop-loss triggers → auto-sell → trade logged in history
  - Verify: GoPlus blocks a honeypot token (test with known scam address)
  - Test edge cases: duplicate tickers, insufficient balance, high-risk token
- UI polish: loading states, error handling, empty states, responsive design

**Afternoon (4h):**
- Seed demo data: 10-15 realistic trades for presentation
- Risk disclaimers visible in all relevant UI
- Practice demo run (2x full walk-through)
- Fix any bugs found during practice run
- Final screenshots / recording backup
- Deploy to Vercel (frontend) + Railway (backend) for live demo

**Evening: Final push to GitHub ✅ — Ready for presentation**

---

## 🎤 Demo Script (Presentation Day)

| Section | Duration | Content |
|---------|----------|---------|
| **Problem** | 1.5 min | "Pump.fun has launched 12.5M+ tokens on Solana since Jan 2024. Retail users are flooding in. But the tools — Banana Gun, Photon — are built for power users. Config screens, slippage settings, MEV toggles. The next wave of users won't learn all that." |
| **Solution** | 1 min | "MemeQuant AI: an AI agent you talk to in plain English. It trades for you on Solana, with pre-built risk automations that protect your capital. The agent that survives first, profits second." |
| **Live Demo** | 6 min | Open dashboard → Connect Phantom → Deposit SOL → Chat: "Buy $10 of [token]" → Agent executes (show NLP parsing + GoPlus check + Jupiter swap) → Position appears in portfolio → Show active automations (stop-loss ON) → Price drops → Stop-loss triggers → Auto-sell → Trade logged in history → Withdraw funds |
| **Competitive Edge** | 1.5 min | Side-by-side: Banana Gun needs 5 config steps. We need one sentence. Show automation library — 7 playbooks, one click each. |
| **Honest Assessment** | 1 min | "Playbooks are hypotheses — volume surge buy is a pattern, not a proven edge. Banana Gun wins on speed and MEV. We're not competing on infra — we're competing on UX for the next million non-technical users." |
| **Tech Deep Dive** | 1 min | "Chat → Claude API → structured JSON → GoPlus safety (risk score formula) → Jupiter swap with dynamic slippage + $200 max cap. Stop-loss on Birdeye WebSocket with < 2s trigger-to-execution." |
| **Roadmap** | 1 min | V1.5: MEV protection (Jito) + backtest playbooks. V2.0: Multi-chain + copy trade. V3.0: Mobile. |
| **Q&A** | 5-8 min | See Prepared Q&A section |

**Total: ~13–15 minutes**

---

## ❓ Prepared Q&A

**Q: "Banana Gun already does this. What's different?"**

A: Banana Gun is a power tool — fast execution, MEV protection, multi-chain. Excellent for users who know what slippage to set, which RPC to configure, how to read a candlestick chart. Our agent targets a different user: someone who says "buy PEPE" and expects intelligent defaults to handle the rest. Three specific differentiators: (1) chat interface vs. command/config UI, (2) pre-built automation playbooks vs. blank slate, (3) GoPlus safety check on every trade by default. We're not replacing Banana Gun — we're the on-ramp for users who aren't ready for Banana Gun yet.

**Q: "How does chat-to-trade actually work technically?"**

A: User message → Claude API with structured system prompt → returns JSON with intent, token, amount, conditions → we resolve the token via Jupiter Token List API (handling duplicate tickers by filtering for Jupiter verified/strict list first, then sorting by highest liquidity pool size) → GoPlus safety check scores 4 factors: honeypot (weight 40), mint authority (25), holder concentration (20), liquidity (15) → if risk score < 50, Jupiter Swap API executes → confirm on Solana RPC → record in DB. Total pipeline: 3-5 seconds. If AI confidence < 80%, it asks a clarifying question instead of guessing.

**Q: "What if the AI misunderstands the message?"**

A: Two safeguards. First, confidence threshold — if LLM returns confidence < 80%, the agent asks for clarification instead of executing. Second, for trades above a configurable threshold (default $50), the agent shows a preview: "I'll buy $50 of PEPE at ~$0.00004. Stop-loss at -20%. Confirm?" User must approve before execution.

**Q: "Your automations — how do you know 'volume surge → buy' works?"**

A: We don't — and we're transparent about that. These playbooks encode commonly-observed patterns from experienced memecoin traders. "Volume surge often precedes price movement" is a widely-noted heuristic, but it's not a proven edge. Win rate is unknown without backtesting. That's why playbooks have configurable thresholds and built-in stop-losses. Post-MVP, we plan to backtest all playbooks against 30+ days of Solana memecoin data and publish transparent results.

**Q: "What about MEV / sandwich attacks?"**

A: Honest answer — the MVP does not have MEV protection. We submit standard Solana transactions. We mitigate this with: (1) max trade size cap of $200 in MVP, and (2) dynamic slippage — 5% for <$50, 3% for $50-200, 1% for >$200 with user warning. For small trades (< $100), sandwich risk is low because attacker profit doesn't justify the cost. V1.5 roadmap includes Jito bundle integration for private transaction submission — the industry standard on Solana. Banana Gun already has this; we acknowledge they're ahead on infrastructure.

**Q: "Why Solana only?"**

A: Two-day constraint. Solana has the highest memecoin trading volume, 12.5M+ tokens launched on pump.fun alone, and Jupiter provides the best DEX aggregator API. We chose depth over breadth. Multi-chain is V2.0 — the architecture supports it, but shipping one chain well beats five chains poorly.

**Q: "What's the execution latency?"**

A: Chat-to-trade: ~1s (LLM) + ~0.5s (GoPlus) + ~0.5s (Jupiter quote) + ~1-2s (tx) = 3-5 seconds total. Automation triggers: ~0.4s (WebSocket detection) + ~1-2s (Jupiter swap) = 1.5-2.5 seconds. This is slower than Banana Gun's optimized infra (~0.5-1s). We're not competing on speed — we're competing on intelligence and accessibility.

**Q: "What if someone tries to buy a scam token?"**

A: Every trade passes through GoPlus. We score 4 risk factors: honeypot (40 points), active mint authority (25), top-10 holder concentration >50% (20), liquidity < $10K (15). Score ≥ 50 → trade blocked with explanation. Score 25-49 → warning, user must confirm. Score < 25 → proceed. This catches most known patterns, but novel scams may bypass it. Agent always warns: "No safety check is 100%. Only risk what you can afford to lose."

**Q: "Is this regulated?"**

A: MVP is a hackathon demo — no real fund custody in production, no investment advice given. For production deployment, legal review is required. Automated trading with user funds could classify as money transmission, investment advisory, or broker-dealer depending on jurisdiction. This is explicitly gated in our roadmap before V3.0 mainnet.

---

## 💰 Business Model

### SaaS Credits
Users purchase credits to power AI reasoning, agent hosting, and contract analysis. Credits consumed per agent-operation — metered usage aligned with value delivery.

### Transactional Fee
**0.1% fee** on every autonomous trade execution — applied only when the agent successfully executes. No trade, no fee.

### Referral 2.0 (V2.0)

| Role | Benefit |
|---|---|
| **Referred User (F1)** | Permanent **10% discount** on credit purchases |
| **Referrer (F0)** | Earns **10% of transaction fees** from their F1 network, paid real-time |

### Premium Agent Marketplace *(V3.0)*
Top-performing agent strategy templates available for purchase or subscription. Strategy authors earn royalties.

---

## 🗺️ Roadmap

| Phase | Features | Est. Time | Gate |
|-------|----------|-----------|------|
| **MVP** | Solana: Chat-to-trade + 4 playbooks + stop-loss + GoPlus + dynamic slippage | 3 days | **Current sprint** |
| **V1.5** | MEV protection (Jito bundles) + DCA engine + trailing stop-loss | 1 week | — |
| **V1.5** | **Backtest all playbooks** against 30+ days Solana data | 1 week | **Must complete before any win rate claims** |
| **V2.0** | Multi-chain: Base + ETH integration | 2 weeks | — |
| **V2.0** | Copy trade + wallet tracking + agent leaderboard | 2 weeks | — |
| **V2.0** | Custom automation builder (drag-and-drop) | 2 weeks | — |
| **V2.0** | Referral 2.0 system (F0/F1 fee sharing) | 1 week | — |
| **V2.5** | Social layer: share playbook configs, community strategies | 2 weeks | — |
| **V3.0** | **Production deployment** | 1 month | **Requires: validated backtest + legal review + security audit** |
| **V3.0** | Mobile app (iOS/Android) | 2 months | — |
| **V4.0** | MQA governance token + strategy developer SDK | TBD | — |

---

## 🛠️ Tech Stack

| Layer | Technology | Rationale |
|---|---|---|
| **AI / NLP** | Claude API (Anthropic) | Intent extraction, strategy formalization, pre-trade reasoning |
| **On-Chain Execution** | @solana/web3.js + Jupiter Swap API v6 | Solana-native, best DEX aggregator on Solana |
| **Token Safety** | GoPlus Security API | Industry-standard honeypot/rug detection |
| **Price Data** | Birdeye WebSocket API (primary) + Jupiter REST API (fallback) | Birdeye provides real-time WebSocket price streaming for Solana (SUBSCRIBE_PRICE, 1s intervals). Jupiter REST as fallback — Jupiter does not offer a public WebSocket for price feeds. |
| **Agent Wallet** | Solana Keypair + AES-256-GCM encryption | Self-sovereign agent wallet, server-side key management |
| **Frontend** | Next.js 14, Tailwind CSS, Solana Wallet Adapter | Fast setup, Phantom/Solflare integration |
| **Backend** | Node.js + Express | Lightweight, real-time capable (WebSocket) |
| **Database** | SQLite (MVP) → PostgreSQL (production) | Zero-config for hackathon, migrate later |
| **Infrastructure** | Vercel (frontend) + Railway (backend) | Quick deployment, free tier |

---

## ⚠️ Risk Disclosure

**This product is a hackathon MVP demonstration.**

1. **Automation playbook effectiveness is untested** — win rates are unknown without backtesting against historical data. The playbooks encode common heuristics, not proven alpha.
2. **Memecoin trading is extremely high-risk** — tokens can lose 90%+ value in minutes. Many tokens launched on Solana are fraudulent.
3. **No MEV protection in MVP** — large trades may be susceptible to sandwich attacks on public Solana RPC.
4. **GoPlus safety scoring is not infallible** — novel scam patterns may bypass detection. Users should always DYOR.
5. **Chat-to-trade NLP may misinterpret** complex or ambiguous instructions — always review trade confirmations before approving.
6. **Execution latency (3-5s) means slippage** — prices can move significantly between quote and execution in volatile markets.
7. **Smart contract risk** — interacting with on-chain protocols carries inherent risk of bugs, exploits, or vulnerabilities in third-party contracts.
8. **Regulatory uncertainty** — automated trading with user funds may be subject to varying regulations by jurisdiction. Legal review required before production deployment.
9. **This is NOT investment advice** — MemeQuant AI provides automation tools, not financial recommendations.
10. **Only deploy capital you can afford to lose entirely.**

> **The core product value is accessible automation and risk management, not profit generation.**

---

<div align="center">

**MemeQuant AI** — *The agent that survives first, profits second.*

🦞💎🚀

</div>
