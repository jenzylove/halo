import { CdpClient } from "@coinbase/cdp-sdk";
import { toAccount } from "viem/accounts";
import type { LocalAccount } from "viem";

// PRD C2, F4: every wallet in Halo is a Coinbase CDP server wallet (the AgentKit wallet layer).
// The operator is Halo's adjuster agent. Each user gets an agent wallet of their own.

let cdp: CdpClient | null = null;
export function cdpClient(): CdpClient {
  cdp ??= new CdpClient(); // reads CDP_API_KEY_ID, CDP_API_KEY_SECRET, CDP_WALLET_SECRET
  return cdp;
}

export const NETWORK = "base-sepolia" as const;
export const OPERATOR_NAME = "halo-operator";

type ServerAccount = Awaited<ReturnType<CdpClient["evm"]["getOrCreateAccount"]>>;

const cache = new Map<string, ServerAccount>();

export async function serverAccount(name: string): Promise<ServerAccount> {
  const hit = cache.get(name);
  if (hit) return hit;
  const acct = await cdpClient().evm.getOrCreateAccount({ name });
  cache.set(name, acct);
  return acct;
}

export const operatorAccount = () => serverAccount(OPERATOR_NAME);
export const userAccountName = (userId: string) => `halo-user-${userId.replace(/[^a-zA-Z0-9-]/g, "").slice(0, 32)}`;
export const userAccount = (userId: string) => serverAccount(userAccountName(userId));

/** A viem account backed by a CDP server wallet, for x402 payment signing. */
export function asViemAccount(acct: ServerAccount): LocalAccount {
  return toAccount({
    address: acct.address,
    signMessage: ({ message }) => acct.signMessage({ message }),
    signTransaction: (tx) => acct.signTransaction(tx),
    signTypedData: (td) => acct.signTypedData(td as Parameters<ServerAccount["signTypedData"]>[0]),
  }) as LocalAccount;
}

/** Send a contract call from a CDP wallet. CDP handles nonce and gas. */
export async function sendFrom(acct: ServerAccount, to: `0x${string}`, data: `0x${string}`): Promise<`0x${string}`> {
  const { transactionHash } = await cdpClient().evm.sendTransaction({
    address: acct.address,
    network: NETWORK,
    transaction: { to, data, value: 0n },
  });
  return transactionHash as `0x${string}`;
}

export async function faucet(address: string, token: "eth" | "usdc"): Promise<string> {
  const { transactionHash } = await cdpClient().evm.requestFaucet({ address, network: NETWORK, token });
  return transactionHash;
}
