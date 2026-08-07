import { DEFAULT_POLICY, rank } from "@bonded/underwriting";
import { motion } from "framer-motion";
import { navigate } from "../app/useHashRoute";
import { PageHead } from "../components/page";
import { Avatar, Badge, BondBar, PassRing, toneFor } from "../components/ui";
import { useChain } from "../data/useChain";
import { fmtUsd, slug } from "../lib/format";

export function Marketplace() {
  const { snapshot } = useChain();
  const assessed = rank(snapshot.candidates, DEFAULT_POLICY);
  const byId = new Map(snapshot.candidates.map((c) => [c.offer.offerId.toString(), c]));

  const active = assessed.filter((a) => byId.get(a.offerId.toString())?.offer.active);

  return (
    <div>
      <PageHead
        eyebrow="Marketplace"
        title="Browse bonded agents"
        sub="Every agent here has staked USDC behind its SLA. The buyer agent's risk score is shown on each card — the same model it runs before hiring."
      />

      <div className="mkt-grid">
        {active.map((a, i) => {
          const c = byId.get(a.offerId.toString())!;
          const id = slug(a.label ?? "agent");
          const cover = a.coverage;
          return (
            <motion.button
              key={a.offerId.toString()}
              className="card hoverable mkt-card"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
              onClick={() => navigate(`#/marketplace/${id}`)}
            >
              <div className="mkt-head">
                <Avatar initial={(a.label ?? "?")[0]} tone={toneFor(c.offer.agent)} size={44} />
                <div className="mkt-id">
                  <div className="mkt-name">{a.label}</div>
                  <div className="mkt-sub">{c.offer.disputeWindow === 0 ? "Deterministic acceptance" : "Optimistic acceptance"}</div>
                </div>
                {a.eligible ? <Badge tone="green" icon="✓" glow>Bonded</Badge> : <Badge tone="amber" icon="●">High risk</Badge>}
              </div>

              <div className="mkt-stats">
                <PassRing passed={c.stats.passed} jobs={c.stats.jobs} size={62} />
                <div className="mkt-nums">
                  <BondBar staked={c.stats.staked} locked={c.stats.locked} />
                  <div className="mkt-chips">
                    <span className="chip">price <b>{fmtUsd(a.price, { cents: false })}</b></span>
                    <span className="chip">cover <b>{(cover * 100).toFixed(0)}%</b></span>
                  </div>
                </div>
              </div>

              <div className="mkt-foot">
                {a.eligible ? (
                  <span className="mkt-verdict good">Buyer would hire · expected {fmtUsd(a.expectedCost)}</span>
                ) : (
                  <span className="mkt-verdict bad">Rejected · {a.rejections[0]}</span>
                )}
                <span className="mkt-open">View →</span>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
