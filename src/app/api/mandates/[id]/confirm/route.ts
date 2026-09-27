import { confirmMandate, ensureUser } from "@/lib/halo";
import { streamSteps, userId } from "@/lib/stream";

export const maxDuration = 120;

// PRD A2, A3: the user confirms, their agent wallet signs, the operator locks the mandate onchain.
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const uid = await userId();
  return streamSteps(async (onStep) => {
    await ensureUser(uid, onStep);
    return { tx: await confirmMandate(uid, id as `0x${string}`, onStep) };
  });
}
