import { DEFAULT_POLICY, assess } from "@bonded/underwriting";
import { AnimatePresence, motion } from "framer-motion";
import { navigate } from "../app/useHashRoute";
import { PageHead } from "../components/page";
import { Avatar, Badge, BondBar, BondedBadge, EmptyState, PassRing, toneFor } from "../components/ui";
import { useChain } from "../data/useChain";
import { addressUrl, txUrl } from "../lib/chain";
import { fmtUsd, pct, shortAddr, slug } from "../lib/format";
import { useHire } from "../wallet/useHire";
import { useWalletCtx } from "../wallet/WalletContext";
import { fmtBalance } from "../wallet/useWallet";

const STEP_LABEL: Record<string, string> = {
  checking: "Checking balance…",
  approving: "Approve USDC in your wallet…",
  hiring: "Confirm hire in your wallet…",
  watching: "Waiting for the checker to settle…",
};

function HirePanel({ offerId, price, bondSlice, premium, label }: { offerId: bigint; price: bigint; bondSlice: bigint; premium: bigint; label: string }) {
  const w = useWalletCtx();
  const hire = useHire(offerId, price);
  const busy = hire.step !== "idle" && hire.step !== "passed" && hire.step !== "failed" && hire.step !== "error";

  return (
    <motion.div className="card hire-panel" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.1 }}>
      <p className="eyebrow">Hire {label}</p>
      <div className="hire-price">{fmtUsd(price)}</div>
      <div className="hire-outcomes">
        <div className="hire-out good">
          <span className="hio-dot" />
          <div><b>If it passes</b><span>agent paid {fmtUsd(price - premium)}, {fmtUsd(premium)} to the pool</span></div>
        </div>
        <div className="hire-out bad">
          <span className="hio-dot" />
          <div><b>If it fails</b><span>you're repaid {fmtUsd(price)} + {fmtUsd(bondSlice)} from the bond</span></div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {hire.step === "passed" && hire.result ? (
          <motion.div key="passed" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="receipt">
            <div className="receipt-row good"><span>Agent paid</span><span className="amount">+{fmtUsd(hire.result.primary)}</span></div>
            <div className="receipt-row"><span>Premium to pool</span><span className="amount">+{fmtUsd(hire.result.secondary)}</span></div>
            {hire.hireTx && <a className="footnote" style={{ display: "block", marginTop: 8 }} href={txUrl(hire.hireTx)} target="_blank" rel="noreferrer">View settlement on ArcScan ↗</a>}
            <button className="btn ghost" style={{ width: "100%", marginTop: 12 }} onClick={hire.reset}>Hire again</button>
          </motion.div>
        ) : hire.step === "failed" && hire.result ? (
          <motion.div key="failed" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="receipt">
            <div className="receipt-row good"><span>You were refunded</span><span className="amount">+{fmtUsd(hire.result.primary)}</span></div>
            <div className="receipt-row good"><span>Penalty from the bond</span><span className="amount">+{fmtUsd(hire.result.secondary)}</span></div>
            {hire.hireTx && <a className="footnote" style={{ display: "block", marginTop: 8 }} href={txUrl(hire.hireTx)} target="_blank" rel="noreferrer">View settlement on ArcScan ↗</a>}
            <button className="btn ghost" style={{ width: "100%", marginTop: 12 }} onClick={hire.reset}>Hire again</button>
          </motion.div>
        ) : (
          <motion.div key="cta" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {w.status === "no-provider" ? (
              <a className="btn" style={{ width: "100%" }} href="https://metamask.io/download" target="_blank" rel="noreferrer">Get a wallet to hire</a>
            ) : w.status !== "connected" ? (
              <button className="btn" style={{ width: "100%" }} onClick={() => void w.connect()} disabled={w.status === "connecting"}>
                {w.status === "connecting" ? "Connecting…" : "Connect wallet to hire"}
              </button>
            ) : !w.onArc ? (
              <button className="btn" style={{ width: "100%" }} onClick={() => void w.switchToArc()}>Switch to Arc Testnet</button>
            ) : busy ? (
              <button className="btn" style={{ width: "100%" }} disabled>
                <span className="btn-spinner" /> {STEP_LABEL[hire.step]}
              </button>
            ) : (
              <button className="btn" style={{ width: "100%" }} onClick={() => void hire.start()}>
                Hire {label} — {fmtUsd(price)}
              </button>
            )}
            {hire.step === "error" && hire.error && (
              <div className="hire-error">
                <span>{hire.error}</span>
                <button className="linkish" onClick={hire.reset}>try again</button>
              </div>
            )}
            {w.status === "connected" && w.onArc && w.usdcBalance != null && hire.step === "idle" && (
              <p className="footnote" style={{ textAlign: "center" }}>Your balance: {fmtBalance(w.usdcBalance)}</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <p className="footnote" style={{ textAlign: "center" }}>
        The autonomous buyer agent already hires on-chain — see the <a href="#/proof" onClick={(e) => { e.preventDefault(); navigate("#/proof"); }}>Proof</a>.
      </p>
    </motion.div>
  );
}

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

        <HirePanel offerId={offer.offerId} price={offer.price} bondSlice={offer.bondSlice} premium={offer.premium} label={label ?? "this agent"} />
      </div>
    </div>
  );
}
