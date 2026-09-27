import { poolAddress, poolLedger, poolStats } from "@/lib/chain";

export const dynamic = "force-dynamic";

// PRD H4: the pool, computed from onchain events.
export default async function Pool() {
  let data;
  try {
    const [s, l] = await Promise.all([poolStats(), poolLedger()]);
    data = { ...s, ...l, address: poolAddress() };
  } catch (e) {
    return <p className="py-24 text-center text-muted">Pool not reachable: {String(e)}</p>;
  }
  const leverage = data.balance > 0 ? data.openCoverage / data.balance : 0;
  const rows: [string, string, string][] = [
    ["Pool capital", `${data.balance.toFixed(2)} USDC`, "USDC held by the contract, minus merchant bonds"],
    ["Open coverage", `${data.openCoverage.toFixed(2)} USDC`, "Purchases still inside their claim window"],
    ["Leverage", `${leverage.toFixed(2)}x of 20x`, "The contract refuses approvals past 20x pool capital"],
    ["Room to cover", `${data.capacity.toFixed(2)} USDC`, "New purchases the pool can still guarantee"],
    ["Merchant bonds", `${data.bonds.toFixed(2)} USDC`, "Slashed back into the pool when a merchant is at fault"],
    ["Covered volume", `${data.volume.toFixed(2)} USDC`, `${data.covered} purchases covered, ${data.approvals} approved`],
    ["Fees in", `${data.fees.toFixed(2)} USDC`, "1% of every covered purchase, minimum 0.02"],
    ["Paid back to users", `${data.claimsPaid.toFixed(2)} USDC`, `${data.claims} claims resolved`],
    ["Recovered from merchants", `${data.recovered.toFixed(2)} USDC`, "Bond slashes on merchant fault verdicts"],
    ["Net loss ratio", data.fees > 0 ? `${(data.lossRatio * 100).toFixed(1)}%` : "n/a", "(paid back minus recovered) divided by fees"],
  ];
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-center text-4xl font-bold tracking-tight">The pool</h1>
      <p className="mt-3 text-center text-sm text-muted">
        Every number below is read from{" "}
        <a className="font-mono underline" href={`https://sepolia.basescan.org/address/${data.address}`} target="_blank" rel="noreferrer">
          HaloPool
        </a>{" "}
        events on Base Sepolia ({data.events} events).
      </p>
      <dl className="mt-12 divide-y divide-line border-y hair">
        {rows.map(([k, v, d]) => (
          <div key={k} className="grid grid-cols-1 gap-1 py-4 sm:grid-cols-3">
            <dt className="font-medium">{k}</dt>
            <dd className="font-mono">{v}</dd>
            <dd className="text-sm text-muted">{d}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
