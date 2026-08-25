import { loadEnv } from "../env.js";
loadEnv();

import { privateKeyToAccount } from "viem/accounts";
import { bondVaultAbi } from "../abis.js";
import { addresses, publicClient } from "../chain.js";
import { FLEET } from "../fleet.js";

/**
 * Health check for a worker wallet before trusting it to run unattended:
 * enough gas to actually broadcast, enough free bond to keep hiring viable.
 *
 *   npm run check:worker             # every fleet member
 *   npm run check:worker -- leak     # just one
 */

const only = process.argv[2];
const targets = only ? FLEET.filter((m) => m.id === only) : FLEET;
if (targets.length === 0) {
  console.error(`no fleet member "${only}" — options: ${FLEET.map((m) => m.id).join(", ")}`);
  process.exit(1);
}

for (const m of targets) {
  const envKey = process.env[m.envKey];
  if (!envKey) {
    console.log(`${m.name.padEnd(12)} — ${m.envKey} not set, skipping`);
    continue;
  }
  const key = (envKey.startsWith("0x") ? envKey : `0x${envKey}`) as `0x${string}`;
  const addr = privateKeyToAccount(key).address;

  const nativeBal = await publicClient.getBalance({ address: addr });
  const staked = (await publicClient.readContract({ address: addresses.bondVault, abi: bondVaultAbi, functionName: "staked", args: [addr] })) as bigint;
  const locked = (await publicClient.readContract({ address: addresses.bondVault, abi: bondVaultAbi, functionName: "locked", args: [addr] })) as bigint;

  console.log(
    `${m.name.padEnd(12)} ${addr}  gas $${(Number(nativeBal) / 1e18).toFixed(2)}  bond staked $${(Number(staked) / 1e6).toFixed(2)} locked $${(Number(locked) / 1e6).toFixed(2)} available $${(Number(staked - locked) / 1e6).toFixed(2)}`,
  );
}
