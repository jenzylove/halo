import { createWalletClient, erc20Abi, http, keccak256, parseAbi, parseSignature, toHex, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { poolAddress, publicClient } from "./chain";
import { MERCHANTS } from "./merchants";
import { USDC } from "./x402server";

// Testnet USDC is scarce, so the demo recycles it: demo merchants' revenue is swept back (gasless EIP-3009),
// their bonds are topped back up, and the rest refills the treasury that funds new visitors' agent wallets.

const usdc = USDC.address as Hex;
const units = (n: number) => BigInt(Math.round(n * 1e6));
const poolAbi = parseAbi(["function depositBond(address,uint128)", "function merchants(address) view returns (uint128,uint64,bool)"]);

const merchantKey = (slug: string) => process.env[`MERCHANT_${slug.toUpperCase().replace(/[^A-Z0-9]/g, "")}_KEY`] as Hex | undefined;

export async function recycle(treasury: Hex): Promise<{ swept: number; bonds: number; toTreasury: number }> {
  const key = (process.env.FACILITATOR_PRIVATE_KEY || process.env.DEPLOYER_PRIVATE_KEY) as Hex | undefined;
  if (!key) return { swept: 0, bonds: 0, toTreasury: 0 };
  const relayer = privateKeyToAccount(key);
  const wallet = createWalletClient({ account: relayer, chain: baseSepolia, transport: http() });
  const wait = (hash: Hex) => publicClient.waitForTransactionReceipt({ hash });
  const balance = (a: Hex) => publicClient.readContract({ address: usdc, abi: erc20Abi, functionName: "balanceOf", args: [a] });

  let swept = 0n;
  for (const m of MERCHANTS) {
    const k = merchantKey(m.slug);
    if (!k) continue;
    const signer = privateKeyToAccount(k);
    const amount = await balance(signer.address);
    if (amount === 0n) continue;
    const nonce = keccak256(toHex(`sweep:${signer.address}:${Date.now()}`));
    const validBefore = BigInt(Math.floor(Date.now() / 1000) + 600);
    const sig = await signer.signTypedData({
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
      message: { from: signer.address, to: relayer.address, value: amount, validAfter: 0n, validBefore, nonce },
    });
    const { v, r, s } = parseSignature(sig);
    await wait(
      await wallet.writeContract({
        address: usdc,
        abi: parseAbi(["function transferWithAuthorization(address,address,uint256,uint256,uint256,bytes32,uint8,bytes32,bytes32)"]),
        functionName: "transferWithAuthorization",
        args: [signer.address, relayer.address, amount, 0n, validBefore, nonce, Number(v), r, s],
      }),
    );
    swept += amount;
  }

  // Top bonds back up to target for verified merchants.
  let bonds = 0n;
  for (const m of MERCHANTS.filter((m) => m.verified)) {
    const [bond] = (await publicClient.readContract({ address: poolAddress(), abi: poolAbi, functionName: "merchants", args: [m.payTo] })) as [bigint, bigint, boolean];
    const need = units(m.bond) - bond;
    if (need <= 0n || (await balance(relayer.address)) < need) continue;
    await wait(await wallet.writeContract({ address: poolAddress(), abi: poolAbi, functionName: "depositBond", args: [m.payTo, need] }));
    bonds += need;
  }

  // Everything else goes back to the treasury.
  const rest = await balance(relayer.address);
  if (rest > 0n) await wait(await wallet.writeContract({ address: usdc, abi: erc20Abi, functionName: "transfer", args: [treasury, rest] }));
  return { swept: Number(swept) / 1e6, bonds: Number(bonds) / 1e6, toTreasury: Number(rest) / 1e6 };
}
