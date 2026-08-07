/** Turns viem/wallet errors into something a user can act on. */
export function friendlyError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (/user rejected|denied|user denied/i.test(msg)) return "Rejected in wallet.";
  if (/already pending/i.test(msg)) return "A wallet request is already open — check your wallet.";
  if (/insufficient funds/i.test(msg)) return "Not enough USDC to cover this plus gas.";
  return msg.split("\n")[0].slice(0, 140);
}
