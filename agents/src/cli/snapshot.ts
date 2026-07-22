import { loadEnv } from "../env.js";
loadEnv();

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseAbiItem, type Address } from "viem";
import { addresses, publicClient } from "../chain.js";
import { FLEET_LABELS } from "../fleet.js";
import { allJobs, State } from "../jobs.js";
import { surveyMarketplace } from "../marketplace.js";
import { withRetry } from "../rpc.js";

/**
 * Writes the proof manifest the dashboard ships with.
 *
 * Why a manifest instead of reading logs in the browser: Arc's public RPC
 * caps eth_getLogs at a 10,000-block range and rate-limits bursts, so a page
 * that scanned history live would spend the demo in backoff and could fail
 * outright on stage. Settled jobs are immutable, so they are captured once,
 * here, with every transaction hash included and linkable — anyone can verify
 * each one on ArcScan. The dashboard still refreshes live state on demand.
 *
 *   npm run snapshot
 */

const DEPLOY_BLOCK = 52_945_394n;
const CHUNK = 9_000n;

const jobPassed = parseAbiItem("event JobPassed(uint64 indexed jobId, uint256 paidToAgent, uint256 premium)");
const jobFailed = parseAbiItem("event JobFailed(uint64 indexed jobId, uint256 refundedToBuyer, uint256 slashedToBuyer)");

const json = (v: unknown) => JSON.stringify(v, (_k, x) => (typeof x === "bigint" ? x.toString() : x), 2);

const main = async () => {
  const labels = FLEET_LABELS();
  const nameOf = (a: string) => labels[a.toLowerCase()] ?? `${a.slice(0, 6)}…${a.slice(-4)}`;

  const jobs = await allJobs();
  const settled = jobs.filter((j) => j.state === State.Passed || j.state === State.Failed);
  console.log(`${jobs.length} jobs on chain, ${settled.length} settled — finding their transactions`);

  const latest = await withRetry(() => publicClient.getBlockNumber());
  const found = new Map<string, { txHash: string; blockNumber: bigint }>();

  // Walk forward in permitted chunks, stopping as soon as every settled job
  // has been matched — in practice that is the first chunk or two.
  for (let from = DEPLOY_BLOCK; from <= latest && found.size < settled.length; from += CHUNK) {
    const to = from + CHUNK - 1n > latest ? latest : from + CHUNK - 1n;
    for (const event of [jobPassed, jobFailed]) {
      const logs = await withRetry(() =>
        publicClient.getLogs({ address: addresses.jobEscrow, event, fromBlock: from, toBlock: to }),
      );
      for (const l of logs) {
        found.set(String((l.args as { jobId: bigint }).jobId), {
          txHash: l.transactionHash!,
          blockNumber: l.blockNumber!,
        });
      }
    }
    process.stdout.write(`  scanned ${from}–${to} · ${found.size}/${settled.length}\r`);
    await new Promise((r) => setTimeout(r, 250));
  }
  console.log();

  const settlements = settled
    .map((j) => {
      const hit = found.get(String(j.jobId));
      return {
        jobId: j.jobId,
        passed: j.state === State.Passed,
        // passed → paid to agent / premium · failed → refund / bond penalty
        primary: j.state === State.Passed ? j.price - j.premium : j.price,
        secondary: j.state === State.Passed ? j.premium : j.bondSlice,
        price: j.price,
        agent: j.agent as Address,
        agentName: nameOf(j.agent),
        buyer: j.buyer as Address,
        txHash: hit?.txHash ?? null,
        blockNumber: hit?.blockNumber ?? null,
      };
    })
    .filter((s) => s.txHash)
    .sort((a, b) => Number((b.blockNumber ?? 0n) - (a.blockNumber ?? 0n)));

  const candidates = await surveyMarketplace(labels);
  const poolAssets = await withRetry(() =>
    publicClient.readContract({
      address: addresses.underwriterPool,
      abi: [{ type: "function", name: "totalAssets", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] }],
      functionName: "totalAssets",
    }),
  );

  const seen = new Set<string>();
  let totalBonded = 0n;
  for (const c of candidates) {
    const k = c.offer.agent.toLowerCase();
    if (!seen.has(k)) {
      seen.add(k);
      totalBonded += c.stats.staked;
    }
  }

  const manifest = {
    chainId: 5042002,
    blockNumber: latest,
    generatedAt: new Date().toISOString(),
    settlements,
    candidates,
    poolAssets,
    totalBonded,
  };

  const out = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "web", "src", "data", "proof.json");
  writeFileSync(out, json(manifest) + "\n");
  console.log(`wrote ${out}`);
  console.log(`  ${settlements.length} settlements · ${candidates.length} offers · pool ${poolAssets}`);
};

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
