"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, ChevronRight, ChevronLeft, Loader2 } from "lucide-react";

export interface AgentAction {
  type: "NAVIGATE" | "REFRESH_BALANCE" | "UPDATE_RISK" | "OPEN_DEPOSIT";
  target?: string;    // e.g. "portfolio", "market", "automations"
  setting?: string;   // e.g. "stopLoss", "takeProfit"
  value?: number;
}

const ACTION_TAG_RE = /\[ACTION:([A-Z_]+)(?::([^\]:]*))?(?::([^\]]*))?\]/g;

/**
 * Parse [ACTION:...] tags from text. Returns cleaned text and list of actions.
 */
function parseActions(text: string): { cleanText: string; actions: AgentAction[] } {
  const actions: AgentAction[] = [];
  let match;
  const re = new RegExp(ACTION_TAG_RE.source, "g");
  while ((match = re.exec(text)) !== null) {
    const type = match[1] as AgentAction["type"];
    const arg1 = match[2] || undefined;
    const arg2 = match[3] || undefined;

    if (type === "NAVIGATE") {
      actions.push({ type, target: arg1 });
    } else if (type === "UPDATE_RISK") {
      actions.push({ type, setting: arg1, value: arg2 ? Number(arg2) : undefined });
    } else if (type === "REFRESH_BALANCE" || type === "OPEN_DEPOSIT") {
      actions.push({ type });
    }
  }
  const cleanText = text.replace(re, "").replace(/\n{3,}/g, "\n\n").trim();
  return { cleanText, actions };
}

interface Message {
  role: "user" | "agent";
  content: string[];
}

// Render markdown bold (**text**) as <strong> tags
function renderMarkdown(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className="text-white font-semibold">{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}

function makeWelcomeMessage(agentName: string): Message {
  const name = agentName
    ? `${agentName}, your trading agent live on Solana`
    : "Testie, your MemeQuant trading agent on Solana";
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
  walletAddress = "",
  pendingBuyMessage,
  onPendingBuyConsumed,
  onBalanceRefresh,
  onAgentAction,
}: {
  onDeployClick: () => void;
  agentDeployed: boolean;
  agentName?: string;
  walletAddress?: string;
  pendingBuyMessage?: string | null;
  onPendingBuyConsumed?: () => void;
  onBalanceRefresh?: () => void;
  onAgentAction?: (action: AgentAction) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [hasStartedChat, setHasStartedChat] = useState(false);
  const [messages, setMessages] = useState<Message[]>([makeWelcomeMessage(agentName)]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
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
  }, [messages, hasStartedChat, isTyping]);

  // Handle pending buy message from search modal
  useEffect(() => {
    if (!pendingBuyMessage || pendingBuyMessage === lastBuyRef.current) return;
    lastBuyRef.current = pendingBuyMessage;

    if (collapsed) setCollapsed(false);
    if (!hasStartedChat) setHasStartedChat(true);

    const userMsg: Message = { role: "user", content: [pendingBuyMessage] };
    setMessages((prev) => [...prev, userMsg]);

    sendToAPI([...messages, userMsg]);
    onPendingBuyConsumed?.();
  }, [pendingBuyMessage]); // eslint-disable-line react-hooks/exhaustive-deps

  // Build chat history for the API (flatten content arrays to single strings)
  const buildApiHistory = useCallback((msgs: Message[]) => {
    return msgs
      .filter((m) => m.content.length > 0 && m.content[0].trim() !== "")
      .map((m) => ({
        role: m.role === "agent" ? "agent" : "user",
        content: m.content.join("\n"),
      }));
  }, []);

  const sendToAPI = async (currentMessages: Message[]) => {
    setIsTyping(true);

    try {
      const history = buildApiHistory(currentMessages);

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, walletAddress: walletAddress || undefined, agentName: agentName || undefined }),
      });

      if (!res.ok) {
        throw new Error(`API ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder();
      let accumulated = "";

      // Add empty agent message that we'll stream into
      setMessages((prev) => [...prev, { role: "agent", content: [""] }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);

          if (data === "[DONE]") break;

          try {
            const parsed = JSON.parse(data);
            if (parsed.error) {
              accumulated += `\n\nError: ${parsed.error}`;
            } else if (parsed.text) {
              accumulated += parsed.text;
            }

            // Update the last agent message with accumulated text
            const current = accumulated;
            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last && last.role === "agent") {
                updated[updated.length - 1] = { role: "agent", content: [current] };
              }
              return updated;
            });
          } catch {
            // Skip malformed JSON chunks
          }
        }
      }
      // Stream complete — strip any XML artifacts and parse actions
      let cleaned = accumulated
        .replace(/<function_calls>[\s\S]*?<\/function_calls>/g, "")
        .replace(/<function_result>[\s\S]*?<\/function_result>/g, "")
        .replace(/<invoke[\s\S]*?<\/invoke>/g, "")
        .replace(/<parameter[\s\S]*?<\/parameter>/g, "")
        .replace(/<[\s\S]*?<\/antml:[^>]+>/g, "")
        .replace(/<result>[\s\S]*?<\/result>/g, "")
        .trim();
      const { cleanText, actions } = parseActions(cleaned);
      if (cleanText !== accumulated) {
        const final = cleanText;
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last && last.role === "agent") {
            updated[updated.length - 1] = { role: "agent", content: [final] };
          }
          return updated;
        });
      }

      // Execute actions
      for (const action of actions) {
        onAgentAction?.(action);
      }
    } catch {
      // API failed — show friendly error
      setMessages((prev) => [
        ...prev,
        { role: "agent", content: ["Hmm, I'm having trouble connecting right now. Try again in a sec!"] },
      ]);
    }

    setIsTyping(false);

    // Refresh balance after every agent response (catches post-trade balance changes)
    onBalanceRefresh?.();
  };

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || sendingRef.current || isTyping) return;

    sendingRef.current = true;

    if (!hasStartedChat) setHasStartedChat(true);

    const newMessages: Message[] = [...messages, { role: "user", content: [trimmed] }];
    setMessages(newMessages);
    setInput("");

    sendToAPI(newMessages);

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
                          {step.includes("**") ? renderMarkdown(step) : step}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}

            {/* Typing indicator */}
            {isTyping && messages[messages.length - 1]?.content[0] === "" && (
              <div className="flex justify-start">
                <div className="bg-bg-card border border-border rounded-xl rounded-bl-sm px-3.5 py-2.5 flex items-center gap-1.5">
                  <Loader2 size={12} className="text-accent animate-spin" />
                  <span className="text-text-secondary text-xs">Testie is typing...</span>
                </div>
              </div>
            )}

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
                disabled={isTyping}
              />
              <button
                onClick={handleSend}
                disabled={isTyping}
                className="p-1.5 text-accent hover:text-white transition-colors disabled:opacity-40"
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
