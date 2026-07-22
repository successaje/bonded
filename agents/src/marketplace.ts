import type { Address } from "viem";
import { bondVaultAbi, outcomeLogAbi, slaRegistryAbi } from "./abis.js";
import { addresses, publicClient } from "./chain.js";
import { mapSeries, withRetry } from "./rpc.js";
import type { AgentStats, Candidate, OfferView } from "./underwriting.js";

/**
 * Reads the marketplace straight off Arc. Everything a buyer needs to judge a
 * counterparty is public: the offer terms, the bond actually free to back it,
 * and the settled outcome history. No private feed, no API key, no trust.
 */

export async function readOffer(offerId: bigint): Promise<OfferView> {
  const o = (await withRetry(() =>
    publicClient.readContract({
      address: addresses.slaRegistry,
      abi: slaRegistryAbi,
      functionName: "getOffer",
      args: [offerId],
    }),
  )) as {
    agent: Address;
    price: bigint;
    bondSlice: bigint;
    premium: bigint;
    deliveryWindow: number;
    disputeWindow: number;
    checker: Address;
    criteriaHash: `0x${string}`;
    uri: string;
    active: boolean;
  };
  return { offerId, ...o };
}

export async function readAgentStats(agent: Address): Promise<AgentStats> {
  const read = <T>(address: Address, abi: readonly unknown[], functionName: string) =>
    withRetry(() =>
      publicClient.readContract({ address, abi: abi as never, functionName, args: [agent] }),
    ) as Promise<T>;

  const staked = await read<bigint>(addresses.bondVault, bondVaultAbi, "staked");
  const locked = await read<bigint>(addresses.bondVault, bondVaultAbi, "locked");
  const available = await read<bigint>(addresses.bondVault, bondVaultAbi, "availableBond");
  const r = await read<{ jobs: bigint; passed: bigint; failed: bigint; volumePaid: bigint; volumeSlashed: bigint }>(
    addresses.outcomeLog,
    outcomeLogAbi,
    "trackRecord",
  );

  return {
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

/** Every offer ever published, with its agent's live bond and record. */
export async function surveyMarketplace(labels: Record<string, string> = {}): Promise<Candidate[]> {
  const next = (await withRetry(() =>
    publicClient.readContract({ address: addresses.slaRegistry, abi: slaRegistryAbi, functionName: "nextOfferId" }),
  )) as bigint;

  const ids = Array.from({ length: Number(next) - 1 }, (_, i) => BigInt(i + 1));
  const offers = await mapSeries(ids, readOffer);

  // One agent may publish several offers — read its bond and record once.
  const statsByAgent = new Map<string, AgentStats>();
  for (const o of offers) {
    const key = o.agent.toLowerCase();
    if (!statsByAgent.has(key)) statsByAgent.set(key, await readAgentStats(o.agent));
  }

  return offers.map((offer) => ({
    offer,
    stats: statsByAgent.get(offer.agent.toLowerCase())!,
    label: labels[offer.agent.toLowerCase()] ?? `agent ${offer.agent.slice(0, 8)}`,
  }));
}
