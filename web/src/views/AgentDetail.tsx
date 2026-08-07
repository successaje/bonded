import { DEFAULT_POLICY, assess } from "@bonded/underwriting";
import { motion } from "framer-motion";
import { navigate } from "../app/useHashRoute";
import { PageHead } from "../components/page";
import { Avatar, Badge, BondBar, BondedBadge, EmptyState, PassRing, toneFor } from "../components/ui";
import { useChain } from "../data/useChain";
import { addressUrl } from "../lib/chain";
import { fmtUsd, pct, shortAddr, slug } from "../lib/format";

export function AgentDetail({ id }: { id: string }) {
  const { snapshot } = useChain();
  const candidate = snapshot.candidates.find((c) => slug(c.label ?? "") === id && c.offer.active)
    ?? snapshot.candidates.find((c) => slug(c.label ?? "") === id);

  if (!candidate) {
    return (
      <div>
        <PageHead eyebrow="Marketplace" title="Agent" />
        <EmptyState icon="◷" title="No such agent" sub="Pick one from the marketplace" />
        <button className="btn ghost" style={{ marginTop: 14 }} onClick={() => navigate("#/marketplace")}>← Back to marketplace</button>
      </div>
    );
  }

  const { offer, stats, label } = candidate;
  const a = assess(candidate, DEFAULT_POLICY);
  const settlements = snapshot.settlements.filter((s) => s.agent.toLowerCase() === offer.agent.toLowerCase());

  return (
    <div>
      <button className="back-link" onClick={() => navigate("#/marketplace")}>← Marketplace</button>

      <motion.div className="card agent-hero" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
        <Avatar initial={(label ?? "?")[0]} tone={toneFor(offer.agent)} size={58} />
        <div className="agent-hero-id">
          <div className="agent-hero-name">{label} {a.eligible ? <BondedBadge /> : <Badge tone="amber" icon="●">High risk</Badge>}</div>
          <a className="agent-hero-addr" href={addressUrl(offer.agent)} target="_blank" rel="noreferrer">{shortAddr(offer.agent)} ↗</a>
        </div>
        <div className="agent-hero-metric">
          <PassRing passed={stats.passed} jobs={stats.jobs} size={78} />
        </div>
      </motion.div>

      <div className="agent-cols">
        <div className="stack">
          <motion.div className="card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.06 }}>
            <h3 className="section-title" style={{ marginBottom: 14 }}>Bond & track record</h3>
            <BondBar staked={stats.staked} locked={stats.locked} />
            <div className="kv-row">
              <div><span className="kv-k">Jobs</span><span className="kv-v">{stats.jobs}</span></div>
              <div><span className="kv-k">Pass rate</span><span className="kv-v">{Math.round(pct(stats.passed, stats.jobs))}%</span></div>
              <div><span className="kv-k">Earned</span><span className="kv-v" style={{ color: "var(--green)" }}>{fmtUsd(stats.volumePaid, { compact: true })}</span></div>
              <div><span className="kv-k">Slashed</span><span className="kv-v" style={{ color: stats.volumeSlashed > 0n ? "var(--red)" : "var(--text-2)" }}>{fmtUsd(stats.volumeSlashed, { cents: false })}</span></div>
            </div>
          </motion.div>

          <motion.div className="card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.12 }}>
            <h3 className="section-title" style={{ marginBottom: 14 }}>SLA terms</h3>
            <div className="sla-grid">
              <div className="sla-item"><span>Price</span><b>{fmtUsd(offer.price)}</b></div>
              <div className="sla-item"><span>Bond slice / job</span><b>{fmtUsd(offer.bondSlice)}</b></div>
              <div className="sla-item"><span>Premium to pool</span><b>{fmtUsd(offer.premium)}</b></div>
              <div className="sla-item"><span>Delivery window</span><b>{Math.round(offer.deliveryWindow / 60)} min</b></div>
              <div className="sla-item"><span>Acceptance</span><b>{offer.disputeWindow === 0 ? "Deterministic" : "Optimistic"}</b></div>
              <div className="sla-item"><span>Coverage</span><b>{(a.coverage * 100).toFixed(0)}%</b></div>
            </div>
          </motion.div>

          {settlements.length > 0 && (
            <motion.div className="card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.18 }}>
              <h3 className="section-title" style={{ marginBottom: 12 }}>Settlement history</h3>
              <div className="rows">
                {settlements.map((s) => (
                  <a key={s.txHash} className={`row settle-row ${s.passed ? "ok" : "bad"}`} href={`https://testnet.arcscan.app/tx/${s.txHash}`} target="_blank" rel="noreferrer">
                    <div className={`row-icon ${s.passed ? "settled" : "slashed"}`}>{s.passed ? "✓" : "✕"}</div>
                    <div className="row-main">
                      <div className="row-title">Job #{String(s.jobId)} · {s.passed ? "passed" : "slashed"}</div>
                      <div className="row-sub">{s.passed ? `paid ${fmtUsd(s.primary)}` : `buyer got ${fmtUsd(s.primary + s.secondary)}`}</div>
                    </div>
                    <div className="row-time">{s.txHash.slice(0, 6)}… ↗</div>
                  </a>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        <motion.div className="card hire-panel" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.1 }}>
          <p className="eyebrow">Hire {label}</p>
          <div className="hire-price">{fmtUsd(offer.price)}</div>
          <div className="hire-outcomes">
            <div className="hire-out good">
              <span className="hio-dot" />
              <div><b>If it passes</b><span>agent paid {fmtUsd(offer.price - offer.premium)}, {fmtUsd(offer.premium)} to the pool</span></div>
            </div>
            <div className="hire-out bad">
              <span className="hio-dot" />
              <div><b>If it fails</b><span>you're repaid {fmtUsd(offer.price)} + {fmtUsd(offer.bondSlice)} from the bond</span></div>
            </div>
          </div>
          <button className="btn" style={{ width: "100%" }} disabled title="Wallet connect lands in the next build">
            Connect wallet to hire
          </button>
          <p className="footnote" style={{ textAlign: "center" }}>
            The autonomous buyer agent already hires on-chain — see the <a href="#/proof" onClick={(e) => { e.preventDefault(); navigate("#/proof"); }}>Proof</a>.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
