/** Amounts are micro-USDC (1_000_000 = $1), matching the 6-decimal ERC-20 view on Arc. */
export const USDC = 1_000_000;

export function fmtUsd(micro: number, opts: { compact?: boolean; cents?: boolean } = {}): string {
  const dollars = micro / USDC;
  if (opts.compact && dollars >= 1000) {
    return `$${dollars.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  }
  return `$${dollars.toLocaleString("en-US", {
    minimumFractionDigits: opts.cents === false ? 0 : 2,
    maximumFractionDigits: opts.cents === false ? 0 : 2,
  })}`;
}

export function pct(num: number, den: number): number {
  return den === 0 ? 0 : (num / den) * 100;
}

export function timeAgo(t: number, now: number): string {
  const s = Math.max(0, Math.round((now - t) / 1000));
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

export function mmss(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function shortAddr(a: string): string {
  return a.length > 10 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a;
}

export function clamp(x: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, x));
}
