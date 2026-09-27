// PRD G2: run the checkout and claim answer keys through SERV and raw modes and publish the results.
// Usage: npx tsx evals/run.ts            (both modes)
//        MODES=serv npx tsx evals/run.ts (one mode)
import { config } from "dotenv";
config({ path: ".env.local" });

import { readFileSync, writeFileSync } from "node:fs";
import { checkout } from "../src/lib/check";
import { adjudicate } from "../src/lib/claim";
import { checkoutCases, claimCases } from "./cases";

const MODES = (process.env.MODES || "serv,raw").split(",") as ("serv" | "raw")[];
const LIMIT = Number(process.env.CONCURRENCY || 4);

async function pool<T>(tasks: (() => Promise<T>)[]): Promise<T[]> {
  const out: T[] = [];
  let i = 0;
  await Promise.all(
    Array.from({ length: LIMIT }, async () => {
      while (i < tasks.length) {
        const k = i++;
        out[k] = await tasks[k]();
      }
    }),
  );
  return out;
}

interface Row {
  mode: string;
  suite: string;
  id: string;
  expect: string;
  got: string;
  ok: boolean;
  falseApproval?: boolean;
  ms: number;
  tokens: number;
  note: string;
}

async function main() {
  const rows: Row[] = [];
  for (const mode of process.env.REPORT_ONLY ? [] : MODES) {
    const raw = mode === "raw";
    const cc = checkoutCases();
    console.log(`${mode}: ${cc.length} checkout cases`);
    rows.push(
      ...(await pool(
        cc.map((c) => async (): Promise<Row> => {
          const t0 = Date.now();
          try {
            const r = await checkout(c.offer, {
              terms: c.terms,
              spent: c.spent,
              expiresAt: new Date(Date.now() + 3600_000),
              merchantVerified: true,
              verifiedNames: ["Verified Shop"],
              unverifiedCap: 2,
              raw,
            });
            return {
              mode,
              suite: "checkout",
              id: c.id,
              expect: c.expect,
              got: r.decision,
              ok: r.decision === c.expect,
              falseApproval: c.mustDecline && r.decision === "approve",
              ms: Date.now() - t0,
              tokens: r.records.reduce((a, x) => a + (x.tokens ?? 0), 0),
              note: r.reasons.map((x) => x.code).join(","),
            };
          } catch (e) {
            return { mode, suite: "checkout", id: c.id, expect: c.expect, got: "error", ok: false, ms: Date.now() - t0, tokens: 0, note: String(e).slice(0, 120) };
          }
        }),
      )),
    );

    const lc = claimCases();
    console.log(`${mode}: ${lc.length} claim cases`);
    rows.push(
      ...(await pool(
        lc.map((c) => async (): Promise<Row> => {
          const t0 = Date.now();
          try {
            const v = await adjudicate({ terms: c.terms, offer: c.offer, amountPaid: c.offer.total, delivery: c.delivery, evidence: c.evidence, raw });
            const ok =
              v.covered === c.expectCovered &&
              (!c.expectCovered || v.type === c.expectType) &&
              Math.abs(v.payout - c.expectPayout) < 0.011;
            return {
              mode,
              suite: "claim",
              id: c.id,
              expect: c.expectCovered ? `${c.expectType} ${c.expectPayout}` : "no payout",
              got: v.covered ? `${v.type} ${v.payout}` : "no payout",
              ok,
              ms: Date.now() - t0,
              tokens: v.records.reduce((a, x) => a + (x.tokens ?? 0), 0),
              note: v.reason.slice(0, 140),
            };
          } catch (e) {
            return { mode, suite: "claim", id: c.id, expect: String(c.expectCovered), got: "error", ok: false, ms: Date.now() - t0, tokens: 0, note: String(e).slice(0, 120) };
          }
        }),
      )),
    );
  }

  // Keep earlier results for modes not rerun this time, so SERV and raw end up in one table.
  try {
    const prev = JSON.parse(readFileSync("evals/results.json", "utf8")) as { rows: Row[] };
    rows.push(...prev.rows.filter((r) => process.env.REPORT_ONLY || !MODES.includes(r.mode as "serv" | "raw")));
  } catch {
    // first run
  }
  const allModes = [...new Set(rows.map((r) => r.mode))];
  const summary = allModes.flatMap((mode) =>
    ["checkout", "claim"].map((suite) => {
      const rs = rows.filter((r) => r.mode === mode && r.suite === suite);
      const ok = rs.filter((r) => r.ok).length;
      return {
        mode,
        suite,
        correct: `${ok}/${rs.length}`,
        pct: rs.length ? Math.round((ok / rs.length) * 100) : 0,
        falseApprovals: rs.filter((r) => r.falseApproval).length,
        // Money paid when it should not have been, or the wrong amount: the costly error for a guarantor.
        wrongPayouts: suite === "claim" ? rs.filter((r) => r.got !== "error" && r.got !== "no payout" && r.got !== r.expect).length : 0,
        errors: rs.filter((r) => r.got === "error").length,
        avgMs: Math.round(rs.reduce((a, r) => a + r.ms, 0) / Math.max(rs.length, 1)),
        avgTokens: Math.round(rs.reduce((a, r) => a + r.tokens, 0) / Math.max(rs.length, 1)),
      };
    }),
  );
  console.table(summary);

  const md = [
    "# Eval results",
    "",
    `Run ${new Date().toISOString()} on \`${process.env.SERV_MODEL || "gpt-5.4-mini"}\`. Cases and answer keys: [cases.ts](cases.ts).`,
    "",
    "PRD G2 bar: zero false approvals on cases that must be declined, and at least 90% correct overall.",
    "",
    "False approvals: a purchase that must be declined was approved. Wrong payouts: money paid on a claim that deserved none, or the wrong amount.",
    "",
    "| Mode | Suite | Correct | % | False approvals | Wrong payouts | Errors | Avg ms | Avg tokens |",
    "|---|---|---|---|---|---|---|---|---|",
    ...summary.map((s) => `| ${s.mode} | ${s.suite} | ${s.correct} | ${s.pct}% | ${s.suite === "checkout" ? s.falseApprovals : "n/a"} | ${s.suite === "claim" ? s.wrongPayouts : "n/a"} | ${s.errors} | ${s.avgMs} | ${s.avgTokens} |`),
    "",
    "## Misses",
    "",
    "| Mode | Suite | Case | Expected | Got | Note |",
    "|---|---|---|---|---|---|",
    ...rows.filter((r) => !r.ok).map((r) => `| ${r.mode} | ${r.suite} | ${r.id} | ${r.expect} | ${r.got} | ${r.note.replace(/\|/g, "/")} |`),
    "",
  ].join("\n");
  writeFileSync("evals/RESULTS.md", md);
  writeFileSync("evals/results.json", JSON.stringify({ summary, rows }, null, 2));
  console.log("wrote evals/RESULTS.md");
}

main();
