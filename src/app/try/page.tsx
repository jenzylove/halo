"use client";

import Link from "next/link";
import { useState } from "react";
import { WalletPanel } from "@/components/WalletPanel";
import type { Step } from "@/lib/halo";
import { postStream } from "@/lib/sse";
import type { MandateTerms, Reason } from "@/lib/types";

// The guided demo: 1 pick a job, 2 approve your agent's rules, 3 watch it shop and get refunded if a store gets it wrong.

const JOBS = [
  {
    icon: "🎟",
    title: "Concert tickets",
    ask: "Get me 2 tickets for Neon Harbor on Oct 12, under $0.50 each",
    twist: "One store is a fake. Another sends tickets for the wrong date.",
  },
  {
    icon: "📈",
    title: "Market data",
    ask: "Buy the last 24 hours of ETH funding rate data, max $0.10",
    twist: "The data store takes the money and sends back nothing.",
  },
];

type StoreStatus = "checking" | "blocked" | "needs_you" | "allowed" | "protected" | "paid" | "checking_delivery" | "delivered_ok" | "wrong" | "refunded";

interface Store {
  name: string;
  item: string;
  price: number;
  status: StoreStatus;
  why: string[];
  delivery?: string;
  refund?: number;
  txs: { label: string; tx: string }[];
}

const scan = (tx: string) => `https://sepolia.basescan.org/tx/${tx}`;

/** Halo's reasons, in words a shopper would use. */
function plain(r: Reason): string {
  switch (r.code) {
    case "lookalike":
      return `Fake store. ${r.text.replace("imitates the verified merchant", "copies the name of the real store")}`;
    case "injection":
    case "injection_rule":
      return "Its listing tries to give your agent orders, like ignoring your budget.";
    case "mismatch":
      return `Doesn't match your rules: ${r.text}`;
    case "unclear":
      return `Doesn't say: ${r.text.replace(": the offer does not say.", "")}.`;
    case "unverified":
      return "Not a trusted store.";
    case "budget":
    case "unit_price":
      return `Too expensive. ${r.text}`;
    case "quantity":
      return `Wrong quantity. ${r.text}`;
    case "fund_full":
      return r.text;
    default:
      return r.text;
  }
}

function summarizeDelivery(d: unknown): string {
  if (!d || typeof d !== "object") return String(d ?? "nothing");
  const o = d as Record<string, unknown>;
  if (Array.isArray(o.tickets)) return `${o.tickets.length} tickets for ${o.date ?? "?"}`;
  if (Array.isArray(o.rows)) return o.rows.length ? `${o.rows.length} rows of data` : "an empty file (0 rows)";
  return JSON.stringify(d).slice(0, 80);
}

const STATUS: Record<StoreStatus, { label: string; tone: string }> = {
  checking: { label: "Halo is checking", tone: "text-muted border-line" },
  blocked: { label: "Blocked", tone: "text-bad border-bad/60" },
  needs_you: { label: "Needs your OK", tone: "text-warn border-warn/60" },
  allowed: { label: "Allowed", tone: "text-ok border-ok/60" },
  protected: { label: "Protected", tone: "text-ok border-ok/60" },
  paid: { label: "Paid, waiting for delivery", tone: "text-gold border-gold/60" },
  checking_delivery: { label: "Checking what arrived", tone: "text-gold border-gold/60" },
  delivered_ok: { label: "Delivered, matches your rules", tone: "text-ok border-ok/60" },
  wrong: { label: "Wrong delivery", tone: "text-bad border-bad/60" },
  refunded: { label: "Refunded", tone: "text-ok border-ok/60" },
};

export default function Try() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [custom, setCustom] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [draft, setDraft] = useState<{ id: string; terms: MandateTerms; ask: string } | null>(null);
  const [question, setQuestion] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [setup, setSetup] = useState<{ label: string; tx?: string }[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [done, setDone] = useState<string | null>(null);

  async function pick(ask: string) {
    setBusy("Turning your request into rules");
    setError(null);
    setQuestion(null);
    try {
      const r = await fetch("/api/mandates", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ instruction: ask }) }).then((r) => r.json());
      if (r.error) setError(r.error);
      else if (r.status === "clarify") setQuestion(r.question);
      else {
        setDraft({ id: r.id, terms: r.terms, ask });
        setStep(2);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(null);
    }
  }

  function onStep(s: Step) {
    if (s.kind === "tx" && (s.stage === "funded" || s.stage === "rules")) {
      setSetup((p) => [...p, { label: s.label, tx: s.tx }]);
      return;
    }
    if (s.kind === "info") {
      if (/^Done|No other seller|No seller/.test(s.text)) setDone(s.text);
      else setSetup((p) => [...p, { label: s.text }]);
      return;
    }
    setStores((prev) => {
      const list = [...prev];
      const cur = list[list.length - 1];
      const patch = (p: Partial<Store>) => (list[list.length - 1] = { ...cur, ...p });
      switch (s.kind) {
        case "offer":
          list.push({ name: s.merchant, item: s.title, price: s.total, status: "checking", why: [], txs: [] });
          break;
        case "decision":
          if (!cur) break;
          if (s.decision === "approve") patch({ status: "allowed", why: [s.reasons.find((r) => r.code === "match")?.text ?? "Matches your rules."] });
          else patch({ status: s.decision === "decline" ? "blocked" : "needs_you", why: s.reasons.map(plain) });
          break;
        case "tx": {
          if (!cur) break;
          const txs = [...cur.txs, { label: s.label, tx: s.tx }];
          if (s.stage === "protected") patch({ status: "protected", txs });
          else if (s.stage === "paid") patch({ status: "paid", txs });
          else patch({ txs });
          break;
        }
        case "delivered":
          if (cur) patch({ status: "checking_delivery", delivery: summarizeDelivery(s.delivery) });
          break;
        case "verdict":
          if (cur) patch(s.verdict.covered ? { status: "wrong", why: [s.verdict.reason] } : { status: "delivered_ok" });
          break;
        case "payout":
          if (cur) patch({ status: "refunded", refund: s.amount, txs: [...cur.txs, { label: `Refunded ${s.amount.toFixed(2)} USDC`, tx: s.tx }] });
          break;
      }
      return list;
    });
  }

  async function start() {
    if (!draft) return;
    setStep(3);
    setSetup([]);
    setStores([]);
    setDone(null);
    setError(null);
    setBusy("Saving your rules");
    let failed = false;
    const run = async (url: string) =>
      postStream(url, {}, (event, data) => {
        if (event === "step") onStep(data as Step);
        if (event === "error") {
          failed = true;
          setError((data as { message: string }).message);
        }
      });
    try {
      await run(`/api/mandates/${draft.id}/confirm`);
      if (!failed) {
        setBusy("Your agent is shopping");
        await run(`/api/mandates/${draft.id}/run`);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(null);
    }
  }

  function reset() {
    setStep(1);
    setDraft(null);
    setStores([]);
    setSetup([]);
    setDone(null);
    setError(null);
    setQuestion(null);
  }

  const spent = stores.filter((s) => ["paid", "checking_delivery", "delivered_ok", "wrong", "refunded"].includes(s.status)).reduce((a, s) => a + s.price, 0);
  const refunded = stores.reduce((a, s) => a + (s.refund ?? 0), 0);
  const got = stores.find((s) => s.status === "delivered_ok");

  return (
    <div className="mx-auto max-w-3xl px-4 py-14">
      <Stepper step={step} />

      {step === 1 && (
        <section className="mt-12">
          <h1 className="text-balance text-center text-4xl font-semibold tracking-tight sm:text-5xl">What should your agent buy?</h1>
          <p className="mx-auto mt-4 max-w-lg text-center text-muted">
            Pick a job. Your agent will shop real test stores and pay with real test USDC. Halo watches every step.
          </p>
          <div className="mt-10 divide-y divide-line border-y hair">
            {JOBS.map((j) => (
              <button
                key={j.title}
                onClick={() => pick(j.ask)}
                disabled={!!busy}
                className="group flex w-full items-center justify-between gap-6 py-6 text-left transition disabled:opacity-50"
              >
                <span>
                  <span className="text-xl font-semibold transition group-hover:text-gold">{j.title}</span>
                  <span className="mt-1 block text-fg/80">“{j.ask}”</span>
                  <span className="mt-2 block text-sm text-muted">{j.twist}</span>
                </span>
                <span className="shrink-0 text-gold transition group-hover:translate-x-1">→</span>
              </button>
            ))}
          </div>
          <div className="mt-6 text-center">
            {!showCustom ? (
              <button onClick={() => setShowCustom(true)} className="text-sm text-muted underline decoration-dotted hover:text-fg">
                or describe your own job
              </button>
            ) : (
              <div className="mt-2 flex flex-col gap-3 sm:flex-row">
                <input
                  value={custom}
                  onChange={(e) => setCustom(e.target.value)}
                  placeholder="e.g. 3 Neon Harbor tickets for Oct 12, max $0.45 each"
                  className="flex-1 rounded-full border hair bg-transparent px-5 py-3 outline-none focus:border-gold"
                />
                <button onClick={() => custom && pick(custom)} disabled={!!busy || !custom} className="rounded-full bg-gold px-6 py-3 text-sm font-semibold text-bg disabled:opacity-50">
                  Continue
                </button>
              </div>
            )}
          </div>
          {question && (
            <p className="mt-6 text-center text-warn">
              Halo needs one more detail: {question} <span className="text-muted">It never guesses a budget.</span>
            </p>
          )}
        </section>
      )}

      {step === 2 && draft && (
        <section className="mt-12">
          <h1 className="text-balance text-center text-4xl font-semibold tracking-tight sm:text-5xl">Your agent&apos;s rules</h1>
          <p className="mx-auto mt-4 max-w-lg text-center text-muted">
            Halo turned your request into rules. Your agent can only buy what fits them. Nobody can change them later, not even us.
          </p>
          <div className="mt-10">
            <p className="text-sm text-muted">You asked: “{draft.ask}”</p>
            <dl className="mt-4 divide-y divide-line border-y hair">
              <Rule k="Buy" v={draft.terms.item} />
              <Rule k="How many" v={String(draft.terms.quantity)} />
              {draft.terms.maxUnitPrice != null && <Rule k="Max price each" v={`$${draft.terms.maxUnitPrice.toFixed(2)}`} />}
              <Rule k="Max total" v={`$${draft.terms.maxTotal.toFixed(2)}`} />
              {draft.terms.constraints.map((c) => (
                <Rule key={c.name} k={c.name.replace(/_/g, " ")} v={c.value} />
              ))}
              <Rule k="Stores" v={draft.terms.merchantRule === "verified_only" ? "Trusted stores only" : "Any store"} />
            </dl>
          </div>
          <div className="mt-8 flex flex-col-reverse items-center gap-3 sm:flex-row sm:justify-between">
            <button onClick={reset} className="text-sm text-muted underline decoration-dotted hover:text-fg">
              ← Pick another job
            </button>
            <button onClick={start} className="w-full rounded-full bg-gold px-8 py-3.5 text-sm font-semibold text-bg shadow-[0_0_40px_-8px_var(--gold)] sm:w-auto">
              Approve and start shopping →
            </button>
          </div>
          <p className="mt-4 text-center text-xs text-muted">Your agent gets a wallet with test USDC. No sign up, nothing to install.</p>
        </section>
      )}

      {step === 3 && (
        <section className="mt-12">
          <h1 className="text-balance text-center text-4xl font-semibold tracking-tight sm:text-5xl">Watch your agent shop</h1>
          <ul className="mx-auto mt-8 max-w-xl space-y-1.5 text-center text-sm text-muted">
            {setup.map((s, i) => (
              <li key={i} className="rise">
                ✓ {s.label}{" "}
                {s.tx && (
                  <a className="underline decoration-dotted" href={scan(s.tx)} target="_blank" rel="noreferrer">
                    proof
                  </a>
                )}
              </li>
            ))}
          </ul>

          <div className="mt-10 divide-y divide-line border-y hair">
            {stores.map((s, i) => (
              <StoreCard key={i} s={s} />
            ))}
          </div>

          {busy && <p className="mt-8 animate-pulse text-center text-sm text-muted">{busy}…</p>}
          {error && <p className="mt-8 text-center text-sm text-bad">{error}</p>}

          {done && (
            <div className="rise mt-10 border-t border-gold/40 pt-8">
              <p className="text-xs uppercase tracking-[0.25em] text-gold">Your receipt</p>
              <div className="mt-5 grid grid-cols-3 gap-4 text-center">
                <Money k="Paid to stores" v={spent} />
                <Money k="Refunded to you" v={refunded} tone="text-ok" />
                <Money k="Stores blocked" v={stores.filter((s) => s.status === "blocked").length} plain />
              </div>
              <p className="mt-6 text-center text-lg">
                {got ? `You got what you asked for from ${got.name}.` : refunded > 0 ? "Nothing matched your rules, and you got your money back." : done}
              </p>
              <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <Link href="/dashboard" className="rounded-full border hair px-5 py-2.5 text-sm hover:border-gold">
                  See every detail
                </Link>
                <button onClick={reset} className="rounded-full bg-gold px-5 py-2.5 text-sm font-semibold text-bg">
                  Give another job
                </button>
              </div>
            </div>
          )}

          {(done || error) && (
            <div className="mt-8">
              <p className="mb-3 text-center text-sm text-muted">Want refunds sent to your own wallet next time?</p>
              <WalletPanel compact />
            </div>
          )}
        </section>
      )}

      {busy && step === 1 && <p className="mt-8 animate-pulse text-center text-sm text-muted">{busy}…</p>}
      {error && step !== 3 && <p className="mt-8 text-center text-sm text-bad">{error}</p>}
    </div>
  );
}

function Stepper({ step }: { step: number }) {
  const items = ["Pick a job", "Approve the rules", "Watch it shop"];
  return (
    <ol className="mx-auto flex max-w-xl items-center justify-between gap-2 text-xs sm:text-sm">
      {items.map((label, i) => {
        const n = i + 1;
        const state = n < step ? "done" : n === step ? "now" : "next";
        return (
          <li key={label} className="flex flex-1 items-center gap-2">
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border font-mono text-xs ${
                state === "now" ? "border-gold bg-gold text-bg" : state === "done" ? "border-gold/60 text-gold" : "hair text-muted"
              }`}
            >
              {state === "done" ? "✓" : n}
            </span>
            <span className={state === "next" ? "text-muted" : "text-fg"}>{label}</span>
            {n < 3 && <span className="hidden h-px flex-1 bg-line sm:block" />}
          </li>
        );
      })}
    </ol>
  );
}

function Rule({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-6 py-3">
      <dt className="capitalize text-muted">{k}</dt>
      <dd className="text-right font-medium">{v}</dd>
    </div>
  );
}

function Money({ k, v, tone = "", plain = false }: { k: string; v: number; tone?: string; plain?: boolean }) {
  return (
    <div>
      <p className={`text-3xl font-semibold ${tone}`}>{plain ? v : `$${v.toFixed(2)}`}</p>
      <p className="mt-1 text-xs text-muted">{k}</p>
    </div>
  );
}

function StoreCard({ s }: { s: Store }) {
  const st = STATUS[s.status];
  return (
    <div className="rise py-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-lg font-semibold">{s.name}</p>
          <p className="text-sm text-muted">
            {s.item} · ${s.price.toFixed(2)}
          </p>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${st.tone}`}>{st.label}</span>
      </div>
      {s.why.length > 0 && (
        <ul className="mt-4 space-y-1 text-sm text-fg/80">
          {s.why.map((w, i) => (
            <li key={i}>{w}</li>
          ))}
        </ul>
      )}
      {s.delivery && (
        <p className="mt-3 text-sm">
          <span className="text-muted">Arrived: </span>
          {s.delivery}
        </p>
      )}
      {s.refund != null && <p className="mt-3 font-semibold text-ok">${s.refund.toFixed(2)} is back in your agent&apos;s wallet.</p>}
      {s.txs.length > 0 && (
        <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
          {s.txs.map((t) => (
            <a key={t.tx} href={scan(t.tx)} target="_blank" rel="noreferrer" className="underline decoration-dotted hover:text-fg">
              {t.label}
            </a>
          ))}
        </p>
      )}
    </div>
  );
}
