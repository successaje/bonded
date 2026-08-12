import { loadEnv } from "../env.js";
loadEnv();

import { privateKeyToAccount } from "viem/accounts";
import { bondVaultAbi } from "../abis.js";
import { addresses, publicClient } from "../chain.js";

const key = (process.env.WORKER_LEAK_KEY!.startsWith("0x") ? process.env.WORKER_LEAK_KEY! : `0x${process.env.WORKER_LEAK_KEY}`) as `0x${string}`;
const addr = privateKeyToAccount(key).address;

const nativeBal = await publicClient.getBalance({ address: addr });
const staked = (await publicClient.readContract({ address: addresses.bondVault, abi: bondVaultAbi, functionName: "staked", args: [addr] })) as bigint;
const locked = (await publicClient.readContract({ address: addresses.bondVault, abi: bondVaultAbi, functionName: "locked", args: [addr] })) as bigint;

console.log("worker address:", addr);
console.log("native (gas) balance, USDC-equivalent:", Number(nativeBal) / 1e18);
console.log("bond staked:", Number(staked) / 1e6, "locked:", Number(locked) / 1e6, "available:", Number(staked - locked) / 1e6);
