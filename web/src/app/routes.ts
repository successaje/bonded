import type { IconKey } from "./icons";

/**
 * The whole information architecture in one place — drives both the router and
 * the sidebar, so navigation can never drift from what actually renders.
 * Paths are hash-based (#/dashboard), which deep-links and needs no server
 * rewrites beyond the SPA fallback already in vercel.json.
 */

export interface NavChild {
  label: string;
  path: string;
}
export interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: IconKey;
  children?: NavChild[];
  /** shown with a subtle "preview" tag in the sidebar */
  preview?: boolean;
}

export const NAV: NavItem[] = [
  { id: "dashboard", label: "Dashboard", path: "#/dashboard", icon: "dashboard" },
  { id: "proof", label: "Proof", path: "#/proof", icon: "proof" },
  {
    id: "marketplace",
    label: "Marketplace",
    path: "#/marketplace",
    icon: "marketplace",
    children: [
      { label: "Browse agents", path: "#/marketplace" },
      { label: "Agent details", path: "#/marketplace/leak" },
    ],
  },
  {
    id: "jobs",
    label: "Jobs",
    path: "#/jobs/active",
    icon: "jobs",
    children: [
      { label: "Active", path: "#/jobs/active" },
      { label: "Pending review", path: "#/jobs/pending" },
      { label: "Completed", path: "#/jobs/completed" },
      { label: "Failed", path: "#/jobs/failed" },
    ],
  },
  {
    id: "my-agent",
    label: "My Agent",
    path: "#/my-agent",
    icon: "myAgent",
    preview: true,
    children: [
      { label: "Bond", path: "#/my-agent/bond" },
      { label: "SLA", path: "#/my-agent/sla" },
      { label: "Reputation", path: "#/my-agent/reputation" },
      { label: "Earnings", path: "#/my-agent/earnings" },
      { label: "History", path: "#/my-agent/history" },
    ],
  },
  {
    id: "pool",
    label: "Underwriter Pool",
    path: "#/pool",
    icon: "pool",
    children: [
      { label: "Deposit", path: "#/pool/deposit" },
      { label: "Yield", path: "#/pool/yield" },
      { label: "Exposure", path: "#/pool/exposure" },
      { label: "Premiums", path: "#/pool/premiums" },
    ],
  },
  { id: "reputation", label: "Reputation Explorer", path: "#/reputation", icon: "reputation" },
  { id: "disputes", label: "Disputes", path: "#/disputes", icon: "disputes", preview: true },
  { id: "analytics", label: "Analytics", path: "#/analytics", icon: "analytics" },
  { id: "settings", label: "Settings", path: "#/settings", icon: "settings" },
  { id: "docs", label: "Documentation", path: "#/docs", icon: "docs" },
];

/** Flat lookup for the topbar breadcrumb / title. */
export const NAV_BY_ID = Object.fromEntries(NAV.map((n) => [n.id, n]));
