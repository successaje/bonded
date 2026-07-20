import { AnimatePresence, motion } from "framer-motion";
import { forwardRef } from "react";
import { CountUp } from "../components/CountUp";
import { Avatar, agentTone, BondedBadge, EmptyState, StatTile } from "../components/ui";
import { useNow, useWorld } from "../data/source";
import type { ActivityEvent, Agent } from "../data/types";
import { fmtUsd, pct, timeAgo } from "../lib/format";

const FAIL_LABEL = {
  checker: "failed the acceptance check",
  timeout: "missed the deadline",
  dispute: "dispute upheld by arbiter",
} as const;

const FeedRow = forwardRef<HTMLDivElement, { e: ActivityEvent; agent: Agent; now: number }>(function FeedRow(
  { e, agent, now },
  ref
) {
  const icon = e.kind === "settled" ? "✓" : e.kind === "slashed" ? "✕" : "→";
  return (
    <motion.div
      ref={ref}
      layout
      className="row feed-row"
      initial={{ opacity: 0, y: -14, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ type: "spring", stiffness: 420, damping: 34 }}
    >
      <div className={`row-icon ${e.kind}`} aria-hidden="true">{icon}</div>
      <div className="row-main">
        {e.kind === "funded" && (
          <>
            <div className="row-title">Job funded · {agent.name}</div>
            <div className="row-sub">bond slice locked · deterministic escrow</div>
          </>
        )}
        {e.kind === "settled" && (
          <>
            <div className="row-title">Settled in under a second · {agent.name}</div>
            <div className="row-sub">
              <b>{fmtUsd(e.premium ?? 0)}</b> premium to underwriters
            </div>
          </>
        )}
        {e.kind === "slashed" && (
          <>
            <div className="row-title">SLA broken · {agent.name} slashed</div>
            <div className="row-sub">{e.failKind ? FAIL_LABEL[e.failKind] : "SLA breach"}</div>
          </>
        )}
      </div>
      <div className={`row-amt ${e.kind === "settled" ? "pos" : e.kind === "slashed" ? "neg" : "neu"}`}>
        {e.kind === "funded" ? fmtUsd(e.amount) : `+${fmtUsd(e.amount)}`}
        <span className="u">{e.kind === "settled" ? "to agent" : e.kind === "slashed" ? "to buyer" : "escrowed"}</span>
      </div>
      <div className="row-time">{timeAgo(e.at, now)}</div>
    </motion.div>
  );
});

export function Overview({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const world = useWorld();
  const now = useNow(1000);
  const byId = new Map(world.agents.map((a) => [a.id, a]));
  const totalBonded = world.agents.reduce((s, a) => s + a.staked, 0);
  const totalProtected = totalBonded + world.pool.assets;
  const activeJobs = world.jobs.filter((j) => j.state === "funded" || j.state === "delivered" || j.state === "disputed");
  const tvlSpark = world.pool.history.slice(-24).map((p) => p.assets);

  return (
    <div>
      <motion.div className="hero" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
        <div>
          <p className="eyebrow">Total value protected</p>
          <div className="hero-num">
            <CountUp value={totalProtected} format={(v) => fmtUsd(v, { compact: true })} />
          </div>
          <div className="hero-sub">
            USDC standing behind the fleet's promises on Arc · settled in <span className="up">~1s</span>, not months
          </div>
        </div>
        <div className="hero-splits">
          <div className="hero-split">
            <div className="k">Agent bonds</div>
            <div className="v">{fmtUsd(totalBonded, { compact: true })}</div>
          </div>
          <div className="hero-split">
            <div className="k">Underwriter pool</div>
            <div className="v">{fmtUsd(world.pool.assets, { compact: true })}</div>
          </div>
        </div>
      </motion.div>

      <div className="tiles">
        <StatTile
          label="Claims paid to buyers"
          value={<CountUp value={world.claimsPaidTotal} format={(v) => fmtUsd(v, { compact: true })} />}
          sub={<span>{world.claimsCount} claims · <span className="up">instant</span> compensation</span>}
          delay={0.04}
        />
        <StatTile
          label="Jobs settled"
          value={<CountUp value={world.settledCount} format={(v) => Math.round(v).toLocaleString()} />}
          sub={<span>{activeJobs.length} live right now</span>}
          delay={0.1}
        />
        <StatTile
          label="Underwriter pool"
          value={<CountUp value={world.pool.assets} format={(v) => fmtUsd(v, { compact: true })} />}
          sub={<span>premiums from real work</span>}
          spark={tvlSpark}
          delay={0.16}
        />
      </div>

      <div className="overview-grid">
        <motion.div className="card" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.12 }}>
          <div className="section-head">
            <h3 className="section-title">Settlement feed</h3>
            <span className="section-note">live on Arc</span>
          </div>
          <div className="rows">
            <AnimatePresence initial={false} mode="popLayout">
              {world.events.slice(0, 8).map((e) => {
                const agent = byId.get(e.agentId);
                return agent ? <FeedRow key={e.id} e={e} agent={agent} now={now} /> : null;
              })}
            </AnimatePresence>
          </div>
        </motion.div>

        <div className="stack">
          <motion.div className="card" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.18 }}>
            <div className="section-head">
              <h3 className="section-title">Bonded fleet</h3>
              <span className="section-note">{world.agents.length} agents</span>
            </div>
            <div className="rows">
              {world.agents.map((a) => (
                <div key={a.id} className="row fleet-row">
                  <Avatar initial={a.initial} tone={agentTone(a.id)} size={30} />
                  <div className="row-main">
                    <div className="fleet-name">{a.name}</div>
                    <div className="fleet-meta">
                      {Math.round(pct(a.passed, a.jobs))}% pass · {a.jobs} jobs
                    </div>
                  </div>
                  <div className="fleet-amt">
                    <div className="v mono">{fmtUsd(a.staked, { cents: false })}</div>
                    <div className="k">bonded</div>
                  </div>
                </div>
              ))}
            </div>
            <button className="btn ghost" style={{ width: "100%", marginTop: 15 }} onClick={() => onNavigate("agents")}>
              View agents
            </button>
          </motion.div>

          <motion.div className="card flat" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.24 }}>
            <p className="eyebrow">Why it matters</p>
            <div className="prose">
              Every job is backed by locked USDC. Pass the SLA's own acceptance check and settlement is instant. Break it and
              the buyer is paid back — <b>plus a penalty from the agent's bond</b> — in one sub-second Arc transaction.{" "}
              <BondedBadge /> is the badge worth demanding.
            </div>
          </motion.div>
        </div>
      </div>

      {world.events.length === 0 && <EmptyState icon="◷" title="No settlements yet" sub="Fund a job to see it flow through" />}
    </div>
  );
}
