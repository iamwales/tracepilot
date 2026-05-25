"use client";

import { useMemo, useState } from "react";
import { useEffect } from "react";
import { Cable, Check, SlidersHorizontal } from "lucide-react";
import { connectors as initialConnectors } from "@/components/dashboard/data";
import { Badge, Card, MiniLabel, PageHeader } from "@/components/dashboard/ui";
import type { Connector, ConnectorCategory } from "@/components/dashboard/types";

type Filter = "All" | ConnectorCategory;

export default function ConnectorsPage() {
  const [connectors, setConnectors] = useState<Connector[]>(initialConnectors);
  const [filter, setFilter] = useState<Filter>("All");
  const [configuring, setConfiguring] = useState<string | null>(null);
  const [token, setToken] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  const categories = useMemo<Filter[]>(() => ["All", ...Array.from(new Set(initialConnectors.map((connector) => connector.category)))], []);
  const filteredConnectors = filter === "All" ? connectors : connectors.filter((connector) => connector.category === filter);
  const connectedCount = connectors.filter((connector) => connector.connected).length;

  useEffect(() => {
    let active = true;
    fetch("/api/connectors")
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Could not load connectors.");
        if (active) setConnectors(payload.connectors);
      })
      .catch((caught) => {
        if (active) setError(caught instanceof Error ? caught.message : "Could not load connectors.");
      });
    return () => {
      active = false;
    };
  }, []);

  const toggleConnector = async (id: string) => {
    const connector = connectors.find((item) => item.id === id);
    if (!connector) return;
    setConnectors((current) =>
      current.map((connector) => (connector.id === id ? { ...connector, connected: !connector.connected } : connector))
    );
    try {
      const response = await fetch("/api/connectors", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, connected: !connector.connected })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not update connector.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update connector.");
      setConnectors((current) =>
        current.map((item) => (item.id === id ? { ...item, connected: connector.connected } : item))
      );
    }
  };

  const saveConfig = async (id: string) => {
    try {
      const response = await fetch("/api/connectors", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, token: token || undefined, webhookUrl: webhookUrl || null, connected: true })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not save connector.");
      setConnectors((current) => current.map((connector) => (connector.id === id ? payload.connector : connector)));
      setConfiguring(null);
      setToken("");
      setWebhookUrl("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save connector.");
    }
  };

  return (
    <div className="animate-[fadeIn_250ms_ease-out]">
      <PageHeader
        title="Connectors"
        subtitle="Attach the operational systems that enrich incident timelines and remediation context."
        action={<Badge tone="green">{connectedCount} Connected</Badge>}
      />
      {error ? <div className="mb-4 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-200">{error}</div> : null}

      <div className="mb-6 flex flex-wrap gap-2">
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => setFilter(category)}
            className={
              filter === category
                ? "rounded-full bg-red-600 px-4 py-2 font-mono text-xs uppercase tracking-[0.12em] text-white shadow-[0_0_16px_rgba(220,38,38,0.22)]"
                : "rounded-full border border-slate-200 bg-white px-4 py-2 font-mono text-xs uppercase tracking-[0.12em] text-slate-500 transition hover:border-red-300 hover:text-red-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-400 dark:hover:text-red-300"
            }
          >
            {category}
          </button>
        ))}
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredConnectors.map((connector) => (
          <Card key={connector.id} className={connector.connected ? "relative overflow-hidden p-5 ring-1 ring-red-500/20" : "relative overflow-hidden p-5"}>
            {connector.connected ? <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-red-500 to-transparent" /> : null}
            <div className="mb-4 flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-slate-200 bg-slate-50 text-red-600 dark:border-white/10 dark:bg-red-500/10 dark:text-red-300">
                  <Cable size={18} />
                </div>
                <div className="min-w-0">
                  <h2 className="truncate font-medium text-slate-950 dark:text-white">{connector.name}</h2>
                  <p className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-slate-400">{connector.category}</p>
                </div>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={connector.connected}
                onClick={() => toggleConnector(connector.id)}
                className={
                  connector.connected
                    ? "relative h-6 w-11 shrink-0 rounded-full bg-red-600 shadow-[0_0_14px_rgba(220,38,38,0.25)]"
                    : "relative h-6 w-11 shrink-0 rounded-full bg-slate-200 dark:bg-white/10"
                }
              >
                <span
                  className={
                    connector.connected
                      ? "absolute left-[22px] top-1 grid h-4 w-4 place-items-center rounded-full bg-white text-red-600 transition"
                      : "absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition"
                  }
                >
                  {connector.connected ? <Check size={11} /> : null}
                </span>
              </button>
            </div>

            <p className="min-h-14 text-sm leading-6 text-slate-600 dark:text-slate-400">{connector.description}</p>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {connector.connected ? (
                <>
                  <Badge tone="green">Connected</Badge>
                  <button
                    type="button"
                    onClick={() => setConfiguring((current) => (current === connector.id ? null : connector.id))}
                    className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-1.5 font-mono text-[0.65rem] uppercase tracking-[0.12em] text-slate-500 transition hover:border-red-300 hover:text-red-600 dark:border-white/10 dark:text-slate-400 dark:hover:text-red-300"
                  >
                    <SlidersHorizontal size={13} />
                    Configure
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => toggleConnector(connector.id)}
                  className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-1.5 font-mono text-[0.65rem] uppercase tracking-[0.12em] text-red-600 transition hover:bg-red-500/15 dark:text-red-300"
                >
                  Connect
                </button>
              )}
            </div>

            {configuring === connector.id ? (
              <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/[0.03]">
                <MiniLabel>Configuration</MiniLabel>
                <div className="mt-3 grid gap-2">
                  <input
                    placeholder="API key or token"
                    value={token}
                    onChange={(event) => setToken(event.target.value)}
                    className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-red-400 dark:border-white/10 dark:bg-slate-950 dark:text-white"
                  />
                  <input
                    placeholder="Webhook URL"
                    value={webhookUrl}
                    onChange={(event) => setWebhookUrl(event.target.value)}
                    className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-red-400 dark:border-white/10 dark:bg-slate-950 dark:text-white"
                  />
                  <button type="button" onClick={() => saveConfig(connector.id)} className="rounded-md bg-red-600 px-3 py-2 font-mono text-xs uppercase tracking-[0.12em] text-white transition hover:bg-red-500">
                    Save Configuration
                  </button>
                </div>
              </div>
            ) : null}
          </Card>
        ))}
      </section>
    </div>
  );
}
