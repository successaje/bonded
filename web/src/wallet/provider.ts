/** Minimal EIP-1193 surface — just what connecting a wallet needs. */
export interface Eip1193Provider {
  request(args: { method: string; params?: unknown[] | object }): Promise<unknown>;
  on(event: string, handler: (...args: unknown[]) => void): void;
  removeListener(event: string, handler: (...args: unknown[]) => void): void;
  isMetaMask?: boolean;
}

declare global {
  interface Window {
    ethereum?: Eip1193Provider;
  }
}

export function getProvider(): Eip1193Provider | null {
  return typeof window !== "undefined" ? (window.ethereum ?? null) : null;
}
