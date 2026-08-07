import { createContext, useContext, type ReactNode } from "react";
import { useWallet, type WalletState } from "./useWallet";

const Ctx = createContext<WalletState | null>(null);

/** One wallet connection shared across the whole app — the appbar button and
 *  the hire panel must see the same state, not independent connections. */
export function WalletProvider({ children }: { children: ReactNode }) {
  const wallet = useWallet();
  return <Ctx.Provider value={wallet}>{children}</Ctx.Provider>;
}

export function useWalletCtx(): WalletState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useWalletCtx must be used inside <WalletProvider>");
  return ctx;
}
