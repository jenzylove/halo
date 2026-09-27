import { poolLedger, poolStats } from "@/lib/chain";

// Live numbers from the chain (PRD H1, H4). Renders nothing if the pool is not reachable.
export async function PoolStrip() {
  let data: (Awaited<ReturnType<typeof poolStats>> & Awaited<ReturnType<typeof poolLedger>>) | null = null;
  try {
    const [s, l] = await Promise.all([poolStats(), poolLedger()]);
    data = { ...s, ...l };
  } catch {
    return null;
  }
  const items = [
    ["Pool", `${data.balance.toFixed(2)} USDC`],
    ["Covered volume", `${data.volume.toFixed(2)} USDC`],
    ["Fees in", `${data.fees.toFixed(2)} USDC`],
    ["Paid back", `${data.claimsPaid.toFixed(2)} USDC`],
    ["Recovered", `${data.recovered.toFixed(2)} USDC`],
  ];
  return (
    <dl className="grid grid-cols-2 gap-px border-y hair sm:grid-cols-5">
      {items.map(([k, v]) => (
        <div key={k} className="px-4 py-4 text-center">
          <dt className="text-xs uppercase tracking-wide text-muted">{k}</dt>
          <dd className="mt-1 font-mono text-sm">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
