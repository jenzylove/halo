// One command from keys to a live pool on Base Sepolia.
// Usage: npx tsx scripts/bootstrap.ts
// Needs .env.local (CDP + SERV + DATABASE_URL) and .env.deployer (generated).
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env.deployer" });

import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { createWalletClient, encodeFunctionData, erc20Abi, http, parseAbi, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";

const USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as const;

function setEnv(key: string, value: string) {
  const path = ".env.local";
  const lines = readFileSync(path, "utf8").split(/\r?\n/).filter((l) => !l.startsWith(`${key}=`));
  lines.push(`${key}=${value}`);
  writeFileSync(path, lines.filter((l, i) => l || i < lines.length - 1).join("\n") + "\n");
  process.env[key] = value;
}

async function main() {
  const { cdpClient, operatorAccount, serverAccount } = await import("../src/lib/wallets");
  const { publicClient } = await import("../src/lib/chain");
  const { MERCHANTS } = await import("../src/lib/merchants");
  const cdp = cdpClient();
  const wait = (hash: string) => publicClient.waitForTransactionReceipt({ hash: hash as Hex });
  const usdcOf = async (a: string) =>
    Number(await publicClient.readContract({ address: USDC, abi: erc20Abi, functionName: "balanceOf", args: [a as Hex] })) / 1e6;
  const ethOf = async (a: string) => Number(await publicClient.getBalance({ address: a as Hex })) / 1e18;

  const operator = await operatorAccount();
  const treasury = await serverAccount("halo-treasury");
  const deployer = privateKeyToAccount(process.env.DEPLOYER_PRIVATE_KEY as Hex);
  console.log("operator ", operator.address);
  console.log("treasury ", treasury.address);
  console.log("deployer ", deployer.address);

  // 1. Gas for the deployer (deploy, pool funding, facilitator settlements) and the operator (every Halo action).
  for (const [who, addr, n] of [["deployer", deployer.address, 5], ["operator", operator.address, 5]] as const) {
    if ((await ethOf(addr)) > 0.0003) continue;
    for (let i = 0; i < n; i++) {
      try {
        const { transactionHash } = await cdp.evm.requestFaucet({ address: addr, network: "base-sepolia", token: "eth" });
        await wait(transactionHash);
      } catch (e) {
        console.log(`  eth faucet ${who} stopped: ${String(e).slice(0, 100)}`);
        break;
      }
    }
    console.log(`${who} ETH`, await ethOf(addr));
  }

  // 2. Test USDC for the pool (deployer) and for starter balances (treasury).
  for (const [who, addr, n] of [["deployer", deployer.address, 10], ["treasury", treasury.address, 10]] as const) {
    for (let i = 0; i < n; i++) {
      try {
        const { transactionHash } = await cdp.evm.requestFaucet({ address: addr, network: "base-sepolia", token: "usdc" });
        await wait(transactionHash);
      } catch (e) {
        console.log(`  usdc faucet ${who} stopped after ${i}: ${String(e).slice(0, 100)}`);
        break;
      }
    }
    console.log(`${who} USDC`, await usdcOf(addr));
  }

  // 3. Deploy HaloPool with the CDP operator as operator.
  if (!process.env.HALO_POOL_ADDRESS) {
    const out = execSync(
      `forge script script/Deploy.s.sol --rpc-url https://sepolia.base.org --broadcast --slow`,
      { cwd: "contracts", env: { ...process.env, USDC_ADDRESS: USDC, OPERATOR_ADDRESS: operator.address }, encoding: "utf8" },
    );
    const addr = /HaloPool (0x[0-9a-fA-F]{40})/.exec(out)?.[1];
    if (!addr) throw new Error(`deploy output had no address:\n${out}`);
    const block = await publicClient.getBlockNumber();
    setEnv("HALO_POOL_ADDRESS", addr);
    setEnv("HALO_POOL_BLOCK", String(block - 50n));
    console.log("HaloPool deployed", addr);
  }
  const pool = process.env.HALO_POOL_ADDRESS as Hex;

  // 4. Seed the pool and post merchant bonds from the deployer.
  const wallet = createWalletClient({ account: deployer, chain: baseSepolia, transport: http("https://sepolia.base.org") });
  const poolAbi = parseAbi(["function fund(uint256)", "function depositBond(address,uint128)", "function totalBonds() view returns (uint256)"]);
  const bonds = MERCHANTS.filter((m) => m.verified).reduce((a, m) => a + m.bond, 0);
  const have = await usdcOf(deployer.address);
  const seed = Math.max(0, Math.floor((have - bonds) * 100) / 100);
  await wait(await wallet.writeContract({ address: USDC, abi: erc20Abi, functionName: "approve", args: [pool, 2n ** 255n] }));
  if ((await publicClient.readContract({ address: pool, abi: poolAbi, functionName: "totalBonds" })) === 0n) {
    for (const m of MERCHANTS.filter((m) => m.verified)) {
      await wait(await wallet.writeContract({ address: pool, abi: poolAbi, functionName: "depositBond", args: [m.payTo, BigInt(m.bond * 1e6)] }));
      console.log(`bond ${m.name} ${m.bond} USDC`);
    }
  }
  if (seed > 0) {
    await wait(await wallet.writeContract({ address: pool, abi: poolAbi, functionName: "fund", args: [BigInt(Math.round(seed * 1e6))] }));
    console.log(`pool funded ${seed} USDC`);
  }

  // 5. Operator marks the verified merchants onchain.
  const { setVerified } = await import("../src/lib/chain");
  for (const m of MERCHANTS.filter((m) => m.verified)) {
    await setVerified(m.payTo, true);
    console.log(`verified ${m.name}`);
  }

  const { poolStats } = await import("../src/lib/chain");
  console.log("pool", await poolStats());
  console.log("treasury USDC", await usdcOf(treasury.address));
  void encodeFunctionData;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
