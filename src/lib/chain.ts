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
  const hash = await sendFrom(op, poolAddress(), data);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error(`${functionName} reverted: ${hash}`);
  return hash;
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

/** PRD H4: every pool number is computed from onchain events, nothing from the database. */
export async function poolLedger() {
  const fromBlock = BigInt(process.env.HALO_POOL_BLOCK || "0");
  const events = await publicClient.getContractEvents({ address: poolAddress(), abi: haloAbi, fromBlock });
  let volume = 0n, fees = 0n, claimsPaid = 0n, recovered = 0n, funded = 0n;
  let approvals = 0, covered = 0, claims = 0;
  const approvedAmount = new Map<string, bigint>();
  for (const e of events as unknown as { eventName: string; args: Record<string, unknown> }[]) {
    const a = e.args;
    switch (e.eventName) {
      case "ApprovalRecorded":
        approvals++;
        approvedAmount.set(a.approvalId as string, a.amount as bigint);
        break;
      case "FeePaid":
        covered++;
        fees += a.fee as bigint;
        volume += approvedAmount.get(a.approvalId as string) ?? 0n;
        break;
      case "ClaimResolved":
        claims++;
        claimsPaid += a.payout as bigint;
        break;
      case "BondSlashed":
        recovered += a.amount as bigint;
        break;
      case "PoolFunded":
        funded += a.amount as bigint;
        break;
    }
  }
  const f = fromUnits;
  const net = f(claimsPaid) - f(recovered);
  return {
    approvals,
    covered,
    claims,
    volume: f(volume),
    fees: f(fees),
    claimsPaid: f(claimsPaid),
    recovered: f(recovered),
    funded: f(funded),
    lossRatio: fees > 0n ? net / f(fees) : 0,
    events: events.length,
  };
}
