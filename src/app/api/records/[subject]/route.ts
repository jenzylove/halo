import { migrate, recordsFor, sql } from "@/lib/db";
import { userId } from "@/lib/stream";

// PRD G3: the full reasoning record behind a mandate, approval or claim, for the session that owns it.
export async function GET(_req: Request, ctx: { params: Promise<{ subject: string }> }) {
  const subject = (await ctx.params).subject;
  const uid = await userId();
  await migrate();
  const owned = (await sql()`select 1 from mandates where id = ${subject} and user_id = ${uid}
    union all select 1 from purchases where id = ${subject} and user_id = ${uid} limit 1`) as unknown[];
  if (!owned.length) return Response.json({ error: "not found" }, { status: 404 });
  return Response.json({ records: await recordsFor(subject) });
}
