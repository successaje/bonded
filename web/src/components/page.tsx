import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { Icon, type IconKey } from "../app/icons";

export function PageHead({
  eyebrow,
  title,
  sub,
  actions,
}: {
  eyebrow?: string;
  title: string;
  sub?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <motion.div className="page-head" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="page-title">{title}</h1>
        {sub && <p className="page-sub">{sub}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </motion.div>
  );
}

export function SubTabs({
  items,
  active,
  onChange,
}: {
  items: { id: string; label: string; count?: number }[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="subtabs" role="tablist">
      {items.map((it) => (
        <button key={it.id} role="tab" aria-selected={active === it.id} className={`subtab${active === it.id ? " active" : ""}`} onClick={() => onChange(it.id)}>
          {active === it.id && <motion.span layoutId="subtab-bg" className="subtab-bg" transition={{ type: "spring", stiffness: 500, damping: 40 }} />}
          <span className="subtab-label">{it.label}</span>
          {it.count != null && <span className="subtab-count">{it.count}</span>}
        </button>
      ))}
    </div>
  );
}

/** An intentional, on-brand screen for sections whose data needs a connected
 *  wallet or a future build — a designed spec, never an empty stub. */
export function Preview({
  icon,
  title,
  blurb,
  points,
  status = "On the roadmap",
}: {
  icon: IconKey;
  title: string;
  blurb: string;
  points: { k: string; v: string }[];
  status?: string;
}) {
  const IconCmp = Icon[icon];
  return (
    <motion.div className="preview-wrap" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
      <div className="preview-hero card">
        <div className="preview-ico"><IconCmp width={26} height={26} /></div>
        <span className="badge accent" style={{ marginBottom: 12 }}>{status}</span>
        <h2 className="preview-title">{title}</h2>
        <p className="preview-blurb">{blurb}</p>
      </div>
      <div className="preview-grid">
        {points.map((p, i) => (
          <motion.div
            key={p.k}
            className="card flat preview-point"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.06 * (i + 1) }}
          >
            <div className="pp-k">{p.k}</div>
            <div className="pp-v">{p.v}</div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
