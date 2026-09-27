"use client";

import type { Step } from "@/lib/halo";

const scan = (tx: string) => `https://sepolia.basescan.org/tx/${tx}`;

const badge: Record<string, string> = {
  approve: "text-ok border-ok",
  decline: "text-bad border-bad",
  ask_user: "text-warn border-warn",
};

export function StepLog({ steps }: { steps: Step[] }) {
  return (
    <ol className="divide-y divide-line border-y hair">
      {steps.map((s, i) => (
        <li key={i} className="py-3 text-sm">
          <StepRow s={s} />
        </li>
      ))}
    </ol>
  );
}

function StepRow({ s }: { s: Step }) {
  switch (s.kind) {
    case "info":
      return <p className="text-muted">{s.text}</p>;
    case "tx":
      return (
        <p>
          <span className="text-muted">⛓</span> {s.label}{" "}
          <a className="font-mono text-xs text-muted underline" href={scan(s.tx)} target="_blank" rel="noreferrer">
            {s.tx.slice(0, 10)}…
          </a>
        </p>
      );
    case "offer":
      return (
        <p>
          Agent wants <b>{s.title}</b> from <b>{s.merchant}</b> for <span className="font-mono">{s.total.toFixed(2)} USDC</span>
        </p>
      );
    case "decision":
      return (
        <div>
          <span className={`mr-2 rounded-full border px-2 py-0.5 text-xs font-semibold uppercase ${badge[s.decision] ?? ""}`}>
            {s.decision === "ask_user" ? "ask you" : s.decision === "approve" ? "approved" : "declined"}
          </span>
          <span className="font-medium">{s.merchant}</span>
          <ul className="mt-2 space-y-1 text-muted">
            {s.reasons.map((r, j) => (
              <li key={j}>· {r.text}</li>
            ))}
          </ul>
        </div>
      );
    case "delivered":
      return (
        <div>
          <p>{s.merchant} delivered:</p>
          <pre className="mt-2 overflow-x-auto bg-soft p-3 font-mono text-xs">{JSON.stringify(s.delivery, null, 2)}</pre>
        </div>
      );
    case "verdict":
      return s.verdict.covered ? (
        <p>
          <span className="mr-2 rounded-full border border-bad px-2 py-0.5 text-xs font-semibold uppercase text-bad">
            {s.verdict.type.replace(/_/g, " ")}
          </span>
          {s.verdict.reason}
        </p>
      ) : (
        <p>
          <span className="mr-2 rounded-full border border-ok px-2 py-0.5 text-xs font-semibold uppercase text-ok">matches</span>
          {s.verdict.reason}
        </p>
      );
    case "payout":
      return (
        <p className="text-base font-semibold text-ok">
          Paid back {s.amount.toFixed(2)} USDC{" "}
          <a className="font-mono text-xs font-normal underline" href={scan(s.tx)} target="_blank" rel="noreferrer">
            view on Basescan
          </a>
        </p>
      );
  }
}
