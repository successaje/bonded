import assert from "node:assert/strict";
import { test } from "node:test";
import {
  assess,
  choose,
  DEFAULT_POLICY,
  rank,
  smoothedPassRate,
  type AgentStats,
  type Candidate,
  type OfferView,
} from "./underwriting.js";

const HASH = "0x0000000000000000000000000000000000000000000000000000000000000001" as const;

function offer(over: Partial<OfferView> = {}): OfferView {
  return {
    offerId: 1n,
    agent: "0x1111111111111111111111111111111111111111",
    price: 1_000_000n,
    bondSlice: 500_000n,
    premium: 20_000n,
    deliveryWindow: 3600,
    disputeWindow: 0,
    checker: "0x2222222222222222222222222222222222222222",
    criteriaHash: HASH,
    uri: "ipfs://sla",
    active: true,
    ...over,
  };
}

function stats(over: Partial<AgentStats> = {}): AgentStats {
  return {
    staked: 5_000_000n,
    locked: 0n,
    available: 5_000_000n,
    jobs: 10,
    passed: 10,
    failed: 0,
    volumePaid: 9_800_000n,
    volumeSlashed: 0n,
    ...over,
  };
}

const cand = (o: Partial<OfferView> = {}, s: Partial<AgentStats> = {}, label?: string): Candidate => ({
  offer: offer(o),
  stats: stats(s),
  label,
});

test("a brand-new agent is treated as a coin flip, not as flawless", () => {
  const fresh = smoothedPassRate(stats({ jobs: 0, passed: 0, failed: 0 }));
  assert.equal(fresh, 0.5);
  // and it can never reach 1.0 no matter how good the record
  assert.ok(smoothedPassRate(stats({ jobs: 100, passed: 100 })) < 1);
});

test("one failure out of one job is not read as hopeless", () => {
  const q = smoothedPassRate(stats({ jobs: 1, passed: 0, failed: 1 }));
  assert.ok(q > 0.3 && q < 0.4, `expected ~0.33, got ${q}`);
});

test("a bigger bond lowers expected cost — the core thesis", () => {
  const thin = assess(cand({ bondSlice: 100_000n }, { jobs: 10, passed: 8, failed: 2 }));
  const thick = assess(cand({ bondSlice: 900_000n }, { jobs: 10, passed: 8, failed: 2 }));
  assert.ok(thick.expectedCost < thin.expectedCost, "more bond must reduce expected cost");
});

test("a perfect record costs about the sticker price", () => {
  const a = assess(cand({}, { jobs: 200, passed: 200, failed: 0 }));
  assert.ok(Math.abs(a.expectedCost - Number(offer().price)) < 30_000, `got ${a.expectedCost}`);
});

test("unreliability is expensive when the bond does not cover the delay it causes", () => {
  // delayCost 400k > bondSlice 100k, so each failure is a net loss
  const a = assess(cand({ bondSlice: 100_000n }, { jobs: 10, passed: 6, failed: 4 }));
  assert.ok(a.expectedCost > Number(offer().price), "should price above sticker");
});

test("failure is never made profitable, however large the bond", () => {
  // A bond that dwarfs the delay it offsets must not price below sticker,
  // or the rational buyer would farm unreliable agents for penalties.
  const a = assess(cand({ bondSlice: 5_000_000n }, { jobs: 10, passed: 5, failed: 5 }));
  assert.equal(a.expectedCost, Number(offer().price));
  assert.ok(a.expectedCost >= Number(offer().price));
});

test("a bond that covers the delay fully substitutes for a track record", () => {
  // This is how a newcomer breaks into a market of incumbents: post capital
  // instead of history. Both price at sticker...
  const newcomer = assess(cand({ bondSlice: 500_000n }, { jobs: 0, passed: 0, failed: 0 }));
  const incumbent = assess(cand({ bondSlice: 500_000n }, { jobs: 80, passed: 79, failed: 1 }));
  assert.equal(newcomer.expectedCost, incumbent.expectedCost);
});

test("...but reputation still breaks the tie", () => {
  const newcomer = cand({ offerId: 1n, bondSlice: 500_000n }, { jobs: 0, passed: 0, failed: 0 }, "newcomer");
  const incumbent = cand({ offerId: 2n, bondSlice: 500_000n }, { jobs: 80, passed: 79, failed: 1 }, "incumbent");
  assert.equal(choose([newcomer, incumbent])?.label, "incumbent");
});

test("rejects offers the agent cannot actually back — before spending gas", () => {
  const a = assess(cand({ bondSlice: 500_000n }, { available: 100_000n }));
  assert.equal(a.eligible, false);
  assert.match(a.rejections.join(" "), /insufficient free bond/);
});

test("rejects decorative bonds, overpriced work, and inactive offers", () => {
  assert.match(assess(cand({ bondSlice: 10_000n })).rejections.join(" "), /covers only/);
  assert.match(assess(cand({ price: 9_000_000n })).rejections.join(" "), /above budget/);
  assert.match(assess(cand({ active: false })).rejections.join(" "), /inactive/);
});

test("rejects an agent whose failure rate breaches policy", () => {
  const a = assess(cand({}, { jobs: 10, passed: 2, failed: 8 }));
  assert.equal(a.eligible, false);
  assert.match(a.rejections.join(" "), /failure rate/);
});

test("the buyer knowingly pays a higher sticker price to buy down risk", () => {
  // CheapCo undercuts on price but posts a thin bond and has a patchy record,
  // so its risk premium more than eats the discount.
  const cheapAndFlaky = cand(
    { offerId: 1n, agent: "0xaaaa000000000000000000000000000000000000", price: 950_000n, bondSlice: 100_000n },
    { jobs: 20, passed: 14, failed: 6 },
    "CheapCo",
  );
  const dearAndSolid = cand(
    { offerId: 2n, agent: "0xbbbb000000000000000000000000000000000000", price: 1_000_000n, bondSlice: 500_000n },
    { jobs: 40, passed: 39, failed: 1 },
    "Leak",
  );
  const winner = choose([cheapAndFlaky, dearAndSolid]);
  assert.equal(winner?.label, "Leak");
  assert.ok(winner!.price > cheapAndFlaky.offer.price, "deliberately paid more for less risk");
});

test("a cheap agent with a serious bond genuinely deserves to win", () => {
  // The model must not just always prefer the incumbent — capital earns work.
  const cheapButBonded = cand(
    { offerId: 1n, price: 700_000n, bondSlice: 400_000n },
    { jobs: 6, passed: 5, failed: 1 },
    "Upstart",
  );
  const dearIncumbent = cand({ offerId: 2n, price: 1_000_000n, bondSlice: 500_000n }, { jobs: 40, passed: 39 }, "Leak");
  assert.equal(choose([cheapButBonded, dearIncumbent])?.label, "Upstart");
});

test("choose returns nothing rather than settling for an ineligible offer", () => {
  assert.equal(choose([cand({ active: false })]), null);
});

test("eligible offers always outrank ineligible ones", () => {
  const bad = cand({ offerId: 1n, active: false, price: 100_000n }, {}, "bad");
  const good = cand({ offerId: 2n }, {}, "good");
  assert.equal(rank([bad, good])[0].label, "good");
});

test("policy is honoured, not hardcoded", () => {
  const strict = { ...DEFAULT_POLICY, minCoverage: 0.9 };
  assert.equal(assess(cand({ bondSlice: 500_000n }), strict).eligible, false);
  assert.equal(assess(cand({ bondSlice: 500_000n })).eligible, true);
});

test("unknown agents are ranked below proven ones at equal terms", () => {
  const unknown = cand({ offerId: 1n }, { jobs: 0, passed: 0, failed: 0 }, "unknown");
  const proven = cand({ offerId: 2n }, { jobs: 50, passed: 49, failed: 1 }, "proven");
  assert.equal(choose([unknown, proven])?.label, "proven");
});
