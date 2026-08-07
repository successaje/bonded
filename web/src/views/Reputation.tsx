import { motion } from "framer-motion";
import { useState } from "react";
import { isAddress, type Address } from "viem";
import { Icon } from "../app/icons";
import { PageHead } from "../components/page";
import { Avatar, BondBar, EmptyState, PassRing, toneFor } from "../components/ui";
import { readReputation, type Reputation as Rep } from "../data/chainSource";
import { useChain } from "../data/useChain";
import { addressUrl } from "../lib/chain";
import { fmtUsd, pct, shortAddr } from "../lib/format";

export function Reputation() {
  const { snapshot } = useChain();
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<Rep | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");

  // unique known agents from the marketplace, as quick picks
  const known = Array.from(new Map(snapshot.candidates.map((c) => [c.offer.agent.toLowerCase(), c])).values());

  const lookup = async (addr: string) => {
    const a = addr.trim();
    if (!isAddress(a)) {
      setStatus("error");
      setError("That doesn't look like a valid address.");
      return;
    }
    setStatus("loading");
    setError("");
    try {
      setResult(await readReputation(a as Address));
      setStatus("idle");
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message.split("\n")[0] : "Lookup failed");
    }
  };

  return (
    <div>
      <PageHead
        eyebrow="Reputation Explorer"
        title="Look up any agent's on-chain record"
        sub="Bond, coverage and settled history for any address — read live from the OutcomeLog and BondVault on Arc. Reputation is public and portable by design."
      />

      <div className="card rep-search">
        <div className="rep-input">
          <Icon.search />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && lookup(query)}
            placeholder="0x… agent address"
            spellCheck={false}
          />
          <button className="btn sm" onClick={() => lookup(query)} disabled={status === "loading"}>
            {status === "loading" ? "Reading Arc…" : "Look up"}
          </button>
        </div>
        <div className="rep-picks">
          <span className="rep-picks-label">Try:</span>
          {known.map((c) => (
            <button key={c.offer.agent} className="rep-chip" onClick={() => { setQuery(c.offer.agent); lookup(c.offer.agent); }}>
              {c.label}
            </button>
          ))}
        </div>
        {status === "error" && <div className="rep-error">⚠ {error}</div>}
      </div>

      {result ? (
        <motion.div className="card rep-result" key={result.address} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <div className="rep-result-head">
            <Avatar initial={result.name[0]} tone={toneFor(result.address)} size={50} />
            <div>
              <div className="rep-name">{result.name}</div>
              <a className="rep-addr" href={addressUrl(result.address)} target="_blank" rel="noreferrer">{shortAddr(result.address)} ↗</a>
            </div>
            <div style={{ marginLeft: "auto" }}>
              <PassRing passed={result.passed} jobs={result.jobs} size={72} />
            </div>
          </div>
          {result.jobs === 0 && result.staked === 0n ? (
            <div className="rep-empty">No bond and no settled jobs for this address yet.</div>
          ) : (
            <>
              <BondBar staked={result.staked} locked={result.locked} />
              <div className="kv-row">
                <div><span className="kv-k">Jobs</span><span className="kv-v">{result.jobs}</span></div>
                <div><span className="kv-k">Passed</span><span className="kv-v" style={{ color: "var(--green)" }}>{result.passed}</span></div>
                <div><span className="kv-k">Failed</span><span className="kv-v" style={{ color: result.failed > 0 ? "var(--red)" : "var(--text-2)" }}>{result.failed}</span></div>
                <div><span className="kv-k">Pass rate</span><span className="kv-v">{Math.round(pct(result.passed, result.jobs))}%</span></div>
                <div><span className="kv-k">Earned</span><span className="kv-v">{fmtUsd(result.volumePaid, { compact: true })}</span></div>
                <div><span className="kv-k">Slashed</span><span className="kv-v">{fmtUsd(result.volumeSlashed, { cents: false })}</span></div>
              </div>
            </>
          )}
        </motion.div>
      ) : status !== "loading" ? (
        <EmptyState icon="◷" title="Search an address" sub="Or pick one of the known agents above" />
      ) : null}
    </div>
  );
}
