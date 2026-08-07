import { useEffect, useState } from "react";

export interface Route {
  /** path segments after the hash, e.g. #/jobs/active → ["jobs","active"] */
  segments: string[];
  /** the raw hash path, e.g. "/jobs/active" */
  path: string;
  /** top-level section id, e.g. "jobs" (or "landing" at the root) */
  section: string;
  /** second segment, e.g. "active" */
  sub?: string;
}

function parse(): Route {
  const raw = window.location.hash.replace(/^#/, "");
  const path = raw || "/";
  const segments = path.split("/").filter(Boolean);
  return {
    segments,
    path,
    section: segments[0] ?? "landing",
    sub: segments[1],
  };
}

/** Tiny hash router — no dependency, deep-linkable, Vercel-safe. */
export function useHashRoute(): Route {
  const [route, setRoute] = useState<Route>(parse);
  useEffect(() => {
    const onChange = () => {
      setRoute(parse());
      window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    };
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return route;
}

export function navigate(path: string): void {
  const hash = path.startsWith("#") ? path : `#${path.startsWith("/") ? "" : "/"}${path}`;
  if (window.location.hash === hash) return;
  window.location.hash = hash;
}
