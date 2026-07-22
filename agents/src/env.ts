import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/** Loads agents/.env into process.env without a dependency. Never logs values. */
export function loadEnv(): void {
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  let raw: string;
  try {
    raw = readFileSync(join(root, ".env"), "utf8");
  } catch {
    return; // fine — env may come from the shell
  }
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    const value = t.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (value && !process.env[key]) process.env[key] = value;
  }
}
