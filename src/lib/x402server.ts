import { exact } from "x402/schemes";
import { settle, verify } from "x402/facilitator";
import { getDefaultAsset } from "x402/shared";
import { createConnectedClient, createSigner, type PaymentRequirements } from "x402/types";

// Merchant side of x402. Halo runs its own facilitator for the demo merchants so the demo
// does not depend on a third party; the settle wallet pays the gas.

export const NETWORK = "base-sepolia" as const;
export const USDC = getDefaultAsset(NETWORK);

export function requirements(opts: {
  priceUsdc: number;
  payTo: `0x${string}`;
  resource: string;
  description: string;
}): PaymentRequirements {
  return {
    scheme: "exact",
    network: NETWORK,
    maxAmountRequired: String(Math.round(opts.priceUsdc * 10 ** USDC.decimals)),
    resource: opts.resource,
    description: opts.description,
    mimeType: "application/json",
    payTo: opts.payTo,
    maxTimeoutSeconds: 120,
    asset: USDC.address as string,
    extra: { name: USDC.eip712.name, version: USDC.eip712.version },
  };
}

export function paymentRequired(req: PaymentRequirements, error = "X-PAYMENT header is required"): Response {
  return Response.json({ x402Version: 1, error, accepts: [req] }, { status: 402 });
}

/** Verify and settle an X-PAYMENT header. Returns the settlement transaction or an error response. */
export async function collect(
  header: string,
  req: PaymentRequirements,
): Promise<{ ok: true; tx: string; payer: string } | { ok: false; response: Response }> {
  const key = process.env.FACILITATOR_PRIVATE_KEY || process.env.DEPLOYER_PRIVATE_KEY;
  if (!key) return { ok: false, response: Response.json({ error: "facilitator not configured" }, { status: 500 }) };

  let payload;
  try {
    payload = exact.evm.decodePayment(header);
  } catch {
    return { ok: false, response: paymentRequired(req, "invalid X-PAYMENT header") };
  }
  const client = createConnectedClient(NETWORK);
  const v = await verify(client, payload, req);
  if (!v.isValid) return { ok: false, response: paymentRequired(req, v.invalidReason ?? "payment invalid") };

  const signer = await createSigner(NETWORK, key as `0x${string}`);
  const s = await settle(signer, payload, req);
  if (!s.success) return { ok: false, response: paymentRequired(req, s.errorReason ?? "settlement failed") };
  return { ok: true, tx: s.transaction, payer: s.payer ?? "" };
}

export function paymentResponseHeader(tx: string, payer: string): string {
  return Buffer.from(JSON.stringify({ success: true, transaction: tx, network: NETWORK, payer })).toString("base64");
}
