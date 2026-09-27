import { purchase, type Step } from "@/lib/halo";

export const maxDuration = 300;

// PRD H6: the endpoint behind the SDK. An agent hands Halo an x402 URL; Halo checks, pays, and guarantees.
export async function POST(req: Request) {
  const uid = (req.headers.get("x-halo-user") || "").replace(/[^a-zA-Z0-9]/g, "").slice(0, 32);
  if (!uid) return Response.json({ error: "x-halo-user header required" }, { status: 401 });
  const { mandateId, url } = (await req.json()) as { mandateId?: string; url?: string };
  if (!mandateId || !url) return Response.json({ error: "mandateId and url required" }, { status: 400 });
  const steps: Step[] = [];
  try {
    const result = await purchase(uid, mandateId as `0x${string}`, url, (s) => void steps.push(s));
    const delivered = steps.find((s) => s.kind === "delivered");
    return Response.json({ ...result, delivery: delivered?.kind === "delivered" ? delivered.delivery : null, steps });
  } catch (e) {
    return Response.json({ status: "error", error: e instanceof Error ? e.message : String(e), steps }, { status: 500 });
  }
}
