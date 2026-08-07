import { motion } from "framer-motion";
import type { ReactNode } from "react";
import type { Job } from "../data/types";
import { fmtUsd, pct } from "../lib/format";
import { Spark } from "./charts";

type Tone = "green" | "red" | "amber" | "accent" | "gray";
type AvTone = "blue" | "violet" | "teal" | "amber";

const AGENT_TONE: Record<string, AvTone> = {
  leak: "blue",
  scribe: "violet",
  quant: "teal",
  flaky: "amber",
};
export function agentTone(id: string): AvTone {
  return AGENT_TONE[id] ?? "blue";
}

const TONE_CYCLE: AvTone[] = ["blue", "violet", "teal", "amber"];
/** Stable, distinct avatar color for an arbitrary seed (e.g. an address). */
export function toneFor(seed: string): AvTone {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return TONE_CYCLE[h % TONE_CYCLE.length];
}

export function BondedMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" style={{ display: "block", flex: "none" }}>
      <circle cx="16" cy="16" r="13" fill="none" stroke="var(--accent)" strokeWidth="2.6" />
      <path d="M10.5 16.5l4 4 7.5-9.5" fill="none" stroke="var(--green)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Badge({ tone, icon, children, glow }: { tone: Tone; icon?: string; children: ReactNode; glow?: boolean }) {
  return (
    <span className={`badge ${tone}${glow ? " bonded-badge" : ""}`}>
      {icon && <span className="bi" aria-hidden="true">{icon}</span>}
      {children}
    </span>
  );
}

export function BondedBadge() {
  return (
    <Badge tone="green" icon="✓" glow>
      Bonded
    </Badge>
  );
}

/** State always ships icon + label — never color alone. */
export function StateBadge({ job }: { job: Job }) {
  switch (job.state) {
    case "funded":
      return <Badge tone="accent" icon="●">In progress</Badge>;
    case "delivered":
      return <Badge tone="amber" icon="●">Acceptance window</Badge>;
    case "disputed":
      return <Badge tone="amber" icon="⚖">Disputed</Badge>;
    case "passed":
      return <Badge tone="green" icon="✓">Passed</Badge>;
    case "failed":
      return <Badge tone="red" icon="✕">Slashed</Badge>;
  }
}

export function Avatar({ initial, tone, size = 42 }: { initial: string; tone: AvTone; size?: number }) {
  return (
    <div className={`avatar av-${tone}`} style={{ width: size, height: size, fontSize: size * 0.4 }}>
      {initial}
    </div>
  );
}

export function EmptyState({ icon, title, sub }: { icon: string; title: string; sub?: string }) {
  return (
    <div className="empty">
      <div className="em-icon" aria-hidden="true">{icon}</div>
      <div className="em-title">{title}</div>
      {sub && <div className="em-sub">{sub}</div>}
    </div>
  );
}

export function StatTile({
  label,
  value,
  sub,
  spark,
  delay = 0,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  spark?: number[];
  delay?: number;
}) {
  return (
    <motion.div
      className="card hoverable"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.42, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="stat-label">{label}</div>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 10 }}>
        <div className="stat-value">{value}</div>
        {spark && <Spark data={spark} />}
      </div>
      {sub && <div className="stat-sub">{sub}</div>}
    </motion.div>
  );
}

export function BondBar({ staked: staked_, locked: locked_ }: { staked: number | bigint; locked: number | bigint }) {
  const staked = Number(staked_);
  const locked = Number(locked_);
  const available = Math.max(0, staked - locked);
  const lockedPct = staked > 0 ? (locked / staked) * 100 : 0;
  return (
    <div>
      <div className="bondbar-label">
        <span>
          Bond <b>{fmtUsd(staked, { cents: false })}</b>
        </span>
        <span>{locked > 0 ? `${fmtUsd(locked, { cents: false })} locked` : "fully available"}</span>
      </div>
      <div
        className="bondbar"
        role="img"
        aria-label={`Bond ${fmtUsd(staked)}, ${fmtUsd(locked)} locked, ${fmtUsd(available)} available`}
      >
        {locked > 0 && (
          <motion.div
            className="seg"
            style={{ background: "var(--amber)" }}
            animate={{ width: `${lockedPct}%` }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          />
        )}
        <motion.div
          className="seg"
          style={{ background: "rgba(140,160,200,0.4)" }}
          animate={{ width: `${100 - lockedPct}%` }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </div>
  );
}

export function PassRing({ passed, jobs, size = 78 }: { passed: number; jobs: number; size?: number }) {
  const rate = jobs > 0 ? pct(passed, jobs) : 0;
  const r = size / 2 - 5;
  const c = 2 * Math.PI * r;
  const tone = rate >= 90 ? "var(--green)" : rate >= 70 ? "var(--amber)" : "var(--red)";
  return (
    <div style={{ position: "relative", width: size, height: size, flex: "none" }}>
      <svg width={size} height={size} role="img" aria-label={`${Math.round(rate)}% pass rate over ${jobs} jobs`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(140,160,200,0.13)" strokeWidth="6" />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={tone}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={c}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - rate / 100) }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", textAlign: "center", lineHeight: 1.05 }}>
        <div>
          <div className="mono" style={{ fontWeight: 700, fontSize: size * 0.25 }}>
            {Math.round(rate)}%
          </div>
          <div style={{ fontSize: 10, color: "var(--text-4)", fontWeight: 600 }}>pass</div>
        </div>
      </div>
    </div>
  );
}
