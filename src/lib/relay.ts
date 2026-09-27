import { createWalletClient, erc20Abi, http, keccak256, parseAbi, parseSignature, toHex, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { publicClient } from "./chain";
import { userAccount } from "./wallets";
import { USDC } from "./x402server";

// Moves USDC out of a user's agent wallet without the agent holding ETH:
// the agent wallet signs an EIP-3009 authorization, Halo's relayer submits it and pays the gas.

const usdc = USDC.address as Hex;

export async function agentBalance(userId: string): Promise<bigint> {
  const agent = await userAccount(userId);
  return publicClient.readContract({ address: usdc, abi: erc20Abi, functionName: "balanceOf", args: [agent.address as Hex] });
}

export async function transferFromAgent(userId: string, to: Hex, amount: bigint): Promise<Hex> {
  const key = (process.env.FACILITATOR_PRIVATE_KEY || process.env.DEPLOYER_PRIVATE_KEY) as Hex | undefined;
  if (!key) throw new Error("relayer not configured");
  const agent = await userAccount(userId);
  const nonce = keccak256(toHex(`relay:${agent.address}:${to}:${amount}:${Date.now()}`));
  const validBefore = BigInt(Math.floor(Date.now() / 1000) + 600);
  const sig = await agent.signTypedData({
    domain: { name: USDC.eip712.name, version: USDC.eip712.version, chainId: baseSepolia.id, verifyingContract: usdc },
    types: {
      TransferWithAuthorization: [
        { name: "from", type: "address" },
        { name: "to", type: "address" },
        { name: "value", type: "uint256" },
        { name: "validAfter", type: "uint256" },
        { name: "validBefore", type: "uint256" },
        { name: "nonce", type: "bytes32" },
      ],
    },
    primaryType: "TransferWithAuthorization",
    message: { from: agent.address as Hex, to, value: amount, validAfter: 0n, validBefore, nonce },
  });
  const { v, r, s } = parseSignature(sig as Hex);
  const relayer = createWalletClient({ account: privateKeyToAccount(key), chain: baseSepolia, transport: http() });
  const hash = await relayer.writeContract({
    address: usdc,
    abi: parseAbi(["function transferWithAuthorization(address,address,uint256,uint256,uint256,bytes32,uint8,bytes32,bytes32)"]),
    functionName: "transferWithAuthorization",
    args: [agent.address as Hex, to, amount, 0n, validBefore, nonce, Number(v), r, s],
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error(`transfer reverted: ${hash}`);
  return hash;
}
