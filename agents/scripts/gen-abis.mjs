/**
 * Regenerates src/abis.ts from the compiled Foundry artifacts so the agents
 * can never drift from the contracts. Run after any contract change:
 *   npm run gen:abis
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "..", "contracts", "out");

/** contract → exported const name */
const EXPORTS = {
  JobEscrow: "jobEscrowAbi",
  BondVault: "bondVaultAbi",
  SLARegistry: "slaRegistryAbi",
  UnderwriterPool: "underwriterPoolAbi",
  OutcomeLog: "outcomeLogAbi",
  AuditChecker: "auditCheckerAbi",
};

let src = "// AUTO-GENERATED from contracts/out — regenerate with: npm run gen:abis\n// Do not edit by hand.\n\n";

for (const [contract, exportName] of Object.entries(EXPORTS)) {
  const artifact = JSON.parse(readFileSync(join(out, `${contract}.sol`, `${contract}.json`), "utf8"));
  const abi = artifact.abi.filter((e) => e.type === "function" || e.type === "event" || e.type === "error");
  src += `export const ${exportName} = ${JSON.stringify(abi)} as const;\n\n`;
}

const erc20 = [
  { type: "function", name: "approve", stateMutability: "nonpayable", inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bool" }] },
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ name: "account", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "allowance", stateMutability: "view", inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "transfer", stateMutability: "nonpayable", inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bool" }] },
];
src += `export const erc20Abi = ${JSON.stringify(erc20)} as const;\n`;

writeFileSync(join(root, "src", "abis.ts"), src);
console.log(`wrote src/abis.ts — ${Object.values(EXPORTS).join(", ")}, erc20Abi`);
