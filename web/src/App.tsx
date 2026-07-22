import { motion, MotionConfig } from "framer-motion";
import { useRef, useState } from "react";
import { addresses, addressUrl } from "./lib/chain";
import { Agents } from "./views/Agents";
import { Jobs } from "./views/Jobs";
import { Overview } from "./views/Overview";
import { Pool } from "./views/Pool";
import { Proof } from "./views/Proof";

const TABS = [
  { id: "proof", label: "Proof" },
  { id: "overview", label: "Overview" },
  { id: "agents", label: "Agents" },
  { id: "jobs", label: "Jobs" },
  { id: "pool", label: "Pool" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function Logo() {
  return (
    <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="13" fill="none" stroke="var(--blue)" strokeWidth="2.6" />
      <path d="M10.5 16.5l4 4 7.5-9.5" fill="none" stroke="var(--green)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function App() {
  const [tab, setTab] = useState<TabId>("proof");
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  /** Arrow-key navigation between tabs, per the WAI-ARIA tabs pattern. */
  const onTabKeyDown = (e: React.KeyboardEvent, index: number) => {
    const delta = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    const jump = e.key === "Home" ? 0 : e.key === "End" ? TABS.length - 1 : null;
    if (!delta && jump === null) return;
    e.preventDefault();
    const next = jump ?? (index + delta + TABS.length) % TABS.length;
    setTab(TABS[next].id);
    tabRefs.current[next]?.focus();
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="app">
        <header className="topbar">
          <div className="brand">
            <Logo />
            Bonded
          </div>
          <div className="tabs" role="tablist" aria-label="Dashboard views">
            {TABS.map((t, i) => {
              const selected = tab === t.id;
              return (
                <button
                  key={t.id}
                  ref={(el) => {
                    tabRefs.current[i] = el;
                  }}
                  id={`tab-${t.id}`}
                  role="tab"
                  aria-selected={selected}
                  aria-controls={`panel-${t.id}`}
                  tabIndex={selected ? 0 : -1}
                  className={`tab${selected ? " active" : ""}`}
                  onClick={() => setTab(t.id)}
                  onKeyDown={(e) => onTabKeyDown(e, i)}
                >
                  {t.label}
                  {selected && <motion.span layoutId="tab-underline" className="tab-underline" />}
                </button>
              );
            })}
          </div>
          <div className="topbar-right">
            <span className="pill">
              <span className="live-dot" /> Arc Testnet
            </span>
            {/* say exactly what the visible screen is showing — Proof reads the
                real deployment, the operational views still run the simulation */}
            {tab === "proof" ? (
              <a
                className="pill"
                href={addressUrl(addresses.jobEscrow)}
                target="_blank"
                rel="noreferrer"
                title="Every contract is source-verified on ArcScan"
                style={{ textDecoration: "none" }}
              >
                Verified on-chain ↗
              </a>
            ) : (
              <span className="pill muted" title="This view runs a simulation of the protocol economics">
                Simulated preview
              </span>
            )}
          </div>
        </header>

        <motion.main
          key={tab}
          id={`panel-${tab}`}
          role="tabpanel"
          aria-labelledby={`tab-${tab}`}
          tabIndex={-1}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          {tab === "proof" && <Proof />}
          {tab === "overview" && <Overview onNavigate={(t) => setTab(t as TabId)} />}
          {tab === "agents" && <Agents />}
          {tab === "jobs" && <Jobs />}
          {tab === "pool" && <Pool />}
        </motion.main>
      </div>
    </MotionConfig>
  );
}
