import type { SVGProps } from "react";

/** Clean 1.6px line icons, currentColor. One consistent visual language. */
const base = (p: SVGProps<SVGSVGElement>) => ({
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  ...p,
});

export const Icon = {
  dashboard: (p: SVGProps<SVGSVGElement>) => (
    <svg {...base(p)}><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></svg>
  ),
  proof: (p: SVGProps<SVGSVGElement>) => (
    <svg {...base(p)}><path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" /><path d="M9 12l2 2 4-4" /></svg>
  ),
  marketplace: (p: SVGProps<SVGSVGElement>) => (
    <svg {...base(p)}><path d="M4 8h16l-1 3H5L4 8z" /><path d="M4 8l1-3h14l1 3" /><path d="M6 11v7a1 1 0 001 1h10a1 1 0 001-1v-7" /><path d="M10 19v-4h4v4" /></svg>
  ),
  jobs: (p: SVGProps<SVGSVGElement>) => (
    <svg {...base(p)}><path d="M4 6h11M4 12h11M4 18h7" /><path d="M18.5 5.5l1.5 1.5 2.5-3" /><path d="M18.5 11.5l1.5 1.5 2.5-3" /></svg>
  ),
  myAgent: (p: SVGProps<SVGSVGElement>) => (
    <svg {...base(p)}><rect x="5" y="8" width="14" height="10" rx="2.5" /><path d="M12 5v3M9 12.5h.01M15 12.5h.01" /><path d="M3 12v2M21 12v2" /></svg>
  ),
  pool: (p: SVGProps<SVGSVGElement>) => (
    <svg {...base(p)}><path d="M12 3s6 6.5 6 10.5A6 6 0 016 13.5C6 9.5 12 3 12 3z" /><path d="M9.5 13.5a2.5 2.5 0 002.5 2.5" /></svg>
  ),
  reputation: (p: SVGProps<SVGSVGElement>) => (
    <svg {...base(p)}><circle cx="11" cy="11" r="6" /><path d="M20 20l-3.5-3.5" /><path d="M11 8.5l.9 1.9 2 .3-1.5 1.4.4 2-1.8-1-1.8 1 .4-2L8 10.7l2-.3.9-1.9z" /></svg>
  ),
  disputes: (p: SVGProps<SVGSVGElement>) => (
    <svg {...base(p)}><path d="M12 4v16M7 20h10" /><path d="M5 8h14" /><path d="M5 8l-2 5a3 3 0 004 0l-2-5z" /><path d="M19 8l-2 5a3 3 0 004 0l-2-5z" /></svg>
  ),
  analytics: (p: SVGProps<SVGSVGElement>) => (
    <svg {...base(p)}><path d="M4 4v16h16" /><path d="M8 15l3-4 3 2 4-6" /></svg>
  ),
  settings: (p: SVGProps<SVGSVGElement>) => (
    <svg {...base(p)}><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" /></svg>
  ),
  docs: (p: SVGProps<SVGSVGElement>) => (
    <svg {...base(p)}><path d="M6 3h9l4 4v14a1 1 0 01-1 1H6a1 1 0 01-1-1V4a1 1 0 011-1z" /><path d="M14 3v5h5M8 13h8M8 17h5" /></svg>
  ),
  chevron: (p: SVGProps<SVGSVGElement>) => (
    <svg {...base(p)} width={16} height={16}><path d="M9 6l6 6-6 6" /></svg>
  ),
  external: (p: SVGProps<SVGSVGElement>) => (
    <svg {...base(p)} width={14} height={14}><path d="M14 4h6v6M20 4l-9 9M18 13v6a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h6" /></svg>
  ),
  search: (p: SVGProps<SVGSVGElement>) => (
    <svg {...base(p)}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
  ),
  arrowRight: (p: SVGProps<SVGSVGElement>) => (
    <svg {...base(p)}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
  ),
  menu: (p: SVGProps<SVGSVGElement>) => (
    <svg {...base(p)}><path d="M4 6h16M4 12h16M4 18h16" /></svg>
  ),
  close: (p: SVGProps<SVGSVGElement>) => (
    <svg {...base(p)}><path d="M6 6l12 12M18 6L6 18" /></svg>
  ),
  spark: (p: SVGProps<SVGSVGElement>) => (
    <svg {...base(p)}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8" /></svg>
  ),
};

export type IconKey = keyof typeof Icon;
