import { createPublicClient, decodeEventLog, encodeFunctionData, http, keccak256, parseSignature, toHex, type Hex, type Log } from "viem";
import { baseSepolia } from "viem/chains";
import { haloAbi } from "./haloAbi";
import { USDC } from "./x402server";
import { operatorAccount, sendFrom, userAccount } from "./wallets";

// Every money movement in Halo goes through HaloPool on Base Sepolia.

export const publicClient = createPublicClient({ chain: baseSepolia, transport: http(process.env.BASE_SEPOLIA_RPC) });
export const poolAddress = () => {
  const a = process.env.HALO_POOL_ADDRESS;
  if (!a) throw new Error("HALO_POOL_ADDRESS is not set");
  return a as `0x${string}`;
};
export const explorer = (tx: string) => `https://sepolia.basescan.org/tx/${tx}`;
export const toUnits = (usdc: number) => BigInt(Math.round(usdc * 10 ** USDC.decimals));
export const fromUnits = (u: bigint) => Number(u) / 10 ** USDC.decimals;
export const idOf = (s: string) => keccak256(toHex(s));

async function operatorCall(functionName: string, args: readonly unknown[]): Promise<Hex> {
  const op = await operatorAccount();
  // @ts-expect-error generic function name over the generated ABI
  const data = encodeFunctionData({ abi: haloAbi, functionName, args });
  // RPC nodes behind a load balancer can lag a block behind the previous transaction; retry stale gas estimates.
  for (let attempt = 0; ; attempt++) {
    try {
      const hash = await sendFrom(op, poolAddress(), data);
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== "success") throw new Error(`${functionName} reverted: ${hash}`);
      return hash;
    } catch (e) {
      if (attempt >= 4 || !/estimate gas|nonce/i.test(String(e))) throw e;
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
    }
  }
}

let paramsCache: { feeBps: number; minFee: bigint } | null = null;
/** Fee for an approval, from the contract's fixed parameters (never from a possibly stale approval read). */
export async function feeFor(amount: bigint): Promise<bigint> {
  if (!paramsCache) {
    const p = (await publicClient.readContract({ address: poolAddress(), abi: haloAbi, functionName: "params" })) as readonly unknown[];
    paramsCache = { feeBps: Number(p[0]), minFee: BigInt(p[1] as bigint) };
  }
  const fee = (amount * BigInt(paramsCache.feeBps)) / 10_000n;
  return fee < paramsCache.minFee ? paramsCache.minFee : fee;
}

/** The user's agent wallet signs the mandate (EIP-712) so the operator can lock it onchain without the user paying gas. */
export async function signMandate(userId: string, id: Hex, termsHash: Hex, maxTotal: bigint, expiry: bigint) {
  const user = await userAccount(userId);
  const signature = await user.signTypedData({
    domain: { name: "HaloPool", version: "1", chainId: baseSepolia.id, verifyingContract: poolAddress() },
    types: {
      Mandate: [
        { name: "id", type: "bytes32" },
        { name: "termsHash", type: "bytes32" },
        { name: "maxTotal", type: "uint128" },
        { name: "expiry", type: "uint64" },
      ],
    },
    primaryType: "Mandate",
    message: { id, termsHash, maxTotal, expiry },
  });
  return { user: user.address as `0x${string}`, signature: signature as Hex };
}

export const registerMandate = (id: Hex, user: Hex, termsHash: Hex, maxTotal: bigint, expiry: bigint, sig: Hex) =>
  operatorCall("registerMandate", [id, user, termsHash, maxTotal, expiry, sig]);

export const recordApproval = (approvalId: Hex, mandateId: Hex, merchant: Hex, amount: bigint) =>
  operatorCall("recordApproval", [approvalId, mandateId, merchant, amount]);

export const linkPayment = (approvalId: Hex, paymentRef: Hex, deliveryHash: Hex) =>
  operatorCall("linkPayment", [approvalId, paymentRef, deliveryHash]);

export const fileClaim = (approvalId: Hex, evidenceHash: Hex) => operatorCall("fileClaim", [approvalId, evidenceHash]);

export const resolveClaim = (approvalId: Hex, payout: bigint, verdictHash: Hex, merchantFault: boolean) =>
  operatorCall("resolveClaim", [approvalId, payout, verdictHash, merchantFault]);

export const setVerified = (merchant: Hex, verified: boolean) => operatorCall("setVerified", [merchant, verified]);

/** The user signs an EIP-3009 authorization for the fee; the operator submits it, so the user needs no ETH (PRD C4). */
export async function payFee(userId: string, approvalId: Hex, fee: bigint): Promise<Hex> {
  const user = await userAccount(userId);
  const nonce = keccak256(toHex(`fee:${approvalId}`));
  const validBefore = BigInt(Math.floor(Date.now() / 1000) + 3600);
  const sig = await user.signTypedData({
    domain: {
      name: USDC.eip712.name,
      version: USDC.eip712.version,
      chainId: baseSepolia.id,
      verifyingContract: USDC.address as `0x${string}`,
    },
    types: {
      ReceiveWithAuthorization: [
        { name: "from", type: "address" },
        { name: "to", type: "address" },
        { name: "value", type: "uint256" },
        { name: "validAfter", type: "uint256" },
        { name: "validBefore", type: "uint256" },
        { name: "nonce", type: "bytes32" },
      ],
    },
    primaryType: "ReceiveWithAuthorization",
    message: { from: user.address, to: poolAddress(), value: fee, validAfter: 0n, validBefore, nonce },
  });
  const { v, r, s } = parseSignature(sig as Hex);
  return operatorCall("payFeeWithAuthorization", [approvalId, 0n, validBefore, nonce, Number(v), r, s]);
}

export async function readApproval(approvalId: Hex) {
  const [mandateId, merchant, amount, fee, deadline, status] = (await publicClient.readContract({
    address: poolAddress(),
    abi: haloAbi,
    functionName: "approvals",
    args: [approvalId],
  })) as [Hex, Hex, bigint, bigint, bigint, number];
  return { mandateId, merchant, amount, fee, deadline, status };
}

export async function poolStats() {
  const read = (functionName: "poolBalance" | "openCoverage" | "totalBonds" | "capacity") =>
    publicClient.readContract({ address: poolAddress(), abi: haloAbi, functionName }) as Promise<bigint>;
  const [balance, open, bonds, capacity] = await Promise.all([
    read("poolBalance"),
    read("openCoverage"),
    read("totalBonds"),
    read("capacity"),
  ]);
  return { balance: fromUnits(balance), openCoverage: fromUnits(open), bonds: fromUnits(bonds), capacity: fromUnits(capacity) };
}

/** Payout actually sent to the user, read from the ClaimResolved event. */
export function claimPayoutFrom(logs: Log[]): number {
  for (const log of logs) {
    try {
      const ev = decodeEventLog({ abi: haloAbi, data: log.data, topics: log.topics });
      if (ev.eventName === "ClaimResolved") return fromUnits((ev.args as { payout: bigint }).payout);
    } catch {
      // not a HaloPool event
    }
  }
  return 0;
}

/** PRD H4: every pool number is computed from onchain events. Postgres only caches the running totals and a block cursor,
 * because public RPCs cap eth_getLogs at 1,000 blocks per call. */
export async function poolLedger() {
  const { migrate, sql } = await import("./db");
  await migrate();
  await sql()`create table if not exists ledger (pool text primary key, cursor bigint not null, totals jsonb not null)`;
  const pool = poolAddress().toLowerCase();
  const empty = { volume: "0", fees: "0", claimsPaid: "0", recovered: "0", funded: "0", approvals: 0, covered: 0, claims: 0, events: 0, amounts: {} as Record<string, string> };
  const [row] = (await sql()`select cursor, totals from ledger where pool = ${pool}`) as { cursor: string; totals: typeof empty }[];
  let cursor = row ? BigInt(row.cursor) : BigInt(process.env.HALO_POOL_BLOCK || "0") - 1n;
  const t = row ? row.totals : empty;
  const latest = await publicClient.getBlockNumber();
  const add = (k: "volume" | "fees" | "claimsPaid" | "recovered" | "funded", v: bigint) => (t[k] = (BigInt(t[k]) + v).toString());

  // Scan at most 20 chunks per request so a page load stays fast; the rest is picked up on the next load.
  for (let i = 0; i < 20 && cursor < latest; i++) {
    const from = cursor + 1n;
    const to = from + 999n < latest ? from + 999n : latest;
    const events = await publicClient.getContractEvents({ address: poolAddress(), abi: haloAbi, fromBlock: from, toBlock: to });
    for (const e of events as unknown as { eventName: string; args: Record<string, unknown> }[]) {
      const a = e.args;
      t.events++;
      if (e.eventName === "ApprovalRecorded") {
        t.approvals++;
        t.amounts[a.approvalId as string] = String(a.amount);
      } else if (e.eventName === "FeePaid") {
        t.covered++;
        add("fees", a.fee as bigint);
        add("volume", BigInt(t.amounts[a.approvalId as string] ?? "0"));
      } else if (e.eventName === "ClaimResolved") {
        t.claims++;
        add("claimsPaid", a.payout as bigint);
      } else if (e.eventName === "BondSlashed") add("recovered", a.amount as bigint);
      else if (e.eventName === "PoolFunded") add("funded", a.amount as bigint);
    }
    cursor = to;
  }
  await sql()`insert into ledger (pool, cursor, totals) values (${pool}, ${cursor.toString()}, ${JSON.stringify(t)})
    on conflict (pool) do update set cursor = excluded.cursor, totals = excluded.totals`;

  const f = (v: string) => fromUnits(BigInt(v));
  const fees = f(t.fees);
  return {
    approvals: t.approvals,
    covered: t.covered,
    claims: t.claims,
    volume: f(t.volume),
    fees,
    claimsPaid: f(t.claimsPaid),
    recovered: f(t.recovered),
    funded: f(t.funded),
    lossRatio: fees > 0 ? (f(t.claimsPaid) - f(t.recovered)) / fees : 0,
    events: t.events,
    syncedTo: Number(cursor),
    behind: Number(latest - cursor),
  };
}

/** True once a merchant has asked to withdraw its bond. */
export async function isUnbonding(merchant: Hex): Promise<boolean> {
  const [, unlockAt] = (await publicClient.readContract({ address: poolAddress(), abi: haloAbi, functionName: "merchants", args: [merchant] })) as [bigint, bigint, boolean];
  return unlockAt > 0n;
}
