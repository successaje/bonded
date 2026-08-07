import { useCallback, useEffect, useMemo, useState } from "react";
import { createWalletClient, custom, formatUnits, type Address, type WalletClient } from "viem";
import { erc20Abi } from "../lib/abis";
import { addresses, arcTestnet, publicClient } from "../lib/chain";
import { friendlyError } from "./errors";
import { getProvider } from "./provider";

const RECONNECT_KEY = "bonded-wallet-connected";
const ARC_CHAIN_HEX = `0x${arcTestnet.id.toString(16)}`;

export type WalletStatus = "disconnected" | "connecting" | "connected" | "no-provider";

export interface WalletState {
  status: WalletStatus;
  address: Address | null;
  chainId: number | null;
  onArc: boolean;
  usdcBalance: bigint | null;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  switchToArc: () => Promise<boolean>;
  walletClient: WalletClient | null;
  refreshBalance: () => Promise<void>;
}

/** Wallet connection over raw EIP-1193 + viem — no wagmi, matches the rest
 *  of the app's minimal-dependency approach. Silently reconnects on reload
 *  if the user connected before (no prompt), and tracks account/chain
 *  changes live. */
export function useWallet(): WalletState {
  const provider = useMemo(() => getProvider(), []);
  const [status, setStatus] = useState<WalletStatus>(provider ? "disconnected" : "no-provider");
  const [address, setAddress] = useState<Address | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [usdcBalance, setUsdcBalance] = useState<bigint | null>(null);
  const [error, setError] = useState<string | null>(null);

  const walletClient = useMemo(() => {
    if (!provider || !address) return null;
    return createWalletClient({ account: address, chain: arcTestnet, transport: custom(provider) });
  }, [provider, address]);

  const refreshBalance = useCallback(async () => {
    if (!address) return;
    try {
      const bal = await publicClient.readContract({
        address: addresses.usdc,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [address],
      });
      setUsdcBalance(bal as bigint);
    } catch {
      /* transient RPC hiccup — next poll will retry */
    }
  }, [address]);

  const connect = useCallback(async () => {
    if (!provider) {
      setError("No wallet found — install MetaMask or another injected wallet.");
      return;
    }
    setStatus("connecting");
    setError(null);
    try {
      const accts = (await provider.request({ method: "eth_requestAccounts" })) as string[];
      const cid = (await provider.request({ method: "eth_chainId" })) as string;
      setAddress(accts[0] as Address);
      setChainId(parseInt(cid, 16));
      setStatus("connected");
      localStorage.setItem(RECONNECT_KEY, "1");
    } catch (e) {
      setStatus("disconnected");
      setError(friendlyError(e));
    }
  }, [provider]);

  const disconnect = useCallback(() => {
    setAddress(null);
    setChainId(null);
    setUsdcBalance(null);
    setStatus("disconnected");
    localStorage.removeItem(RECONNECT_KEY);
  }, []);

  const switchToArc = useCallback(async () => {
    if (!provider) return false;
    try {
      await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: ARC_CHAIN_HEX }] });
      return true;
    } catch (e) {
      // 4902 = chain not added to the wallet yet
      if (e && typeof e === "object" && "code" in e && (e as { code: number }).code === 4902) {
        try {
          await provider.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: ARC_CHAIN_HEX,
                chainName: arcTestnet.name,
                nativeCurrency: arcTestnet.nativeCurrency,
                rpcUrls: [arcTestnet.rpcUrls.default.http[0]],
                blockExplorerUrls: [arcTestnet.blockExplorers.default.url],
              },
            ],
          });
          return true;
        } catch (addErr) {
          setError(friendlyError(addErr));
          return false;
        }
      }
      setError(friendlyError(e));
      return false;
    }
  }, [provider]);

  // silent reconnect on load
  useEffect(() => {
    if (!provider || localStorage.getItem(RECONNECT_KEY) !== "1") return;
    (async () => {
      try {
        const accts = (await provider.request({ method: "eth_accounts" })) as string[];
        if (accts.length === 0) return;
        const cid = (await provider.request({ method: "eth_chainId" })) as string;
        setAddress(accts[0] as Address);
        setChainId(parseInt(cid, 16));
        setStatus("connected");
      } catch {
        /* wallet locked or unavailable — user reconnects manually */
      }
    })();
  }, [provider]);

  // live account / chain changes
  useEffect(() => {
    if (!provider) return;
    const onAccounts = (...args: unknown[]) => {
      const accts = args[0] as string[];
      if (accts.length === 0) disconnect();
      else setAddress(accts[0] as Address);
    };
    const onChain = (...args: unknown[]) => setChainId(parseInt(args[0] as string, 16));
    provider.on("accountsChanged", onAccounts);
    provider.on("chainChanged", onChain);
    return () => {
      provider.removeListener("accountsChanged", onAccounts);
      provider.removeListener("chainChanged", onChain);
    };
  }, [provider, disconnect]);

  useEffect(() => {
    if (address) void refreshBalance();
  }, [address, chainId, refreshBalance]);

  return {
    status,
    address,
    chainId,
    onArc: chainId === arcTestnet.id,
    usdcBalance,
    error,
    connect,
    disconnect,
    switchToArc,
    walletClient,
    refreshBalance,
  };
}

export const fmtBalance = (v: bigint) => `${Number(formatUnits(v, 6)).toLocaleString("en-US", { maximumFractionDigits: 2 })} USDC`;
