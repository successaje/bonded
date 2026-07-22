import { loadEnv } from "../env.js";
loadEnv();

import { erc20Abi, jobEscrowAbi } from "../abis.js";
import { addresses, agentWallet, explorerTx, publicClient, requireKey, usd, waitForTx } from "../chain.js";
import { FLEET_LABELS } from "../fleet.js";
import { readJob, STATE_NAME, State } from "../jobs.js";
import { surveyMarketplace } from "../marketplace.js";
import { withRetry } from "../rpc.js";
import { DEFAULT_POLICY, rank } from "../underwriting.js";

/**
 * The buyer agent. It holds its own wallet and spends its own USDC. Nobody
 * tells it who to hire: it reads the marketplace off Arc, prices each offer's
 * risk from the counterparty's live bond and settled track record, hires the
 * best risk-adjusted option, and waits for the chain to settle.
 *
 *   npm run buyer            # survey, decide, hire, watch
 *   npm run buyer -- --dry   # decide only, spend nothing
 */

const dry = process.argv.includes("--dry");
const buyer = agentWallet(requireKey("BUYER_KEY"));

const line = () => console.log("─".repeat(64));

async function watchJob(jobId: bigint, timeoutMs = 180_000) {
  const started = Date.now();
  let last = -1;
  while (Date.now() - started < timeoutMs) {
    const job = await readJob(jobId);
    if (job.state !== last) {
      last = job.state;
      console.log(`   job #${jobId} → ${STATE_NAME[job.state]}`);
    }
    if (job.state === State.Passed || job.state === State.Failed) return job;
    await new Promise((r) => setTimeout(r, 4000));
  }
  return readJob(jobId);
}

const main = async () => {
  const before = await publicClient.getBalance({ address: buyer.address });
  console.log(`\nBuyer agent ${buyer.address}`);
  console.log(`holding ${usd(before / 10n ** 12n)} — needs a recurring-spend audit\n`);

  line();
  console.log("1. survey the marketplace (public on-chain state only)");
  line();
  const candidates = await surveyMarketplace(FLEET_LABELS());
  const assessed = rank(candidates, DEFAULT_POLICY);
  for (const a of assessed) {
    console.log(
      `  ${a.eligible ? "✓" : "✗"} #${a.offerId} ${(a.label ?? "").padEnd(22)} ` +
        `${usd(a.price).padStart(6)} · bond ${usd(a.bondSlice).padStart(6)} (${(a.coverage * 100).toFixed(0).padStart(3)}%)` +
        ` · ${(a.passRate * 100).toFixed(0)}% pass` +
        (a.eligible ? ` → expected ${usd(a.expectedCost)}` : ` → ${a.rejections[0]}`),
    );
  }

  const pick = assessed.find((a) => a.eligible);
  if (!pick) {
    console.log("\nno offer clears policy — buying nothing. Refusing to hire is a valid outcome.\n");
    return;
  }

  line();
  console.log("2. decision");
  line();
  const cheapest = assessed.reduce((m, a) => (a.price < m.price ? a : m), assessed[0]);
  console.log(`  hiring ${pick.label} — offer #${pick.offerId} at ${usd(pick.price)}`);
  if (cheapest.offerId !== pick.offerId) {
    console.log(
      `  deliberately NOT the cheapest (${cheapest.label} at ${usd(cheapest.price)}): ${cheapest.rejections[0] ?? "worse risk-adjusted cost"}`,
    );
  }
  console.log(`  a failure here refunds ${usd(pick.price)} and pays ${usd(pick.bondSlice)} from the agent's bond`);

  if (dry) {
    console.log("\n--dry: stopping before spending.\n");
    return;
  }

  line();
  console.log("3. fund the job");
  line();
  const allowance = (await withRetry(() =>
    publicClient.readContract({
      address: addresses.usdc,
      abi: erc20Abi,
      functionName: "allowance",
      args: [buyer.address, addresses.jobEscrow],
    }),
  )) as bigint;
  if (allowance < pick.price) {
    const hash = await withRetry(() =>
      buyer.client.writeContract({
        address: addresses.usdc,
        abi: erc20Abi,
        functionName: "approve",
        args: [addresses.jobEscrow, pick.price * 10n],
      }),
    );
    await waitForTx(hash);
    console.log(`   approved escrow  ${explorerTx(hash)}`);
  }

  const hireHash = await withRetry(() =>
    buyer.client.writeContract({
      address: addresses.jobEscrow,
      abi: jobEscrowAbi,
      functionName: "hire",
      args: [pick.offerId],
    }),
  );
  const hireReceipt = await waitForTx(hireHash);
  if (hireReceipt.status !== "success") throw new Error("hire reverted");
  console.log(`   hired  ${explorerTx(hireHash)}`);

  // The job id is nextJobId-1 right after our hire lands.
  const next = (await withRetry(() =>
    publicClient.readContract({ address: addresses.jobEscrow, abi: jobEscrowAbi, functionName: "nextJobId" }),
  )) as bigint;
  const jobId = next - 1n;
  console.log(`   job #${jobId} funded — ${usd(pick.price)} escrowed, ${usd(pick.bondSlice)} of bond locked`);

  line();
  console.log("4. wait for the chain to settle (start the worker in another terminal)");
  line();
  const final = await watchJob(jobId);

  line();
  console.log("5. outcome");
  line();
  const after = await publicClient.getBalance({ address: buyer.address });
  const delta = (after - before) / 10n ** 12n;
  if (final.state === State.Passed) {
    console.log(`  work accepted — the agent was paid ${usd(final.price - final.premium)}`);
  } else if (final.state === State.Failed) {
    console.log(`  work rejected by the SLA's own checker`);
    console.log(`  compensated ${usd(final.price)} refund + ${usd(final.bondSlice)} penalty from the bond`);
  } else {
    console.log(`  still ${STATE_NAME[final.state]} — no worker delivered yet`);
  }
  console.log(`  buyer balance change: ${delta >= 0n ? "+" : ""}${usd(delta)} (incl. gas)\n`);
};

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
