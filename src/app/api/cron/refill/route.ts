import { refillTreasury } from "@/lib/halo";
import { serverAccount } from "@/lib/wallets";

export const maxDuration = 300;

// Daily Vercel cron: keeps the demo treasury funded during judging (faucet limits reset daily).
export async function GET(req: Request) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`)
    return Response.json({ error: "forbidden" }, { status: 403 });
  const treasury = await serverAccount("halo-treasury");
  return Response.json(await refillTreasury(treasury.address as `0x${string}`, 10));
}
