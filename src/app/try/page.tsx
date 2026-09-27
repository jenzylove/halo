"use client";

import Link from "next/link";
import { useState } from "react";
import { StepLog } from "@/components/StepLog";
import type { Step } from "@/lib/halo";
import { postStream } from "@/lib/sse";
import type { MandateTerms } from "@/lib/types";

const PRESETS = [
  "Get me 2 tickets for Neon Harbor on Oct 12, under $0.50 each",
  "Buy the last 24 hours of ETH funding rate data, max $0.10",
  "Buy me some concert tickets",
];

type Draft = { id: string; terms: MandateTerms } | null;

export default function Try() {
  const [instruction, setInstruction] = useState(PRESETS[0]);
  const [draft, setDraft] = useState<Draft>(null);
  const [question, setQuestion] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [steps, setSteps] = useState<Step[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const stream = async (label: string, url: string, body?: unknown) => {
    setBusy(label);
    setError(null);
    let failed = false;
    try {
      await postStream(url, body, (event, data) => {
        if (event === "step") setSteps((prev) => [...prev, data as Step]);
        if (event === "error") {
          failed = true;
          setError((data as { message: string }).message);
        }
      });
    } catch (e) {
      failed = true;
      setError(String(e));
    } finally {
      setBusy(null);
    }
    return !failed;
  };

  async function compile() {
    setBusy("Reading your instruction");
    setError(null);
    setDraft(null);
    setQuestion(null);
    setLocked(false);
    setSteps([]);
    try {
      const r = await fetch("/api/mandates", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ instruction }),
      }).then((r) => r.json());
      if (r.error) setError(r.error);
      else if (r.status === "clarify") setQuestion(r.question);
      else setDraft({ id: r.id, terms: r.terms });
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(null);
    }
  }

  async function confirm() {
    if (!draft) return;
    if (await stream("Locking your mandate onchain", `/api/mandates/${draft.id}/confirm`)) setLocked(true);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-center text-4xl font-bold tracking-tight">Give an agent a job</h1>
      <p className="mx-auto mt-3 max-w-lg text-center text-muted">
        This agent shops at four demo stores over x402 on Base Sepolia. One is a lookalike scam, one delivers the wrong date. Watch
        Halo handle both. Prices are scaled down for testnet USDC.
      </p>

      <div className="mt-10">
        <textarea
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          rows={2}
          className="w-full resize-none border hair bg-transparent p-4 text-lg outline-none focus:border-fg"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button key={p} onClick={() => setInstruction(p)} className="rounded-full border hair px-3 py-1 text-xs text-muted hover:text-fg">
              {p}
            </button>
          ))}
        </div>
        <button
          onClick={compile}
          disabled={!!busy}
          className="mt-5 w-full rounded-full bg-fg py-3 text-sm font-medium text-bg disabled:opacity-40"
        >
          Write the mandate
        </button>
      </div>

      {question && (
        <div className="mt-10 border-t hair pt-6">
          <p className="text-xs uppercase tracking-wide text-muted">Halo needs to know</p>
          <p className="mt-2 text-lg">{question}</p>
          <p className="mt-2 text-sm text-muted">Halo never guesses a budget. Add one and try again.</p>
        </div>
      )}

      {draft && (
        <div className="mt-10 border-t hair pt-6">
          <p className="text-xs uppercase tracking-wide text-muted">Your mandate</p>
          <p className="mt-2 text-xl font-medium">{draft.terms.summary}</p>
          <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
            <Term k="Item" v={draft.terms.item} />
            <Term k="Quantity" v={String(draft.terms.quantity)} />
            <Term k="Max total" v={`${draft.terms.maxTotal.toFixed(2)} USDC`} />
            {draft.terms.maxUnitPrice != null && <Term k="Max each" v={`${draft.terms.maxUnitPrice.toFixed(2)} USDC`} />}
            <Term k="Sellers" v={draft.terms.merchantRule === "verified_only" ? "Verified only" : "Any"} />
            {draft.terms.constraints.map((c) => (
              <Term key={c.name} k={c.name} v={c.value} />
            ))}
          </dl>
          {!locked ? (
            <button onClick={confirm} disabled={!!busy} className="mt-6 w-full rounded-full bg-fg py-3 text-sm font-medium text-bg disabled:opacity-40">
              Confirm and lock it onchain
            </button>
          ) : (
            <button
              onClick={() => stream("Agent is shopping", `/api/mandates/${draft.id}/run`)}
              disabled={!!busy}
              className="mt-6 w-full rounded-full bg-fg py-3 text-sm font-medium text-bg disabled:opacity-40"
            >
              Let the agent shop
            </button>
          )}
        </div>
      )}

      {busy && <p className="mt-8 animate-pulse text-center text-sm text-muted">{busy}…</p>}
      {error && <p className="mt-8 text-center text-sm text-bad">{error}</p>}

      {steps.length > 0 && (
        <div className="mt-10">
          <StepLog steps={steps} />
          <p className="mt-6 text-center text-sm">
            <Link href="/dashboard" className="underline">
              See every purchase, reason and transaction on your dashboard
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}

function Term({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-xs capitalize text-muted">{k}</dt>
      <dd>{v}</dd>
    </div>
  );
}
