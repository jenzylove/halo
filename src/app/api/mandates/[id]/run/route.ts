import { runAgent } from "@/lib/halo";
import { streamSteps, userId } from "@/lib/stream";

export const maxDuration = 300;

// The hosted demo agent shops under the mandate; Halo checks, pays, and pays back.
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const uid = await userId();
  const origin = new URL(req.url).origin;
  return streamSteps((onStep) => runAgent(uid, id as `0x${string}`, origin, onStep));
}
