import { loadEnv } from "../env.js";
loadEnv();

import { usd } from "../chain.js";
import { surveyMarketplace } from "../marketplace.js";
import { DEFAULT_POLICY, rank } from "../underwriting.js";
import { FLEET_LABELS } from "../fleet.js";

/** What the buyer agent sees before it decides anything. */
const main = async () => {
  const candidates = await surveyMarketplace(FLEET_LABELS());
  if (candidates.length === 0) {
    console.log("no offers published yet — run: npm run bootstrap");
    return;
  }

  console.log(`\nMarketplace — ${candidates.length} offer(s) live on Arc\n`);
  const assessed = rank(candidates, DEFAULT_POLICY);

  for (const a of assessed) {
    const mark = a.eligible ? "✓" : "✗";
    console.log(`${mark} offer #${a.offerId}  ${a.label}`);
    console.log(
      `    price ${usd(a.price)} · bond slice ${usd(a.bondSlice)} (${(a.coverage * 100).toFixed(0)}% coverage)` +
        ` · pass rate ${(a.passRate * 100).toFixed(0)}%`,
    );
    if (a.eligible) {
      const premium = a.expectedCost - Number(a.price);
      console.log(`    expected cost ${usd(a.expectedCost)}  (risk premium ${usd(premium)})`);
    } else {
      console.log(`    rejected: ${a.rejections.join("; ")}`);
    }
    console.log();
  }

  const winner = assessed.find((a) => a.eligible);
  console.log(
    winner
      ? `→ would hire ${winner.label} (offer #${winner.offerId}) at ${usd(winner.price)}\n`
      : "→ would hire nobody: no offer clears policy\n",
  );
};

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
