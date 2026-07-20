import { motion, MotionConfig } from "framer-motion";
import { useState } from "react";
import { Agents } from "./views/Agents";
import { Jobs } from "./views/Jobs";
import { Overview } from "./views/Overview";
import { Pool } from "./views/Pool";

const TABS = [
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
  const [tab, setTab] = useState<TabId>("overview");

  return (
    <MotionConfig reducedMotion="user">
      <div className="app">
        <header className="topbar">
          <div className="brand">
            <Logo />
            Bonded
          </div>
          <nav className="tabs" aria-label="Views">
            {TABS.map((t) => (
              <button key={t.id} className={`tab${tab === t.id ? " active" : ""}`} onClick={() => setTab(t.id)}>
                {t.label}
                {tab === t.id && <motion.span layoutId="tab-underline" className="tab-underline" />}
              </button>
            ))}
          </nav>
          <div className="topbar-right">
            <span className="pill">
              <span className="live-dot" /> Arc Testnet
            </span>
            <span className="pill muted" title="Live chain reads land with the testnet deployment">
              Simulated preview
            </span>
          </div>
        </header>

        <motion.main
          key={tab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          {tab === "overview" && <Overview onNavigate={(t) => setTab(t as TabId)} />}
          {tab === "agents" && <Agents />}
          {tab === "jobs" && <Jobs />}
          {tab === "pool" && <Pool />}
        </motion.main>
      </div>
    </MotionConfig>
  );
}
