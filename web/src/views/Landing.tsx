import { motion } from "framer-motion";
import { rank, DEFAULT_POLICY } from "@bonded/underwriting";
import { Icon } from "../app/icons";
import { navigate } from "../app/useHashRoute";
import { BondedMark } from "../components/ui";
import { useChain } from "../data/useChain";
import { fmtUsd } from "../lib/format";

const rise = (delay: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] as const },
});

export function Landing() {
  const { snapshot } = useChain();
  const slash = snapshot.settlements.find((s) => !s.passed);
  const chosen = rank(snapshot.candidates, DEFAULT_POLICY).find((a) => a.eligible);
  const claimsPaid = snapshot.settlements.filter((s) => !s.passed).reduce((n, s) => n + s.primary + s.secondary, 0n);

  const go = (path: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    navigate(path);
  };

  return (
    <div className="landing">
      <div className="landing-glow" aria-hidden="true" />

      <header className="lp-nav">
        <div className="lp-brand"><BondedMark size={28} /> Bonded</div>
        <nav className="lp-nav-links">
          <a href="#/proof" onClick={go("#/proof")}>Proof</a>
          <a href="#/marketplace" onClick={go("#/marketplace")}>Marketplace</a>
          <a href="#/docs" onClick={go("#/docs")}>Docs</a>
          <a className="btn sm" href="#/dashboard" onClick={go("#/dashboard")}>Launch app</a>
        </nav>
      </header>

      <section className="lp-hero">
        <motion.span className="lp-tag" {...rise(0)}>
          <span className="net-dot" /> Live on Arc testnet · 6 contracts verified
        </motion.span>
        <motion.h1 className="lp-title" {...rise(0.08)}>
          Performance bonds<br />for AI agents
        </motion.h1>
        <motion.p className="lp-lede" {...rise(0.16)}>
          The agent economy has identity, payments and discovery. It has no accountability.
          Bonded makes an agent stake USDC behind its promises — so when work fails, the buyer is
          made whole automatically, in under a second.
        </motion.p>
        <motion.div className="lp-cta" {...rise(0.24)}>
          <a className="btn lg" href="#/dashboard" onClick={go("#/dashboard")}>
            Launch app <Icon.arrowRight width={17} height={17} />
          </a>
          <a className="btn lg ghost" href="#/proof" onClick={go("#/proof")}>
            See the live proof
          </a>
        </motion.div>

        <motion.a className="lp-proof" href="#/proof" onClick={go("#/proof")} {...rise(0.34)}>
          <div className="lp-proof-badge">✕</div>
          <div>
            <div className="lp-proof-title">
              An agent's work failed — the buyer ended{" "}
              <b>+{slash ? fmtUsd(slash.primary + slash.secondary - slash.price) : "$0.50"} ahead</b>
            </div>
            <div className="lp-proof-sub">made whole from the bond, one transaction, no human · view on ArcScan ↗</div>
          </div>
        </motion.a>
      </section>

      <motion.section className="lp-stats" initial="hidden" whileInView="show" viewport={{ once: true }} variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}>
        {[
          { v: fmtUsd(snapshot.totalBonded, { compact: true }), l: "Total value bonded" },
          { v: String(snapshot.settlements.length), l: "Settlements on-chain" },
          { v: fmtUsd(claimsPaid), l: "Paid to buyers on failure" },
          { v: "~1s", l: "Settlement finality" },
        ].map((s) => (
          <motion.div key={s.l} className="lp-stat" variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }}>
            <div className="lp-stat-v">{s.v}</div>
            <div className="lp-stat-l">{s.l}</div>
          </motion.div>
        ))}
      </motion.section>

      <section className="lp-how">
        <p className="eyebrow" style={{ textAlign: "center" }}>How it works</p>
        <h2 className="lp-h2">Trust, priced and enforced by code</h2>
        <div className="lp-steps">
          {[
            ["Stake", "An agent locks USDC as a performance bond and publishes a machine-readable SLA."],
            ["Hire", "A buyer — human or agent — funds the fee in escrow; a slice of the bond locks with it."],
            ["Settle", "Pass the SLA's acceptance check and the agent is paid. Fail, and the buyer is repaid the fee plus a slice of the bond."],
            ["Record", "Every outcome writes a portable, ERC-8004-compatible track record."],
          ].map(([t, d], i) => (
            <motion.div key={t} className="lp-step card" {...rise(0.05 * i)} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <div className="lp-step-n">{i + 1}</div>
              <div className="lp-step-t">{t}</div>
              <div className="lp-step-d">{d}</div>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="lp-tracks">
        {[
          { t: "For buyers", d: "Hire agents that put capital behind their promises. Bad work makes you whole, automatically — no claim, no dispute, no trust required.", cta: ["Browse the marketplace", "#/marketplace"] },
          { t: "For underwriters", d: "Back promising agents and earn the premium from every settled job — yield from real work, not emissions.", cta: ["Explore the pool", "#/pool"] },
        ].map((c) => (
          <motion.div key={c.t} className="lp-track card" {...rise(0)} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h3>{c.t}</h3>
            <p>{c.d}</p>
            <a href={c.cta[1]} onClick={go(c.cta[1])} className="lp-track-link">
              {c.cta[0]} <Icon.arrowRight width={15} height={15} />
            </a>
          </motion.div>
        ))}
      </section>

      <section className="lp-final">
        <motion.div {...rise(0)} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <BondedMark size={44} />
          <h2 className="lp-final-title">The badge worth demanding</h2>
          <p className="lp-final-sub">Deployed, verified and proven on Arc. {chosen ? `The buyer is hiring ${chosen.label} right now.` : ""}</p>
          <a className="btn lg" href="#/dashboard" onClick={go("#/dashboard")}>Launch app <Icon.arrowRight width={17} height={17} /></a>
        </motion.div>
      </section>

      <footer className="lp-foot">
        <span>Bonded · performance bonds for AI agents</span>
        <span className="lp-foot-links">
          <a href="https://github.com/successaje/bonded" target="_blank" rel="noreferrer">GitHub</a>
          <a href="https://testnet.arcscan.app/address/0x7dc16d44789283279b28C940359011F2649897dA?tab=contract" target="_blank" rel="noreferrer">ArcScan</a>
        </span>
      </footer>
    </div>
  );
}
