"use client";

import Link from "next/link";

/* eslint-disable @next/next/no-img-element */

const features = [
  {
    title: "AI-Powered Analysis",
    description:
      "Machine learning models scan thousands of tokens in real-time, identifying patterns and opportunities before the crowd.",
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714a2.25 2.25 0 0 0 .659 1.591L19 14.5m-9.25-11.396c.251.023.501.05.75.082M19 14.5l-3.306-3.306a2.25 2.25 0 0 1-.659-1.591V3.186m0 0a24.301 24.301 0 0 0-4.5 0" />
      </svg>
    ),
  },
  {
    title: "Risk Management",
    description:
      "Built-in stop-losses, position sizing, and portfolio limits protect your capital automatically — even when you sleep.",
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
      </svg>
    ),
  },
  {
    title: "Autonomous Execution",
    description:
      "Deploy an AI agent that monitors, analyzes, and executes trades 24/7 — no manual intervention required.",
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
  },
  {
    title: "Real-Time Market Data",
    description:
      "Live price feeds, volume spikes, and liquidity metrics aggregated from DEXs — all in one unified terminal.",
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
      </svg>
    ),
  },
];

const problems = [
  {
    stat: "90%",
    label: "of memecoin traders lose money",
    description:
      "Emotional decisions, FOMO entries, and late exits wipe out most traders. Humans can't compete with bots.",
  },
  {
    stat: "24/7",
    label: "markets never sleep",
    description:
      "Crypto moves around the clock. Miss a 3 AM pump and your edge is gone. You need something watching for you.",
  },
  {
    stat: "1000+",
    label: "new tokens launched daily",
    description:
      "The signal-to-noise ratio is brutal. Manually scanning every new token is impossible at this scale.",
  },
];

const steps = [
  {
    step: "01",
    title: "Connect & Configure",
    description:
      "Launch the terminal, set your risk parameters, and define your trading strategy preferences.",
  },
  {
    step: "02",
    title: "Deploy Your Agent",
    description:
      "Activate your AI trading agent. It immediately begins scanning the market for opportunities.",
  },
  {
    step: "03",
    title: "Monitor & Earn",
    description:
      "Watch your agent work in real-time. Review trades, adjust strategy, and let the AI compound your edge.",
  },
];

const comparisonRows = [
  { feature: "AI-Powered Analysis", mq: true, manual: false, bots: "Limited" },
  { feature: "Risk Management", mq: true, manual: "Manual", bots: "Basic" },
  { feature: "24/7 Autonomous Trading", mq: true, manual: false, bots: true },
  { feature: "Real-Time Market Scanner", mq: true, manual: "Slow", bots: "Limited" },
  { feature: "Natural Language Commands", mq: true, manual: false, bots: false },
  { feature: "No Code Required", mq: true, manual: true, bots: false },
];

function renderCheck(value: boolean | string) {
  if (value === true)
    return (
      <svg className="w-5 h-5 text-[#2D7EFF] mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
      </svg>
    );
  if (value === false)
    return (
      <svg className="w-5 h-5 text-red-400 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    );
  return <span className="text-yellow-400 text-sm">{value}</span>;
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white scroll-smooth">
      {/* ── Nav ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-[#222228] bg-[#0a0a0f]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
          <img src="/MemeQuantLogo.svg" alt="MemeQuant" className="h-6 w-auto" />
          <div className="hidden md:flex items-center gap-8 text-sm text-[#888]">
            <a href="#problem" className="hover:text-white transition-colors">Problem</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#compare" className="hover:text-white transition-colors">Compare</a>
          </div>
          <Link
            href="/app"
            className="px-5 py-2 rounded-lg bg-[#2D7EFF] text-sm font-semibold text-white hover:scale-105 transition-transform"
          >
            Launch App
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 hero-grid opacity-[0.08]" />
        {/* Animated gradient background */}
        <div className="absolute inset-0 hero-gradient opacity-70" />
        {/* Radial glow behind headline */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[900px] bg-[radial-gradient(ellipse_at_center,_rgba(50,140,255,0.35),_rgba(45,126,255,0.12)_40%,_transparent_70%)]" />
        {/* Floating particles */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="particle particle-1" />
          <div className="particle particle-2" />
          <div className="particle particle-3" />
          <div className="particle particle-4" />
          <div className="particle particle-5" />
          <div className="particle particle-6" />
        </div>
        {/* Edge vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_40%,_#0a0a0f_85%)]" />

        <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight leading-[1.1] mb-6">
            Dominate The Trenches With{" "}
            <span className="text-[#2D7EFF]">
              MemeQuant AI
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-[#999] max-w-2xl mx-auto mb-10 leading-relaxed">
            Deploy an autonomous AI agent that scans, analyzes, and executes memecoin trades 24/7 — with built-in risk management so you don&apos;t get rekt.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/app"
              className="group relative px-8 py-4 rounded-xl bg-[#2D7EFF] text-lg font-bold text-white hover:scale-105 transition-all duration-200 shadow-[0_0_30px_rgba(45,126,255,0.25)]"
            >
              Launch App
              <span className="inline-block ml-2 group-hover:translate-x-1 transition-transform">&rarr;</span>
            </Link>
            <a
              href="#how-it-works"
              className="px-8 py-4 rounded-xl border border-[#333] text-[#999] hover:text-white hover:border-[#555] transition-all text-lg"
            >
              See How It Works
            </a>
          </div>
          <p className="mt-8 text-xs text-[#555]">
            Built for the Solana ecosystem &middot; No API keys required to explore
          </p>
        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0a0a0f] to-transparent" />
      </section>

      {/* ── Problem ── */}
      <section id="problem" className="relative py-24 sm:py-32 px-6 overflow-hidden">
        {/* Blue/cyan accent glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[600px] bg-[radial-gradient(ellipse_at_center,_rgba(45,126,255,0.15),_transparent_70%)] pointer-events-none" />
        {/* Faint diagonal lines */}
        <div className="absolute inset-0 problem-diagonals opacity-[0.03] pointer-events-none" />
        <div className="relative max-w-6xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4">
            The Problem with Memecoin Trading
          </h2>
          <p className="text-center text-[#888] mb-16 max-w-2xl mx-auto">
            The odds are stacked against manual traders. Here&apos;s why most people lose.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {problems.map((p) => (
              <div
                key={p.stat}
                className="bg-[#111114] border border-[#222228] rounded-2xl p-8 hover:border-[#333] transition-colors group"
              >
                <div className="text-4xl font-bold text-[#2D7EFF] mb-2">
                  {p.stat}
                </div>
                <div className="text-sm font-semibold text-[#ccc] mb-4">{p.label}</div>
                <p className="text-sm text-[#888] leading-relaxed">{p.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how-it-works" className="relative py-24 sm:py-32 px-6 bg-[#0d0d12] overflow-hidden">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4">
            How It Works
          </h2>
          <p className="text-center text-[#888] mb-16 max-w-2xl mx-auto">
            Three steps to autonomous memecoin trading.
          </p>
          {/* Dots + connector line (desktop only) */}
          <div className="hidden md:flex items-center justify-between max-w-5xl mx-auto mb-2 px-6">
            <div className="flex-1 flex items-center">
              <div className="flex-1" />
              <div className="w-3 h-3 rounded-full bg-[#2D7EFF]/40 border border-[#2D7EFF]/60 shrink-0" />
              <div className="flex-1 h-px steps-connector" />
            </div>
            <div className="flex-1 flex items-center">
              <div className="flex-1 h-px steps-connector" />
              <div className="w-3 h-3 rounded-full bg-[#2D7EFF]/40 border border-[#2D7EFF]/60 shrink-0" />
              <div className="flex-1 h-px steps-connector" />
            </div>
            <div className="flex-1 flex items-center">
              <div className="flex-1 h-px steps-connector" />
              <div className="w-3 h-3 rounded-full bg-[#2D7EFF]/40 border border-[#2D7EFF]/60 shrink-0" />
              <div className="flex-1" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((s) => (
              <div key={s.step} className="relative step-card rounded-2xl p-6 text-center md:text-left transition-all duration-300">
                <div className="text-6xl font-black text-[#555] mb-4 select-none">
                  {s.step}
                </div>
                <h3 className="text-xl font-bold mb-3">{s.title}</h3>
                <p className="text-sm text-[#888] leading-relaxed">{s.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Key Features ── */}
      <section id="features" className="relative py-24 sm:py-32 px-6 overflow-hidden">
        {/* Blue section glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[700px] bg-[radial-gradient(ellipse_at_center,_rgba(45,126,255,0.1),_transparent_65%)] pointer-events-none" />
        <div className="relative max-w-6xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4">
            Key Features
          </h2>
          <p className="text-center text-[#888] mb-16 max-w-2xl mx-auto">
            Everything you need for smarter, safer memecoin trading.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {features.map((f) => (
              <div
                key={f.title}
                className="bg-[#111114] border border-[#222228] rounded-2xl p-8 hover:border-[#2D7EFF]/40 hover:shadow-[0_0_40px_rgba(45,126,255,0.12)] transition-all duration-300 group"
              >
                <div className="text-[#2D7EFF] mb-4">{f.icon}</div>
                <h3 className="text-lg font-bold mb-2">{f.title}</h3>
                <p className="text-sm text-[#888] leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Comparison Table ── */}
      <section id="compare" className="py-24 sm:py-32 px-6 bg-[#0d0d12]">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4">
            MemeQuant vs The Rest
          </h2>
          <p className="text-center text-[#888] mb-16 max-w-2xl mx-auto">
            See how an AI-powered terminal stacks up against traditional approaches.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#222228]">
                  <th className="text-left py-4 px-4 text-[#888] font-medium">Feature</th>
                  <th className="py-4 px-4 text-center">
                    <span className="text-[#2D7EFF] font-bold">
                      MemeQuant AI
                    </span>
                  </th>
                  <th className="py-4 px-4 text-center text-[#888] font-medium">Manual Trading</th>
                  <th className="py-4 px-4 text-center text-[#888] font-medium">Trading Bots</th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row) => (
                  <tr key={row.feature} className="border-b border-[#191920]">
                    <td className="py-4 px-4 text-[#ccc]">{row.feature}</td>
                    <td className="py-4 px-4 text-center bg-[#2D7EFF]/[0.03]">
                      {renderCheck(row.mq)}
                    </td>
                    <td className="py-4 px-4 text-center">{renderCheck(row.manual)}</td>
                    <td className="py-4 px-4 text-center">{renderCheck(row.bots)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 sm:py-32 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6">
            Ready to Trade Smarter?
          </h2>
          <p className="text-[#888] mb-10 max-w-xl mx-auto">
            Launch the terminal and deploy your AI agent in under a minute.
          </p>
          <Link
            href="/app"
            className="inline-block px-10 py-4 rounded-xl bg-[#2D7EFF] text-lg font-bold text-white hover:scale-105 transition-all duration-200 shadow-[0_0_40px_rgba(45,126,255,0.3)]"
          >
            Launch App &rarr;
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-[#222228] py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <img src="/MemeQuantLogo.svg" alt="MemeQuant" className="h-5 w-auto" />
          <div className="flex items-center gap-6 text-sm text-[#666]">
            <Link href="/app" className="hover:text-white transition-colors">Terminal</Link>
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
          </div>
          <p className="text-xs text-[#444] text-center md:text-right max-w-xs">
            Built for the Colosseum Hackathon. This is a demo — no real funds are traded.
          </p>
        </div>
      </footer>

      {/* Hero styles */}
      <style jsx>{`
        .hero-grid {
          background-image:
            linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px);
          background-size: 60px 60px;
        }
        .hero-gradient {
          background: radial-gradient(
              ellipse 90% 60% at 50% -10%,
              rgba(50, 140, 255, 0.35),
              transparent
            ),
            radial-gradient(
              ellipse 70% 50% at 60% 5%,
              rgba(45, 126, 255, 0.2),
              transparent
            );
          animation: heroShift 8s ease-in-out infinite alternate;
        }
        @keyframes heroShift {
          0% {
            transform: translateY(0) scale(1);
            opacity: 0.7;
          }
          100% {
            transform: translateY(-30px) scale(1.08);
            opacity: 1;
          }
        }
        .particle {
          position: absolute;
          width: 2px;
          height: 2px;
          background: rgba(50, 140, 255, 0.8);
          border-radius: 50%;
          animation: float linear infinite;
        }
        .particle-1 { left: 15%; top: 80%; animation-duration: 12s; animation-delay: 0s; width: 4px; height: 4px; }
        .particle-2 { left: 35%; top: 90%; animation-duration: 10s; animation-delay: -2s; width: 3px; height: 3px; }
        .particle-3 { left: 55%; top: 85%; animation-duration: 14s; animation-delay: -4s; width: 3.5px; height: 3.5px; }
        .particle-4 { left: 75%; top: 95%; animation-duration: 11s; animation-delay: -1s; width: 3px; height: 3px; }
        .particle-5 { left: 25%; top: 75%; animation-duration: 13s; animation-delay: -6s; width: 2.5px; height: 2.5px; }
        .particle-6 { left: 85%; top: 80%; animation-duration: 9s; animation-delay: -3s; width: 3.5px; height: 3.5px; }
        @keyframes float {
          0% {
            transform: translateY(0) translateX(0);
            opacity: 0;
          }
          10% {
            opacity: 0.8;
          }
          90% {
            opacity: 0.8;
          }
          100% {
            transform: translateY(-100vh) translateX(20px);
            opacity: 0;
          }
        }
        /* ── Problem section diagonal lines ── */
        .problem-diagonals {
          background-image: repeating-linear-gradient(
            -45deg,
            rgba(45, 126, 255, 0.5),
            rgba(45, 126, 255, 0.5) 1px,
            transparent 1px,
            transparent 40px
          );
        }
        /* ── How It Works connector + step hover ── */
        .steps-connector {
          background: linear-gradient(
            90deg,
            transparent,
            rgba(45, 126, 255, 0.25) 20%,
            rgba(45, 126, 255, 0.25) 80%,
            transparent
          );
        }
        .step-card:hover {
          background: radial-gradient(
            ellipse at 50% 60%,
            rgba(45, 126, 255, 0.06),
            transparent 70%
          );
        }
      `}</style>
    </div>
  );
}
