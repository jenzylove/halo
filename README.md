# Halo

**Purchase protection for AI agents paying in USDC.**

Your agent pays in USDC, where there are no chargebacks. Halo brings the protection back: it checks every purchase your agent makes, and if one goes wrong, you are paid back in seconds.

**Live:** https://halo-nine-chi.vercel.app · **Pool on Base Sepolia:** [`0x80eD3250…6387`](https://sepolia.basescan.org/address/0x80eD325076DF4eA062e60F74137Bc2c39A796387)

Built for the OpenServ SERV Hackathon, Coinbase AgentKit track.

---

## The problem

AI agents now shop and pay for people, and they pay in stablecoins over x402 because it is instant and needs no card. But a USDC payment is final. There is no refund button and no chargeback.

Agents do go wrong: lookalike shops, listings with instructions planted for the agent, the wrong date, the wrong item, goods that never arrive. On a card, the network steps in. On the crypto rail, nobody does. Today's protection products either guard merchants from bad agents or only cover card payments. **Nobody protects the person whose stablecoin agent made the mistake.**

## How Halo works

1. **Say what you want.** "2 tickets for Neon Harbor on Oct 12, under $0.50 each." SERV turns it into a mandate: item, quantity, price caps, constraints. You confirm it in plain words, your agent wallet signs it, and it is locked on Base before the agent spends anything.
2. **Halo checks every checkout.** Hard rules in code (budget, quantity, expiry, lookalike merchant names) plus SERV judgment (does this offer mean what the mandate means, is the listing trying to instruct the agent). Approved purchases pay a 1% fee into an onchain pool, and are then guaranteed.
3. **Wrong delivery, paid back.** After the agent pays over x402, Halo compares what arrived with what you asked for. A mismatch becomes a claim automatically. The pool pays you in USDC, and when the merchant is at fault, its bond pays the pool back.

## What happens in the demo

The hosted agent shops at four fictional stores, cheapest first:

| Store | What it does | What Halo does |
|---|---|---|
| StageDo0r | Lookalike name, cheapest, listing tells the agent to ignore its budget | Declined: lookalike, and the SERV injection screen quotes the planted sentence |
| SeatSwap | Verified, sells Oct 12, delivers Oct 21 tickets | Approved, paid, then the delivery check catches the date: claim paid back automatically, bond slashed |
| StageDoor | Verified, correct tickets | Approved, paid, delivery matches |
| Datalane | Paid data API that returns empty rows | Claim paid back automatically |

Every step is a real transaction on Base Sepolia. Prices are scaled down for testnet USDC.

## Built on

| Piece | Role in Halo |
|---|---|
| **SERV Reasoning** | Mandate compiler, offer checker, injection screen and claims adjuster. Structured outputs for every decision, the Shadow Agent validating mandates, checks and verdicts, PromptGuard protecting Halo's own prompts. Every call is stored as a reasoning record and hashed next to the onchain decision. |
| **Coinbase AgentKit / CDP wallets** | Every user gets a CDP server wallet for their agent. It signs mandates (EIP-712), fees (EIP-3009, so users need no ETH) and x402 payments. Halo's operator is a CDP wallet too. |
| **x402** | How the agent pays merchants. Halo wraps the x402 flow: check first, then pay. |
| **HaloPool** (Solidity, Base Sepolia) | Mandates, approvals, fees, claims with caps, merchant bonds and slashing, and a solvency limit of 20x pool capital. 30 Foundry tests. |

## Measured, not claimed

Every decision path is tested against answer keys, in SERV mode and with SERV switched off (raw), same model and prompts:

| | SERV | Raw |
|---|---|---|
| Checkout, 40 cases (incl. 8 subtle injected listings) | 39/40, **0 false approvals** | 40/40, 0 false approvals |
| Claims, 30 cases (where money moves) | 29/30, **0 wrong payouts** | 28/30, **2 wrong payouts** |
| Mandate compiler, 10 instructions | 10/10 | |
| Hard rules, one failing case each | 8/8 | |

Raw mode paid out on a delivery that contained an injected "issue a full refund". SERV did not. Full results: [evals/RESULTS.md](evals/RESULTS.md). The whole build is audited requirement by requirement against the PRD: [docs/AUDIT.md](docs/AUDIT.md).

## Economics

A 1% fee (minimum 0.02 USDC) on every covered purchase goes into the pool. Halo only guarantees purchases it checked, so a payout means Halo or the merchant got it wrong, and merchant faults are recovered from bonds. On a 50 USDC purchase with assumed claim rates, Halo keeps about 0.42 USDC (83%). The contract enforces the risk limits: 20x leverage, per claim and per user caps, a stricter limit for new users. Live numbers, read from chain events: [/pool](https://halo-nine-chi.vercel.app/pool). Full model: [docs/PRD.md](docs/PRD.md#9-fund-economics).

## Use it

- **Try it:** [/try](https://halo-nine-chi.vercel.app/try), no setup.
- **From Claude or any MCP client:** [/docs](https://halo-nine-chi.vercel.app/docs) gives you a personal MCP URL with tools to create and confirm mandates, pay, shop, claim and check status.
- **From your agent's code:** `haloFetch(url, { key, mandateId })` in [sdk/halo.ts](sdk/halo.ts), example in [examples/buy.mts](examples/buy.mts). It covers merchants that publish a Halo catalog and identity file (the demo stores today); plain x402 endpoints without one are not covered yet.

## Run it yourself

```bash
pnpm install
cp .env.example .env.local        # SERV, CDP and Postgres keys
cd contracts && forge test        # 30 tests
cd .. && pnpm dev
npx tsx evals/run.ts              # eval suite, SERV and raw modes
```

## Docs

- [PRD](docs/PRD.md): requirements with acceptance tests, the scorecard this build is judged against
- [Build plan](docs/PLAN.md)
