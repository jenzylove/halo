import { createWalletClient, http, parseAbi, parseSignature, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { publicClient } from "@/lib/chain";
import { ownerOf } from "@/lib/halo";
import { userId } from "@/lib/stream";
import { userAccount } from "@/lib/wallets";
import { USDC } from "@/lib/x402server";

export const maxDuration = 60;

// Gasless top up: the owner signs a USDC transfer authorization (EIP-3009) to their agent; Halo's relayer submits it and pays gas.
export async function POST(req: Request) {
  const uid = await userId();
  const owner = await ownerOf(uid);
  if (!owner) return Response.json({ error: "connect and link your wallet first" }, { status: 400 });
  const { value, validBefore, nonce, signature } = (await req.json()) as { value: string; validBefore: string; nonce: Hex; signature: Hex };
  const agent = await userAccount(uid);
  const key = (process.env.FACILITATOR_PRIVATE_KEY || process.env.DEPLOYER_PRIVATE_KEY) as Hex;
  const relayer = createWalletClient({ account: privateKeyToAccount(key), chain: baseSepolia, transport: http() });
  const { v, r, s } = parseSignature(signature);
  try {
    const tx = await relayer.writeContract({
      address: USDC.address as Hex,
      abi: parseAbi(["function transferWithAuthorization(address,address,uint256,uint256,uint256,bytes32,uint8,bytes32,bytes32)"]),
      functionName: "transferWithAuthorization",
      args: [owner, agent.address as Hex, BigInt(value), 0n, BigInt(validBefore), nonce, Number(v), r, s],
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash: tx });
    if (receipt.status !== "success") return Response.json({ error: "top up reverted" }, { status: 400 });
    return Response.json({ tx, amount: Number(value) / 1e6 });
  } catch (e) {
    return Response.json({ error: String((e as Error).message ?? e).slice(0, 200) }, { status: 400 });
  }
}
