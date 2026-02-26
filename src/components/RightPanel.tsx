"use client";

import { useState, useRef, useEffect } from "react";
import { Send, ChevronRight, ChevronLeft } from "lucide-react";
import api from "@/lib/api";

interface Message {
  role: "user" | "agent";
  content: string[];
}

const fallbackPipelineSteps = [
  "\ud83d\udd0d Token Resolution: Found 3 tokens named PEPE \u2192 Selected verified token with highest LP ($2.1M)",
  "\ud83d\udee1\ufe0f GoPlus Safety: Score 15/100 (SAFE) \u2014 No honeypot, mint authority revoked, top-10 holders: 32%",
  "\u26a1 Slippage: 3% (trade $50-200 range) | Max trade cap: $200",
  "\u2705 Bought 12.5M PEPE at $0.00004 via Jupiter\nTx: 7xKX...gAsU",
  "\ud83d\udd12 Stop-loss set at -20% | Take-profit at +100%",
];

function isBuyMessage(text: string): boolean {
  return /\bbuy\b/i.test(text);
}

function makeWelcomeMessage(agentName: string): Message {
  const name = agentName
    ? `${agentName}, your trading agent live on Solana`
    : "your MemeQuant agent, live on Solana";
  return {
    role: "agent",
    content: [
      `\ud83d\udc4b Hey! I'm ${name}.\n\nI can help you:\n- Buy & sell tokens \u2014 just tell me what and how much\n- Set automations \u2014 stop-loss, take-profit, alerts\n- Check portfolio & token safety\n\nWhat would you like to do?`,
    ],
  };
}

export default function RightPanel({
  onDeployClick,
  agentDeployed,
  agentName = "",
  pendingBuyMessage,
  onPendingBuyConsumed,
}: {
  onDeployClick: () => void;
  agentDeployed: boolean;
  agentName?: string;
  pendingBuyMessage?: string | null;
  onPendingBuyConsumed?: () => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [hasStartedChat, setHasStartedChat] = useState(false);
  const [messages, setMessages] = useState<Message[]>([makeWelcomeMessage(agentName)]);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const sendingRef = useRef(false);
  const lastBuyRef = useRef<string | null>(null);

  useEffect(() => {
    if (agentDeployed && !hasStartedChat) {
      setHasStartedChat(true);
      setMessages([makeWelcomeMessage(agentName)]);
    }
  }, [agentDeployed, hasStartedChat, agentName]);

  useEffect(() => {
    if (hasStartedChat) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, hasStartedChat]);

  // Handle pending buy message from search modal
  useEffect(() => {
    if (!pendingBuyMessage || pendingBuyMessage === lastBuyRef.current) return;
    lastBuyRef.current = pendingBuyMessage;

    if (collapsed) setCollapsed(false);
    if (!hasStartedChat) setHasStartedChat(true);

    const userMsg: Message = { role: "user", content: [pendingBuyMessage] };
    setMessages((prev) => [...prev, userMsg]);

    sendToBackend(pendingBuyMessage);
    onPendingBuyConsumed?.();
  }, [pendingBuyMessage]); // eslint-disable-line react-hooks/exhaustive-deps

  const streamSteps = (steps: string[]) => {
    steps.forEach((step, i) => {
      setTimeout(() => {
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last && last.role === "agent" && i > 0) {
            return [
              ...prev.slice(0, -1),
              { ...last, content: [...last.content, step] },
            ];
          }
          return [...prev, { role: "agent", content: [step] }];
        });
      }, 500 * (i + 1));
    });
  };

  const sendToBackend = async (message: string) => {
    try {
      const data = await api.chat("DemoUser123", message);
      if (data.steps && data.steps.length > 0) {
        streamSteps(data.steps);
      } else if (data.reply) {
        setMessages((prev) => [...prev, { role: "agent", content: [data.reply] }]);
      } else {
        // Fallback for unexpected response shape
        streamSteps(isBuyMessage(message) ? fallbackPipelineSteps : ["I received your message but couldn't process it. Please try again."]);
      }
    } catch {
      // Backend down — use mock fallback
      if (isBuyMessage(message)) {
        streamSteps(fallbackPipelineSteps);
      } else {
        setMessages((prev) => [...prev, { role: "agent", content: ["Backend is offline. Using demo mode.\n\nI can simulate trades for you — try saying \"buy $50 of PEPE\"."] }]);
      }
    }
  };

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || sendingRef.current) return;

    sendingRef.current = true;

    if (!hasStartedChat) setHasStartedChat(true);

    setMessages((prev) => [...prev, { role: "user", content: [trimmed] }]);
    setInput("");

    sendToBackend(trimmed);

    setTimeout(() => { sendingRef.current = false; }, 100);
  };

  return (
    <aside
      className={`h-screen bg-bg-secondary border-l border-border flex flex-col transition-all duration-300 overflow-hidden ${
        collapsed ? "w-12 min-w-12" : "w-[280px] min-w-[280px]"
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 px-3 py-4 border-b border-border flex-shrink-0">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 text-text-secondary hover:text-white transition-colors flex-shrink-0"
        >
          {collapsed ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
        </button>
        {!collapsed && (
          <>
            <span className="text-white font-semibold text-sm">AI Agent</span>
            <div className="w-2 h-2 rounded-full bg-positive" />
            <span className="text-positive text-xs">Online</span>
          </>
        )}
      </div>

      {collapsed ? null : !hasStartedChat ? (
        /* New User State */
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-accent flex items-center justify-center text-white font-bold text-xl mb-5">
            M
          </div>
          <h2 className="text-white font-semibold text-base mb-2">
            Automate your trading with your own AI Agent
          </h2>
          <p className="text-text-secondary text-sm mb-5">Just tell your agent what to do:</p>
          <div className="flex flex-wrap justify-center gap-1.5 mb-8">
            {[
              "Buy $50 of PEPE, 20% SL",
              "DCA $10/day into memecoins",
              "Alert when token hits $1M MC",
            ].map((prompt) => (
              <button
                key={prompt}
                onClick={() => { setInput(prompt); }}
                className="text-text-secondary hover:text-white text-[11px] bg-bg-card hover:bg-bg-card/80 rounded-full px-3 py-1.5 border border-border hover:border-accent/50 transition-colors cursor-pointer"
              >
                {prompt}
              </button>
            ))}
          </div>
          <button
            onClick={onDeployClick}
            className="w-full py-3 bg-accent hover:bg-accent/90 text-white font-semibold rounded-xl transition-colors text-sm"
          >
            🚀 Deploy Your Agent
          </button>
        </div>
      ) : (
        /* Chat State */
        <>
          <div className="flex-1 overflow-auto px-4 py-4 space-y-3">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "user" ? (
                  <div className="max-w-[85%] px-3.5 py-2.5 rounded-xl text-sm leading-relaxed bg-accent text-white rounded-br-sm">
                    {msg.content[0]}
                  </div>
                ) : (
                  <div className="max-w-[92%] bg-bg-card border border-border rounded-xl rounded-bl-sm overflow-hidden">
                    {msg.content.map((step, j) => {
                      const isLast = j === msg.content.length - 1;
                      const isSuccess = step.startsWith("\u2705");
                      const isBlocked = step.startsWith("\u26d4");
                      const isPortfolio = step.startsWith("\ud83d\udcbc");
                      const isSafety = step.includes("GoPlus Safety") || step.includes("GoPlus safety");
                      const isInfo = step.startsWith("\ud83d\udd0d") || step.startsWith("\u26a1") || step.startsWith("\ud83d\udd12");
                      return (
                        <div
                          key={j}
                          className={`px-3.5 py-2 text-xs leading-relaxed border-b border-border/30 last:border-0 ${
                            isSuccess ? "text-positive bg-positive/5" :
                            isBlocked ? "text-negative bg-negative/5" :
                            isPortfolio ? "text-white" :
                            isSafety ? "text-yellow-300" :
                            isInfo ? "text-accent" :
                            "text-text-secondary"
                          } ${(isSuccess || isBlocked || isPortfolio) && isLast ? "font-medium text-sm" : ""}`}
                          style={{ whiteSpace: "pre-wrap" }}
                        >
                          {step}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          <div className="p-4 border-t border-border flex-shrink-0">
            <div className="flex items-center gap-2 bg-bg-card rounded-xl border border-border px-3 py-1">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Message your agent..."
                className="flex-1 bg-transparent text-white text-sm py-2 outline-none placeholder:text-text-secondary"
              />
              <button
                onClick={handleSend}
                className="p-1.5 text-accent hover:text-white transition-colors"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </>
      )}
    </aside>
  );
}
