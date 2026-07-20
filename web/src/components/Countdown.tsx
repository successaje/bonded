import { motion } from "framer-motion";
import { useNow } from "../data/source";
import { clamp, mmss } from "../lib/format";

export function Countdown({ deadline, total, label }: { deadline: number; total: number; label: string }) {
  const now = useNow(250);
  const remaining = Math.max(0, deadline - now);
  const frac = clamp(total > 0 ? remaining / total : 0, 0, 1);
  const color = frac > 0.35 ? "var(--blue)" : frac > 0.15 ? "var(--amber)" : "var(--red)";

  return (
    <div className="countdown">
      <div className="countdown-row">
        <span>{label}</span>
        <span className="mono">{mmss(remaining)}</span>
      </div>
      <div className="countdown-track">
        <motion.div
          className="countdown-fill"
          animate={{ width: `${frac * 100}%`, backgroundColor: color }}
          transition={{ duration: 0.25, ease: "linear" }}
        />
      </div>
    </div>
  );
}
