import { AgentKit, CdpEvmWalletProvider, erc20ActionProvider } from "@coinbase/agentkit";
import type { Hex } from "viem";
import { USDC } from "./x402server";

// Coinbase AgentKit in Halo's money flow: the treasury agent funds each new shopping agent
// through AgentKit's ERC20 transfer action, running on a CDP server wallet.

const kits = new Map<string, AgentKit>();

async function kitFor(address: string): Promise<AgentKit> {
  const hit = kits.get(address);
  if (hit) return hit;
  const walletProvider = await CdpEvmWalletProvider.configureWithWallet({
    apiKeyId: process.env.CDP_API_KEY_ID,
    apiKeySecret: process.env.CDP_API_KEY_SECRET,
    walletSecret: process.env.CDP_WALLET_SECRET,
    networkId: "base-sepolia",
    address: address as Hex,
  });
  const kit = await AgentKit.from({ walletProvider, actionProviders: [erc20ActionProvider()] });
  kits.set(address, kit);
  return kit;
}

/** Send USDC with AgentKit's ERC20 transfer action. Returns the transaction hash. */
export async function agentkitSendUsdc(from: string, to: string, amount: number): Promise<Hex> {
  const kit = await kitFor(from);
  const action = kit.getActions().find((a) => /erc20/i.test(a.name) && /_transfer$/i.test(a.name));
  if (!action) throw new Error("AgentKit ERC20 transfer action not available");
  const message = await action.invoke({ amount: String(amount), tokenAddress: USDC.address, destinationAddress: to });
  const hash = /0x[a-fA-F0-9]{64}/.exec(message)?.[0];
  if (!hash) throw new Error(`AgentKit transfer failed: ${message.slice(0, 200)}`);
  return hash as Hex;
}
