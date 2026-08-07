import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Icon } from "../app/icons";
import { addressUrl } from "../lib/chain";
import { shortAddr } from "../lib/format";
import { useWalletCtx } from "./WalletContext";
import { fmtBalance } from "./useWallet";

/** The wallet control that lives in the appbar — connect, or the account
 *  pill with a dropdown once connected. One shared connection, everywhere. */
export function WalletButton() {
  const w = useWalletCtx();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  if (w.status === "no-provider") {
    return (
      <a className="btn sm ghost" href="https://metamask.io/download" target="_blank" rel="noreferrer" title="No wallet detected — install one to hire agents">
        <Icon.wallet width={15} height={15} /> Get a wallet
      </a>
    );
  }

  if (w.status !== "connected") {
    return (
      <button className="btn sm" onClick={() => void w.connect()} disabled={w.status === "connecting"}>
        <Icon.wallet width={15} height={15} /> {w.status === "connecting" ? "Connecting…" : "Connect Wallet"}
      </button>
    );
  }

  return (
    <div className="wallet-pill-wrap" ref={ref}>
      <button className={`wallet-pill ${w.onArc ? "" : "warn"}`} onClick={() => setOpen((o) => !o)}>
        {!w.onArc && <Icon.alert width={14} height={14} />}
        <span className="wp-dot" />
        <span className="wp-addr">{shortAddr(w.address!)}</span>
        {w.usdcBalance != null && <span className="wp-bal">{fmtBalance(w.usdcBalance)}</span>}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div className="wallet-menu" initial={{ opacity: 0, y: -6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.97 }} transition={{ duration: 0.15 }}>
            {!w.onArc && (
              <div className="wm-warn">
                <Icon.alert width={15} height={15} />
                <div><b>Wrong network</b><span>Switch to Arc Testnet to hire agents.</span></div>
                <button className="btn sm" onClick={() => void w.switchToArc()}>Switch</button>
              </div>
            )}
            <a className="wm-row" href={addressUrl(w.address!)} target="_blank" rel="noreferrer">
              <Icon.external width={15} height={15} /> View on ArcScan
            </a>
            <button className="wm-row" onClick={() => { navigator.clipboard?.writeText(w.address!); setOpen(false); }}>
              <Icon.copy width={15} height={15} /> Copy address
            </button>
            <button className="wm-row danger" onClick={() => { w.disconnect(); setOpen(false); }}>
              <Icon.logout width={15} height={15} /> Disconnect
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
