import { motion } from "framer-motion";
import { useRef, useState } from "react";
import type { PoolPoint } from "../data/types";
import { fmtUsd } from "../lib/format";

/** Single-series marks: one hue, 2px line, recessive grid — per the viz method. */

export function Spark({ data, width = 118, height = 34 }: { data: number[]; width?: number; height?: number }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pad = 3;
  const pts = data.map((v, i) => [
    pad + (i / (data.length - 1)) * (width - pad * 2),
    pad + (1 - (v - min) / range) * (height - pad * 2),
  ]);
  const line = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join("");
  const area = `${line}L${pts[pts.length - 1][0].toFixed(1)},${height - pad}L${pad},${height - pad}Z`;
  return (
    <svg width={width} height={height} aria-hidden="true">
      <defs>
        <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.24" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#sparkFill)" />
      <path d={line} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const W = 620;
const H = 210;
const PAD = { l: 10, r: 58, t: 16, b: 24 };

const hhmm = (t: number) => new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export function AreaChart({ points, label }: { points: PoolPoint[]; label: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  if (points.length < 2) return null;
  const values = points.map((p) => p.assets);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const lo = min - span * 0.2;
  const hi = max + span * 0.12;

  const x = (i: number) => PAD.l + (i / (points.length - 1)) * (W - PAD.l - PAD.r);
  const y = (v: number) => PAD.t + (1 - (v - lo) / (hi - lo)) * (H - PAD.t - PAD.b);

  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.assets).toFixed(1)}`).join("");
  const area = `${line}L${x(points.length - 1).toFixed(1)},${H - PAD.b}L${PAD.l},${H - PAD.b}Z`;

  const last = points[points.length - 1];
  const lastX = x(points.length - 1);
  const lastY = y(last.assets);

  // sparse time ticks
  const tickIdx = [0, Math.floor((points.length - 1) / 2), points.length - 1];

  const onMove = (e: React.MouseEvent) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    const frac = (e.clientX - rect.left) / rect.width;
    const i = Math.round(frac * (points.length - 1));
    setHover(Math.min(points.length - 1, Math.max(0, i)));
  };

  const hp = hover != null ? points[hover] : null;
  const hxPct = hover != null ? (x(hover) / W) * 100 : 0;

  return (
    <div className="chart-wrap" ref={wrapRef} onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} style={{ display: "block" }}>
        <defs>
          <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.33, 0.66].map((f) => (
          <line
            key={f}
            x1={PAD.l}
            x2={W - PAD.r}
            y1={PAD.t + f * (H - PAD.t - PAD.b)}
            y2={PAD.t + f * (H - PAD.t - PAD.b)}
            stroke="rgba(140,160,200,0.08)"
            strokeWidth="1"
          />
        ))}
        <motion.path d={area} fill="url(#areaFill)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.9, delay: 0.35 }} />
        <motion.path
          d={line}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.1, ease: "easeOut" }}
        />

        {/* time ticks */}
        {tickIdx.map((i, k) => (
          <text
            key={i}
            className="tick"
            x={x(i)}
            y={H - 6}
            textAnchor={k === 0 ? "start" : k === tickIdx.length - 1 ? "end" : "middle"}
          >
            {hhmm(points[i].t)}
          </text>
        ))}

        {/* labeled last-value dot */}
        <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1 }}>
          <circle cx={lastX} cy={lastY} r="3.5" fill="var(--accent)" stroke="var(--bg)" strokeWidth="2" />
          <text className="tick" x={lastX + 8} y={lastY + 3.5} textAnchor="start" style={{ fill: "var(--text-2)", fontWeight: 600 }}>
            {fmtUsd(last.assets, { compact: true })}
          </text>
        </motion.g>

        {hp && (
          <g>
            <line x1={x(hover!)} x2={x(hover!)} y1={PAD.t} y2={H - PAD.b} stroke="rgba(140,160,200,0.3)" strokeWidth="1" />
            <circle cx={x(hover!)} cy={y(hp.assets)} r="4.5" fill="var(--accent)" stroke="var(--bg)" strokeWidth="2" />
          </g>
        )}
      </svg>
      {hp && (
        <div className="chart-tip" style={{ left: `${hxPct}%`, top: 6 }}>
          <b>{fmtUsd(hp.assets)}</b> · {hhmm(hp.t)}
        </div>
      )}
    </div>
  );
}
