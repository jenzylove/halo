import { createHash } from "node:crypto";
import { verifyMessage, type Hex } from "viem";
import { linkOwner, ownerOf } from "@/lib/halo";
import { agentBalance } from "@/lib/relay";
import { userId } from "@/lib/stream";
import { userAccount } from "@/lib/wallets";

export const maxDuration = 60;

// The session id never appears in the message; a one way fingerprint binds the signature to this session.
const fingerprint = (uid: string) => createHash("sha256").update(`halo:${uid}`).digest("hex").slice(0, 16);
const message = (agent: string, uid: string, issued: string) =>
  `Link my wallet as the owner of my Halo agent.\n\nAgent wallet: ${agent}\nSession: ${fingerprint(uid)}\nIssued: ${issued}\n\nRefunds will be forwarded to this wallet. This signature costs nothing.`;

// The owner layer: who the agent belongs to, what it holds, and the message to sign to link a wallet.
export async function GET() {
  const uid = await userId();
  const agent = await userAccount(uid);
  const [owner, balance] = await Promise.all([ownerOf(uid), agentBalance(uid)]);
  const issued = new Date().toISOString();
  return Response.json({
    agent: agent.address,
    owner,
    agentUsdc: Number(balance) / 1e6,
    link: { issued, message: message(agent.address, uid, issued) },
  });
}

// Link: the owner signs a plain message naming the agent wallet; Halo verifies it and remembers the owner.
export async function POST(req: Request) {
  const uid = await userId();
  const { address, signature, issued } = (await req.json()) as { address?: Hex; signature?: Hex; issued?: string };
  if (!address || !signature || !issued) return Response.json({ error: "address, signature and issued required" }, { status: 400 });
  if (Date.now() - new Date(issued).getTime() > 10 * 60_000) return Response.json({ error: "link message expired, try again" }, { status: 400 });
  const agent = await userAccount(uid);
  const ok = await verifyMessage({ address, message: message(agent.address, uid, issued), signature });
  if (!ok) return Response.json({ error: "signature does not match this wallet" }, { status: 401 });
  // Ownership locks once set: a session (or anyone holding it) cannot move refunds to a different wallet.
  const current = await ownerOf(uid);
  if (current && current.toLowerCase() !== address.toLowerCase())
    return Response.json({ error: `This agent is already owned by ${current.slice(0, 6)}…${current.slice(-4)}. Ownership cannot be reassigned.` }, { status: 409 });
  await linkOwner(uid, address);
  return Response.json({ owner: address.toLowerCase(), agent: agent.address });
}
