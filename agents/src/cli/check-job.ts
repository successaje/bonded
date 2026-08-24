import { loadEnv } from "../env.js";
loadEnv();

import { jobEscrowAbi } from "../abis.js";
import { addresses, publicClient } from "../chain.js";

const STATE = ["None", "Funded", "Delivered", "Disputed", "Passed", "Failed"];

const next = (await publicClient.readContract({ address: addresses.jobEscrow, abi: jobEscrowAbi, functionName: "nextJobId" })) as bigint;
console.log("nextJobId:", next.toString(), `→ jobs 1..${Number(next) - 1} exist\n`);

for (let id = 1n; id < next; id++) {
  const j = (await publicClient.readContract({ address: addresses.jobEscrow, abi: jobEscrowAbi, functionName: "getJob", args: [id] })) as {
    state: number;
    buyer: string;
    agent: string;
    price: bigint;
    fundedAt: number;
    deliveryWindow: number;
  };
  const now = Math.floor(Date.now() / 1000);
  const overdue = j.state === 1 && now > j.fundedAt + j.deliveryWindow;
  console.log(
    `job #${id}  state=${STATE[j.state]}  buyer=${j.buyer}  agent=${j.agent}  price=$${Number(j.price) / 1e6}` +
      (overdue ? "  ⚠ OVERDUE, unclaimed" : ""),
  );
}
