import { ownerOf } from "@/lib/halo";
import { agentBalance, transferFromAgent } from "@/lib/relay";
import { userId } from "@/lib/stream";

export const maxDuration = 120;

// Withdraw: everything in the agent wallet goes back to the linked owner, gasless.
export async function POST() {
  const uid = await userId();
  const owner = await ownerOf(uid);
  if (!owner) return Response.json({ error: "connect and link your wallet first" }, { status: 400 });
  const balance = await agentBalance(uid);
  if (balance === 0n) return Response.json({ error: "agent wallet is empty" }, { status: 400 });
  const tx = await transferFromAgent(uid, owner, balance);
  return Response.json({ tx, amount: Number(balance) / 1e6, to: owner });
}
