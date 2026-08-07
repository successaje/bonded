import { motion } from "framer-motion";
import { PageHead } from "../components/page";
import { Avatar, StatTile, toneFor } from "../components/ui";
import { useChain } from "../data/useChain";
import { fmtUsd, pct } from "../lib/format";

export function Analytics() {
  const { snapshot } = useChain();
  const s = snapshot.settlements;
  const passed = s.filter((x) => x.passed).length;
  const slashed = s.length - passed;
  const paidAgents = s.filter((x) => x.passed).reduce((n, x) => n + x.primary, 0n);
  const premiums = s.filter((x) => x.passed).reduce((n, x) => n + x.secondary, 0n);
  const toBuyers = s.filter((x) => !x.passed).reduce((n, x) => n + x.primary + x.secondary, 0n);
  const passPct = s.length ? (passed / s.length) * 100 : 0;

  const agents = Array.from(new Map(snapshot.candidates.map((c) => [c.offer.agent.toLowerCase(), c])).values())
    .sort((a, b) => b.stats.jobs - a.stats.jobs);

  return (
    <div>
      <PageHead eyebrow="Analytics" title="Protocol health" sub="Aggregated from every settlement on the live deployment." />

      <div className="tiles four">
        <StatTile label="Settlements" value={String(s.length)} sub={<span>{snapshot.candidates.filter((c) => c.offer.active).length} live offers</span>} delay={0.02} />
        <StatTile label="Pass rate" value={`${Math.round(passPct)}%`} sub={<span>{passed} passed · {slashed} slashed</span>} delay={0.08} />
        <StatTile label="Paid to agents" value={fmtUsd(paidAgents)} sub={<span>{fmtUsd(premiums)} to underwriters</span>} delay={0.14} />
        <StatTile label="Paid to buyers" value={fmtUsd(toBuyers)} sub={<span>on failed jobs — the point</span>} delay={0.2} />
      </div>

      <div className="an-grid">
        <motion.div className="card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.1 }}>
          <h3 className="section-title" style={{ marginBottom: 16 }}>Outcome split</h3>
          <div className="split-bar">
            <div className="split-seg good" style={{ width: `${passPct}%` }}>{passed > 0 && <span>{passed}</span>}</div>
            <div className="split-seg bad" style={{ width: `${100 - passPct}%` }}>{slashed > 0 && <span>{slashed}</span>}</div>
          </div>
          <div className="split-legend">
            <span><span className="dot good" /> Passed — agent paid, premium to pool</span>
            <span><span className="dot bad" /> Slashed — buyer made whole from the bond</span>
          </div>
          <p className="footnote">Every slashed job is a buyer who got their money back plus a penalty — accountability, not loss.</p>
        </motion.div>

        <motion.div className="card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.16 }}>
          <h3 className="section-title" style={{ marginBottom: 12 }}>Agents by activity</h3>
          <div className="rows">
            {agents.map((c) => (
              <div key={c.offer.agent} className="row fleet-row">
                <Avatar initial={(c.label ?? "?")[0]} tone={toneFor(c.offer.agent)} size={30} />
                <div className="row-main">
                  <div className="fleet-name">{c.label}</div>
                  <div className="fleet-meta">{Math.round(pct(c.stats.passed, c.stats.jobs))}% pass · {c.stats.jobs} jobs</div>
                </div>
                <div className="fleet-amt">
                  <div className="v mono">{fmtUsd(c.stats.staked, { cents: false })}</div>
                  <div className="k">bonded</div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
