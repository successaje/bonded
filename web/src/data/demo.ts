import type { ActivityEvent, Agent, FailKind, Job, Pool, World } from "./types";

/**
 * The demo data source: a seeded simulation of the Bonded protocol so the
 * dashboard is alive before (and alongside) live chain reads. It follows the
 * exact contract economics — pass pays price−premium to the agent and the
 * premium to the pool; fail pays price+slice to the buyer out of the bond.
 *
 * The seam: anything that renders reads `World` via useWorld(). A ChainSource
 * reading JobEscrow/OutcomeLog events over viem replaces this file without
 * touching a single component.
 */

const U = 1_000_000; // $1 in micro-USDC

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const BUYERS = [
  "0x7f3ab812", "0x91c04e77", "0x2ad85f19", "0xb35c60d4",
  "0x5e91aa02", "0xc7d3128f", "0x30f6b9ce", "0xe84a75d1",
];

function seedAgents(): Agent[] {
  return [
    {
      id: "leak", name: "Leak", initial: "L", service: "Recurring-spend audits",
      price: 50 * U, slice: 25 * U, premium: 1 * U,
      staked: 500 * U, locked: 0,
      jobs: 34, passed: 33, failed: 1,
      volumePaid: 33 * 49 * U, volumeSlashed: 25 * U,
      deterministic: true,
    },
    {
      id: "scribe", name: "Scribe", initial: "S", service: "Docs & changelog writing",
      price: 12 * U, slice: 6 * U, premium: 240_000,
      staked: 150 * U, locked: 0,
      jobs: 58, passed: 57, failed: 1,
      volumePaid: 57 * 11_760_000, volumeSlashed: 6 * U,
      deterministic: false,
    },
    {
      id: "quant", name: "Quant", initial: "Q", service: "Market-data backtests",
      price: 80 * U, slice: 40 * U, premium: 1_600_000,
      staked: 800 * U, locked: 0,
      jobs: 21, passed: 20, failed: 1,
      volumePaid: 20 * 78_400_000, volumeSlashed: 40 * U,
      deterministic: false,
    },
    {
      id: "flaky", name: "Flaky Labs", initial: "F", service: "Web scraping runs",
      price: 30 * U, slice: 15 * U, premium: 600_000,
      staked: 120 * U, locked: 0,
      jobs: 12, passed: 8, failed: 4,
      volumePaid: 8 * 29_400_000, volumeSlashed: 60 * U,
      deterministic: true,
    },
  ];
}

export class DemoEngine {
  private rand = mulberry32(7);
  private agents = seedAgents();
  private jobs: Job[] = [];
  private events: ActivityEvent[] = [];
  private pool: Pool;
  private claimsPaidTotal = 393 * U; // 7 historical claims across the fleet
  private claimsCount = 7;
  private settledCount = 118;

  private jobSeq = 1000;
  private eventSeq = 1;
  private nextActionAt = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private listeners = new Set<() => void>();
  private snapshot!: World;

  constructor() {
    const now = Date.now();
    const assets = 12_418 * U;
    const history = Array.from({ length: 36 }, (_, i) => {
      const t = now - (36 - i) * 5 * 60_000;
      const drift = (i / 36) * 260 * U + Math.sin(i / 3.1) * 14 * U;
      return { t, assets: assets - 260 * U + drift };
    });
    this.pool = {
      assets,
      shares: Math.round(assets / 1.043),
      lps: 9,
      premiumsSession: 0,
      history,
    };
    this.seedLiveJobs(now);
    this.emit();
  }

  private seedLiveJobs(now: number) {
    const mk = (partial: Omit<Job, "id">): Job => ({ id: this.jobSeq++, ...partial });
    const a = (id: string) => this.agents.find((x) => x.id === id)!;

    const funded = (agentId: string, ageMs: number, windowMs: number): Job => {
      const ag = a(agentId);
      ag.locked += ag.slice;
      return mk({
        agentId, buyer: this.pickBuyer(), price: ag.price, slice: ag.slice, premium: ag.premium,
        state: "funded", fundedAt: now - ageMs, deliveryDeadline: now - ageMs + windowMs,
      });
    };

    const j1 = funded("leak", 6_000, 34_000);
    const j2 = funded("quant", 14_000, 45_000);

    const ag3 = a("scribe");
    ag3.locked += ag3.slice;
    const j3 = mk({
      agentId: "scribe", buyer: this.pickBuyer(), price: ag3.price, slice: ag3.slice, premium: ag3.premium,
      state: "delivered", fundedAt: now - 26_000, deliveryDeadline: now - 26_000 + 40_000,
      deliveredAt: now - 7_000, disputeDeadline: now + 6_500,
    });

    const settled = (agentId: string, ageMs: number, ok: boolean, failKind?: FailKind): Job => {
      const ag = a(agentId);
      return mk({
        agentId, buyer: this.pickBuyer(), price: ag.price, slice: ag.slice, premium: ag.premium,
        state: ok ? "passed" : "failed", fundedAt: now - ageMs - 30_000, deliveryDeadline: now - ageMs - 5_000,
        deliveredAt: ok ? now - ageMs - 8_000 : undefined, settledAt: now - ageMs, failKind,
      });
    };

    const j4 = settled("leak", 48_000, true);
    const j5 = settled("flaky", 95_000, false, "checker");
    const j6 = settled("scribe", 150_000, true);

    this.jobs = [j1, j2, j3, j4, j5, j6];

    this.pushEvent({ at: now - 48_000, kind: "settled", agentId: "leak", jobId: j4.id, amount: 49 * U, premium: 1 * U });
    this.pushEvent({ at: now - 95_000, kind: "slashed", agentId: "flaky", jobId: j5.id, amount: 45 * U, failKind: "checker" });
    this.pushEvent({ at: now - 150_000, kind: "settled", agentId: "scribe", jobId: j6.id, amount: 11_760_000, premium: 240_000 });
    this.pushEvent({ at: now - 14_000, kind: "funded", agentId: "quant", jobId: j2.id, amount: 80 * U });
    this.pushEvent({ at: now - 6_000, kind: "funded", agentId: "leak", jobId: j1.id, amount: 50 * U });
    this.events.sort((x, y) => y.at - x.at);
  }

  // ---------- store plumbing ----------

  subscribe = (cb: () => void): (() => void) => {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  };

  getSnapshot = (): World => this.snapshot;

  start() {
    if (this.timer) return;
    this.nextActionAt = Date.now() + 2_800;
    this.timer = setInterval(() => this.tick(), 700);
  }

  private emit() {
    this.snapshot = {
      agents: this.agents.map((a) => ({ ...a })),
      jobs: [...this.jobs],
      events: [...this.events],
      pool: { ...this.pool, history: [...this.pool.history] },
      claimsPaidTotal: this.claimsPaidTotal,
      claimsCount: this.claimsCount,
      settledCount: this.settledCount,
    };
    this.listeners.forEach((cb) => cb());
  }

  private pushEvent(e: Omit<ActivityEvent, "id">) {
    this.events.unshift({ id: this.eventSeq++, ...e });
    if (this.events.length > 40) this.events.pop();
  }

  private pickBuyer(): string {
    return BUYERS[Math.floor(this.rand() * BUYERS.length)];
  }

  // ---------- the simulation ----------

  private tick() {
    const now = Date.now();
    let changed = false;

    // Deadlines fire regardless of the action scheduler.
    for (const j of this.jobs) {
      if (j.state === "funded" && now > j.deliveryDeadline) {
        this.fail(j, now, "timeout");
        changed = true;
      } else if (j.state === "delivered" && j.disputeDeadline && now > j.disputeDeadline) {
        this.pass(j, now); // silence is consent
        changed = true;
      } else if (j.state === "disputed" && j.disputeDeadline && now > j.disputeDeadline) {
        // v1 arbiter rules — most disputes that get raised are real
        if (this.rand() < 0.7) this.fail(j, now, "dispute");
        else this.pass(j, now);
        changed = true;
      }
    }

    if (now >= this.nextActionAt) {
      this.act(now);
      this.nextActionAt = now + 2_600 + this.rand() * 2_800;
      changed = true;
    }

    if (changed) this.emit();
  }

  private act(now: number) {
    const funded = this.jobs.filter((j) => j.state === "funded");
    const delivered = this.jobs.filter((j) => j.state === "delivered");

    if (funded.length < 2 && this.rand() < 0.7) {
      this.fund(now);
      return;
    }

    // Occasionally a buyer disputes a delivered job mid-window.
    if (delivered.length > 0 && this.rand() < 0.08) {
      const j = delivered[0];
      j.state = "disputed";
      j.disputeDeadline = now + 5_000 + this.rand() * 3_000;
      return;
    }

    const j = funded[0];
    if (!j) {
      this.fund(now);
      return;
    }
    this.deliverJob(j, now);
  }

  private fund(now: number) {
    const weights: [string, number][] = [["leak", 0.34], ["scribe", 0.24], ["quant", 0.2], ["flaky", 0.22]];
    let r = this.rand();
    let agentId = weights[0][0];
    for (const [id, w] of weights) {
      if (r < w) { agentId = id; break; }
      r -= w;
    }
    const ag = this.agents.find((a) => a.id === agentId)!;
    if (ag.staked - ag.locked < ag.slice) return; // vault would revert the hire

    ag.locked += ag.slice;
    const job: Job = {
      id: this.jobSeq++, agentId, buyer: this.pickBuyer(),
      price: ag.price, slice: ag.slice, premium: ag.premium,
      state: "funded", fundedAt: now,
      deliveryDeadline: now + 26_000 + this.rand() * 16_000,
    };
    this.jobs.unshift(job);
    if (this.jobs.length > 26) this.jobs.pop();
    this.pushEvent({ at: now, kind: "funded", agentId, jobId: job.id, amount: job.price });
  }

  private deliverJob(j: Job, now: number) {
    const ag = this.agents.find((a) => a.id === j.agentId)!;

    // Flaky Labs sometimes ships work that fails its own acceptance checker,
    // and sometimes just goes quiet until the deadline slashes it.
    if (j.agentId === "flaky") {
      const r = this.rand();
      if (r < 0.4) { this.fail(j, now, "checker"); return; }
      if (r < 0.55) return; // stays silent → timeout path fires later
    }

    j.deliveredAt = now;
    if (ag.deterministic) {
      this.pass(j, now);
    } else {
      j.state = "delivered";
      j.disputeDeadline = now + 9_000 + this.rand() * 6_000;
    }
  }

  private pass(j: Job, now: number) {
    const ag = this.agents.find((a) => a.id === j.agentId)!;
    j.state = "passed";
    j.settledAt = now;
    ag.locked -= j.slice;
    ag.jobs += 1;
    ag.passed += 1;
    ag.volumePaid += j.price - j.premium;
    this.settledCount += 1;
    this.pool.assets += j.premium;
    this.pool.premiumsSession += j.premium;
    this.pool.history.push({ t: now, assets: this.pool.assets });
    if (this.pool.history.length > 240) this.pool.history.shift();
    this.pushEvent({ at: now, kind: "settled", agentId: j.agentId, jobId: j.id, amount: j.price - j.premium, premium: j.premium });
  }

  private fail(j: Job, now: number, kind: FailKind) {
    const ag = this.agents.find((a) => a.id === j.agentId)!;
    j.state = "failed";
    j.settledAt = now;
    j.failKind = kind;
    ag.locked -= j.slice;
    ag.staked -= j.slice;
    ag.jobs += 1;
    ag.failed += 1;
    ag.volumeSlashed += j.slice;
    this.claimsPaidTotal += j.price + j.slice;
    this.claimsCount += 1;
    this.pushEvent({ at: now, kind: "slashed", agentId: j.agentId, jobId: j.id, amount: j.price + j.slice, failKind: kind });
  }
}
