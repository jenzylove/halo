import { manualClaim } from "@/lib/halo";
import { streamSteps, userId } from "@/lib/stream";

export const maxDuration = 120;

// PRD D2: one tap "something is wrong".
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { evidence } = (await req.json().catch(() => ({}))) as { evidence?: string };
  const uid = await userId();
  return streamSteps((onStep) => manualClaim(uid, id as `0x${string}`, (evidence || "Something is wrong with this purchase.").slice(0, 2000), onStep));
}
