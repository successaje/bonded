import { AnimatePresence, motion } from "framer-motion";
import { forwardRef } from "react";
import { Countdown } from "../components/Countdown";
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

function Column({
  title,
  icon,
  jobs,
  agents,
  empty,
}: {
  title: string;
  icon: string;
  jobs: Job[];
  agents: Map<string, Agent>;
  empty: { title: string; sub: string };
}) {
  return (
    <div>
      <div className="col-title">
        <span aria-hidden="true">{icon}</span> {title} <span className="col-count">{jobs.length}</span>
      </div>
      <motion.div className="job-col" layout>
        {jobs.length === 0 ? (
          <EmptyState icon={icon} title={empty.title} sub={empty.sub} />
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

export function Jobs() {
  const world = useWorld();
  const agents = new Map(world.agents.map((a) => [a.id, a]));

  const funded = world.jobs.filter((j) => j.state === "funded");
  const awaiting = world.jobs.filter((j) => j.state === "delivered" || j.state === "disputed");
  const settled = world.jobs
    .filter((j) => j.state === "passed" || j.state === "failed")
    .sort((a, b) => (b.settledAt ?? 0) - (a.settledAt ?? 0))
    .slice(0, 6);

  return (
    <div className="jobs-board">
      <Column title="In progress" icon="◷" jobs={funded} agents={agents} empty={{ title: "No jobs in flight", sub: "New hires appear here first" }} />
      <Column title="Acceptance" icon="◔" jobs={awaiting} agents={agents} empty={{ title: "Nothing awaiting review", sub: "Delivered work waits out its window here" }} />
      <Column title="Settled" icon="⚡" jobs={settled} agents={agents} empty={{ title: "No settlements yet", sub: "Passed and slashed jobs land here" }} />
    </div>
  );
}
