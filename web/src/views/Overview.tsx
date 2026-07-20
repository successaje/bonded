import { AnimatePresence, motion } from "framer-motion";
import { forwardRef } from "react";
import { CountUp } from "../components/CountUp";
import { Avatar, BondedBadge, StatCard } from "../components/ui";
import { useNow, useWorld } from "../data/source";
import type { ActivityEvent, Agent } from "../data/types";
import { fmtUsd, pct, timeAgo } from "../lib/format";

const FAIL_LABEL = {
  checker: "failed the acceptance check",
  timeout: "missed the deadline",
  dispute: "dispute upheld",
} as const;

const FeedItem = forwardRef<HTMLDivElement, { e: ActivityEvent; agent: Agent; now: number }>(function FeedItem(
  { e, agent, now },
  ref
) {
  const icon = e.kind === "settled" ? "✓" : e.kind === "slashed" ? "✕" : "→";
  return (
    <motion.div
      ref={ref}
      layout
      className={`feed-item ${e.kind}`}
      initial={{ opacity: 0, y: -16, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ type: "spring", stiffness: 420, damping: 34 }}
    >
      <div className="feed-icon" aria-hidden="true">{icon}</div>
      <div className="feed-main">
        {e.kind === "funded" && (
          <>
            <div className="feed-title">Job funded · {agent.name}</div>
            <div className="feed-sub">
              buyer escrowed <b>{fmtUsd(e.amount)}</b> · bond slice locked
            </div>
          </>
        )}
        {e.kind === "settled" && (
          <>
            <div className="feed-title">Settled in under a second · {agent.name}</div>
            <div className="feed-sub">
              <b>{fmtUsd(e.amount)}</b> to agent · {fmtUsd(e.premium ?? 0)} premium to underwriters
            </div>
          </>
        )}
        {e.kind === "slashed" && (
          <>
            <div className="feed-title">SLA broken · {agent.name} slashed</div>
            <div className="feed-sub">
              buyer compensated <b>{fmtUsd(e.amount)}</b> — {e.failKind ? FAIL_LABEL[e.failKind] : "SLA breach"}
            </div>
          </>
        )}
      </div>
      <div className="when">{timeAgo(e.at, now)}</div>
    </motion.div>
  );
});

export function Overview({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const world = useWorld();
  const now = useNow(1000);
  const byId = new Map(world.agents.map((a) => [a.id, a]));
  const totalBonded = world.agents.reduce((s, a) => s + a.staked, 0);
  const activeJobs = world.jobs.filter((j) => j.state === "funded" || j.state === "delivered" || j.state === "disputed");
  const tvlSpark = world.pool.history.slice(-24).map((p) => p.assets);

  return (
    <div>
      <div className="kpis">
        <StatCard
          label="Total bonded"
          value={<CountUp value={totalBonded} format={(v) => fmtUsd(v, { compact: true })} />}
          sub={<span>{world.agents.length} agents with skin in the game</span>}
        />
        <StatCard
          label="Claims paid to buyers"
          value={<CountUp value={world.claimsPaidTotal} format={(v) => fmtUsd(v, { compact: true })} />}
          sub={
            <span>
              {world.claimsCount} claims · settled in <span className="up">~1s</span>, not months
            </span>
          }
        />
        <StatCard
          label="Jobs settled"
          value={<CountUp value={world.settledCount} format={(v) => Math.round(v).toLocaleString()} />}
          sub={<span>{activeJobs.length} live right now</span>}
        />
        <StatCard
          label="Underwriter pool"
          value={<CountUp value={world.pool.assets} format={(v) => fmtUsd(v, { compact: true })} />}
          sub={<span>premiums from real work</span>}
          spark={tvlSpark}
        />
      </div>

      <div className="overview-grid">
        <motion.div className="card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.08 }}>
          <p className="eyebrow">Live</p>
          <h3 className="section-title">Settlement feed</h3>
          <div className="feed">
            <AnimatePresence initial={false} mode="popLayout">
              {world.events.slice(0, 9).map((e) => {
                const agent = byId.get(e.agentId);
                return agent ? <FeedItem key={e.id} e={e} agent={agent} now={now} /> : null;
              })}
            </AnimatePresence>
          </div>
        </motion.div>

        <div className="stack">
          <motion.div className="card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.16 }}>
            <p className="eyebrow">Fleet</p>
            <h3 className="section-title">Bonded agents</h3>
            <div style={{ display: "grid", gap: 12 }}>
              {world.agents.map((a) => (
                <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 11 }}>
                  <Avatar initial={a.initial} size={34} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 620, fontSize: 13.5 }}>{a.name}</div>
                    <div style={{ fontSize: 12, color: "var(--text-3)" }}>
                      {Math.round(pct(a.passed, a.jobs))}% pass · {a.jobs} jobs
                    </div>
                  </div>
                  <div style={{ marginLeft: "auto", textAlign: "right" }}>
                    <div className="mono" style={{ fontWeight: 640, fontSize: 13.5 }}>{fmtUsd(a.staked, { cents: false })}</div>
                    <div style={{ fontSize: 11.5, color: "var(--text-3)" }}>bonded</div>
                  </div>
                </div>
              ))}
            </div>
            <button className="btn" style={{ width: "100%", marginTop: 16 }} onClick={() => onNavigate("agents")}>
              View agents
            </button>
          </motion.div>

          <motion.div className="card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.24 }}>
            <p className="eyebrow">Why it matters</p>
            <div style={{ fontSize: 13.5, color: "var(--text-2)", lineHeight: 1.65 }}>
              Every job is backed by locked USDC. Pass the SLA's own acceptance check and settlement is instant.
              Break it, and the buyer is paid back — <b style={{ color: "var(--text)" }}>plus a penalty from the agent's bond</b> — in
              one sub-second Arc transaction. <BondedBadge /> is the badge worth demanding.
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
