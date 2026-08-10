import { DEFAULT_POLICY, rank } from "@bonded/underwriting";
import { animate, AnimatePresence, motion, useInView, useReducedMotion, type Variants } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Icon } from "../app/icons";
import { ThemeToggle } from "../app/theme";
import { navigate } from "../app/useHashRoute";
import { Avatar, BondedMark, toneFor } from "../components/ui";
import { useChain } from "../data/useChain";
import { fmtUsd, pct } from "../lib/format";

const go = (path: string) => (e: React.MouseEvent) => { e.preventDefault(); navigate(path); };
const EASE = [0.22, 1, 0.36, 1] as const;

/* ── scroll-reveal ── */
function Reveal({ children, delay = 0, y = 28, className }: { children: ReactNode; delay?: number; y?: number; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div className={className} initial={reduce ? false : { opacity: 0, y }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.7, delay, ease: EASE }}>
      {children}
    </motion.div>
  );
}

/* ── stack marks: simple line-marks in the same visual language as the rest
   of the product (not brand pixel-art) — a "built with" bar, not a trademark
   gallery. Circle/Arc/USDC/Foundry are nominative references; ERC-8004 is a
   spec number, drawn as a spec tag rather than invented as a fake logo. ── */
const StackIcon = {
  circle: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <circle cx="9" cy="12" r="6.5" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="15" cy="12" r="6.5" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  ),
  arc: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M4 18a10 10 0 0116 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M8 18a6 6 0 018 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="12" cy="18" r="1.4" fill="currentColor" />
    </svg>
  ),
  usdc: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 7.5v9M9.5 9.8c0-1 1-1.8 2.5-1.8s2.5.7 2.5 1.7-1 1.4-2.5 1.7-2.5.8-2.5 1.8 1 1.7 2.5 1.7 2.5-.7 2.5-1.7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  erc: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M4 6a2 2 0 012-2h7l7 7-9 9-7-7V6z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="8.5" cy="8.5" r="1.4" fill="currentColor" />
    </svg>
  ),
  foundry: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M3 20h18M6 20l1.5-6h9L18 20" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 14l1.5-8h3L15 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="5" r="1.3" fill="currentColor" />
    </svg>
  ),
};

const STACK = [
  { k: "circle" as const, label: "Circle" },
  { k: "arc" as const, label: "Arc" },
  { k: "usdc" as const, label: "USDC" },
  { k: "erc" as const, label: "ERC-8004" },
  { k: "foundry" as const, label: "Foundry" },
];

function StackMarks() {
  return (
    <div className="built-row">
      {STACK.map((s) => {
        const M = StackIcon[s.k];
        return (
          <motion.span key={s.k} className="built-mark" whileHover={{ y: -2, opacity: 1 }}>
            <M />
            <span>{s.label}</span>
          </motion.span>
        );
      })}
    </div>
  );
}

/* ── in-view counter ── */
function Counter({ to, format }: { to: number; format: (v: number) => string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const c = animate(0, to, { duration: 1.6, ease: EASE, onUpdate: setV });
    return () => c.stop();
  }, [inView, to]);
  return <span ref={ref}>{format(v)}</span>;
}

/* ── the interactive settlement demo (the centerpiece) ── */
function SettlementDemo() {
  const [outcome, setOutcome] = useState<"pass" | "fail" | null>(null);
  const [run, setRun] = useState(0);
  const pick = (o: "pass" | "fail") => { setOutcome(o); setRun((r) => r + 1); };

  const nodes = [
    { t: "Buyer funds escrow", s: "$50 locked", c: "blue" },
    { t: "Agent delivers work", s: outcome === "fail" ? "misses the SLA" : "meets the SLA", c: "blue" },
    { t: "Checker verifies on-chain", s: "deterministic", c: "violet" },
    { t: outcome === "fail" ? "Slashed" : outcome === "pass" ? "Settled" : "Outcome", s: outcome ? "in ~1 second" : "you choose", c: outcome === "fail" ? "red" : outcome === "pass" ? "green" : "muted" },
  ];

  return (
    <div className="demo">
      <div className="demo-head">
        <div className="demo-dots"><span className="dd r" /><span className="dd a" /><span className="dd g" /></div>
        <span className="demo-title">Live settlement · Arc</span>
        <div className="demo-seg" role="tablist" aria-label="Choose an outcome">
          <button className={`ds ${outcome === "pass" ? "on pass" : ""}`} onClick={() => pick("pass")}>Pass</button>
          <button className={`ds ${outcome === "fail" ? "on fail" : ""}`} onClick={() => pick("fail")}>Fail</button>
        </div>
      </div>

      <div className="demo-flow">
        {nodes.map((n, i) => (
          <motion.div key={`${run}-${i}`} className={`dnode ${n.c}`}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 * i, duration: 0.4, ease: EASE }}>
            <div className="dnode-ic">{i === 3 ? (outcome === "fail" ? "✕" : outcome === "pass" ? "✓" : "?") : i + 1}</div>
            <div className="dnode-main"><b>{n.t}</b><span>{n.s}</span></div>
            {i < 3 && <motion.div className="dnode-line" initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ delay: 0.12 * i + 0.15, duration: 0.3 }} />}
          </motion.div>
        ))}
      </div>

      <div className="demo-out">
        <AnimatePresence mode="wait">
          {outcome === null && (
            <motion.div key="idle" className="demo-hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              Choose an outcome to watch the USDC move.
            </motion.div>
          )}
          {outcome === "pass" && (
            <motion.div key="pass" className="demo-result pass" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.45, ease: EASE }}>
              <div className="dr-row"><span>Agent paid</span><b className="g"><Counter to={49} format={(v) => `+$${v.toFixed(2)}`} /></b></div>
              <div className="dr-row"><span>Premium to underwriters</span><b><Counter to={1} format={(v) => `+$${v.toFixed(2)}`} /></b></div>
              <div className="dr-row"><span>Bond</span><b className="mut">unlocked</b></div>
            </motion.div>
          )}
          {outcome === "fail" && (
            <motion.div key="fail" className="demo-result fail" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.45, ease: EASE }}>
              <div className="dr-row"><span>You're refunded</span><b className="g"><Counter to={50} format={(v) => `+$${v.toFixed(2)}`} /></b></div>
              <div className="dr-row"><span>Penalty from the agent's bond</span><b className="g"><Counter to={25} format={(v) => `+$${v.toFixed(2)}`} /></b></div>
              <div className="dr-headline">You end <b>+$0.50 ahead</b> — on a job that failed.</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ── FAQ accordion ── */
function Faq({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`faq ${open ? "open" : ""}`}>
      <button className="faq-q" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        {q}<Icon.chevron className="faq-chev" />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div className="faq-a" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: EASE }}>
            <p>{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const stagger: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.09 } } };
const rise: Variants = { hidden: { opacity: 0, y: 22 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } } };

/* ── Arc-style concentric arc line-art (the Arc signature motif) ── */
function ArcLines({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 800 600" fill="none" aria-hidden="true" preserveAspectRatio="xMaxYMid slice">
      {[120, 200, 285, 375, 470, 570, 675].map((r, i) => (
        <circle key={r} cx="760" cy="300" r={r} stroke="currentColor" strokeWidth="1" opacity={0.5 - i * 0.05} />
      ))}
    </svg>
  );
}

/* ── one job, followed down the whole page ── */
const STAGES = [
  { k: "Funded", d: "escrow locked" },
  { k: "Matched", d: "agent hired" },
  { k: "Delivered", d: "work submitted" },
  { k: "Verified", d: "checker ran" },
  { k: "Recorded", d: "on the ledger" },
];

/**
 * Follows one job down the page — but the stage it shows is driven by which
 * *section* is actually on screen (via IntersectionObserver against the
 * `data-stage` landmarks below), not a blind fraction of total scroll
 * distance. A job "gets Matched" because you've scrolled to the section
 * about hiring, not because you crossed some arbitrary 40% mark that might
 * land mid-paragraph anywhere on the page.
 */
function JobRail() {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    let io: IntersectionObserver | undefined;
    let cancelled = false;

    const start = () => {
      if (cancelled) return;
      const targets = Array.from(document.querySelectorAll<HTMLElement>("[data-stage]"));
      if (targets.length === 0) return;
      // Track membership explicitly and take the lowest active index rather
      // than trusting iteration order — a callback batch can report more
      // than one target intersecting at once (percentage rootMargin can
      // resolve before layout is fully settled), and on that burst the
      // lowest index still resolves correctly to the top-of-page stage.
      const active = new Set<number>();
      io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            const idx = Number((e.target as HTMLElement).dataset.stage);
            if (e.isIntersecting) active.add(idx);
            else active.delete(idx);
          }
          if (active.size > 0) setStage(Math.min(...active));
        },
        { rootMargin: "-45% 0px -45% 0px", threshold: 0 },
      );
      targets.forEach((t) => io!.observe(t));
    };

    // Wait for web fonts before measuring — Inter Variable loading mid-mount
    // shifts section heights, which can make an early scroller see the wrong
    // stage for a moment while layout is still settling.
    const fontsReady = document.fonts?.ready;
    if (fontsReady) void fontsReady.then(start);
    else start();

    return () => {
      cancelled = true;
      io?.disconnect();
    };
  }, []);

  return (
    <div className="jobrail" aria-hidden="true">
      <div className="jr-badge">One job, followed</div>
      <div className="jr-track">
        <motion.div
          className="jr-fill"
          animate={{ height: `${(stage / (STAGES.length - 1)) * 100}%` }}
          transition={{ duration: 0.5, ease: EASE }}
        />
        {STAGES.map((s, i) => (
          <div key={s.k} className={`jr-node ${i <= stage ? "done" : ""} ${i === stage ? "active" : ""}`}>
            <span className="jr-dot" />
            <div className="jr-meta"><b>{s.k}</b><span>{s.d}</span></div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Landing() {
  const { snapshot } = useChain();
  const agents = rank(snapshot.candidates.filter((c) => c.offer.active), DEFAULT_POLICY).slice(0, 3);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    const onMove = (e: MouseEvent) => {
      document.documentElement.style.setProperty("--mx", e.clientX + "px");
      document.documentElement.style.setProperty("--my", e.clientY + "px");
    };
    if (matchMedia("(pointer: fine)").matches) window.addEventListener("mousemove", onMove);
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("mousemove", onMove); };
  }, []);

  return (
    <div className="lp">
      <div className="lp-mesh" aria-hidden="true"><span className="m1" /><span className="m2" /><span className="m3" /></div>
      <div className="lp-cursor" aria-hidden="true" />
      <JobRail />

      {/* nav */}
      <header className={`lpn ${scrolled ? "scrolled" : ""}`}>
        <div className="lpn-in">
          <a className="lpn-brand" href="#/dashboard" onClick={go("#/dashboard")}><BondedMark size={24} /> Bonded</a>
          <nav className="lpn-links">
            <a href="#/marketplace" onClick={go("#/marketplace")}>Product</a>
            <a href="#/docs" onClick={go("#/docs")}>Developers</a>
            <a href="#/docs" onClick={go("#/docs")}>Docs</a>
            <a href="#/proof" onClick={go("#/proof")}>Proof</a>
          </nav>
          <div className="lpn-right">
            <ThemeToggle compact />
            <a className="btn sm green" href="#/dashboard" onClick={go("#/dashboard")}>Launch App</a>
          </div>
        </div>
      </header>

      {/* hero */}
      <section className="hero navy-band" data-stage="0">
        <ArcLines className="hero-arcs" />
        <motion.a className="hero-tag" href="#/proof" onClick={go("#/proof")} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <span className="net-dot" /> Live on Arc testnet
        </motion.a>
        <h1 className="hero-h1">
          <motion.span initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.05, ease: EASE }}>AI agents</motion.span>{" "}
          <motion.span initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.13, ease: EASE }}>you can <span className="trust">trust.</span></motion.span>
        </h1>
        <motion.p className="hero-sub2" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.24 }}>
          Hire AI agents backed by programmable USDC performance bonds. If the work fails, you're compensated automatically — in seconds.
        </motion.p>
        <motion.div className="hero-cta" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.34 }}>
          <a className="btn lg green" href="#/dashboard" onClick={go("#/dashboard")}>Launch App <Icon.arrowRight width={17} height={17} /></a>
          <a className="btn lg ghost" href="#/proof" onClick={go("#/proof")}>See the proof</a>
        </motion.div>
        <motion.div className="hero-demo" initial={{ opacity: 0, y: 40, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.9, delay: 0.44, ease: EASE }}>
          <SettlementDemo />
        </motion.div>
      </section>

      {/* built on */}
      <Reveal className="built" y={14}>
        <span className="built-label">Built on the open agent stack</span>
        <StackMarks />
      </Reveal>

      {/* problem */}
      <section className="sec">
        <Reveal><h2 className="sec-h2">Hiring AI agents requires trust.<br /><span className="dim">Trust doesn't scale.</span></h2></Reveal>
        <div className="probs">
          {[
            { t: "Without Bonded", tone: "red", steps: ["Pay the agent", "Hope it delivers", "Wait", "Maybe it works"] },
            { t: "With Bonded", tone: "green", steps: ["Fund escrow", "Bond locks", "Automatic verification", "Instant compensation"] },
          ].map((p, i) => (
            <Reveal key={p.t} delay={i * 0.08} className={`prob ${p.tone}`}>
              <div className="prob-h">{p.t}</div>
              <div className="prob-steps">
                {p.steps.map((s, j) => (
                  <div key={s} className="prob-step"><span className="ps-dot" />{s}{j < p.steps.length - 1 && <span className="ps-line" />}</div>
                ))}
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* how it works */}
      <section className="sec navy-band" data-stage="1">
        <ArcLines className="fc-arcs" />
        <Reveal><p className="kick">How it works</p></Reveal>
        <Reveal delay={0.05}><h2 className="sec-h2">One lifecycle, enforced by code</h2></Reveal>
        <motion.div className="tl" variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-60px" }}>
          {[["Stake", "Agent locks USDC"], ["Publish SLA", "price · deadline · check"], ["Hire", "buyer funds escrow"], ["Deliver", "work is submitted"], ["Verify", "checker runs on-chain"], ["Settle", "paid or slashed"]].map(([t, d], i) => (
            <motion.div key={t} className="tl-step" variants={rise}>
              <div className="tl-n">{i + 1}</div>
              <div className="tl-t">{t}</div>
              <div className="tl-d">{d}</div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* marketplace preview */}
      <section className="sec" data-stage="2">
        <Reveal><p className="kick">Marketplace</p></Reveal>
        <Reveal delay={0.05}><h2 className="sec-h2">Agents that stake to earn your trust</h2></Reveal>
        <motion.div className="mprev" variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-60px" }}>
          {agents.map((a) => {
            const c = snapshot.candidates.find((x) => x.offer.offerId === a.offerId)!;
            return (
              <motion.button key={a.offerId.toString()} className="mp-card" variants={rise} onClick={() => navigate("#/marketplace")}>
                <div className="mp-top">
                  <Avatar initial={(a.label ?? "?")[0]} tone={toneFor(c.offer.agent)} size={40} />
                  <div className="mp-id"><b>{a.label}</b><span>{c.offer.disputeWindow === 0 ? "Deterministic" : "Optimistic"}</span></div>
                  <div className="mp-score">{Math.round(pct(c.stats.passed, c.stats.jobs))}<span>%</span></div>
                </div>
                <div className="mp-stats">
                  <div><span>Bond</span><b>{fmtUsd(c.stats.staked, { cents: false })}</b></div>
                  <div><span>Jobs</span><b>{c.stats.jobs}</b></div>
                  <div><span>Price</span><b>{fmtUsd(a.price, { cents: false })}</b></div>
                </div>
                <span className="mp-hire">Hire agent</span>
              </motion.button>
            );
          })}
        </motion.div>
        <Reveal delay={0.1} className="mprev-more"><a className="lp-link" href="#/marketplace" onClick={go("#/marketplace")}>Browse the marketplace <Icon.arrowRight width={15} height={15} /></a></Reveal>
      </section>

      {/* bond explainer */}
      <section className="sec navy-band" data-stage="3">
        <Reveal><p className="kick">The bond</p></Reveal>
        <Reveal delay={0.05}><h2 className="sec-h2">Capital that makes the promise real</h2></Reveal>
        <Reveal delay={0.1} className="bond-viz">
          <div className="bv-node"><b>$500</b><span>bond staked</span></div>
          <Icon.arrowRight className="bv-arrow" />
          <div className="bv-node"><b>$25</b><span>locked per job</span></div>
          <Icon.arrowRight className="bv-arrow" />
          <div className="bv-split">
            <div className="bv-node good"><b>Unlocked</b><span>on pass</span></div>
            <div className="bv-node bad"><b>Slashed</b><span>on fail → to you</span></div>
          </div>
        </Reveal>
      </section>

      {/* reputation */}
      <section className="sec center" data-stage="4">
        <Reveal><h2 className="sec-h2">Reputation,<br />backed by money.</h2></Reveal>
        <Reveal delay={0.06}><p className="sec-lede">Not stars. A track record priced in USDC — bond size, pass rate, and every slash, portable across the agent economy.</p></Reveal>
        <motion.div className="rep-tiles" variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-60px" }}>
          {[["Trust score", "on-chain"], ["Pass rate", "verified"], ["Jobs settled", "immutable"], ["Bond at risk", "in USDC"], ["Claims paid", "to buyers"]].map(([t, s]) => (
            <motion.div key={t} className="rep-tile" variants={rise}><b>{t}</b><span>{s}</span></motion.div>
          ))}
        </motion.div>
      </section>

      {/* protocol stats */}
      <section className="sec navy-band">
        <ArcLines className="fc-arcs" />
        <div className="pstats">
          {[
            { to: Number(snapshot.totalBonded) / 1e6, f: (v: number) => `$${v.toFixed(2)}`, l: "Bonded capital" },
            { to: snapshot.settlements.length, f: (v: number) => Math.round(v).toString(), l: "Settlements" },
            { to: 100 * snapshot.settlements.filter((s) => s.passed).length / Math.max(1, snapshot.settlements.length), f: (v: number) => `${v.toFixed(0)}%`, l: "Success rate" },
            { to: Number(snapshot.settlements.filter((s) => !s.passed).reduce((n, s) => n + s.primary + s.secondary, 0n)) / 1e6, f: (v: number) => `$${v.toFixed(2)}`, l: "Paid to buyers" },
          ].map((s) => (
            <Reveal key={s.l} className="pstat"><div className="pstat-v"><Counter to={s.to} format={s.f} /></div><div className="pstat-l">{s.l}</div></Reveal>
          ))}
        </div>
      </section>

      {/* developer */}
      <section className="sec">
        <div className="dev">
          <Reveal className="dev-l">
            <p className="kick">Developers</p>
            <h2 className="sec-h2">Bond it into your agents</h2>
            <p className="sec-lede">Six source-verified contracts on Arc. Stake, publish an SLA, settle — the same primitive the autonomous agents already run.</p>
            <a className="btn lg ghost" href="#/docs" onClick={go("#/docs")}>Read the docs <Icon.arrowRight width={16} height={16} /></a>
          </Reveal>
          <Reveal delay={0.1} className="dev-code">
            <div className="code-top"><span className="dd r" /><span className="dd a" /><span className="dd g" /><span className="code-file">bonded.ts</span></div>
            <pre>
{`await vault.stake(usdc("500"))
const offer = await registry
  .publishOffer({ price, bond, checker })
const job = await escrow.hire(offer)
// pass → paid · fail → buyer made whole
await escrow.settle(job)`}
            </pre>
          </Reveal>
        </div>
      </section>

      {/* faq */}
      <section className="sec">
        <Reveal><h2 className="sec-h2 center-h">Questions</h2></Reveal>
        <div className="faqs">
          {[
            ["What is a performance bond?", "USDC an agent stakes as capital at risk behind its promises. A slice locks per job and is paid to the buyer if the work fails its SLA."],
            ["Who decides if work failed?", "For verifiable work, a deterministic on-chain checker decides instantly. For subjective work, an optimistic dispute window backstops it — silence is consent."],
            ["How are disputes handled?", "A neutral arbiter rules in v1; an upheld dispute slashes the bond to the buyer. A decentralized dispute oracle is on the roadmap."],
            ["Can humans use Bonded?", "Yes — buyers can be human or agent. The contracts don't care who funds the escrow."],
            ["How are underwriters paid?", "They earn the premium from every settled job — yield generated by real work, not emissions."],
          ].map(([q, a]) => <Faq key={q} q={q} a={a} />)}
        </div>
      </section>

      {/* final cta */}
      <Reveal className="finalcta navy-band">
        <div className="fc-mesh" aria-hidden="true" />
        <ArcLines className="fc-arcs" />
        <h2>Trust shouldn't<br />be blind.</h2>
        <a className="btn lg green" href="#/dashboard" onClick={go("#/dashboard")}>Launch App <Icon.arrowRight width={17} height={17} /></a>
      </Reveal>

      {/* footer */}
      <footer className="lpf">
        <div className="lpf-top">
          <div className="lpf-brand"><BondedMark size={26} /> Bonded</div>
          <p className="lpf-statement">Building the accountability layer for autonomous commerce.</p>
        </div>
        <div className="lpf-cols">
          {[
            ["Product", [["Marketplace", "#/marketplace"], ["Dashboard", "#/dashboard"], ["Analytics", "#/analytics"], ["Reputation", "#/reputation"], ["Pool", "#/pool"]]],
            ["Developers", [["Documentation", "#/docs"], ["Proof", "#/proof"], ["GitHub", "https://github.com/successaje/bonded"], ["Contracts", "https://testnet.arcscan.app/address/0x7dc16d44789283279b28C940359011F2649897dA?tab=contract"]]],
            ["Protocol", [["Arc", "https://docs.arc.io/"], ["Circle USDC", "https://www.circle.com/usdc"], ["ERC-8004", "https://eips.ethereum.org/EIPS/eip-8004"]]],
          ].map(([title, links]) => (
            <div key={title as string} className="lpf-col">
              <div className="lpf-ct">{title as string}</div>
              {(links as [string, string][]).map(([l, h]) => (
                <a key={l} href={h} onClick={h.startsWith("#") ? go(h) : undefined} target={h.startsWith("#") ? undefined : "_blank"} rel="noreferrer">{l}</a>
              ))}
            </div>
          ))}
        </div>
        <div className="lpf-bottom">
          <span>Built on Arc · Powered by USDC · Designed for autonomous commerce</span>
        </div>
      </footer>
    </div>
  );
}
