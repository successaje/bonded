import { AnimatePresence, motion } from "framer-motion";
import { forwardRef } from "react";
import { navigate } from "../app/useHashRoute";
import { Countdown } from "../components/Countdown";
import { PageHead, SubTabs } from "../components/page";
import { Avatar, agentTone, EmptyState, StateBadge } from "../components/ui";
import { useWorld } from "../data/source";
import type { Agent, Job } from "../data/types";
import { fmtUsd, shortAddr } from "../lib/format";

const JobCard = forwardRef<HTMLDivElement, { job: Job; agent: Agent }>(function JobCard({ job, agent }, ref) {
  return (
    <motion.div
      ref={ref}
      layout
      className="card job-card"
      initial={{ opacity: 0, y: -12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ type: "spring", stiffness: 360, damping: 32 }}
    >
      <div className="job-head">
        <Avatar initial={agent.initial} tone={agentTone(agent.id)} size={30} />
        <div>
          <div className="job-agent">{agent.name}</div>
          <div className="job-id">job #{job.id}</div>
        </div>
        <div className="job-price mono">{fmtUsd(job.price, { cents: false })}</div>
      </div>

      <div className="job-meta">
        <span>buyer {shortAddr(job.buyer)}</span>
        <span>slice {fmtUsd(job.slice, { cents: false })}</span>
        <StateBadge job={job} />
      </div>

      {job.state === "funded" && (
        <Countdown deadline={job.deliveryDeadline} total={job.deliveryDeadline - job.fundedAt} label="Delivery deadline" />
      )}

      {(job.state === "delivered" || job.state === "disputed") && job.disputeDeadline && job.deliveredAt && (
        <Countdown
          deadline={job.disputeDeadline}
          total={job.disputeDeadline - job.deliveredAt}
          label={job.state === "disputed" ? "Arbiter ruling" : "Silence is consent in"}
        />
      )}

      {job.state === "passed" && (
        <div className="receipt">
          <div className="receipt-row good">
            <span>Agent payout</span>
            <span className="amount">+{fmtUsd(job.price - job.premium)}</span>
          </div>
          <div className="receipt-row">
            <span>Premium to pool</span>
            <span className="amount">+{fmtUsd(job.premium)}</span>
          </div>
        </div>
      )}

      {job.state === "failed" && (
        <div className="receipt">
          <div className="receipt-row good">
            <span>Buyer refunded</span>
            <span className="amount">+{fmtUsd(job.price)}</span>
          </div>
          <div className="receipt-row bad">
            <span>Penalty from agent's bond</span>
            <span className="amount">+{fmtUsd(job.slice)}</span>
          </div>
        </div>
      )}
    </motion.div>
  );
});

const FILTERS = ["active", "pending", "completed", "failed"] as const;
type Filter = (typeof FILTERS)[number];

const match: Record<Filter, (j: Job) => boolean> = {
  active: (j) => j.state === "funded",
  pending: (j) => j.state === "delivered" || j.state === "disputed",
  completed: (j) => j.state === "passed",
  failed: (j) => j.state === "failed",
};

const EMPTY: Record<Filter, { title: string; sub: string }> = {
  active: { title: "No jobs in flight", sub: "New hires land here first" },
  pending: { title: "Nothing awaiting review", sub: "Delivered work waits out its window here" },
  completed: { title: "No completed jobs yet", sub: "Passed settlements land here" },
  failed: { title: "No failed jobs", sub: "Slashes — where the bond makes the buyer whole — land here" },
};

export function Jobs({ filter }: { filter?: string }) {
  const world = useWorld();
  const agents = new Map(world.agents.map((a) => [a.id, a]));
  const active: Filter = (FILTERS as readonly string[]).includes(filter ?? "") ? (filter as Filter) : "active";

  const counts = Object.fromEntries(FILTERS.map((f) => [f, world.jobs.filter(match[f]).length])) as Record<Filter, number>;
  const jobs = world.jobs
    .filter(match[active])
    .sort((a, b) => (b.settledAt ?? b.fundedAt) - (a.settledAt ?? a.fundedAt));

  return (
    <div>
      <PageHead
        eyebrow="Jobs"
        title="Live job board"
        sub="A running simulation of the protocol's job flow. Real settled jobs, linkable to ArcScan, live on Proof."
      />
      <SubTabs
        items={FILTERS.map((f) => ({ id: f, label: f[0].toUpperCase() + f.slice(1), count: counts[f] }))}
        active={active}
        onChange={(id) => navigate(`#/jobs/${id}`)}
      />

      <motion.div className="job-list" layout>
        {jobs.length === 0 ? (
          <EmptyState icon="◷" title={EMPTY[active].title} sub={EMPTY[active].sub} />
        ) : (
          <AnimatePresence initial={false} mode="popLayout">
            {jobs.map((j) => {
              const agent = agents.get(j.agentId);
              return agent ? <JobCard key={j.id} job={j} agent={agent} /> : null;
            })}
          </AnimatePresence>
        )}
      </motion.div>
    </div>
  );
}
