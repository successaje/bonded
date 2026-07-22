import { createPublicClient, defineChain, http, type Address } from "viem";

/** Arc testnet. USDC is the native gas token and also an ERC-20 at a fixed
 *  address — the same pool in two views. Bonded works in the 6-decimal view. */
export const arcTestnet = defineChain({
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.testnet.arc.network"] } },
  blockExplorers: { default: { name: "ArcScan", url: "https://testnet.arcscan.app" } },
  testnet: true,
});

/** Live deployment — docs/deployments.md. All six are source-verified. */
export const addresses = {
  usdc: "0x3600000000000000000000000000000000000000",
  jobEscrow: "0x7dc16d44789283279b28C940359011F2649897dA",
  bondVault: "0x6444f16e29Bf33a8C9da2B89E472b58Bafe41b9c",
  slaRegistry: "0x86C41594e9aDeCcf8c85ba9EEe0138C7c9E70dBc",
  underwriterPool: "0xC310b43748E5303F1372Ab2C9075629E0Bb4FE54",
  outcomeLog: "0xF673F508104876c72C8724728f81d50E01649b40",
  auditChecker: "0x7CC324d15E5fF17c43188fB63b462B9a79dA68f6",
} as const satisfies Record<string, Address>;

/** Block the protocol was deployed in — bounds every log query. */
export const DEPLOY_BLOCK = 52_945_394n;

export const publicClient = createPublicClient({
  chain: arcTestnet,
  transport: http(undefined, { retryCount: 3, retryDelay: 500 }),
});

export const txUrl = (hash: string) => `${arcTestnet.blockExplorers.default.url}/tx/${hash}`;
export const addressUrl = (a: string) => `${arcTestnet.blockExplorers.default.url}/address/${a}`;

/** Known agents, so the UI can name what the chain only knows as addresses. */
export const AGENT_NAMES: Record<string, string> = {
  "0x3390bdf83c4bc5a5fd7c410fb24430843e6e62f4": "Leak",
  "0x18fed7fabbfbe80f271a0943f0c8b2ba1f4cfb6e": "SwiftAudit",
  "0x7fa350db254fb9fe8febcf92560aec683d2a30e7": "FlakyLabs",
  "0x60ef148485c2a5119fa52ca13c52e9fd98f28e87": "Leak (bootstrap)",
  "0xb141478a27ed60cff71e2a5de7b1b95bdc66210c": "Buyer agent",
};

export const nameOf = (a: string) => AGENT_NAMES[a.toLowerCase()] ?? `${a.slice(0, 6)}…${a.slice(-4)}`;

const RATE_LIMITED = /request limit|rate limit|429|too many/i;

/** The public Arc RPC rate-limits bursts; back off rather than fail the page. */
export async function withRetry<T>(fn: () => Promise<T>, attempts = 5): Promise<T> {
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      if (!RATE_LIMITED.test(e instanceof Error ? e.message : String(e))) throw e;
      await new Promise((r) => setTimeout(r, Math.min(400 * 2 ** i, 6000) + Math.random() * 200));
    }
  }
  throw last;
}

export async function mapSeries<T, R>(items: T[], fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i++) out.push(await fn(items[i], i));
  return out;
}
