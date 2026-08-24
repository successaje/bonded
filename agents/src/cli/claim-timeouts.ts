import { loadEnv } from "../env.js";
loadEnv();

import { jobEscrowAbi } from "../abis.js";
import { addresses, agentWallet, explorerTx, publicClient, requireKey, waitForTx } from "../chain.js";
import { withRetry } from "../rpc.js";

/**
 * Sweeps every job and resolves any that are Funded and past their delivery
 * deadline — anyone can call claimTimeout(jobId), it pays the buyer back the
 * fee plus the agent's bond slice. Without this running somewhere, a buyer
 * whose agent goes silent has their money locked forever with no automatic
 * resolution; nothing else in the pipeline does this today.
 *
 *   npm run claim-timeouts
 */

const main = async () => {
  const caller = agentWallet(requireKey("DEPLOYER_KEY"));
  const next = (await withRetry(() =>
    publicClient.readContract({ address: addresses.jobEscrow, abi: jobEscrowAbi, functionName: "nextJobId" }),
  )) as bigint;

  let claimed = 0;
  for (let id = 1n; id < next; id++) {
    const j = (await withRetry(() =>
      publicClient.readContract({ address: addresses.jobEscrow, abi: jobEscrowAbi, functionName: "getJob", args: [id] }),
    )) as { state: number; fundedAt: number; deliveryWindow: number };

    const overdue = j.state === 1 && Math.floor(Date.now() / 1000) > j.fundedAt + j.deliveryWindow;
    if (!overdue) continue;

    console.log(`job #${id} is overdue — claiming timeout…`);
    const hash = await withRetry(() =>
      caller.client.writeContract({ address: addresses.jobEscrow, abi: jobEscrowAbi, functionName: "claimTimeout", args: [id] }),
    );
    const r = await waitForTx(hash);
    console.log(`   ${r.status === "success" ? "✓" : "✗"} ${explorerTx(hash)}`);
    claimed++;
  }

  console.log(claimed === 0 ? "nothing overdue — clean." : `resolved ${claimed} overdue job(s).`);
};

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
