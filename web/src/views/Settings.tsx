import { PageHead } from "../components/page";
import { addresses, addressUrl } from "../lib/chain";
import { useChain } from "../data/useChain";
import { timeAgo } from "../lib/format";

const CONTRACTS: [string, keyof typeof addresses][] = [
  ["JobEscrow", "jobEscrow"],
  ["BondVault", "bondVault"],
  ["SLARegistry", "slaRegistry"],
  ["UnderwriterPool", "underwriterPool"],
  ["OutcomeLog", "outcomeLog"],
  ["AuditChecker", "auditChecker"],
];

export function Settings() {
  const { snapshot, source, loading, refresh } = useChain();

  return (
    <div>
      <PageHead eyebrow="Settings" title="Network & data" />

      <div className="set-grid">
        <div className="card">
          <h3 className="section-title" style={{ marginBottom: 14 }}>Network</h3>
          <div className="set-rows">
            <div className="set-row"><span>Chain</span><b>Arc Testnet</b></div>
            <div className="set-row"><span>Chain ID</span><b className="mono">5042002</b></div>
            <div className="set-row"><span>Gas token</span><b>USDC</b></div>
            <div className="set-row"><span>Explorer</span><a href="https://testnet.arcscan.app" target="_blank" rel="noreferrer">testnet.arcscan.app ↗</a></div>
          </div>
        </div>

        <div className="card">
          <h3 className="section-title" style={{ marginBottom: 14 }}>Data source</h3>
          <div className="set-rows">
            <div className="set-row"><span>Showing</span><b>{source === "live" ? "Live from Arc" : "Verified snapshot"}</b></div>
            <div className="set-row"><span>Block</span><b className="mono">{String(snapshot.blockNumber)}</b></div>
            <div className="set-row"><span>Read</span><b>{timeAgo(snapshot.fetchedAt, Date.now())}</b></div>
          </div>
          <button className="btn ghost" style={{ width: "100%", marginTop: 14 }} onClick={() => void refresh()} disabled={loading}>
            {loading ? "Reading Arc…" : "Refresh from chain"}
          </button>
          <p className="footnote">Settlement receipts come from a verified snapshot (Arc's public RPC caps historical log scans); live state is read on demand.</p>
        </div>
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <h3 className="section-title" style={{ marginBottom: 14 }}>Deployed contracts — all source-verified</h3>
        <div className="contract-list">
          {CONTRACTS.map(([name, key]) => (
            <a key={key} className="contract-row" href={`${addressUrl(addresses[key])}?tab=contract`} target="_blank" rel="noreferrer">
              <span className="contract-name">{name}</span>
              <span className="contract-addr mono">{addresses[key]}</span>
              <span className="contract-ver">✓ verified ↗</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
