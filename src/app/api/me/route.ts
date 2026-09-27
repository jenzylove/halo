import { migrate, sql } from "@/lib/db";
import { apiKeyFor } from "@/lib/halo";
import { userId } from "@/lib/stream";

// PRD H3: everything this browser's agent did.
export async function GET() {
  await migrate();
  const uid = await userId();
  const [user] = (await sql()`select * from users where id = ${uid}`) as { wallet: string }[];
  const mandates = await sql()`select id, instruction, terms, max_total, expires_at, tx, created_at from mandates
    where user_id = ${uid} order by created_at desc limit 20`;
  const purchases = await sql()`select p.id, p.mandate_id, p.merchant_slug, p.offer, p.decision, p.reasons, p.amount, p.fee,
    p.status, p.approval_tx, p.fee_tx, p.payment_tx, p.link_tx, p.delivery, p.created_at,
    c.payout, c.verdict, c.resolve_tx, c.status as claim_status
    from purchases p left join claims c on c.id = p.id where p.user_id = ${uid} order by p.created_at desc limit 50`;
  // The API key (for MCP and the SDK) is returned instead of the session id, which stays in an httpOnly cookie.
  return Response.json({ apiKey: await apiKeyFor(uid), wallet: user?.wallet ?? null, mandates, purchases });
}
