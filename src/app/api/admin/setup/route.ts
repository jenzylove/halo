import { erc20Abi, type Hex } from "viem";
import { publicClient, setVerified } from "@/lib/chain";
import { MERCHANTS } from "@/lib/merchants";
import { cdpClient, operatorAccount, serverAccount } from "@/lib/wallets";
import { USDC } from "@/lib/x402server";

export const maxDuration = 300;

// One time setup that must talk to Coinbase CDP, run from the server (the dev machine's network cannot reach CDP).
// Locked behind ADMIN_TOKEN.
export async function POST(req: Request) {
  if (!process.env.ADMIN_TOKEN || req.headers.get("x-admin-token") !== process.env.ADMIN_TOKEN)
    return Response.json({ error: "forbidden" }, { status: 403 });
  const { step, address, token, times } = (await req.json()) as { step: string; address?: string; token?: "eth" | "usdc"; times?: number };
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

  if (step === "balances" && address) return Response.json(await balances(address));

  return Response.json({ error: "unknown step" }, { status: 400 });
}
