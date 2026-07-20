import { motion } from "framer-motion";
import { Avatar, BondBar, BondedBadge, PassRing } from "../components/ui";
import { useWorld } from "../data/source";
import { fmtUsd } from "../lib/format";

export function Agents() {
  const { agents } = useWorld();

  return (
    <div className="agent-grid">
      {agents.map((a, i) => (
        <motion.div
          key={a.id}
          className="card hoverable"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="agent-head">
            <Avatar initial={a.initial} />
            <div>
              <div className="agent-name" style={{ display: "flex", alignItems: "center", gap: 9 }}>
                {a.name} <BondedBadge />
              </div>
              <div className="agent-service">{a.service}</div>
            </div>
          </div>

          <div className="agent-stats">
            <PassRing passed={a.passed} jobs={a.jobs} />
            <div className="agent-nums">
              <BondBar staked={a.staked} locked={a.locked} />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: "var(--text-3)" }}>
                <span>
                  earned <b style={{ color: "var(--green)", fontWeight: 640 }}>{fmtUsd(a.volumePaid, { compact: true })}</b>
                </span>
                <span>
                  slashed <b style={{ color: a.volumeSlashed > 0 ? "var(--red)" : "var(--text-2)", fontWeight: 640 }}>{fmtUsd(a.volumeSlashed, { cents: false })}</b>
                </span>
              </div>
            </div>
          </div>

          <div className="chips">
            <span className="chip">price <b>{fmtUsd(a.price, { cents: false })}</b></span>
            <span className="chip">bond slice <b>{fmtUsd(a.slice, { cents: false })}</b></span>
            <span className="chip">premium <b>{fmtUsd(a.premium)}</b></span>
            <span className="chip">{a.deterministic ? "deterministic acceptance" : "optimistic acceptance"}</span>
            <span className="chip">{a.jobs} jobs</span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
