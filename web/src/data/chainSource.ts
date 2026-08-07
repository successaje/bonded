import type { Address, Hex } from "viem";
import type { AgentStats, Candidate, OfferView } from "@bonded/underwriting";
import { bondVaultAbi, outcomeLogAbi, slaRegistryAbi, underwriterPoolAbi } from "../lib/abis";
import { addresses, mapSeries, nameOf, publicClient, withRetry } from "../lib/chain";

/**
 * Reads the live deployment on Arc. Deliberately fetch-once rather than
 * polling: settled jobs are immutable, and the public RPC rate-limits bursts
 * hard enough that a chatty dashboard would spend the demo in backoff.
 */

export interface Settlement {
  jobId: bigint;
  passed: boolean;
  /** passed → paid to agent · failed → refunded to buyer */
  primary: bigint;
  /** passed → premium to pool · failed → slashed from bond to buyer */
  secondary: bigint;
  txHash: Hex;
  blockNumber: bigint;
  agent: Address;
  agentName: string;
  buyer: Address;
  price: bigint;
}

export interface ChainSnapshot {
  settlements: Settlement[];
  candidates: Candidate[];
  poolAssets: bigint;
  totalBonded: bigint;
  blockNumber: bigint;
  fetchedAt: number;
}

export interface Reputation {
  address: Address;
  name: string;
  staked: bigint;
  locked: bigint;
  available: bigint;
  jobs: number;
  passed: number;
  failed: number;
  volumePaid: bigint;
  volumeSlashed: bigint;
}

/** Live reputation for any address — the Reputation Explorer's lookup. */
export async function readReputation(address: Address): Promise<Reputation> {
  const read = async <T>(addr: Address, abi: unknown, fn: string) =>
    (await withRetry(() =>
      publicClient.readContract({ address: addr, abi: abi as never, functionName: fn, args: [address] }),
    )) as T;

  const staked = await read<bigint>(addresses.bondVault, bondVaultAbi, "staked");
  const locked = await read<bigint>(addresses.bondVault, bondVaultAbi, "locked");
  const available = await read<bigint>(addresses.bondVault, bondVaultAbi, "availableBond");
  const r = await read<{ jobs: bigint; passed: bigint; failed: bigint; volumePaid: bigint; volumeSlashed: bigint }>(
    addresses.outcomeLog,
    outcomeLogAbi,
    "trackRecord",
  );
  return {
    address,
    name: nameOf(address),
    staked,
    locked,
    available,
    jobs: Number(r.jobs),
    passed: Number(r.passed),
    failed: Number(r.failed),
    volumePaid: r.volumePaid,
    volumeSlashed: r.volumeSlashed,
  };
}

async function loadMarketplace(): Promise<Candidate[]> {
  const next = (await withRetry(() =>
    publicClient.readContract({ address: addresses.slaRegistry, abi: slaRegistryAbi, functionName: "nextOfferId" }),
  )) as bigint;

  const ids = Array.from({ length: Number(next) - 1 }, (_, i) => BigInt(i + 1));
  const offers = await mapSeries(ids, async (offerId) => {
    const o = (await withRetry(() =>
      publicClient.readContract({
        address: addresses.slaRegistry,
        abi: slaRegistryAbi,
        functionName: "getOffer",
        args: [offerId],
      }),
    )) as Omit<OfferView, "offerId">;
    return { offerId, ...o } as OfferView;
  });

  const statsByAgent = new Map<string, AgentStats>();
  for (const o of offers) {
    const key = o.agent.toLowerCase();
    if (statsByAgent.has(key)) continue;
    const read = async <T>(address: Address, abi: unknown, fn: string) =>
      (await withRetry(() =>
        publicClient.readContract({ address, abi: abi as never, functionName: fn, args: [o.agent] }),
      )) as T;

    const staked = await read<bigint>(addresses.bondVault, bondVaultAbi, "staked");
    const locked = await read<bigint>(addresses.bondVault, bondVaultAbi, "locked");
    const available = await read<bigint>(addresses.bondVault, bondVaultAbi, "availableBond");
    const r = await read<{ jobs: bigint; passed: bigint; failed: bigint; volumePaid: bigint; volumeSlashed: bigint }>(
      addresses.outcomeLog,
      outcomeLogAbi,
      "trackRecord",
    );
    statsByAgent.set(key, {
      staked,
      locked,
      available,
      jobs: Number(r.jobs),
      passed: Number(r.passed),
      failed: Number(r.failed),
      volumePaid: r.volumePaid,
      volumeSlashed: r.volumeSlashed,
    });
  }

  return offers.map((offer) => ({
    offer,
    stats: statsByAgent.get(offer.agent.toLowerCase())!,
    label: nameOf(offer.agent),
  }));
}

/**
 * Live state that actually moves: offers, bonds, track records, pool size.
 *
 * Settlement receipts deliberately are not fetched here. They need historical
 * log queries, and Arc's public RPC caps eth_getLogs at a 10,000-block range —
 * the deployment is already hundreds of thousands of blocks back, so a live
 * scan means dozens of chunked calls against an endpoint that rate-limits.
 * Those immutable receipts come from the generated manifest instead
 * (`npm run snapshot`), each one linkable to ArcScan.
 */
export async function loadChainSnapshot(): Promise<ChainSnapshot> {
  const blockNumber = await withRetry(() => publicClient.getBlockNumber());
  const settlements: Settlement[] = [];
  const candidates = await loadMarketplace();
  const poolAssets = (await withRetry(() =>
    publicClient.readContract({ address: addresses.underwriterPool, abi: underwriterPoolAbi, functionName: "totalAssets" }),
  )) as bigint;

  const seen = new Set<string>();
  let totalBonded = 0n;
  for (const c of candidates) {
    const k = c.offer.agent.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    totalBonded += c.stats.staked;
  }

  return { settlements, candidates, poolAssets, totalBonded, blockNumber, fetchedAt: Date.now() };
}
