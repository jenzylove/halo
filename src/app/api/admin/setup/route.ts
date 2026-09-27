import { erc20Abi, type Hex } from "viem";
import { publicClient, resolveClaim, setVerified, toUnits } from "@/lib/chain";
import { sha256 } from "@/lib/serv";
import { sql } from "@/lib/db";
import { MERCHANTS } from "@/lib/merchants";
import { cdpClient, operatorAccount, serverAccount } from "@/lib/wallets";
import { USDC } from "@/lib/x402server";

export const maxDuration = 300;

// One time setup that must talk to Coinbase CDP, run from the server (the dev machine's network cannot reach CDP).
// Locked behind ADMIN_TOKEN.
export async function POST(req: Request) {
  if (!process.env.ADMIN_TOKEN || req.headers.get("x-admin-token") !== process.env.ADMIN_TOKEN)
    return Response.json({ error: "forbidden" }, { status: 403 });
  const { step, address, token, times, approvalId, payout, reason } = (await req.json()) as { step: string; address?: string; token?: "eth" | "usdc"; times?: number; approvalId?: `0x${string}`; payout?: number; reason?: string };
  const cdp = cdpClient();
  const wait = (hash: string) => publicClient.waitForTransactionReceipt({ hash: hash as Hex });
  const balances = async (a: string) => ({
    eth: Number(await publicClient.getBalance({ address: a as Hex })) / 1e18,
    usdc: Number(await publicClient.readContract({ address: USDC.address as Hex, abi: erc20Abi, functionName: "balanceOf", args: [a as Hex] })) / 1e6,
  });

  if (step === "accounts") {
    const operator = await operatorAccount();
    const treasury = await serverAccount("halo-treasury");
    return Response.json({
      operator: { address: operator.address, ...(await balances(operator.address)) },
      treasury: { address: treasury.address, ...(await balances(treasury.address)) },
    });
  }

  if (step === "faucet" && address && token) {
    const results: string[] = [];
    for (let i = 0; i < Math.min(times ?? 1, 20); i++) {
      try {
        const { transactionHash } = await cdp.evm.requestFaucet({ address, network: "base-sepolia", token });
        await wait(transactionHash);
        results.push(transactionHash);
      } catch (e) {
        results.push(`stopped: ${String(e).slice(0, 160)}`);
        break;
      }
    }
    return Response.json({ results, balances: await balances(address) });
  }

  if (step === "verify") {
    const txs: Record<string, string> = {};
    for (const m of MERCHANTS.filter((m) => m.verified)) txs[m.name] = await setVerified(m.payTo, true);
    return Response.json({ txs });
  }

  // Human review: a person resolves a claim Halo could not decide automatically.
  if (step === "review" && approvalId && payout != null && reason) {
    const tx = await resolveClaim(approvalId, toUnits(payout), sha256(`human review: ${reason}`) as `0x${string}`, payout > 0);
    await sql()`update claims set status = ${payout > 0 ? "paid" : "rejected"}, payout = ${payout}, resolve_tx = ${tx} where id = ${approvalId}`;
    await sql()`update purchases set status = ${payout > 0 ? "refunded" : "ok"} where id = ${approvalId}`;
    return Response.json({ tx });
  }

  // Diagnose AgentKit in this runtime: a 0.01 USDC transfer from the treasury agent.
  if (step === "agentkit" && address) {
    try {
      const { agentkitSendUsdc } = await import("@/lib/agentkit");
      const treasury = await serverAccount("halo-treasury");
      return Response.json({ ok: true, node: process.version, tx: await agentkitSendUsdc(treasury.address, address, 0.01) });
    } catch (e) {
      return Response.json({ ok: false, node: process.version, error: String((e as Error)?.stack ?? e).slice(0, 1500) });
    }
  }

  if (step === "balances" && address) return Response.json(await balances(address));

  return Response.json({ error: "unknown step" }, { status: 400 });
}
