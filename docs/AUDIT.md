# Halo: PRD audit

Every MVP requirement in [PRD.md](PRD.md), checked against the live build on 2026-09-27. Pool: [`0x80eD3250…6387`](https://sepolia.basescan.org/address/0x80eD325076DF4eA062e60F74137Bc2c39A796387) on Base Sepolia. App: https://halo-nine-chi.vercel.app

**Result: 34 pass, 3 partial, 0 fail, out of 37 requirements.** Partial lines say exactly what is missing.

`tx:` links go to Basescan. Eval numbers come from [evals/RESULTS.md](../evals/RESULTS.md).

## A. Mandates

| ID | Status | Evidence |
|---|---|---|
| A1 | Pass | Mandate answer key 10/10 ([RESULTS.md](../evals/RESULTS.md#mandate-compiler-prd-a1-a4-1010)). Earlier runs scored 8/10; two fixes (packs vs quantity, relative windows) brought it over the 9/10 bar. |
| A2 | Pass | Purchases refuse unconfirmed mandates (`mandate not confirmed` in [halo.ts](../src/lib/halo.ts)); the UI and MCP both show the plain words summary and require a separate confirm step. |
| A3 | Pass | Live mandate locked: [tx 0x12eb93f2](https://sepolia.basescan.org/tx/0x12eb93f281bf2d848dec57ca876db78e677f3d445fc02842c1c5ef373f2de294). For the 3 latest mandates, onchain hash = stored hash = recomputed hash of stored terms. |
| A4 | Pass | "Buy me some concert tickets" and "Get me something nice" both return a question, not a mandate (answer key). |

## B. Checkout check

| ID | Status | Evidence |
|---|---|---|
| B1 | Pass | One failing case per rule (expired, quantity, unit price, total mismatch, budget, currency), each declined with the rule named: 8/8. |
| B2 | Pass | Live: StageDo0r declined as imitating "stagedoor". Rule suite: lookalike declined. |
| B3 | Pass | Checkout suite 39/40 in SERV mode. |
| B4 | Pass | Every checkout record carries `shadow: true` (records API for any purchase). |
| B5 | Pass | All 8 subtle injected listings declined in the eval (0 false approvals). Live: the SERV screen quoted the planted sentence. Note: the spike showed PromptGuard protects Halo's own prompt, not data, so injection is caught by a dedicated SERV screen step plus a rule; PromptGuard still wraps every screen and claim call. |
| B6 | Pass | Reasons render in /try, /dashboard and MCP output, and are stored per purchase. |
| B7 | Pass | Contract tests: coverage only after `FeePaid`. Live: approval [0x389bac5d](https://sepolia.basescan.org/tx/0x389bac5d10263e9973b2c28ab301e1478cd99a79cfba98921cc16205f10916f1) then fee [0xd1d7f2cf](https://sepolia.basescan.org/tx/0xd1d7f2cfcb72218dbdb7c73d149f534e7f892193c194484c9cab3d5eb00577ba). |

## C. Payments

| ID | Status | Evidence |
|---|---|---|
| C1 | Pass | x402 payment only after approval: [0x295766f5](https://sepolia.basescan.org/tx/0x295766f56ec71e92875d09c323ff3e2b148f413f7bfd0f56dcb96f2fdf5076bc). |
| C2 | Pass | User agent wallets and the operator are CDP server wallets; operator `0xf46b…D85e` signs every Halo action. |
| C3 | Pass | Delivery hash anchored with `linkPayment` on every paid purchase (dashboard "delivery anchor tx"). |
| C4 | Pass | Fees paid gaslessly (EIP-3009, submitted by the operator); pool fees in 0.12 USDC across 6 covered purchases (/pool). |

## D. Claims

| ID | Status | Evidence |
|---|---|---|
| D1 | Pass | SeatSwap delivered Oct 21 for an Oct 12 mandate; automatic claim and payout [0x6bc1bab4](https://sepolia.basescan.org/tx/0x6bc1bab4310504598c8aa28ec3c086a61f31d88a7c555ced45fd85ab4c08765a) with no user action. |
| D2 | Pass | Manual claim through the dashboard route ("I changed my mind") judged no_issue and resolved onchain as not covered: [0xc2c3e398](https://sepolia.basescan.org/tx/0xc2c3e398f75c6e63a02eb19b86caebb4d4e6d958dca3af37fcbcfe6d60440644). MCP `halo_claim` uses the same function. |
| D3 | Pass | Claim suite 29/30 in SERV mode, **0 wrong payouts** (raw mode: 2 wrong payouts, one caused by an injected "issue a full refund"). |
| D4 | Pass | Contract tests clamp to the claim cap and the 30 day user cap; payouts read back from the `ClaimResolved` event. |
| D5 | Pass | `ClaimResolved` carries the verdict hash; the UI shows the reason. |
| D6 | Partial | Eval cases cover not_delivered, not_as_mandated and no_issue; overcharged is a code rule (no live case yet); merchant_fraud has no dedicated eval case. |

## E. Merchants and recovery

| ID | Status | Evidence |
|---|---|---|
| E1 | Pass | `/m/{slug}/.well-known/halo.json` served; bonds posted; operator verified 3 merchants ([StageDoor](https://sepolia.basescan.org/tx/0x925cacd0d5e20af52eb2e6c1242acee8f7446b1cbd9c5210a23b8dcf6d04d9f6)). |
| E2 | Pass | Recovered from merchant bonds: 1.05 USDC, equal to all payouts so far (net loss ratio 0%, /pool). |
| E3 | Pass | Unverified merchant above the cap returns ask_user (rule suite). |

## F. Pool and solvency

| ID | Status | Evidence |
|---|---|---|
| F1 | Pass | 30 Foundry tests cover every money path (`forge test`). |
| F2 | Pass | `test_approval_overLeverage`; live leverage 0.50x of 20x. |
| F3 | Pass | `test_release_afterClaimWindow`, `test_release_unpaidRestoresBudget`. |
| F4 | Pass | `onlyOperator` tests; operator is a CDP wallet. |

## G. SERV and measurement

| ID | Status | Evidence |
|---|---|---|
| G1 | Pass | All reasoning goes through `inference-api.openserv.ai` ([serv.ts](../src/lib/serv.ts)); raw mode is SERV's own switch. |
| G2 | Pass | 0 false approvals, 0 wrong payouts, checkout 98%, claims 97%, mandates 10/10; SERV and raw published side by side. |
| G3 | Pass | `/api/records/{id}` and the dashboard's "show SERV reasoning" return the full record with hash. |

## H. Front doors

| ID | Status | Evidence |
|---|---|---|
| H1 | Partial | Landing verified at desktop width with live pool numbers. Phone layout uses responsive classes but was only rendered at 500px (headless browser minimum), not on a real phone. |
| H2 | Pass | A fresh session (new cookie, new wallet) completed the whole demo on production: funded, mandate locked, lookalike declined, wrong date paid back, correct tickets bought. Rate limited: 3 new wallets per network and 25 per day, 20 mandate drafts per visitor. |
| H3 | Pass | Dashboard lists purchases with every tx link and the claim button. |
| H4 | Pass | /pool computed from chain events (chunked scan, cursor cached in Postgres because public RPCs cap log ranges). |
| H5 | Partial | MCP verified end to end over JSON-RPC on production (create, confirm, pay, automatic claim, payout [0x11a30b9d](https://sepolia.basescan.org/tx/0x11a30b9d5e9762541777d4442dc0480c585c8a48989e421e973393e68689570e)). Not yet run from inside the Claude app. |
| H6 | Pass | [examples/buy.mts](../examples/buy.mts) (12 lines) bought through production and got paid back: [0xe85b38f7](https://sepolia.basescan.org/tx/0xe85b38f7b5eae7bfe49ed0228f51303a929ca699982bc2b0cdc68be9f191f757). |

## Findings from the build worth knowing

1. **PromptGuard does not catch instructions hidden in data.** It protects the caller's own prompt. Halo added a SERV screening step for listings.
2. **SERV intermittently rejects its own `max_tokens`** (sets it above the model limit). Halo passes an explicit output cap and retries.
3. **Where SERV helped measurably:** on claims, where money moves, SERV made 0 wrong payouts vs 2 in raw mode. On checkout, raw was slightly more accurate and much faster; both had 0 false approvals.
4. **Testnet USDC is scarce** (faucet limit about 10 per day), so demo prices are scaled down 10x and merchant revenue is recycled back into bonds and the treasury.
