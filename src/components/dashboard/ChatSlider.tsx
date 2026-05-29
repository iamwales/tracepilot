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
  const [historyLoading, setHistoryLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chatIncident) return;
    let active = true;
    setHistoryLoading(true);
    setMessages([]);

    fetch(`/api/incidents/chat?incidentId=${encodeURIComponent(chatIncident.recordId)}`)
      .then(async (response) => {
        const payload = (await response.json()) as { messages?: ChatMessage[]; error?: string };
        if (!response.ok) throw new Error(payload.error || "Could not load incident chat history.");
        if (!active) return;
        setMessages(payload.messages?.length ? payload.messages : [introMessage(chatIncident.id, chatIncident.title)]);
      })
      .catch(() => {
        if (active) setMessages([introMessage(chatIncident.id, chatIncident.title)]);
      })
      .finally(() => {
        if (active) setHistoryLoading(false);
      });

    return () => {
      active = false;
    };
  }, [chatIncident]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  if (!chatOpen || !chatIncident) return null;

  const send = async (value?: string) => {
    const question = (value ?? input).trim();
    if (!question || loading || historyLoading) return;

    setInput("");
    const history = messages.slice(-24);
    setMessages((current) => [...current, { role: "user", text: question }, { role: "assistant", text: "" }]);
    setLoading(true);

    try {
      const response = await fetch("/api/incidents/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          incident: chatIncident,
          history
        })
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error || "The remediation agent could not answer right now.");
      }

      if (!response.body) {
        throw new Error("The remediation agent returned an empty stream.");
      }

      await readStream(response.body, (chunk) => {
        setMessages((current) => updateLastAssistantMessage(current, chunk));
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "The remediation agent could not answer right now.";
      setMessages((current) =>
        updateLastAssistantMessage(current, `${message}\nTry again, or ask a narrower question about evidence, root cause, or next steps.`, {
          replace: true
        })
      );
    } finally {
      setLoading(false);
    }
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
              disabled={loading || historyLoading}
              onClick={() => send(question)}
              className="rounded-md border border-slate-200 px-2.5 py-1.5 text-left text-xs text-slate-600 transition hover:border-red-300 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:text-slate-400 dark:hover:border-red-400/40 dark:hover:text-red-300"
            >
              {question}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {historyLoading ? (
          <div className="space-y-3">
            <div className="h-14 w-4/5 animate-pulse rounded-lg bg-slate-100 dark:bg-white/[0.05]" />
            <div className="ml-auto h-10 w-2/3 animate-pulse rounded-lg bg-red-500/20" />
            <div className="h-20 w-5/6 animate-pulse rounded-lg bg-slate-100 dark:bg-white/[0.05]" />
          </div>
        ) : null}
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
            disabled={historyLoading}
            className="min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-red-400 dark:border-white/10 dark:bg-slate-950 dark:text-white"
          />
          <button
            type="button"
            disabled={loading || historyLoading}
            onClick={() => send()}
            className="grid h-10 w-10 place-items-center rounded-md bg-red-600 text-white shadow-[0_0_16px_rgba(220,38,38,0.32)] transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Send message"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}

function introMessage(id: string, title: string): ChatMessage {
  return {
    role: "assistant",
    text: `I'm scoped to ${id}: ${title}. Ask me about evidence, blast radius, or remediation.`
  };
}

async function readStream(stream: ReadableStream<Uint8Array>, onChunk: (chunk: string) => void) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    onChunk(decoder.decode(value, { stream: true }));
  }

  const remaining = decoder.decode();
  if (remaining) onChunk(remaining);
}

function updateLastAssistantMessage(messages: ChatMessage[], text: string, options?: { replace?: boolean }): ChatMessage[] {
  const next = [...messages];
  for (let index = next.length - 1; index >= 0; index -= 1) {
    if (next[index].role === "assistant") {
      next[index] = {
        ...next[index],
        text: options?.replace ? text : `${next[index].text}${text}`
      };
      return next;
    }
  }

  return [...next, { role: "assistant", text }];
}
