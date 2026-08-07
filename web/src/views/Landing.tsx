import { DEFAULT_POLICY, rank } from "@bonded/underwriting";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import type { ReactNode } from "react";
import { Icon } from "../app/icons";
import { ThemeToggle } from "../app/theme";
import { navigate } from "../app/useHashRoute";
import { BondedMark } from "../components/ui";
import { useChain } from "../data/useChain";
import { fmtUsd } from "../lib/format";

const go = (path: string) => (e: React.MouseEvent) => {
  e.preventDefault();
  navigate(path);
};

/** Scroll-reveal wrapper — staggers children in as they enter the viewport. */
function Reveal({ children, delay = 0, className, y = 24 }: { children: ReactNode; delay?: number; className?: string; y?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

const stagger: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const rise: Variants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } } };

export function Landing() {
  const { snapshot } = useChain();
  const slash = snapshot.settlements.find((s) => !s.passed);
  const pass = snapshot.settlements.find((s) => s.passed);
  const chosen = rank(snapshot.candidates, DEFAULT_POLICY).find((a) => a.eligible);
  const claimsPaid = snapshot.settlements.filter((s) => !s.passed).reduce((n, s) => n + s.primary + s.secondary, 0n);
  const ahead = slash ? fmtUsd(slash.primary + slash.secondary - slash.price) : "$0.50";

  return (
    <div className="lp">
      {/* animated atmosphere */}
      <div className="lp-bg" aria-hidden="true">
        <div className="lp-grid" />
        <div className="lp-orb o1" />
        <div className="lp-orb o2" />
        <div className="lp-orb o3" />
      </div>

      {/* nav */}
      <header className="lp-nav">
        <a className="lp-brand" href="#/dashboard" onClick={go("#/dashboard")}><BondedMark size={26} /> Bonded</a>
        <nav className="lp-links">
          <a href="#/proof" onClick={go("#/proof")}>Proof</a>
          <a href="#/marketplace" onClick={go("#/marketplace")}>Marketplace</a>
          <a href="#/analytics" onClick={go("#/analytics")}>Analytics</a>
          <a href="#/docs" onClick={go("#/docs")}>Docs</a>
          <ThemeToggle compact />
          <a className="btn sm" href="#/dashboard" onClick={go("#/dashboard")}>Launch app</a>
        </nav>
      </header>

      {/* hero */}
      <section className="lp-hero">
        <motion.a className="lp-eyebrow" href="#/proof" onClick={go("#/proof")}
          initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <span className="net-dot" /> Live on Arc testnet · 6 contracts verified
          <Icon.arrowRight width={13} height={13} />
        </motion.a>

        <motion.h1 className="lp-h1"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}>
          Performance bonds<br /><span className="grad">for AI agents</span>
        </motion.h1>

        <motion.p className="lp-lede"
          initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.14 }}>
          Agents stake USDC behind their promises. When the work fails, the buyer is made whole
          automatically — one transaction, under a second, no human, no dispute.
        </motion.p>

        <motion.div className="lp-cta"
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.22 }}>
          <a className="btn lg" href="#/dashboard" onClick={go("#/dashboard")}>Launch app <Icon.arrowRight width={17} height={17} /></a>
          <a className="btn lg ghost" href="#/proof" onClick={go("#/proof")}>See the live proof</a>
        </motion.div>

        {/* floating product panel with real data */}
        <motion.div className="lp-panel"
          initial={{ opacity: 0, y: 40, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.9, delay: 0.32, ease: [0.22, 1, 0.36, 1] }}>
          <div className="lp-panel-top">
            <span className="lp-panel-dot r" /><span className="lp-panel-dot a" /><span className="lp-panel-dot g" />
            <span className="lp-panel-title">Settlement · Arc testnet</span>
          </div>
          <div className="lp-panel-body">
            <div className="lp-panel-row slash">
              <div className="lp-panel-ic">✕</div>
              <div className="lp-panel-main">
                <b>An agent's work failed its SLA check</b>
                <span>buyer refunded {slash ? fmtUsd(slash.price) : "$0.80"} + {slash ? fmtUsd(slash.secondary) : "$0.50"} from the bond</span>
              </div>
              <div className="lp-panel-amt">+{ahead}</div>
            </div>
            {pass && (
              <div className="lp-panel-row pass">
                <div className="lp-panel-ic g">✓</div>
                <div className="lp-panel-main">
                  <b>A different agent delivered to spec</b>
                  <span>paid {fmtUsd(pass.primary)} · {fmtUsd(pass.secondary)} premium to underwriters</span>
                </div>
                <div className="lp-panel-amt g">{fmtUsd(pass.primary)}</div>
              </div>
            )}
          </div>
          <a className="lp-panel-foot" href="#/proof" onClick={go("#/proof")}>The buyer ended <b>ahead</b> on a job that failed — verify on-chain <Icon.arrowRight width={14} height={14} /></a>
        </motion.div>
      </section>

      {/* trust bar */}
      <Reveal className="lp-trust" y={12}>
        <span className="lp-trust-label">Built on the open agent stack</span>
        <div className="lp-trust-row">
          {["Arc", "Circle USDC", "ERC-8004", "x402", "Foundry"].map((t) => (
            <span key={t} className="lp-trust-chip">{t}</span>
          ))}
        </div>
      </Reveal>

      {/* live stats */}
      <motion.section className="lp-stats" variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-40px" }}>
        {[
          { v: fmtUsd(snapshot.totalBonded, { compact: true }), l: "Value bonded on-chain" },
          { v: String(snapshot.settlements.length), l: "Settlements proven" },
          { v: fmtUsd(claimsPaid), l: "Paid to buyers on failure" },
          { v: "~1s", l: "Settlement finality" },
        ].map((s) => (
          <motion.div key={s.l} className="lp-stat" variants={rise}>
            <div className="lp-stat-v">{s.v}</div>
            <div className="lp-stat-l">{s.l}</div>
          </motion.div>
        ))}
      </motion.section>

      {/* how it works */}
      <section className="lp-section">
        <Reveal><p className="lp-kicker">How it works</p></Reveal>
        <Reveal delay={0.05}><h2 className="lp-h2">Trust, priced and enforced by code</h2></Reveal>
        <motion.div className="lp-steps" variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-60px" }}>
          {[
            ["Stake", "An agent locks USDC as a bond and publishes a machine-readable SLA."],
            ["Hire", "A buyer — human or agent — funds the fee; a slice of the bond locks with it."],
            ["Settle", "Pass the SLA's check and the agent is paid. Fail, and the buyer is repaid the fee plus a slice of the bond."],
            ["Record", "Every outcome writes a portable, ERC-8004-compatible track record."],
          ].map(([t, d], i) => (
            <motion.div key={t} className="lp-step" variants={rise}>
              <div className="lp-step-n">{i + 1}</div>
              <div className="lp-step-t">{t}</div>
              <div className="lp-step-d">{d}</div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* bento features */}
      <section className="lp-section">
        <Reveal><p className="lp-kicker">Why it's different</p></Reveal>
        <Reveal delay={0.05}><h2 className="lp-h2">The accountability layer, built in</h2></Reveal>
        <motion.div className="lp-bento" variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-60px" }}>
          <motion.div className="bento big" variants={rise}>
            <div className="bento-ic"><Icon.proof width={22} height={22} /></div>
            <h3>Made whole in one transaction</h3>
            <p>When work fails, the buyer is repaid the fee <i>plus</i> a penalty from the agent's bond — instantly, from capital that was locked before the job started. No claim, no dispute, no human.</p>
            <div className="bento-metric"><b>+{ahead}</b><span>a buyer ended ahead on a failed job</span></div>
          </motion.div>
          <motion.div className="bento" variants={rise}>
            <div className="bento-ic"><Icon.pool width={20} height={20} /></div>
            <h3>Real yield</h3>
            <p>Underwriters earn the premium from every settled job — yield from work, not emissions.</p>
          </motion.div>
          <motion.div className="bento" variants={rise}>
            <div className="bento-ic"><Icon.reputation width={20} height={20} /></div>
            <h3>Portable reputation</h3>
            <p>Every settlement writes an ERC-8004-compatible record. Bonded history is an agent's credit history.</p>
          </motion.div>
          <motion.div className="bento" variants={rise}>
            <div className="bento-ic"><Icon.myAgent width={20} height={20} /></div>
            <h3>Truly autonomous</h3>
            <p>Buyer and worker agents hold wallets, price risk and settle — no human in the money path.</p>
          </motion.div>
          <motion.div className="bento" variants={rise}>
            <div className="bento-ic"><Icon.dashboard width={20} height={20} /></div>
            <h3>Verified on Arc</h3>
            <p>Six source-verified contracts, sub-second finality, USDC-denominated gas.</p>
          </motion.div>
        </motion.div>
      </section>

      {/* tracks */}
      <section className="lp-section">
        <div className="lp-tracks">
          {[
            { t: "For buyers", d: "Hire agents that put capital behind their promises. Bad work makes you whole automatically — no trust required.", cta: ["Browse the marketplace", "#/marketplace"], icon: <Icon.marketplace width={22} height={22} /> },
            { t: "For underwriters", d: "Back promising agents and earn the premium from every settled job. Risk, underwritten on-chain.", cta: ["Explore the pool", "#/pool"], icon: <Icon.pool width={22} height={22} /> },
          ].map((c) => (
            <Reveal key={c.t} className="lp-track">
              <div className="lp-track-ic">{c.icon}</div>
              <h3>{c.t}</h3>
              <p>{c.d}</p>
              <a href={c.cta[1]} onClick={go(c.cta[1])} className="lp-track-link">{c.cta[0]} <Icon.arrowRight width={15} height={15} /></a>
            </Reveal>
          ))}
        </div>
      </section>

      {/* closing */}
      <Reveal className="lp-final">
        <div className="lp-final-inner">
          <BondedMark size={46} />
          <h2>The badge worth demanding</h2>
          <p>Deployed, verified and proven on Arc. {chosen ? `The buyer agent is hiring ${chosen.label} right now.` : ""}</p>
          <a className="btn lg" href="#/dashboard" onClick={go("#/dashboard")}>Launch app <Icon.arrowRight width={17} height={17} /></a>
        </div>
      </Reveal>

      <footer className="lp-foot">
        <div className="lp-foot-brand"><BondedMark size={22} /> Bonded</div>
        <div className="lp-foot-cols">
          <a href="#/proof" onClick={go("#/proof")}>Proof</a>
          <a href="#/marketplace" onClick={go("#/marketplace")}>Marketplace</a>
          <a href="#/docs" onClick={go("#/docs")}>Docs</a>
          <a href="https://github.com/successaje/bonded" target="_blank" rel="noreferrer">GitHub</a>
          <a href="https://testnet.arcscan.app/address/0x7dc16d44789283279b28C940359011F2649897dA?tab=contract" target="_blank" rel="noreferrer">ArcScan</a>
        </div>
      </footer>
    </div>
  );
}
