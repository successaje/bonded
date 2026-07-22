import { loadEnv } from "../env.js";
loadEnv();

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Hex } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { bondVaultAbi, erc20Abi, slaRegistryAbi } from "../abis.js";
import { addresses, agentWallet, explorerTx, publicClient, requireKey, usd, waitForTx } from "../chain.js";
import { FLEET, type FleetMember } from "../fleet.js";
import { AUDIT_CRITERIA_HASH } from "../deliverable.js";
import { withRetry } from "../rpc.js";

/**
 * Seeds the demo fleet on Arc: gives each agent its own funded wallet, then
 * has *each agent* stake its own bond and publish its own offer — signed by
 * its own key. The deployer only ever hands over starting capital.
 *
 * Idempotent: re-running tops up, skips staking that's already done, and
 * won't republish an offer an agent already has.
 */

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const ENV_PATH = join(ROOT, ".env");

/** Gas float per agent — Arc gas is USDC and very cheap (~$0.004/tx). */
const GAS_FLOAT = 150_000n; // $0.15, ~35 transactions

function persistKey(name: string, key: Hex): void {
  const raw = readFileSync(ENV_PATH, "utf8");
  const line = `${name}=${key}`;
  const next = new RegExp(`^${name}=.*$`, "m").test(raw)
    ? raw.replace(new RegExp(`^${name}=.*$`, "m"), line)
    : `${raw.trimEnd()}\n${line}\n`;
  writeFileSync(ENV_PATH, next);
  process.env[name] = key;
}

function ensureKey(name: string): Hex {
  const existing = process.env[name];
  if (existing) return (existing.startsWith("0x") ? existing : `0x${existing}`) as Hex;
  const key = generatePrivateKey();
  persistKey(name, key);
  console.log(`   generated ${name} → ${privateKeyToAccount(key).address} (key saved to agents/.env, never logged)`);
  return key;
}

/**
 * Submits a transaction and waits for it, surviving the public RPC's rate
 * limiter. Retrying is safe here: a rate-limit rejection happens at the
 * gateway before the transaction is ever broadcast.
 */
const submit = async (label: string, sendTx: () => Promise<Hex>) => {
  const hash = await withRetry(sendTx, 6);
  const r = await waitForTx(hash);
  console.log(`   ${r.status === "success" ? "✓" : "✗"} ${label}  ${explorerTx(hash)}`);
  if (r.status !== "success") throw new Error(`${label} reverted`);
};

async function fund(to: `0x${string}`, needMicro: bigint, deployer: ReturnType<typeof agentWallet>) {
  const balance = await publicClient.getBalance({ address: to });
  const haveMicro = balance / 10n ** 12n; // 18-dec native → 6-dec view
  if (haveMicro >= needMicro) {
    console.log(`   already funded (${usd(haveMicro)})`);
    return;
  }
  const topUp = needMicro - haveMicro;
  // 6-decimal ERC-20 view → 18-decimal native view of the same USDC.
  await submit(`funded ${usd(topUp)}`, () => deployer.client.sendTransaction({ to, value: topUp * 10n ** 12n }));
}

async function setUpMember(m: FleetMember, deployer: ReturnType<typeof agentWallet>) {
  console.log(`\n${m.name} — ${m.service}`);
  const key = ensureKey(m.envKey);
  const agent = agentWallet(key);
  console.log(`   wallet ${agent.address}`);

  await fund(agent.address, m.bond + GAS_FLOAT, deployer);

  // The agent stakes its own bond, signed by its own key.
  const staked = (await withRetry(() =>
    publicClient.readContract({ address: addresses.bondVault, abi: bondVaultAbi, functionName: "staked", args: [agent.address] }),
  )) as bigint;

  if (staked >= m.bond) {
    console.log(`   already bonded ${usd(staked)}`);
  } else {
    const need = m.bond - staked;
    const allowance = (await withRetry(() =>
      publicClient.readContract({
        address: addresses.usdc,
        abi: erc20Abi,
        functionName: "allowance",
        args: [agent.address, addresses.bondVault],
      }),
    )) as bigint;
    if (allowance < need) {
      await submit("approved BondVault", () =>
        agent.client.writeContract({
          address: addresses.usdc,
          abi: erc20Abi,
          functionName: "approve",
          args: [addresses.bondVault, m.bond],
        }),
      );
    }
    await submit(`staked ${usd(need)} bond`, () =>
      agent.client.writeContract({
        address: addresses.bondVault,
        abi: bondVaultAbi,
        functionName: "stake",
        args: [need],
      }),
    );
  }

  // Publish its offer, if it hasn't already.
  const next = (await withRetry(() =>
    publicClient.readContract({ address: addresses.slaRegistry, abi: slaRegistryAbi, functionName: "nextOfferId" }),
  )) as bigint;
  for (let id = 1n; id < next; id++) {
    const o = (await withRetry(() =>
      publicClient.readContract({ address: addresses.slaRegistry, abi: slaRegistryAbi, functionName: "getOffer", args: [id] }),
    )) as { agent: string; active: boolean; price: bigint; bondSlice: bigint };
    if (o.agent.toLowerCase() !== agent.address.toLowerCase() || !o.active) continue;

    if (o.price === m.price && o.bondSlice === m.bondSlice) {
      console.log(`   already publishing offer #${id}`);
      return;
    }
    // Terms drifted from config — retire the stale offer and republish, so
    // the chain always matches what the fleet claims to sell.
    await submit(`retired stale offer #${id}`, () =>
      agent.client.writeContract({
        address: addresses.slaRegistry,
        abi: slaRegistryAbi,
        functionName: "setActive",
        args: [id, false],
      }),
    );
  }

  await submit(`published offer — ${usd(m.price)} job, ${usd(m.bondSlice)} slice`, () =>
    agent.client.writeContract({
      address: addresses.slaRegistry,
      abi: slaRegistryAbi,
      functionName: "publishOffer",
      args: [
        m.price,
        m.bondSlice,
        m.premium,
        m.deliveryWindow,
        m.disputeWindow,
        addresses.auditChecker,
        AUDIT_CRITERIA_HASH,
        `bonded://sla/${m.id}/v1`,
      ],
    }),
  );
}

const main = async () => {
  const deployer = agentWallet(requireKey("DEPLOYER_KEY"));
  const bal = await publicClient.getBalance({ address: deployer.address });
  console.log(`funder ${deployer.address} — ${usd(bal / 10n ** 12n)} available`);

  // The buyer needs a float for job fees plus gas.
  console.log(`\nBuyer agent`);
  const buyer = agentWallet(ensureKey("BUYER_KEY"));
  console.log(`   wallet ${buyer.address}`);
  await fund(buyer.address, 3_000_000n + GAS_FLOAT, deployer);

  for (const m of FLEET) await setUpMember(m, deployer);

  console.log(`\ndone — run \`npm run survey\` to see what the buyer sees\n`);
};

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
