import type { Address, Hex } from "viem";
import { jobEscrowAbi } from "./abis.js";
import { addresses, publicClient } from "./chain.js";
import { mapSeries, withRetry } from "./rpc.js";

/** JobEscrow.State — confirmed against the deployed contract. */
export const State = {
  None: 0,
  Funded: 1,
  Delivered: 2,
  Disputed: 3,
  Passed: 4,
  Failed: 5,
} as const;

export const STATE_NAME: Record<number, string> = {
  0: "none",
  1: "in progress",
  2: "delivered",
  3: "disputed",
  4: "passed",
  5: "slashed",
};

export interface JobView {
  jobId: bigint;
  offerId: bigint;
  buyer: Address;
  agent: Address;
  price: bigint;
  bondSlice: bigint;
  premium: bigint;
  fundedAt: number;
  deliveredAt: number;
  deliveryWindow: number;
  disputeWindow: number;
  checker: Address;
  criteriaHash: Hex;
  deliverableHash: Hex;
  state: number;
}

export async function readJob(jobId: bigint): Promise<JobView> {
  const j = (await withRetry(() =>
    publicClient.readContract({ address: addresses.jobEscrow, abi: jobEscrowAbi, functionName: "getJob", args: [jobId] }),
  )) as Omit<JobView, "jobId">;
  return { jobId, ...j };
}

export async function nextJobId(): Promise<bigint> {
  return (await withRetry(() =>
    publicClient.readContract({ address: addresses.jobEscrow, abi: jobEscrowAbi, functionName: "nextJobId" }),
  )) as bigint;
}

/** All jobs, newest last. Fine at demo scale; an indexer would page this. */
export async function allJobs(): Promise<JobView[]> {
  const next = await nextJobId();
  const ids = Array.from({ length: Number(next) - 1 }, (_, i) => BigInt(i + 1));
  return mapSeries(ids, readJob);
}

export const isOverdue = (j: JobView, now = Math.floor(Date.now() / 1000)) =>
  j.state === State.Funded && now > j.fundedAt + j.deliveryWindow;
