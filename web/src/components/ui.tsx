import { motion } from "framer-motion";
import type { ReactNode } from "react";
import type { Job } from "../data/types";
import { fmtUsd, pct } from "../lib/format";
import { Spark } from "./charts";

type Tone = "green" | "red" | "amber" | "blue" | "gray";

export function Badge({ tone, icon, children, glow }: { tone: Tone; icon?: string; children: ReactNode; glow?: boolean }) {
  return (
    <span className={`badge ${tone}${glow ? " bonded-badge" : ""}`}>
      {icon && <span aria-hidden="true">{icon}</span>}
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
      return <Badge tone="blue" icon="◷">In progress</Badge>;
    case "delivered":
      return <Badge tone="amber" icon="◔">Acceptance window</Badge>;
    case "disputed":
      return <Badge tone="amber" icon="⚖">Disputed</Badge>;
    case "passed":
      return <Badge tone="green" icon="✓">Passed</Badge>;
    case "failed":
      return <Badge tone="red" icon="✕">Slashed</Badge>;
  }
}

export function Avatar({ initial, size = 42 }: { initial: string; size?: number }) {
  return (
    <div className="avatar" style={{ width: size, height: size, fontSize: size * 0.38 }}>
      {initial}
    </div>
  );
}

export function StatCard({
  label,
  value,
  sub,
  spark,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  spark?: number[];
}) {
  return (
    <motion.div
      className="card hoverable"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
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

export function BondBar({ staked, locked }: { staked: number; locked: number }) {
  const available = Math.max(0, staked - locked);
  const lockedPct = staked > 0 ? (locked / staked) * 100 : 0;
  return (
    <div>
      <div className="bondbar-label">
        <span>
          Bond <b style={{ color: "var(--text)" }}>{fmtUsd(staked, { cents: false })}</b>
        </span>
        <span>{locked > 0 ? `${fmtUsd(locked, { cents: false })} locked in jobs` : "nothing locked"}</span>
      </div>
      <div className="bondbar" role="img" aria-label={`Bond ${fmtUsd(staked)}, ${fmtUsd(locked)} locked, ${fmtUsd(available)} available`}>
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
          style={{ background: "var(--blue)" }}
          animate={{ width: `${100 - lockedPct}%` }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </div>
  );
}

export function PassRing({ passed, jobs, size = 74 }: { passed: number; jobs: number; size?: number }) {
  const rate = jobs > 0 ? pct(passed, jobs) : 0;
  const r = size / 2 - 5;
  const c = 2 * Math.PI * r;
  const tone = rate >= 90 ? "var(--green)" : rate >= 70 ? "var(--amber)" : "var(--red)";
  return (
    <div style={{ position: "relative", width: size, height: size, flex: "none" }}>
      <svg width={size} height={size} role="img" aria-label={`${Math.round(rate)}% pass rate over ${jobs} jobs`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(146,166,205,0.14)" strokeWidth="6" />
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
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "grid",
          placeItems: "center",
          textAlign: "center",
          lineHeight: 1.05,
        }}
      >
        <div>
          <div className="mono" style={{ fontWeight: 680, fontSize: size * 0.24 }}>
            {Math.round(rate)}%
          </div>
          <div style={{ fontSize: 10, color: "var(--text-3)", fontWeight: 600 }}>pass</div>
        </div>
      </div>
    </div>
  );
}
