// PRD A1, A4 answer key: 10 instructions, and B1, E3: one failing case per hard rule.
// Usage: npx tsx evals/mandates.ts
import { config } from "dotenv";
config({ path: ".env.local" });

import { appendFileSync } from "node:fs";
import { checkout } from "../src/lib/check";
import { compileMandate } from "../src/lib/mandate";
import type { MandateTerms, Offer } from "../src/lib/types";

const TODAY = "2026-09-27";

interface Key {
  instruction: string;
  status: "ok" | "clarify";
  quantity?: number;
  maxTotal?: number;
  maxUnitPrice?: number | null;
  constraint?: [string, string]; // a constraint that must appear (name contains, value contains)
}

const KEYS: Key[] = [
  { instruction: "Get me 2 tickets for Neon Harbor on Oct 12, under $5 each", status: "ok", quantity: 2, maxTotal: 10, maxUnitPrice: 5, constraint: ["date", "2026-10-12"] },
  { instruction: "Book one train seat London to Paris on November 3rd, max 120 dollars", status: "ok", quantity: 1, maxTotal: 120, constraint: ["date", "2026-11-03"] },
  { instruction: "Buy the EPUB of The Pragmatic Programmer, no more than $30", status: "ok", quantity: 1, maxTotal: 30, constraint: ["format", "epub"] },
  { instruction: "3 Louvre tickets for October 20, $20 each at most", status: "ok", quantity: 3, maxTotal: 60, maxUnitPrice: 20, constraint: ["date", "2026-10-20"] },
  { instruction: "Black running shoes size EU 42, budget 110", status: "ok", quantity: 1, maxTotal: 110, constraint: ["size", "42"] },
  { instruction: "Buy the last 24 hours of ETH funding rate data, max $0.50", status: "ok", quantity: 1, maxTotal: 0.5, constraint: ["", "24"] },
  { instruction: "Two nights in Lisbon from Dec 1, total under $200", status: "ok", maxTotal: 200, constraint: ["", "2026-12-01"] },
  { instruction: "1000 geocoding API calls for $10 or less", status: "ok", quantity: 1, maxTotal: 10, constraint: ["", "1000"] },
  { instruction: "Buy me some concert tickets", status: "clarify" },
  { instruction: "Get me something nice", status: "clarify" },
];

const near = (a: number | null | undefined, b: number | null | undefined) =>
  a == null || b == null ? a == b : Math.abs(a - b) < 0.011;

async function mandates() {
  const out: string[] = [];
  let ok = 0;
  for (const k of KEYS) {
    const r = await compileMandate(k.instruction, { today: TODAY });
    let pass = r.status === k.status;
    let got: string = r.status;
    if (r.status === "ok") {
      const t = r.terms;
      got = `qty ${t.quantity}, total ${t.maxTotal}, each ${t.maxUnitPrice}, ${t.constraints.map((c) => `${c.name}=${c.value}`).join("; ")}`;
      if (k.quantity != null) pass &&= t.quantity === k.quantity;
      if (k.maxTotal != null) pass &&= near(t.maxTotal, k.maxTotal);
      if (k.maxUnitPrice !== undefined) pass &&= near(t.maxUnitPrice, k.maxUnitPrice);
      if (k.constraint)
        pass &&= t.constraints.some(
          (c) => c.name.toLowerCase().includes(k.constraint![0]) && c.value.toLowerCase().includes(k.constraint![1].toLowerCase()),
        );
    } else if (r.status === "clarify") got = `clarify: ${r.question}`;
    if (pass) ok++;
    out.push(`| ${k.instruction} | ${k.status} | ${got.replace(/\|/g, "/")} | ${pass ? "pass" : "FAIL"} |`);
  }
  return { ok, total: KEYS.length, out };
}

// B1 and E3: each hard rule declines on its own (raw mode is enough here: rules never depend on the model).
const terms: MandateTerms = {
  summary: "2 tickets for Neon Harbor on 2026-10-12, under 5 each",
  item: "tickets for Neon Harbor",
  category: "ticket",
  quantity: 2,
  maxUnitPrice: 5,
  maxTotal: 10,
  merchantRule: "verified_only",
  validHours: 24,
  constraints: [{ name: "date", value: "2026-10-12" }],
};
const good: Offer = {
  merchant: { slug: "stagedoor", name: "StageDoor", origin: "https://x/m/stagedoor", payTo: "0x0000000000000000000000000000000000000001" },
  item: { title: "Neon Harbor, general admission", description: "E-ticket.", attributes: { event: "Neon Harbor", date: "2026-10-12" } },
  quantity: 2,
  unitPrice: 4.75,
  total: 9.5,
  currency: "USDC",
  network: "base-sepolia",
  resource: "https://x/buy",
};
const ctx = { terms, spent: 0, expiresAt: new Date(Date.now() + 3600_000), merchantVerified: true, verifiedNames: ["stagedoor", "StageDoor"], unverifiedCap: 2, raw: true };

const RULES: { id: string; offer: Offer; ctx: typeof ctx; code: string; expect: string }[] = [
  { id: "expired mandate", offer: good, ctx: { ...ctx, expiresAt: new Date(Date.now() - 1000) }, code: "expired", expect: "decline" },
  { id: "wrong quantity", offer: { ...good, quantity: 3, total: 14.25 }, ctx, code: "quantity", expect: "decline" },
  { id: "unit price over cap", offer: { ...good, unitPrice: 5.5, total: 11 }, ctx, code: "unit_price", expect: "decline" },
  { id: "total does not add up", offer: { ...good, total: 12 }, ctx, code: "total_mismatch", expect: "decline" },
  { id: "over remaining budget", offer: good, ctx: { ...ctx, spent: 2 }, code: "budget", expect: "decline" },
  { id: "not USDC", offer: { ...good, currency: "EURC" as "USDC" }, ctx, code: "currency", expect: "decline" },
  {
    id: "lookalike merchant",
    offer: { ...good, merchant: { ...good.merchant, slug: "stagedo0r", name: "StageDo0r" } },
    ctx: { ...ctx, merchantVerified: false },
    code: "lookalike",
    expect: "decline",
  },
  {
    id: "unverified merchant over cap (E3)",
    offer: { ...good, merchant: { ...good.merchant, slug: "tixhub", name: "TixHub" } },
    ctx: { ...ctx, merchantVerified: false, terms: { ...terms, merchantRule: "any" } },
    code: "unverified",
    expect: "ask_user",
  },
];

async function rules() {
  const out: string[] = [];
  let ok = 0;
  for (const r of RULES) {
    const res = await checkout(r.offer, r.ctx);
    const pass = res.decision === r.expect && res.reasons.some((x) => x.code === r.code);
    if (pass) ok++;
    out.push(`| ${r.id} | ${r.expect} (${r.code}) | ${res.decision} (${res.reasons.map((x) => x.code).join(", ")}) | ${pass ? "pass" : "FAIL"} |`);
  }
  return { ok, total: RULES.length, out };
}

async function main() {
  const [m, r] = await Promise.all([mandates(), rules()]);
  const md = [
    "",
    `## Mandate compiler (PRD A1, A4): ${m.ok}/${m.total}`,
    "",
    "| Instruction | Expected | Got | Result |",
    "|---|---|---|---|",
    ...m.out,
    "",
    `## Hard rules (PRD B1, E3): ${r.ok}/${r.total}`,
    "",
    "| Case | Expected | Got | Result |",
    "|---|---|---|---|",
    ...r.out,
    "",
  ].join("\n");
  appendFileSync("evals/RESULTS.md", md);
  console.log(md);
}

main();
