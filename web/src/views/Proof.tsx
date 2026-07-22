import { rank, DEFAULT_POLICY } from "@bonded/underwriting";
import { motion } from "framer-motion";
import { CountUp } from "../components/CountUp";
import { useChain } from "../data/useChain";
import type { Settlement } from "../data/chainSource";
import { addressUrl, addresses, txUrl } from "../lib/chain";
import { fmtUsd, timeAgo } from "../lib/format";

/**
 * The pitch, backed by chain state you can click through to. Three beats:
 * what a bond is worth when work fails, how the buyer chose, and the
 * receipts.
 */

function Skeleton({ h = 80 }: { h?: number }) {
  return <div className="skeleton" style={{ height: h }} aria-hidden="true" />;
}

function SettlementRow({ s }: { s: Settlement }) {
  const compensated = s.primary + s.secondary;
  return (
    <a
      className={`row settle-row ${s.passed ? "ok" : "bad"}`}
      href={txUrl(s.txHash)}
      target="_blank"
      rel="noreferrer"
      title="Open this settlement on ArcScan"
    >
      <div className={`row-icon ${s.passed ? "settled" : "slashed"}`} aria-hidden="true">
        {s.passed ? "✓" : "✕"}
      </div>
      <div className="row-main">
        <div className="row-title">
          Job #{String(s.jobId)} · {s.agentName} {s.passed ? "delivered to spec" : "broke its SLA"}
        </div>
        <div className="row-sub">
          {s.passed ? (
            <>
              agent paid <b>{fmtUsd(s.primary)}</b> · <b>{fmtUsd(s.secondary)}</b> premium to underwriters
            </>
          ) : (
            <>
              buyer refunded <b>{fmtUsd(s.primary)}</b> · <b>{fmtUsd(s.secondary)}</b> penalty from the bond
            </>
          )}
        </div>
      </div>
      <div className={`row-amt ${s.passed ? "pos" : "neg"}`}>
        {s.passed ? fmtUsd(s.primary) : `+${fmtUsd(compensated)}`}
        <span className="u">{s.passed ? "to agent" : "to buyer"}</span>
      </div>
      <div className="row-time">
        {s.txHash.slice(0, 6)}…{s.txHash.slice(-4)} ↗
      </div>
    </a>
  );
}

export function Proof() {
  const { snapshot, source, loading, error, refresh } = useChain();

  const slash = snapshot.settlements.find((s) => !s.passed);
  const assessed = rank(snapshot.candidates, DEFAULT_POLICY);
  const chosen = assessed.find((a) => a.eligible);
  const cheapest = assessed.length
    ? assessed.reduce((m, a) => (a.price < m.price ? a : m), assessed[0])
    : null;

  /** An agent that earned work before, and its own failure has since priced
   *  it out — the clearest evidence the market corrects without an operator. */
  const repriced =
    slash && assessed.find((a) => !a.eligible && a.agent.toLowerCase() === slash.agent.toLowerCase());

  return (
    <div>
      {/* ————— the moment ————— */}
      <motion.section
        className="proof-hero"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <p className="eyebrow">What a bond is actually worth</p>
        {slash ? (
          <>
            <h1 className="proof-headline">
              The work failed. The buyer ended{" "}
              <span className="proof-gain">
                <CountUp value={Number(slash.primary + slash.secondary - slash.price)} format={(v) => `+${fmtUsd(v)}`} />
              </span>{" "}
              ahead.
            </h1>
            <p className="proof-sub">
              {slash.agentName} delivered an audit that missed the minimum it had sold. Its own acceptance checker
              rejected the work on-chain, refunded the {fmtUsd(slash.price)} fee and paid a{" "}
              {fmtUsd(slash.secondary)} penalty out of the agent's stake — in one transaction, in about a second, with
              no claim, no dispute and no human.
            </p>
            <div className="proof-actions">
              <a className="btn" href={txUrl(slash.txHash)} target="_blank" rel="noreferrer">
                See the settlement on ArcScan ↗
              </a>
              <a className="btn ghost" href={addressUrl(addresses.jobEscrow)} target="_blank" rel="noreferrer">
                Read the verified contract ↗
              </a>
            </div>
          </>
        ) : (
          <p className="proof-sub">No slash recorded yet on this deployment.</p>
        )}
      </motion.section>

      {/* ————— how the buyer chose ————— */}
      <motion.section
        className="card"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.08 }}
      >
        <div className="section-head">
          <h3 className="section-title">What the buyer would hire right now</h3>
          <span className="section-note">scored with the module the agent runs</span>
        </div>

        {loading ? (
          <div style={{ display: "grid", gap: 8 }}>
            <Skeleton h={44} />
            <Skeleton h={44} />
            <Skeleton h={44} />
          </div>
        ) : (
          <>
            <div className="table-scroll">
              <table className="decision">
                <thead>
                  <tr>
                    <th>Offer</th>
                    <th className="num">Price</th>
                    <th className="num">Bond</th>
                    <th className="num">Cover</th>
                    <th className="num">Pass</th>
                    <th className="num">Expected cost</th>
                    <th>Verdict</th>
                  </tr>
                </thead>
                <tbody>
                  {assessed.map((a) => (
                    <tr key={String(a.offerId)} className={a.offerId === chosen?.offerId ? "picked" : a.eligible ? "" : "out"}>
                      <td>
                        <span className="off-id">#{String(a.offerId)}</span> {a.label}
                      </td>
                      <td className="num mono">{fmtUsd(a.price)}</td>
                      <td className="num mono">{fmtUsd(a.bondSlice)}</td>
                      <td className="num mono">{(a.coverage * 100).toFixed(0)}%</td>
                      <td className="num mono">{(a.passRate * 100).toFixed(0)}%</td>
                      <td className="num mono">{a.eligible ? fmtUsd(a.expectedCost) : "—"}</td>
                      <td>
                        {a.offerId === chosen?.offerId ? (
                          <span className="badge green">
                            <span className="bi" aria-hidden="true">✓</span> hired
                          </span>
                        ) : a.eligible ? (
                          <span className="badge gray">eligible</span>
                        ) : (
                          <span className="verdict-out" title={a.rejections.join("; ")}>
                            {a.rejections[0]}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {chosen && cheapest && cheapest.offerId !== chosen.offerId && (
              <p className="decision-note">
                It does <b>not</b> take the cheapest offer. {cheapest.label} asks {fmtUsd(cheapest.price)} but{" "}
                {cheapest.rejections[0] ?? "prices worse once risk is counted"} — so the buyer pays{" "}
                {fmtUsd(chosen.price - cheapest.price)} more to be covered. A bond that doesn't cover the job is
                decoration, and the agent filters for exactly that before it spends a cent.
              </p>
            )}
            {repriced && (
              <p className="decision-note reprice">
                <b>The market re-priced itself.</b> {repriced.label} won this work before — it is the agent in the
                settlement above. The slash cut its bond and its record, so it now fails the buyer's own thresholds
                ({repriced.rejections[0]}) and gets no further work. No admin, no governance, no delisting: losing
                money to the people you failed is the whole mechanism.
              </p>
            )}
          </>
        )}
      </motion.section>

      {/* ————— receipts ————— */}
      <motion.section
        className="card"
        style={{ marginTop: 14 }}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.16 }}
      >
        <div className="section-head">
          <h3 className="section-title">Every settlement on this deployment</h3>
          <span className="section-note">click any row for the transaction</span>
        </div>
        {snapshot.settlements.length > 0 ? (
          <div className="rows">
            {snapshot.settlements.map((s) => (
              <SettlementRow key={`${s.jobId}-${s.txHash}`} s={s} />
            ))}
          </div>
        ) : (
          <div className="empty">
            <div className="em-icon" aria-hidden="true">◷</div>
            <div className="em-title">No settlements yet</div>
            <div className="em-sub">Run the buyer agent to create one</div>
          </div>
        )}

        <div className="chain-status">
          <span className={`src-dot ${source}`} aria-hidden="true" />
          <span>
            {source === "live" ? "live from Arc" : "verified snapshot"} · block {String(snapshot.blockNumber)} ·{" "}
            {timeAgo(snapshot.fetchedAt, Date.now())}
          </span>
          {error && <span className="chain-err">⚠ {error}</span>}
          <button className="linkish" onClick={() => void refresh()} disabled={loading}>
            {loading ? "reading Arc…" : "refresh from chain"}
          </button>
        </div>
      </motion.section>
    </div>
  );
}
