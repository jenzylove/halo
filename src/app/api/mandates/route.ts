import { draftMandate } from "@/lib/halo";
import { userId } from "@/lib/stream";

export const maxDuration = 60;

// PRD A1, A2, A4: compile an instruction into a mandate the user must confirm.
export async function POST(req: Request) {
  const { instruction } = (await req.json()) as { instruction?: string };
  if (!instruction || instruction.length > 500) return Response.json({ error: "instruction required (max 500 chars)" }, { status: 400 });
  const uid = await userId();
  const res = await draftMandate(uid, instruction);
  if (res.status === "error") return Response.json({ error: res.error }, { status: 502 });
  return Response.json(res);
}
