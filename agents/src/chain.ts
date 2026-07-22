import { createPublicClient, createWalletClient, defineChain, http, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { withRetry } from "./rpc.js";

/** Arc testnet. USDC is the native gas token (18-decimal native view) and is
 *  also an ERC-20 at a fixed address (6-decimal view) — the same pool, two
 *  views. Every Bonded contract works in the 6-decimal ERC-20 view. */
export const arcTestnet = defineChain({
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: { default: { http: [process.env.ARC_TESTNET_RPC_URL ?? "https://rpc.testnet.arc.network"] } },
  blockExplorers: { default: { name: "ArcScan", url: "https://testnet.arcscan.app" } },
  testnet: true,
});

/** Live deployment — see docs/deployments.md. */
export const addresses = {
  usdc: "0x3600000000000000000000000000000000000000",
  jobEscrow: "0x7dc16d44789283279b28C940359011F2649897dA",
  bondVault: "0x6444f16e29Bf33a8C9da2B89E472b58Bafe41b9c",
  slaRegistry: "0x86C41594e9aDeCcf8c85ba9EEe0138C7c9E70dBc",
  underwriterPool: "0xC310b43748E5303F1372Ab2C9075629E0Bb4FE54",
  outcomeLog: "0xF673F508104876c72C8724728f81d50E01649b40",
  auditChecker: "0x7CC324d15E5fF17c43188fB63b462B9a79dA68f6",
} as const satisfies Record<string, Address>;

/** Polls gently — the public Arc RPC rate-limits bursts. */
export const publicClient = createPublicClient({
  chain: arcTestnet,
  transport: http(undefined, { retryCount: 5, retryDelay: 400 }),
  pollingInterval: 2_500,
});

/** Waits for a receipt, surviving the RPC's rate limiter. */
export async function waitForTx(hash: Hex) {
  return withRetry(() => publicClient.waitForTransactionReceipt({ hash, pollingInterval: 2_500 }), 6);
}

/** An agent's own wallet: it signs its own transactions, nobody signs for it. */
export function agentWallet(privateKey: Hex) {
  const account = privateKeyToAccount(privateKey);
  return {
    account,
    address: account.address,
    client: createWalletClient({ account, chain: arcTestnet, transport: http() }),
  };
}

export function requireKey(name: string): Hex {
  const v = process.env[name];
  if (!v) throw new Error(`missing ${name} in agents/.env — see .env.example`);
  return (v.startsWith("0x") ? v : `0x${v}`) as Hex;
}

export const explorerTx = (hash: string) => `${arcTestnet.blockExplorers.default.url}/tx/${hash}`;

/** micro-USDC (6dp) → display */
export const usd = (micro: bigint | number): string =>
  `$${(Number(micro) / 1e6).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const USDC_UNIT = 1_000_000n;
