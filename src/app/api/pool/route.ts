import { poolAddress, poolLedger, poolStats } from "@/lib/chain";

export const dynamic = "force-dynamic";

export async function GET() {
  const [stats, ledger] = await Promise.all([poolStats(), poolLedger()]);
  return Response.json({ address: poolAddress(), ...stats, ...ledger });
}
