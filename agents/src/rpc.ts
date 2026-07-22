/** The public Arc RPC rate-limits bursts, so reads are paced and retried. */

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const RATE_LIMITED = /request limit|rate limit|429|too many requests/i;

export async function withRetry<T>(fn: () => Promise<T>, attempts = 8): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      const msg = e instanceof Error ? e.message : String(e);
      if (!RATE_LIMITED.test(msg)) throw e;
      // 300ms → ~38s total, with jitter so a daemon and a CLI running at the
      // same time don't retry in lockstep and collide again.
      const backoff = Math.min(300 * 2 ** i, 12_000);
      await sleep(backoff + Math.random() * 250);
    }
  }
  throw lastError;
}

/** Sequential map — kinder to the public RPC than Promise.all. */
export async function mapSeries<T, R>(items: T[], fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i++) out.push(await fn(items[i], i));
  return out;
}
