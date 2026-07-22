import { loadEnv } from "../env.js";
loadEnv();

import { jobEscrowAbi } from "../abis.js";
import { addresses, agentWallet, explorerTx, requireKey, usd, waitForTx } from "../chain.js";
import { buildDeliverable, degradedAudit, LEAK_AUDIT, meetsCriteria } from "../deliverable.js";
import { FLEET } from "../fleet.js";
import { allJobs, isOverdue, State } from "../jobs.js";
import { withRetry } from "../rpc.js";

/**
 * A worker agent. It holds its own wallet, watches Arc for jobs hired against
 * its own offers, does the work, and delivers it — signing for itself. No
 * human in the loop, and no human able to stop it being slashed if the work
 * doesn't clear the SLA it sold.
 *
 *   npm run worker -- leak          # deliver as Leak
 *   npm run worker -- flaky --once  # single pass
 */

const arg = process.argv[2];
const once = process.argv.includes("--once");
/**
 * Simulates the agent having a bad day — a scraper hitting a dead site, a
 * model timing out, a corner cut. The work still gets delivered; it just
 * doesn't clear the SLA that was sold. Nothing about the buyer's logic or
 * the contracts changes: the chain decides what that costs.
 */
const badDay = process.argv.includes("--fail");
const member = FLEET.find((m) => m.id === arg);
if (!member) {
  console.error(`usage: npm run worker -- <${FLEET.map((m) => m.id).join("|")}> [--once] [--fail]`);
  process.exit(1);
}

const wallet = agentWallet(requireKey(member.envKey));

async function tick() {
  const jobs = (await allJobs()).filter(
    (j) => j.state === State.Funded && j.agent.toLowerCase() === wallet.address.toLowerCase(),
  );

  if (jobs.length === 0) return;

  for (const job of jobs) {
    if (isOverdue(job)) {
      console.log(`job #${job.jobId} is past its deadline — cannot deliver, the bond is forfeit`);
      continue;
    }

    const claim = badDay ? degradedAudit(Number(job.jobId)) : LEAK_AUDIT;
    const { evidence, deliverableHash } = buildDeliverable(claim);

    console.log(`\n${member!.name} → job #${job.jobId} (${usd(job.price)})`);
    console.log(
      // report figures are in cents; 1 cent = 10_000 micro-USDC
      `   audit claims ${usd(claim.recoverableCents * 10_000n)}/yr recoverable, ` +
        `${claim.findings} findings — ${meetsCriteria(claim) ? "clears the SLA" : "SHORT of the SLA it sold"}`,
    );

    const hash = await withRetry(
      () =>
        wallet.client.writeContract({
          address: addresses.jobEscrow,
          abi: jobEscrowAbi,
          functionName: "deliver",
          args: [job.jobId, deliverableHash, evidence],
        }),
      6,
    );
    const receipt = await waitForTx(hash);
    console.log(`   delivered → ${explorerTx(hash)}`);
    console.log(
      `   the chain decided: ${meetsCriteria(claim) ? "PAID" : "SLASHED — buyer compensated from the bond"}` +
        `  (gas ${receipt.gasUsed})`,
    );
  }
}

const main = async () => {
  console.log(`${member.name} online — ${wallet.address}`);
  console.log(`watching Arc for jobs on its offers${once ? " (single pass)" : ""}…`);
  do {
    await tick();
    if (!once) await new Promise((r) => setTimeout(r, 10_000));
  } while (!once);
};

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
