import { randomBytes } from "node:crypto";
import { createWalletClient, encodeFunctionData, erc20Abi, http, type Hex } from "viem";
import { baseSepolia } from "viem/chains";
import { createPaymentHeader } from "x402/client";
import type { PaymentRequirements } from "x402/types";
import * as chain from "./chain";
import { adjudicate } from "./claim";
import { checkout } from "./check";
import { migrate, saveRecords, sql } from "./db";
import { canonical, compileMandate } from "./mandate";
import { MERCHANTS, merchantBySlug, verifiedNames, type Listing, type MerchantDef } from "./merchants";
import { recycle } from "./recycle";
import { sha256 } from "./serv";
import type { MandateTerms, Offer, Reason, Verdict } from "./types";
import { asViemAccount, serverAccount, userAccount } from "./wallets";
import { USDC } from "./x402server";

// The Halo lifecycle: mandate, check, pay, deliver, claim (PRD section 5).

export type Step =
  | { kind: "info"; text: string }
  | { kind: "tx"; label: string; tx: string }
  | { kind: "offer"; merchant: string; title: string; total: number }
  | { kind: "decision"; merchant: string; decision: string; reasons: Reason[] }
  | { kind: "delivered"; merchant: string; delivery: unknown }
  | { kind: "verdict"; merchant: string; verdict: Omit<Verdict, "records"> }
  | { kind: "payout"; amount: number; tx: string };

export type OnStep = (s: Step) => void | Promise<void>;

const UNVERIFIED_CAP = 0.2; // USDC, PRD E3
const TREASURY = "halo-treasury";
const STARTER_USDC = 1.2;

// ---------- users ----------

const WALLETS_PER_IP_PER_DAY = 3;
const WALLETS_PER_DAY = 25;

export async function ensureUser(userId: string, onStep?: OnStep, ip = "unknown") {
  await migrate();
  const rows = (await sql()`select id from users where id = ${userId}`) as unknown[];
  if (!rows.length) {
    // Rate limits so visitors cannot drain the demo treasury (PRD section 12).
    const [perIp] = (await sql()`select count(*)::int as n from users where ip = ${ip} and created_at > now() - interval '1 day'`) as { n: number }[];
    const [all] = (await sql()`select count(*)::int as n from users where created_at > now() - interval '1 day'`) as { n: number }[];
    if (perIp.n >= WALLETS_PER_IP_PER_DAY) throw new Error("Demo limit reached for your network today. Try again tomorrow, or use the MCP server with an existing wallet.");
    if (all.n >= WALLETS_PER_DAY) throw new Error("The demo has handed out today's test USDC. Try again tomorrow.");
  }
  const acct = await userAccount(userId);
  if (!rows.length) {
    const treasury = await serverAccount(TREASURY);
    const have = (await chain.publicClient.readContract({ address: USDC.address as Hex, abi: erc20Abi, functionName: "balanceOf", args: [treasury.address as Hex] })) as bigint;
    if (have < chain.toUnits(STARTER_USDC)) {
      const r = await recycle(treasury.address as Hex);
      await onStep?.({ kind: "info", text: `Recycled ${r.swept.toFixed(2)} test USDC from demo merchants back into the treasury.` });
    }
    const data = encodeFunctionData({ abi: erc20Abi, functionName: "transfer", args: [acct.address, chain.toUnits(STARTER_USDC)] });
    const { transactionHash } = await (await import("./wallets")).cdpClient().evm.sendTransaction({
      address: treasury.address,
      network: "base-sepolia",
      transaction: { to: USDC.address as Hex, data, value: 0n },
    });
    await chain.publicClient.waitForTransactionReceipt({ hash: transactionHash as Hex });
    await onStep?.({ kind: "tx", label: `Funded your agent wallet with ${STARTER_USDC} test USDC`, tx: transactionHash });
    // Only remember the user once the starter funds actually landed.
    await sql()`insert into users (id, wallet, ip) values (${userId}, ${acct.address}, ${ip}) on conflict do nothing`;
  }
  return { userId, wallet: acct.address as Hex };
}

// ---------- mandates ----------

export async function draftMandate(userId: string, instruction: string) {
  // Each draft is a SERV call; cap them so the demo cannot burn through reasoning credit.
  await migrate();
  const [mine] = (await sql()`select count(*)::int as n from mandates where user_id = ${userId} and created_at > now() - interval '1 day'`) as { n: number }[];
  const [all] = (await sql()`select count(*)::int as n from mandates where created_at > now() - interval '1 day'`) as { n: number }[];
  if (mine.n >= 20 || all.n >= 200) return { status: "error" as const, error: "Daily demo limit reached. Try again tomorrow.", record: null };
  const res = await compileMandate(instruction);
  if (res.status !== "ok") return res;
  const id = ("0x" + randomBytes(32).toString("hex")) as Hex;
  const expiresAt = new Date(Date.now() + res.terms.validHours * 3600_000);
  await migrate();
  await sql()`insert into mandates (id, user_id, instruction, terms, terms_hash, max_total, expires_at)
    values (${id}, ${userId}, ${instruction}, ${JSON.stringify(res.terms)}, ${res.termsHash}, ${res.terms.maxTotal}, ${expiresAt.toISOString()})`;
  await saveRecords(id, [res.record]);
  return { status: "ok" as const, id, terms: res.terms, termsHash: res.termsHash, expiresAt };
}

export async function confirmMandate(userId: string, id: Hex, onStep?: OnStep) {
  const m = await getMandate(id);
  if (!m || m.user_id !== userId) throw new Error("unknown mandate");
  if (m.tx) return m.tx;
  const maxTotal = chain.toUnits(Number(m.max_total));
  const expiry = BigInt(Math.floor(new Date(m.expires_at).getTime() / 1000));
  const { user, signature } = await chain.signMandate(userId, id, m.terms_hash as Hex, maxTotal, expiry);
  const tx = await chain.registerMandate(id, user, m.terms_hash as Hex, maxTotal, expiry, signature);
  await sql()`update mandates set tx = ${tx} where id = ${id}`;
  await onStep?.({ kind: "tx", label: "Mandate locked onchain", tx });
  return tx;
}

interface MandateRow {
  id: string;
  user_id: string;
  instruction: string;
  terms: MandateTerms;
  terms_hash: string;
  max_total: string;
  expires_at: string;
  tx: string | null;
}

export async function getMandate(id: string): Promise<MandateRow | null> {
  await migrate();
  const rows = (await sql()`select * from mandates where id = ${id}`) as MandateRow[];
  return rows[0] ?? null;
}

async function spentOn(mandateId: string): Promise<number> {
  // Mirrors the contract: approved money counts against the budget until it is paid back.
  const rows = (await sql()`select coalesce(sum(p.amount - coalesce(c.payout, 0)), 0) as s from purchases p
    left join claims c on c.id = p.id
    where p.mandate_id = ${mandateId} and p.status in ('approved','covered','delivered','ok','refunded')`) as { s: string }[];
  return Number(rows[0].s);
}

// ---------- the hosted agent ----------

/** The demo shopping agent: finds listings that fit the mandate, tries the cheapest first, and lets Halo decide. */
export async function runAgent(userId: string, mandateId: Hex, origin: string, onStep: OnStep) {
  const m = await getMandate(mandateId);
  if (!m?.tx) throw new Error("mandate not confirmed");
  const words = m.terms.item.toLowerCase().split(/\W+/).filter((w) => w.length > 3);
  const candidates: { merchant: MerchantDef; listing: Listing }[] = [];
  for (const merchant of MERCHANTS)
    for (const listing of merchant.listings) {
      const text = `${listing.title} ${Object.values(listing.attributes).join(" ")}`.toLowerCase();
      if (words.some((w) => text.includes(w))) candidates.push({ merchant, listing });
    }
  candidates.sort((a, b) => a.listing.unitPrice - b.listing.unitPrice);
  await onStep({ kind: "info", text: `Agent found ${candidates.length} listings, trying the cheapest first.` });

  let refunded = 0;
  for (const c of candidates) {
    const url = `${origin}/m/${c.merchant.slug}/buy?listing=${c.listing.id}&qty=${m.terms.quantity}`;
    const result = await purchase(userId, mandateId, url, onStep);
    if (result.status === "ok") {
      await onStep({ kind: "info", text: "Done: the agent bought what you asked for." });
      return result;
    }
    if (result.status === "claimed") refunded++;
  }
  await onStep({
    kind: "info",
    text: refunded
      ? "No other seller left to try. The purchase that went wrong was paid back to you."
      : "No seller passed Halo's check, so nothing was bought.",
  });
  return { status: "none" as const };
}

// ---------- one purchase ----------

export async function purchase(userId: string, mandateId: Hex, url: string, onStep: OnStep) {
  const m = await getMandate(mandateId);
  if (!m?.tx) throw new Error("mandate not confirmed");
  const u = new URL(url);
  const slug = u.pathname.split("/")[2];

  // 1. Ask the merchant, get the x402 payment requirements.
  const first = await fetch(url);
  if (first.status !== 402) return { status: "error" as const, error: `merchant answered ${first.status}` };
  const { accepts } = (await first.json()) as { accepts: PaymentRequirements[] };
  const req = accepts.find((a) => a.network === "base-sepolia" && a.scheme === "exact");
  if (!req) return { status: "error" as const, error: "no Base Sepolia payment option" };

  // 2. Build the offer from the merchant's catalog and its published identity.
  const offer = await buildOffer(u, slug, req, m.terms.quantity);
  await onStep({ kind: "offer", merchant: offer.merchant.name, title: offer.item.title, total: offer.total });
  const registry = merchantBySlug(slug);
  const identity = await fetch(`${u.origin}/m/${slug}/.well-known/halo.json`).then((r) => (r.ok ? r.json() : null));
  const merchantVerified = Boolean(registry?.verified && identity?.payTo?.toLowerCase() === req.payTo.toLowerCase());

  // 3. Halo's checkout check.
  const check = await checkout(offer, {
    terms: m.terms,
    spent: await spentOn(mandateId),
    expiresAt: new Date(m.expires_at),
    merchantVerified,
    verifiedNames: verifiedNames(),
    unverifiedCap: UNVERIFIED_CAP,
  });
  const approvalId = ("0x" + randomBytes(32).toString("hex")) as Hex;
  await saveRecords(approvalId, check.records);
  await onStep({ kind: "decision", merchant: offer.merchant.name, decision: check.decision, reasons: check.reasons });
  await sql()`insert into purchases (id, mandate_id, user_id, merchant_slug, offer, decision, reasons, amount, status)
    values (${approvalId}, ${mandateId}, ${userId}, ${slug}, ${JSON.stringify(offer)}, ${check.decision},
    ${JSON.stringify(check.reasons)}, ${offer.total}, ${check.decision === "approve" ? "approved" : check.decision})`;
  if (check.decision !== "approve") return { status: check.decision, approvalId };

  // 4. Record the approval and activate coverage by paying the fee (B7, C4).
  const amount = BigInt(req.maxAmountRequired);
  const approvalTx = await chain.recordApproval(approvalId, mandateId, req.payTo as Hex, amount);
  await onStep({ kind: "tx", label: "Approval recorded", tx: approvalTx });
  const fee = await chain.feeFor(amount);
  const feeTx = await chain.payFee(userId, approvalId, fee);
  await onStep({ kind: "tx", label: `Halo fee ${chain.fromUnits(fee).toFixed(2)} USDC paid, purchase covered`, tx: feeTx });
  await sql()`update purchases set status = 'covered', fee = ${chain.fromUnits(fee)}, approval_tx = ${approvalTx}, fee_tx = ${feeTx}
    where id = ${approvalId}`;

  // 5. Pay the merchant over x402 (C1).
  // x402 signs through a viem wallet client; the account inside is the user's CDP wallet.
  const payer = createWalletClient({ account: asViemAccount(await userAccount(userId)), chain: baseSepolia, transport: http() });
  const header = await createPaymentHeader(payer as never, 1, req);
  const paid = await fetch(url, { headers: { "X-PAYMENT": header } });
  if (!paid.ok) return { status: "error" as const, error: `payment failed: ${paid.status} ${await paid.text()}` };
  const body = (await paid.json()) as { delivery: unknown };
  const settlement = JSON.parse(Buffer.from(paid.headers.get("x-payment-response") || "", "base64").toString() || "{}");
  const paymentTx = settlement.transaction as Hex;
  await onStep({ kind: "tx", label: `Paid ${offer.merchant.name} ${offer.total.toFixed(2)} USDC over x402`, tx: paymentTx });

  // 6. Capture and anchor the delivery (C3).
  const deliveryText = canonical(body.delivery);
  const deliveryHash = sha256(deliveryText) as Hex;
  await onStep({ kind: "delivered", merchant: offer.merchant.name, delivery: body.delivery });
  const linkTx = await chain.linkPayment(approvalId, paymentTx, deliveryHash);
  await sql()`update purchases set status = 'delivered', payment_tx = ${paymentTx}, delivery = ${deliveryText},
    delivery_hash = ${deliveryHash}, link_tx = ${linkTx} where id = ${approvalId}`;

  // 7. Automatic delivery check (D1): a mismatch becomes a claim with no user action.
  const verdict = await adjudicate({ terms: m.terms, offer, amountPaid: offer.total, delivery: deliveryText });
  await saveRecords(approvalId, verdict.records);
  const { records: _r, ...shown } = verdict;
  await onStep({ kind: "verdict", merchant: offer.merchant.name, verdict: shown });
  if (!verdict.covered) {
    await sql()`update purchases set status = 'ok' where id = ${approvalId}`;
    return { status: "ok" as const, approvalId };
  }
  await settleClaim(userId, approvalId, "halo", "automatic delivery check", verdict, onStep);
  return { status: "claimed" as const, approvalId };
}

async function buildOffer(u: URL, slug: string, req: PaymentRequirements, quantity: number): Promise<Offer> {
  const listingId = u.searchParams.get("listing");
  const catalog = await fetch(`${u.origin}/m/${slug}/catalog`).then((r) => r.json());
  const listing = (catalog.listings as (Listing & { currency: string })[]).find((l) => l.id === listingId);
  if (!listing) throw new Error("listing not in catalog");
  const total = Number(req.maxAmountRequired) / 10 ** USDC.decimals;
  return {
    merchant: { slug, name: catalog.merchant.name, origin: `${u.origin}/m/${slug}`, payTo: req.payTo as Hex },
    item: { title: listing.title, description: listing.description, attributes: listing.attributes },
    quantity: Number(u.searchParams.get("qty") || quantity),
    unitPrice: listing.unitPrice,
    total,
    currency: "USDC",
    network: req.network,
    resource: req.resource,
  };
}

// ---------- claims ----------

export async function manualClaim(userId: string, approvalId: Hex, evidence: string, onStep: OnStep) {
  await migrate();
  const rows = (await sql()`select p.*, m.terms from purchases p join mandates m on m.id = p.mandate_id
    where p.id = ${approvalId} and p.user_id = ${userId}`) as {
    offer: Offer;
    terms: MandateTerms;
    amount: string;
    delivery: unknown;
    status: string;
  }[];
  const p = rows[0];
  if (!p) throw new Error("unknown purchase");
  if (!["ok", "delivered"].includes(p.status)) throw new Error(`purchase is ${p.status}, not claimable`);
  const verdict = await adjudicate({
    terms: p.terms,
    offer: p.offer,
    amountPaid: Number(p.amount),
    // Stored as jsonb, so it comes back parsed; the adjuster reads the canonical text.
    delivery: p.delivery == null ? "" : typeof p.delivery === "string" ? p.delivery : canonical(p.delivery),
    evidence,
  });
  await saveRecords(approvalId, verdict.records);
  const { records: _r, ...shown } = verdict;
  await onStep({ kind: "verdict", merchant: p.offer.merchant.name, verdict: shown });
  return settleClaim(userId, approvalId, "user", evidence, verdict, onStep);
}

async function settleClaim(userId: string, approvalId: Hex, filedBy: string, evidence: string, verdict: Verdict, onStep: OnStep) {
  const fileTx = await chain.fileClaim(approvalId, sha256(evidence) as Hex);
  await onStep({ kind: "tx", label: "Claim filed", tx: fileTx });
  const verdictHash = sha256(canonical({ ...verdict, records: verdict.records.map((r) => r.hash) })) as Hex;
  const resolveTx = await chain.resolveClaim(approvalId, chain.toUnits(verdict.payout), verdictHash, verdict.merchantFault);
  const receipt = await chain.publicClient.getTransactionReceipt({ hash: resolveTx });
  // The contract clamps payouts to its caps, so read what was actually paid.
  const paidOut = chain.claimPayoutFrom(receipt.logs);
  await sql()`insert into claims (id, user_id, filed_by, evidence, verdict, payout, merchant_fault, status, file_tx, resolve_tx)
    values (${approvalId}, ${userId}, ${filedBy}, ${evidence}, ${JSON.stringify({ ...verdict, records: undefined })},
    ${paidOut}, ${verdict.merchantFault}, ${paidOut > 0 ? "paid" : "rejected"}, ${fileTx}, ${resolveTx})
    on conflict (id) do nothing`;
  await sql()`update purchases set status = ${paidOut > 0 ? "refunded" : "ok"} where id = ${approvalId}`;
  if (paidOut > 0) await onStep({ kind: "payout", amount: paidOut, tx: resolveTx });
  else await onStep({ kind: "tx", label: "Claim resolved, not covered", tx: resolveTx });
  return { status: receipt.status, payout: paidOut, resolveTx };
}
