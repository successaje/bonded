import { useEffect, useState, useSyncExternalStore } from "react";
import { DemoEngine } from "./demo";
import type { World } from "./types";

/**
 * The data seam. Today: the demo simulation. After deployment: a ChainSource
 * with the same World shape, hydrated from JobEscrow / OutcomeLog / pool
 * events over viem — no component changes.
 */
const engine = new DemoEngine();
engine.start();

export function useWorld(): World {
  return useSyncExternalStore(engine.subscribe, engine.getSnapshot);
}

/** Shared clock for countdowns and "x ago" labels. */
export function useNow(intervalMs = 500): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}
