"use client";

import { useEffect, useRef, useState } from "react";
import { MessageSquare, Send, X } from "lucide-react";
import { useDashboard } from "./DashboardContext";
import { Badge, SeverityBadge } from "./ui";

type ChatMessage = {
  role: "assistant" | "user";
  text: string;
};

const quickQuestions = [
  "Which log line triggered this?",
  "What command should I run first?",
  "How do I verify resolution?",
  "What is the risk if we wait?"
];

function answerFor(question: string, incidentTitle: string) {
  if (question.includes("triggered")) {
    return "The strongest trigger is the first ECONNREFUSED entry, followed by retry exhaustion and the circuit breaker opening. That sequence is enough to classify this as dependency outage, not ordinary latency.";
  }

  if (question.includes("command")) {
    return "Start by checking reachability to the dependency, then verify the service process. For this incident: psql connection check, route check, then connection pool metrics.";
  }

  if (question.includes("verify")) {
    return "Resolution needs three signals: health check connected, pool errors at zero for a full rolling minute, and the circuit breaker closed.";
  }

  if (question.includes("risk")) {
    return "The near-term risk is write failure amplification. If the queue continues growing, worker memory pressure and customer-facing 503s become likely.";
  }

  return `For ${incidentTitle}, the key pattern is evidence sequence, blast radius, and reversible remediation. I would verify the dependency first, then choose failover only if recovery exceeds the budget.`;
}

function MessageText({ text }: { text: string }) {
  return (
    <div className="space-y-1 text-sm leading-6">
      {text.split("\n").map((line) => (
        <p key={line}>{line}</p>
      ))}
    </div>
  );
}

export function ChatSlider() {
  const { chatOpen, closeChat, chatIncident } = useDashboard();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chatIncident) return;
    setMessages([
      {
        role: "assistant",
        text: `I'm scoped to ${chatIncident.id}: ${chatIncident.title}. Ask me about evidence, blast radius, or remediation.`
      }
    ]);
  }, [chatIncident]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  if (!chatOpen || !chatIncident) return null;

  const send = (value?: string) => {
    const question = (value ?? input).trim();
    if (!question) return;

    setInput("");
    setMessages((current) => [...current, { role: "user", text: question }]);
    setLoading(true);

    window.setTimeout(() => {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          text: answerFor(question, chatIncident.title)
        }
      ]);
      setLoading(false);
    }, 450);
  };

  return (
    <aside className="fixed inset-y-0 right-0 z-30 flex w-full max-w-[440px] flex-col border-l border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-slate-950">
      <div className="border-b border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-md bg-red-500/10 text-red-600 dark:text-red-300">
              <MessageSquare size={16} />
            </span>
            <span className="font-mono text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Remediation Chat</span>
          </div>
          <button
            type="button"
            aria-label="Close chat"
            onClick={closeChat}
            className="grid h-8 w-8 place-items-center rounded-md text-slate-500 transition hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-300"
          >
            <X size={16} />
          </button>
        </div>

        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
          <p className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-slate-500 dark:text-slate-500">Incident</p>
          <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">
            {chatIncident.id} · {chatIncident.title}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <SeverityBadge severity={chatIncident.severity} />
            <Badge tone="green">{chatIncident.confidence}% Confidence</Badge>
          </div>
        </div>
      </div>

      <div className="border-b border-slate-200 p-3 dark:border-white/10">
        <p className="mb-2 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-slate-400">Quick questions</p>
        <div className="flex flex-wrap gap-2">
          {quickQuestions.map((question) => (
            <button
              key={question}
              type="button"
              onClick={() => send(question)}
              className="rounded-md border border-slate-200 px-2.5 py-1.5 text-left text-xs text-slate-600 transition hover:border-red-300 hover:text-red-600 dark:border-white/10 dark:text-slate-400 dark:hover:border-red-400/40 dark:hover:text-red-300"
            >
              {question}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.map((message, index) => (
          <div key={`${message.role}-${index}`} className={message.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div
              className={
                message.role === "user"
                  ? "max-w-[85%] rounded-lg bg-red-600 px-3 py-2 text-white"
                  : "max-w-[85%] rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200"
              }
            >
              <MessageText text={message.text} />
            </div>
          </div>
        ))}
        {loading ? (
          <div className="flex items-center gap-2 text-red-500">
            <span className="h-2 w-2 animate-pulse rounded-full bg-current" />
            <span className="h-2 w-2 animate-pulse rounded-full bg-current delay-100" />
            <span className="h-2 w-2 animate-pulse rounded-full bg-current delay-200" />
          </div>
        ) : null}
        <div ref={endRef} />
      </div>

      <div className="border-t border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") send();
            }}
            placeholder="Ask about this incident..."
            className="min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-red-400 dark:border-white/10 dark:bg-slate-950 dark:text-white"
          />
          <button
            type="button"
            onClick={() => send()}
            className="grid h-10 w-10 place-items-center rounded-md bg-red-600 text-white shadow-[0_0_16px_rgba(220,38,38,0.32)] transition hover:bg-red-500"
            aria-label="Send message"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
