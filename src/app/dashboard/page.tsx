"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { StepLog } from "@/components/StepLog";
import { WalletPanel } from "@/components/WalletPanel";
import type { Step } from "@/lib/halo";
import type { ReasoningRecord } from "@/lib/serv";
import { postStream } from "@/lib/sse";
import type { Offer, Reason } from "@/lib/types";

interface Purchase {
  id: string;
  merchant_slug: string;
  offer: Offer;
  decision: string;
  reasons: Reason[];
  amount: string;
  fee: string | null;
  status: string;
  approval_tx: string | null;
  fee_tx: string | null;
  payment_tx: string | null;
  link_tx: string | null;
  resolve_tx: string | null;
  payout: string | null;
  created_at: string;
}

interface Me {
  apiKey: string;
  wallet: string | null;
  mandates: { id: string; instruction: string; tx: string | null; created_at: string }[];
  purchases: Purchase[];
}

const scan = (tx: string) => `https://sepolia.basescan.org/tx/${tx}`;

const STATUS: Record<string, string> = {
  ok: "Protected · delivered",
  delivered: "Protected · delivered",
  covered: "Protected",
  approved: "Allowed",
  refunded: "Refunded",
  decline: "Blocked",
  ask_user: "Needs your OK",
  review: "Refund under review",
  failed: "Payment failed · fee refunded",
};

export default function Dashboard() {
  const [me, setMe] = useState<Me | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [records, setRecords] = useState<Record<string, ReasoningRecord[]>>({});
  const [claimSteps, setClaimSteps] = useState<Record<string, Step[]>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => fetch("/api/me").then((r) => r.json()).then(setMe), []);
  useEffect(() => {
    load();
  }, [load]);

  async function toggle(id: string) {
    setOpen(open === id ? null : id);
    if (!records[id]) {
      const r = await fetch(`/api/records/${id}`).then((r) => r.json());
      setRecords((prev) => ({ ...prev, [id]: r.records }));
    }
  }

  async function claim(id: string) {
    const evidence = prompt("What went wrong with this purchase?", "The tickets are not what I asked for.");
    if (!evidence) return;
    setBusy(id);
    setClaimSteps((prev) => ({ ...prev, [id]: [] }));
    await postStream(`/api/purchases/${id}/claim`, { evidence }, (event, data) => {
      if (event === "step") setClaimSteps((prev) => ({ ...prev, [id]: [...(prev[id] ?? []), data as Step] }));
      if (event === "error") setClaimSteps((prev) => ({ ...prev, [id]: [...(prev[id] ?? []), { kind: "info", text: `Error: ${(data as { message: string }).message}` }] }));
    });
    setBusy(null);
    load();
  }

  if (!me) return <p className="py-24 text-center text-muted">Loading…</p>;

  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <h1 className="text-center text-4xl font-bold">My purchases</h1>
      <p className="mt-3 text-center text-sm text-muted">
        Agent wallet{" "}
        {me.wallet ? (
          <a className="font-mono underline" href={`https://sepolia.basescan.org/address/${me.wallet}`} target="_blank" rel="noreferrer">
            {me.wallet}
          </a>
        ) : (
          "not created yet"
        )}
      </p>

      <div className="mt-8">
        <WalletPanel />
      </div>

      {me.purchases.length === 0 ? (
        <p className="mt-16 text-center text-muted">
          Nothing yet. <Link href="/try" className="underline">Give your agent a shopping job</Link>.
        </p>
      ) : (
        <ul className="mt-12 divide-y divide-line border-y hair">
          {me.purchases.map((p) => (
            <li key={p.id} className="py-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <p className="font-medium">{p.offer.item.title}</p>
                  <p className="text-sm text-muted">
                    {p.offer.merchant.name} · {Number(p.amount).toFixed(2)} USDC
                    {p.fee ? ` · ${Number(p.fee).toFixed(2)} to the refund fund` : ""}
                  </p>
                </div>
                <span className="text-sm">
                  {STATUS[p.status] ?? p.status}
                  {p.payout && Number(p.payout) > 0 ? ` · ${Number(p.payout).toFixed(2)} USDC refunded` : ""}
                </span>
              </div>
              <ul className="mt-2 text-sm text-muted">
                {p.reasons.map((r, i) => (
                  <li key={i}>· {r.text}</li>
                ))}
              </ul>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                {[
                  ["allowed", p.approval_tx],
                  ["protected", p.fee_tx],
                  ["paid", p.payment_tx],
                  ["delivery recorded", p.link_tx],
                  ["refund", p.resolve_tx],
                ]
                  .filter(([, tx]) => tx)
                  .map(([k, tx]) => (
                    <a key={k} href={scan(tx!)} target="_blank" rel="noreferrer" className="text-muted underline">
                      {k} ↗
                    </a>
                  ))}
                <button onClick={() => toggle(p.id)} className="text-muted underline">
                  {open === p.id ? "hide" : "why Halo decided"}
                </button>
                {["ok", "delivered"].includes(p.status) && (
                  <button onClick={() => claim(p.id)} disabled={busy === p.id} className="font-medium underline">
                    Ask for a refund
                  </button>
                )}
              </div>
              {open === p.id && (
                <div className="mt-3 space-y-3">
                  {(records[p.id] ?? []).map((r) => (
                    <details key={r.id} className="border hair p-3 text-xs">
                      <summary className="cursor-pointer">
                        {r.kind} · {r.mode} · {r.guard ? "PromptGuard · " : ""}
                        {r.shadow ? "Shadow Agent · " : ""}
                        {r.latencyMs} ms · <span className="font-mono">{r.hash.slice(0, 14)}…</span>
                      </summary>
                      <pre className="mt-2 whitespace-pre-wrap font-mono text-muted">{r.input}</pre>
                      <pre className="mt-2 whitespace-pre-wrap font-mono">{r.output}</pre>
                    </details>
                  ))}
                </div>
              )}
              {claimSteps[p.id] && (
                <div className="mt-3">
                  <StepLog steps={claimSteps[p.id]} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
