# Halo: build plan

Phases run in order. A phase is done only when its exit check passes; exit checks point at requirement IDs in [PRD.md](PRD.md). Estimates are focused build hours.

## Stack

| Layer | Choice |
|---|---|
| App, API, MCP server | Next.js on Vercel (TypeScript) |
| Storage | Postgres (Neon) for mandates, records, evals; chain is the source of truth for money |
| Contracts | Solidity + Foundry, Base Sepolia, Circle test USDC |
| Wallets | Coinbase CDP server wallets: one operator wallet (Halo adjuster), one wallet per demo user agent |
| Payments | x402 (merchant middleware + client), public facilitator for Base Sepolia |
| Reasoning | SERV via the OpenAI SDK pointed at `inference-api.openserv.ai` |

## What you need to provide (batched, once)

1. SERV API key (have it) and credit top up (about $5 covers the whole build and evals).
2. Coinbase CDP API key and wallet secret (portal.cdp.coinbase.com).
3. Neon Postgres URL (free tier).
4. Vercel project linked to the repo.
5. Test USDC and Base Sepolia ETH for the operator wallet (faucets; I will list exact links in Phase 0).

---

## Phase 0: Spikes (2h)

Prove every risky external piece works before building on it.

1. SERV: structured output call, PromptGuard on an injected text, Shadow Agent on a known wrong draft. Record exact request flags and response shapes.
2. CDP: create a server wallet, fund it with test USDC, send a transfer.
3. x402: stand up one paid endpoint on Base Sepolia, pay it from the CDP wallet, capture the response body.
4. Foundry: deploy a hello contract to Base Sepolia from the operator wallet.

**Exit:** four scripts in `spikes/` run green; PRD open questions 1 and 2 answered in writing.

## Phase 1: Contracts (3h)

`HaloPool.sol`: mandates, approvals, fees, claims, payouts, merchant bonds and slashing, solvency limit, operator role, pause switch, events for every money path.

1. Write contract and Foundry tests for every path (happy, over budget, expired, over cap, over leverage, non operator, slash).
2. Deploy to Base Sepolia, verify on Basescan, seed pool with 1,000 test USDC.

**Exit:** A3, B7, D4, E2, F1 to F4 pass in tests and on the deployed contract.

## Phase 2: Reasoning engine and eval suite (4h)

1. Mandate compiler (A1, A2, A4) with the plain words summary.
2. Checkout check: deterministic rules (B1), lookalike detection (B2), SERV semantic match (B3), Shadow Agent (B4), PromptGuard (B5), three outcomes with reasons (B6).
3. Claim adjuster (D3, D6) and automatic delivery check (D1).
4. Reasoning record store (G3).
5. Eval suite: 40 checkout cases and 30 claim cases with answer keys, run in SERV and raw modes, results table written to `evals/RESULTS.md` (G2).

**Exit:** G2 thresholds met (zero false approvals on the must decline set, at least 90% overall). If SERV mode misses the threshold, tighten prompts and move more logic into rules, then rerun; the published table shows both modes as they are.

## Phase 3: Payments and demo merchants (2h)

1. Halo client wrapping x402: check before pay, capture delivery, pay fee, link payment to approval (C1 to C4).
2. Four demo merchants from PRD section 8, each x402 on Base Sepolia, with `/.well-known/halo.json` for the verified ones (E1, E3).
3. Merchant bond deposits from the merchant wallets.

**Exit:** scripted run of demo steps 2 to 5 completes onchain from the command line, with every transaction on Basescan.

## Phase 4: Front doors (5h)

1. Landing page (H1).
2. Try it page with the hosted demo agent and preset scenarios, rate limited (H2).
3. Dashboard with records and Basescan links (H3).
4. Pool page computed from chain events (H4).
5. MCP server with five tools (H5), tested from Claude Code.
6. SDK package and a 15 line example (H6).

**Exit:** a fresh browser completes the full demo on the deployed URL; MCP flow works from Claude; SDK example runs.

## Phase 5: Hardening and PRD audit (2h)

1. Walk every requirement A1 to H6, mark pass or fail with evidence links in `docs/AUDIT.md`.
2. Fix every fail. Rerun evals.
3. Security pass: secrets, operator policy, rate limits, pause switch.

**Exit:** `AUDIT.md` shows every MVP requirement passing and every line of the PRD section 13 checklist with a working link.

## Phase 6: Submission (2h)

1. README (problem, how it works, demo, eval table, economics, run locally).
2. Demo video following PRD section 11.
3. Long form X post tagging @openservai.
4. Submission form; confirm SERV data collection is on.

**Exit:** all five deliverables in PRD section 14 done.

---

## Timeline

Total: about 20 focused hours.

Edition 01 closes 2026-09-28 00:00 UTC. The full plan does not fit before that. Two options:

1. **Full build for Edition 02** (recommended): every phase, audited, no shortcuts.
2. **Tonight cut** (about 7h, high risk): Phase 0 spikes 1 to 3, Phase 1 contract, Phase 2 without the eval suite, Phase 3 with two merchants (ticket shop, sloppy shop), Phase 4 try it and pool pages only, a short video. Requirements A4, B5, E, G2, H5 and H6 would be missing, so the audit would fail those lines.
