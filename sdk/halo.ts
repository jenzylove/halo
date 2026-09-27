// Halo SDK: buy over x402 with purchase protection.
// Use haloFetch where your agent would pay an x402 URL. Halo checks the offer against the user's
// mandate, pays only if it fits, and pays the user back if the delivery is wrong.

export interface HaloOptions {
  key: string; // the user's Halo API key (shown on the Docs page)
  mandateId: string; // a confirmed mandate
  base?: string; // Halo deployment, defaults to the public one
}

export interface HaloResult {
  status: "ok" | "claimed" | "decline" | "ask_user" | "error";
  approvalId?: string;
  delivery: unknown;
  steps: { kind: string; [k: string]: unknown }[];
  error?: string;
}

export async function haloFetch(url: string, opts: HaloOptions): Promise<HaloResult> {
  const res = await fetch(`${opts.base ?? "https://halo-nine-chi.vercel.app"}/api/pay`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-halo-key": opts.key },
    body: JSON.stringify({ mandateId: opts.mandateId, url }),
  });
  return (await res.json()) as HaloResult;
}
