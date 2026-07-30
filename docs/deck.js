const pptx = require("pptxgenjs");
const p = new pptx();
p.layout = "LAYOUT_WIDE"; // 13.3 x 7.5
p.author = "Bonded";
p.title = "Bonded — Performance bonds for AI agents";

// ————— brand palette (from the product's own theme) —————
const BG = "060A14";
const CARD = "101C30";
const CARD2 = "0C1526";
const LINE = "1E3050";
const LINE2 = "2A4066";
const TEXT = "EEF2FB";
const MUT = "9FB0D0";
const FAINT = "66789C";
const BLUE = "4B96E6";
const BLUED = "2775CA";
const GREEN = "34C793";
const RED = "E85D54";
const AMBER = "EFA838";
const VIOLET = "9A8BF0";
const F = "Arial";

const W = 13.333;
const H = 7.5;
const MX = 0.7;

// ————— helpers —————
function bg(s, opts = {}) {
  s.background = { color: BG };
  // faint atmospheric glow, top-left
  s.addShape(p.ShapeType.ellipse, {
    x: -2.4, y: -2.6, w: 7, h: 6, fill: { color: opts.glow || BLUE, transparency: 92 }, line: { type: "none" },
  });
  if (opts.glow2 !== false) {
    s.addShape(p.ShapeType.ellipse, {
      x: W - 4.6, y: H - 3.6, w: 7, h: 6, fill: { color: opts.glow2 || GREEN, transparency: 95 }, line: { type: "none" },
    });
  }
}

function eyebrow(s, text, x, y, color = BLUE, w = 8) {
  s.addText(text.toUpperCase(), {
    x, y, w, h: 0.3, fontFace: F, fontSize: 12, bold: true, color, charSpacing: 3, align: "left", margin: 0,
  });
}

function pageNum(s, n) {
  s.addText(String(n).padStart(2, "0"), {
    x: W - 1.1, y: H - 0.55, w: 0.6, h: 0.3, fontFace: F, fontSize: 10, color: FAINT, align: "right", margin: 0,
  });
  s.addText("BONDED", {
    x: MX, y: H - 0.55, w: 2, h: 0.3, fontFace: F, fontSize: 10, bold: true, color: FAINT, charSpacing: 2, align: "left", margin: 0,
  });
}

function card(s, x, y, w, h, opts = {}) {
  s.addShape(p.ShapeType.roundRect, {
    x, y, w, h, rectRadius: 0.1,
    fill: { color: opts.fill || CARD },
    line: { color: opts.line || LINE, width: 1 },
    shadow: opts.shadow ? { type: "outer", color: "000000", blur: 12, offset: 5, angle: 90, opacity: 0.35 } : undefined,
  });
}

function circle(s, x, y, d, color, glyph, glyphColor = "FFFFFF", gsize = 16) {
  s.addShape(p.ShapeType.ellipse, { x, y, w: d, h: d, fill: { color }, line: { type: "none" } });
  if (glyph) s.addText(glyph, { x, y, w: d, h: d, fontFace: F, fontSize: gsize, bold: true, color: glyphColor, align: "center", valign: "middle", margin: 0 });
}

function ringBadge(s, x, y, d) {
  s.addShape(p.ShapeType.ellipse, { x, y, w: d, h: d, fill: { type: "none" }, line: { color: BLUE, width: 3 } });
  s.addText("✓", { x, y: y - 0.02, w: d, h: d, fontFace: F, fontSize: d * 34, bold: true, color: GREEN, align: "center", valign: "middle", margin: 0 });
}

// ============================================================
// 1 — TITLE
// ============================================================
{
  const s = p.addSlide();
  bg(s);
  ringBadge(s, MX, 0.85, 1.15);
  s.addText("Bonded", { x: MX + 1.45, y: 0.9, w: 6, h: 1.0, fontFace: F, fontSize: 54, bold: true, color: TEXT, margin: 0, valign: "middle" });

  s.addText("Performance bonds for AI agents", {
    x: MX, y: 2.9, w: 11.5, h: 0.8, fontFace: F, fontSize: 34, bold: true, color: TEXT, margin: 0,
  });
  s.addText("Work that fails pays you back — in USDC, in under a second.", {
    x: MX, y: 3.75, w: 11.5, h: 0.6, fontFace: F, fontSize: 20, italic: true, color: BLUE, margin: 0,
  });

  s.addText(
    "The agent economy has identity, payments and discovery. It has no accountability. Bonded is the missing layer — “licensed & bonded,” rebuilt as programmable money on Arc.",
    { x: MX, y: 4.7, w: 10.6, h: 0.9, fontFace: F, fontSize: 15, color: MUT, margin: 0, lineSpacingMultiple: 1.15 },
  );

  // pills
  const pill = (x, txt, col) => {
    s.addShape(p.ShapeType.roundRect, { x, y: 6.15, w: 2.55, h: 0.5, rectRadius: 0.25, fill: { color: CARD }, line: { color: col, width: 1 } });
    s.addText(txt, { x, y: 6.15, w: 2.55, h: 0.5, fontFace: F, fontSize: 12.5, bold: true, color: col, align: "center", valign: "middle", margin: 0 });
  };
  pill(MX, "DeFi track", BLUE);
  pill(MX + 2.75, "Agentic Economy", GREEN);
  s.addText("Build on Arc  ·  Encode × Circle", { x: MX + 5.7, y: 6.15, w: 5.9, h: 0.5, fontFace: F, fontSize: 13, color: FAINT, align: "right", valign: "middle", margin: 0 });

  s.addText("Live on Arc testnet  ·  chain 5042002  ·  6 contracts source-verified on ArcScan", {
    x: MX, y: 6.9, w: 12, h: 0.3, fontFace: F, fontSize: 11, color: FAINT, margin: 0,
  });
  s.addNotes("Bonded — performance bonds for AI agents, on Arc. The one-line pitch: work that fails pays you back, in USDC, in under a second. Everything in this deck is deployed and verifiable on-chain today.");
}

// ============================================================
// 2 — PROBLEM
// ============================================================
{
  const s = p.addSlide();
  bg(s);
  eyebrow(s, "The gap", MX, 0.6);
  s.addText("The agent economy has no accountability layer", {
    x: MX, y: 0.95, w: 12, h: 0.8, fontFace: F, fontSize: 36, bold: true, color: TEXT, margin: 0,
  });

  // three solved layers
  const solved = [
    ["Identity", "ERC-8004 — agents have verifiable on-chain identity"],
    ["Payments", "x402 & Nanopayments — agents pay per request in USDC"],
    ["Discovery", "Circle Agent Stack — a directory of agents for hire"],
  ];
  const cw = 3.83, gap = 0.26;
  solved.forEach(([t, d], i) => {
    const x = MX + i * (cw + gap);
    card(s, x, 1.95, cw, 1.5);
    circle(s, x + 0.28, 2.2, 0.42, GREEN, "✓", "062012", 15);
    s.addText(t, { x: x + 0.85, y: 2.18, w: cw - 1, h: 0.4, fontFace: F, fontSize: 17, bold: true, color: TEXT, margin: 0, valign: "middle" });
    s.addText(d, { x: x + 0.28, y: 2.68, w: cw - 0.56, h: 0.7, fontFace: F, fontSize: 12.5, color: MUT, margin: 0, lineSpacingMultiple: 1.1 });
  });
  s.addText("Solved.", { x: MX, y: 3.55, w: 4, h: 0.3, fontFace: F, fontSize: 12, italic: true, color: FAINT, margin: 0 });

  // the gap
  card(s, MX, 4.15, 11.93, 2.55, { fill: CARD2, line: LINE2 });
  circle(s, MX + 0.45, 4.55, 0.5, RED, "✕", "FFFFFF", 17);
  s.addText("When a paid agent delivers bad work, nothing makes the buyer whole.", {
    x: MX + 1.15, y: 4.5, w: 10.4, h: 0.6, fontFace: F, fontSize: 23, bold: true, color: TEXT, margin: 0, valign: "middle",
  });
  s.addText(
    [
      { text: "Reputation ", options: { bold: true, color: TEXT } },
      { text: "tells you who failed before — anyone looks good until the day they don't.   ", options: { color: MUT } },
      { text: "Escrow ", options: { bold: true, color: TEXT } },
      { text: "returns the fee, on one deal. Neither makes the buyer whole, and neither makes a good agent's promise cost anything to break.", options: { color: MUT } },
    ],
    { x: MX + 1.15, y: 5.35, w: 10.4, h: 1.1, fontFace: F, fontSize: 15, margin: 0, lineSpacingMultiple: 1.25 },
  );
  pageNum(s, 2);
  s.addNotes("The plumbing of the agent economy is built. What's missing is consequences. In human commerce this is surety bonds — and mechanically, a bond is pure programmable money.");
}

// ============================================================
// 3 — SOLUTION
// ============================================================
{
  const s = p.addSlide();
  bg(s);
  eyebrow(s, "The solution", MX, 0.6);
  s.addText("“Licensed & bonded,” rebuilt as programmable money", {
    x: MX, y: 0.95, w: 12, h: 0.8, fontFace: F, fontSize: 34, bold: true, color: TEXT, margin: 0,
  });

  // left column: the idea
  card(s, MX, 2.0, 5.0, 4.7);
  s.addText("Like hiring a contractor", { x: MX + 0.4, y: 2.3, w: 4.2, h: 0.4, fontFace: F, fontSize: 16, bold: true, color: BLUE, margin: 0 });
  s.addText(
    "You look for “licensed & bonded”: money sits with a neutral third party, and if the contractor botches the job, you're paid out of it.",
    { x: MX + 0.4, y: 2.75, w: 4.25, h: 1.2, fontFace: F, fontSize: 15, color: MUT, margin: 0, lineSpacingMultiple: 1.3 },
  );
  s.addText("On Bonded, the neutral third party is a smart contract on Arc.", {
    x: MX + 0.4, y: 4.05, w: 4.25, h: 0.9, fontFace: F, fontSize: 15, color: TEXT, bold: true, margin: 0, lineSpacingMultiple: 1.3,
  });
  s.addText("An agent stakes USDC behind a machine-readable SLA. Break it, and the buyer is repaid from that stake — automatically, no one in the middle.", {
    x: MX + 0.4, y: 5.05, w: 4.25, h: 1.4, fontFace: F, fontSize: 15, color: MUT, margin: 0, lineSpacingMultiple: 1.3,
  });

  // right column: 5-step flow
  const steps = [
    ["Stake", "Agent locks USDC as capital at risk behind its promises.", BLUE],
    ["Offer", "Publishes a signed SLA: price, deadline, acceptance test, penalty.", BLUE],
    ["Hire", "A buyer funds the fee in escrow; a slice of the bond locks with it.", BLUE],
    ["Settle", "Delivery runs the SLA's own acceptance check.", VIOLET],
    ["Record", "The outcome writes a portable, on-chain track record.", BLUE],
  ];
  const fx = MX + 5.35, fw = 6.58;
  let fy = 2.0;
  const sh = 0.82, sgap = 0.14;
  steps.forEach(([t, d, col], i) => {
    card(s, fx, fy, fw, sh, { fill: CARD2 });
    circle(s, fx + 0.24, fy + 0.21, 0.4, col, String(i + 1), "FFFFFF", 15);
    s.addText(t, { x: fx + 0.8, y: fy + 0.08, w: 1.6, h: sh - 0.16, fontFace: F, fontSize: 15, bold: true, color: TEXT, margin: 0, valign: "middle" });
    s.addText(d, { x: fx + 2.1, y: fy + 0.08, w: fw - 2.3, h: sh - 0.16, fontFace: F, fontSize: 12.5, color: MUT, margin: 0, valign: "middle", lineSpacingMultiple: 1.05 });
    fy += sh + sgap;
  });
  // pass/fail under settle
  s.addText(
    [
      { text: "PASS ", options: { bold: true, color: GREEN } },
      { text: "→ agent paid + premium to underwriters.    ", options: { color: MUT } },
      { text: "FAIL ", options: { bold: true, color: RED } },
      { text: "→ buyer refunded + penalty from the bond.", options: { color: MUT } },
    ],
    { x: fx + 0.1, y: fy + 0.05, w: fw - 0.2, h: 0.4, fontFace: F, fontSize: 12.5, align: "center", margin: 0 },
  );
  pageNum(s, 3);
  s.addNotes("Five steps. The novelty is the FAIL branch: the buyer is made whole automatically, from the agent's own capital, with no claims department.");
}

// ============================================================
// 4 — PROOF / MONEY SHOT
// ============================================================
{
  const s = p.addSlide();
  bg(s, { glow: GREEN, glow2: false });
  eyebrow(s, "Live on Arc  ·  agent-to-agent  ·  no human in the loop", MX, 0.7, GREEN, 11);
  s.addText(
    [
      { text: "An AI agent's work failed.\n", options: { color: TEXT } },
      { text: "The buyer ended ", options: { color: TEXT } },
      { text: "+$0.50 ahead", options: { color: GREEN } },
      { text: ".", options: { color: TEXT } },
    ],
    { x: MX, y: 1.15, w: 12, h: 1.7, fontFace: F, fontSize: 42, bold: true, margin: 0, lineSpacingMultiple: 1.02 },
  );

  s.addText(
    "A buyer agent hired a worker agent for an $0.80 audit. The work missed the minimum it had sold — so the SLA's own checker rejected it, refunded the $0.80 fee and paid a $0.50 penalty from the agent's stake. One transaction. About one second. No claim, no dispute, no human.",
    { x: MX, y: 3.15, w: 11.6, h: 1.2, fontFace: F, fontSize: 16, color: MUT, margin: 0, lineSpacingMultiple: 1.3 },
  );

  // three stat cards
  const stats = [
    ["+$0.50", "buyer ahead — on a job that FAILED", GREEN],
    ["~1 sec", "sub-second settlement, not a 90-day claim", BLUE],
    ["0", "humans, disputes or claims in the loop", TEXT],
  ];
  const sw = 3.83, sgp = 0.22;
  stats.forEach(([n, l, c], i) => {
    const x = MX + i * (sw + sgp);
    card(s, x, 4.55, sw, 1.55, { shadow: true });
    s.addText(n, { x: x + 0.3, y: 4.72, w: sw - 0.6, h: 0.85, fontFace: F, fontSize: 44, bold: true, color: c, margin: 0 });
    s.addText(l, { x: x + 0.3, y: 5.6, w: sw - 0.6, h: 0.45, fontFace: F, fontSize: 12, color: MUT, margin: 0, lineSpacingMultiple: 1.05 });
  });

  // tx chip
  s.addShape(p.ShapeType.roundRect, { x: MX, y: 6.35, w: 6.4, h: 0.5, rectRadius: 0.25, fill: { color: CARD }, line: { color: LINE2, width: 1 } });
  s.addText(
    [
      { text: "Settlement  ", options: { color: FAINT } },
      { text: "0x47e13e5d…3a0fbd5d", options: { color: BLUE, bold: true } },
      { text: "   verify on ArcScan ↗", options: { color: FAINT } },
    ],
    { x: MX + 0.25, y: 6.35, w: 6.1, h: 0.5, fontFace: F, fontSize: 12.5, valign: "middle", margin: 0 },
  );
  pageNum(s, 4);
  s.addNotes("This is the whole pitch in one number. In an unbonded market a failed job is a total loss. Here the buyer came out ahead — because the bond made them whole and then some. Every figure is on-chain; the tx is clickable.");
}

// ============================================================
// 5 — HOW IT WORKS / ARCHITECTURE
// ============================================================
{
  const s = p.addSlide();
  bg(s);
  eyebrow(s, "Architecture", MX, 0.6);
  s.addText("Six contracts, one primitive — all source-verified on Arc", {
    x: MX, y: 0.95, w: 12, h: 0.8, fontFace: F, fontSize: 32, bold: true, color: TEXT, margin: 0,
  });

  const contracts = [
    ["BondVault", "Holds each agent's staked USDC. Locks a slice per job; slashes it to the buyer on failure.", BLUE],
    ["SLARegistry", "Machine-readable offers: price, deadline, acceptance criteria, penalty schedule.", BLUE],
    ["JobEscrow", "The state machine: Funded → Delivered → Passed | Slashed. Settles in one transaction.", VIOLET],
    ["UnderwriterPool", "Shared capital that backs agents and earns the premium from every settled job.", GREEN],
    ["OutcomeLog", "Every outcome as a portable, ERC-8004-feedable track record. An agent's credit history.", BLUE],
    ["AuditChecker", "Deterministic acceptance: the work either clears the SLA's committed minimums, or it doesn't.", AMBER],
  ];
  const cw = 3.83, ch = 1.72, gx = 0.22, gy = 0.24;
  contracts.forEach(([t, d, c], i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const x = MX + col * (cw + gx);
    const y = 2.0 + row * (ch + gy);
    card(s, x, y, cw, ch);
    s.addShape(p.ShapeType.roundRect, { x: x + 0.28, y: y + 0.26, w: 0.16, h: 0.16, rectRadius: 0.03, fill: { color: c }, line: { type: "none" } });
    s.addText(t, { x: x + 0.56, y: y + 0.16, w: cw - 0.8, h: 0.4, fontFace: F, fontSize: 16, bold: true, color: TEXT, margin: 0, valign: "middle" });
    s.addText(d, { x: x + 0.28, y: y + 0.66, w: cw - 0.56, h: 0.95, fontFace: F, fontSize: 12.5, color: MUT, margin: 0, lineSpacingMultiple: 1.18 });
  });

  s.addText(
    [
      { text: "31 contract tests green.   ", options: { color: TEXT, bold: true } },
      { text: "No detection logic outside the engine — the same primitive, three transports. Deployed to Arc testnet and verified: anyone can read the code and call it from the explorer.", options: { color: MUT } },
    ],
    { x: MX, y: 6.05, w: 12, h: 0.6, fontFace: F, fontSize: 13.5, margin: 0, lineSpacingMultiple: 1.15 },
  );
  pageNum(s, 5);
  s.addNotes("Small, auditable surface. The AuditChecker is why the work is bondable: acceptance is a mechanical test, so settlement can be deterministic and instant. Where no mechanical check exists, an optimistic dispute window backstops it.");
}

// ============================================================
// 6 — REAL AGENT AUTONOMY
// ============================================================
{
  const s = p.addSlide();
  bg(s);
  eyebrow(s, "Agentic Economy — real autonomy", MX, 0.6, VIOLET);
  s.addText("The buyer reasons about risk. It is not an AI wrapper.", {
    x: MX, y: 0.95, w: 12, h: 0.8, fontFace: F, fontSize: 32, bold: true, color: TEXT, margin: 0,
  });

  // left: the model
  card(s, MX, 2.0, 5.1, 4.7);
  s.addText("What it does, every input on-chain", { x: MX + 0.35, y: 2.25, w: 4.4, h: 0.4, fontFace: F, fontSize: 15, bold: true, color: VIOLET, margin: 0 });
  const bullets = [
    "Reads each offer's bond and settled track record straight off Arc",
    "Prices every offer's risk — no oracle, no LLM in the money path",
    "Rejects decorative bonds before it spends a cent",
    "Hires the best risk-adjusted deal — deliberately not the cheapest",
  ];
  s.addText(
    bullets.map((b, i) => ({ text: b, options: { bullet: { indent: 16 }, color: MUT, breakLine: true, paraSpaceAfter: 8 } })),
    { x: MX + 0.35, y: 2.7, w: 4.45, h: 2.2, fontFace: F, fontSize: 13.5, margin: 0, lineSpacingMultiple: 1.1 },
  );
  // formula chip
  s.addShape(p.ShapeType.roundRect, { x: MX + 0.35, y: 5.55, w: 4.4, h: 0.95, rectRadius: 0.08, fill: { color: "081018" }, line: { color: LINE2, width: 1 } });
  s.addText("E = price + ((1−q)/q) · max(0, delay − bond)", {
    x: MX + 0.35, y: 5.62, w: 4.4, h: 0.45, fontFace: "Courier New", fontSize: 13, bold: true, color: TEXT, align: "center", margin: 0, valign: "middle",
  });
  s.addText("A bigger bond buys down risk — but can never make failure profitable.", {
    x: MX + 0.35, y: 6.04, w: 4.4, h: 0.4, fontFace: F, fontSize: 10.5, italic: true, color: FAINT, align: "center", margin: 0,
  });

  // right: decision table
  const tx = MX + 5.45, tw = 6.48;
  s.addText("What the buyer chose, live on Arc", { x: tx, y: 2.0, w: tw, h: 0.35, fontFace: F, fontSize: 15, bold: true, color: TEXT, margin: 0 });
  const rows = [
    ["Leak", "$1.00", "50%", "67%", "hired", GREEN],
    ["SwiftAudit", "$0.80", "63%", "33%", "failure rate too high", RED],
    ["FlakyLabs", "$0.60", "10%", "50%", "bond covers only 10%", RED],
  ];
  // header
  s.addText(
    [
      { text: "AGENT", options: { color: FAINT } },
    ],
    { x: tx + 0.2, y: 2.5, w: 2, h: 0.3, fontFace: F, fontSize: 10.5, bold: true, charSpacing: 1, margin: 0 },
  );
  s.addText("PRICE", { x: tx + 2.2, y: 2.5, w: 0.9, h: 0.3, fontFace: F, fontSize: 10.5, bold: true, color: FAINT, align: "right", margin: 0, charSpacing: 1 });
  s.addText("COVER", { x: tx + 3.15, y: 2.5, w: 0.9, h: 0.3, fontFace: F, fontSize: 10.5, bold: true, color: FAINT, align: "right", margin: 0, charSpacing: 1 });
  s.addText("PASS", { x: tx + 4.05, y: 2.5, w: 0.8, h: 0.3, fontFace: F, fontSize: 10.5, bold: true, color: FAINT, align: "right", margin: 0, charSpacing: 1 });
  let ry = 2.9;
  rows.forEach(([name, price, cover, pass, verdict, col], i) => {
    const hired = i === 0;
    card(s, tx, ry, tw, 0.92, { fill: hired ? "0E2019" : CARD2, line: hired ? GREEN : LINE });
    s.addText(name, { x: tx + 0.2, y: ry, w: 2.0, h: 0.92, fontFace: F, fontSize: 14, bold: hired, color: hired ? TEXT : MUT, valign: "middle", margin: 0 });
    s.addText(price, { x: tx + 2.2, y: ry, w: 0.9, h: 0.92, fontFace: F, fontSize: 13, color: hired ? TEXT : MUT, align: "right", valign: "middle", margin: 0 });
    s.addText(cover, { x: tx + 3.15, y: ry, w: 0.9, h: 0.92, fontFace: F, fontSize: 13, color: hired ? TEXT : MUT, align: "right", valign: "middle", margin: 0 });
    s.addText(pass, { x: tx + 4.05, y: ry, w: 0.8, h: 0.92, fontFace: F, fontSize: 13, color: hired ? TEXT : MUT, align: "right", valign: "middle", margin: 0 });
    if (hired) {
      s.addShape(p.ShapeType.roundRect, { x: tx + 5.0, y: ry + 0.28, w: 1.25, h: 0.36, rectRadius: 0.18, fill: { color: GREEN }, line: { type: "none" } });
      s.addText("✓ hired", { x: tx + 5.0, y: ry + 0.28, w: 1.25, h: 0.36, fontFace: F, fontSize: 11.5, bold: true, color: "062012", align: "center", valign: "middle", margin: 0 });
    } else {
      s.addText(verdict, { x: tx + 4.95, y: ry, w: 1.4, h: 0.92, fontFace: F, fontSize: 10, color: RED, align: "right", valign: "middle", margin: 0, lineSpacingMultiple: 1.0 });
    }
    ry += 1.0;
  });
  s.addText("17 unit tests pin the model — including that an over-bonded agent can never make failure profitable.", {
    x: tx, y: 6.0, w: tw, h: 0.5, fontFace: F, fontSize: 11.5, italic: true, color: FAINT, margin: 0, lineSpacingMultiple: 1.1,
  });
  pageNum(s, 6);
  s.addNotes("This is what separates real autonomy from an AI wrapper. The buyer makes a decision with reasons, tied to real on-chain signals. The dashboard imports the exact same module the agent runs — the screen is the logic, not a mockup of it.");
}

// ============================================================
// 7 — SELF-CORRECTING MARKET
// ============================================================
{
  const s = p.addSlide();
  bg(s);
  eyebrow(s, "The flywheel", MX, 0.6);
  s.addText("The market re-prices failure by itself", {
    x: MX, y: 0.95, w: 12, h: 0.8, fontFace: F, fontSize: 34, bold: true, color: TEXT, margin: 0,
  });

  // before -> after
  const bx = MX, aw = 5.35;
  card(s, bx, 2.05, aw, 3.0, { fill: CARD2 });
  s.addText("Before", { x: bx + 0.35, y: 2.25, w: 3, h: 0.35, fontFace: F, fontSize: 14, bold: true, color: FAINT, margin: 0 });
  s.addText("SwiftAudit wins the work", { x: bx + 0.35, y: 2.65, w: aw - 0.7, h: 0.45, fontFace: F, fontSize: 19, bold: true, color: TEXT, margin: 0 });
  s.addText("A cheaper challenger with a full bond. The buyer rationally hires it over the incumbent — capital substituting for a track record.", {
    x: bx + 0.35, y: 3.2, w: aw - 0.7, h: 1.6, fontFace: F, fontSize: 14, color: MUT, margin: 0, lineSpacingMultiple: 1.3,
  });

  // arrow
  s.addShape(p.ShapeType.rightArrow, { x: bx + aw + 0.2, y: 3.25, w: 0.75, h: 0.5, fill: { color: LINE2 }, line: { type: "none" } });

  const ax = bx + aw + 1.15;
  card(s, ax, 2.05, aw, 3.0, { fill: "1A0F12", line: "50262A" });
  s.addText("After it fails", { x: ax + 0.35, y: 2.25, w: 3, h: 0.35, fontFace: F, fontSize: 14, bold: true, color: RED, margin: 0 });
  s.addText("Priced out — automatically", { x: ax + 0.35, y: 2.65, w: aw - 0.7, h: 0.45, fontFace: F, fontSize: 19, bold: true, color: TEXT, margin: 0 });
  s.addText("The slash cut its bond and its record. It now fails the buyer's own thresholds and gets no further work. No admin, no governance, no delisting.", {
    x: ax + 0.35, y: 3.2, w: aw - 0.7, h: 1.6, fontFace: F, fontSize: 14, color: MUT, margin: 0, lineSpacingMultiple: 1.3,
  });

  // punchline band
  card(s, MX, 5.35, 11.93, 1.25, { fill: "0E2019", line: GREEN });
  s.addText(
    [
      { text: "Losing money to the people you failed ", options: { bold: true, color: GREEN } },
      { text: "is the whole mechanism. Reputation and capital move together, enforced by no one.", options: { color: TEXT } },
    ],
    { x: MX + 0.5, y: 5.35, w: 10.9, h: 1.25, fontFace: F, fontSize: 18, valign: "middle", margin: 0, lineSpacingMultiple: 1.15 },
  );
  pageNum(s, 7);
  s.addNotes("This emerged from the live data — it wasn't scripted. The agent that won work before is now rejected by the same buyer, because its own failure repriced it. That's a market correcting without an operator.");
}

// ============================================================
// 8 — WHY ARC
// ============================================================
{
  const s = p.addSlide();
  bg(s);
  eyebrow(s, "Why Arc", MX, 0.6, BLUE);
  s.addText("This is worse — or impossible — anywhere else", {
    x: MX, y: 0.95, w: 12, h: 0.8, fontFace: F, fontSize: 34, bold: true, color: TEXT, margin: 0,
  });

  const reasons = [
    ["Sub-second finality", "A claim pays out in about a second, not a 90-day process. The instant made-whole moment only feels real on a chain that settles this fast.", "⚡"],
    ["USDC-denominated gas", "An agent earns, stakes, pays penalties and pays gas in one stable asset. Autonomous agents can't sanely manage a volatile gas token.", "$"],
    ["Circle-native + verified", "Agent Wallets, Nanopayments and the Agent Marketplace are the surfaces Bonded plugs into. All six contracts are source-verified on ArcScan.", "◈"],
  ];
  const cw = 3.83, gap = 0.22;
  reasons.forEach(([t, d, g], i) => {
    const x = MX + i * (cw + gap);
    card(s, x, 2.1, cw, 4.1, { shadow: true });
    circle(s, x + 0.35, 2.45, 0.62, i === 1 ? GREEN : BLUE, g, "FFFFFF", i === 1 ? 22 : 20);
    s.addText(t, { x: x + 0.35, y: 3.3, w: cw - 0.7, h: 0.8, fontFace: F, fontSize: 19, bold: true, color: TEXT, margin: 0, lineSpacingMultiple: 1.0 });
    s.addText(d, { x: x + 0.35, y: 4.2, w: cw - 0.7, h: 1.9, fontFace: F, fontSize: 14, color: MUT, margin: 0, lineSpacingMultiple: 1.3 });
  });
  pageNum(s, 8);
  s.addNotes("The judges explicitly ask why Arc makes the product better than a standard onchain app. Speed makes the demo visceral; USDC-gas makes agent economics sane; the Circle stack is the distribution surface. All three are load-bearing, not decorative.");
}

// ============================================================
// 9 — WHAT'S REAL TODAY (checkpoint)
// ============================================================
{
  const s = p.addSlide();
  bg(s);
  eyebrow(s, "Checkpoint status — all shipped, none of it roadmap", MX, 0.6, GREEN, 11);
  s.addText("What is real today", {
    x: MX, y: 0.95, w: 12, h: 0.8, fontFace: F, fontSize: 36, bold: true, color: TEXT, margin: 0,
  });

  const items = [
    ["Deployed to Arc testnet", "All six contracts live on chain 5042002."],
    ["6 / 6 contracts source-verified", "Readable and callable on ArcScan by anyone."],
    ["48 tests green", "31 contract lifecycle + 17 underwriting-model tests."],
    ["Both settlement paths proven live", "Pass and slash, executed with real USDC."],
    ["Autonomous agents settling on-chain", "Buyer + worker, no human in the money path."],
    ["Dashboard on the live deployment", "Real settlements, clickable through to ArcScan."],
  ];
  const cw = 5.83, ch = 1.2, gx = 0.27, gy = 0.24;
  items.forEach(([t, d], i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = MX + col * (cw + gx);
    const y = 2.05 + row * (ch + gy);
    card(s, x, y, cw, ch);
    circle(s, x + 0.32, y + 0.4, 0.42, GREEN, "✓", "062012", 15);
    s.addText(t, { x: x + 0.95, y: y + 0.2, w: cw - 1.2, h: 0.42, fontFace: F, fontSize: 16, bold: true, color: TEXT, margin: 0, valign: "middle" });
    s.addText(d, { x: x + 0.95, y: y + 0.62, w: cw - 1.2, h: 0.42, fontFace: F, fontSize: 12.5, color: MUT, margin: 0, valign: "top" });
  });
  pageNum(s, 9);
  s.addNotes("This is the checkpoint slide. Every line is verifiable right now — deployed, verified, tested, proven live. Nothing here is a promise.");
}

// ============================================================
// 10 — TWO TRACKS + MARKET
// ============================================================
{
  const s = p.addSlide();
  bg(s);
  eyebrow(s, "Positioning", MX, 0.6);
  s.addText("One primitive, both tracks", {
    x: MX, y: 0.95, w: 12, h: 0.8, fontFace: F, fontSize: 34, bold: true, color: TEXT, margin: 0,
  });

  const aw = 5.83;
  card(s, MX, 2.0, aw, 2.5);
  circle(s, MX + 0.35, 2.3, 0.5, BLUE, "◆", "FFFFFF", 15);
  s.addText("DeFi", { x: MX + 1.0, y: 2.28, w: 3, h: 0.45, fontFace: F, fontSize: 19, bold: true, color: TEXT, margin: 0, valign: "middle" });
  s.addText("Underwriters deposit USDC to back agents that can't fully self-bond, price premiums off real track records, and earn yield from actual work — not emissions. Risk, underwritten on-chain.", {
    x: MX + 0.35, y: 2.9, w: aw - 0.7, h: 1.5, fontFace: F, fontSize: 14.5, color: MUT, margin: 0, lineSpacingMultiple: 1.3,
  });

  card(s, MX + aw + 0.27, 2.0, aw, 2.5);
  const gx2 = MX + aw + 0.27;
  circle(s, gx2 + 0.35, 2.3, 0.5, GREEN, "◈", "062012", 14);
  s.addText("Agentic Economy", { x: gx2 + 1.0, y: 2.28, w: 4, h: 0.45, fontFace: F, fontSize: 19, bold: true, color: TEXT, margin: 0, valign: "middle" });
  s.addText("Agents hold wallets, hire each other, and settle jobs in USDC with decision logic tied to real signals — the buyer prices counterparty risk and acts on it, with no human in the loop.", {
    x: gx2 + 0.35, y: 2.9, w: aw - 0.7, h: 1.5, fontFace: F, fontSize: 14.5, color: MUT, margin: 0, lineSpacingMultiple: 1.3,
  });

  // the wedge
  card(s, MX, 4.75, 11.93, 1.85, { fill: CARD2, line: LINE2 });
  s.addText("The wedge", { x: MX + 0.5, y: 4.95, w: 4, h: 0.35, fontFace: F, fontSize: 13, bold: true, color: BLUE, margin: 0, charSpacing: 1 });
  s.addText(
    [
      { text: "Bonded is the accountability layer the whole agent economy is missing. ", options: { color: TEXT, bold: true } },
      { text: "The same primitive can bond any x402-paid service as an uptime/latency SLA — respond in time or the buyer is compensated — turning “Bonded ✓” into the badge buyers learn to demand across Circle's Agent Marketplace.", options: { color: MUT } },
    ],
    { x: MX + 0.5, y: 5.35, w: 10.9, h: 1.1, fontFace: F, fontSize: 15, margin: 0, lineSpacingMultiple: 1.3 },
  );
  pageNum(s, 10);
  s.addNotes("Same code enters both tracks. The go-to-market wedge is the badge: a bonded agent can advertise it, marketplaces can display it, and buyers learn to prefer it — the way 'licensed & bonded' became table stakes for contractors.");
}

// ============================================================
// 11 — ROADMAP + ASK
// ============================================================
{
  const s = p.addSlide();
  bg(s);
  eyebrow(s, "From hackathon to launch", MX, 0.6);
  s.addText("Where this goes next", {
    x: MX, y: 0.95, w: 12, h: 0.8, fontFace: F, fontSize: 34, bold: true, color: TEXT, margin: 0,
  });

  const road = [
    ["Now", "Deployed, verified and proven on Arc testnet — agents settling autonomously.", GREEN],
    ["Next", "x402 latency-bond gateway: bond any paid API with almost no new contract code.", BLUE],
    ["Then", "Underwriter co-signing pools and a decentralized dispute oracle for subjective work.", BLUE],
    ["Mainnet", "Deploy day-one when Arc mainnet opens — a live accountability layer from the start.", VIOLET],
  ];
  const cw = 2.86, gap = 0.22;
  road.forEach(([t, d, c], i) => {
    const x = MX + i * (cw + gap);
    card(s, x, 2.05, cw, 2.5);
    circle(s, x + 0.28, 2.3, 0.4, c, String(i + 1), "FFFFFF", 14);
    s.addText(t, { x: x + 0.8, y: 2.28, w: cw - 1, h: 0.4, fontFace: F, fontSize: 16, bold: true, color: TEXT, margin: 0, valign: "middle" });
    s.addText(d, { x: x + 0.28, y: 2.85, w: cw - 0.56, h: 1.5, fontFace: F, fontSize: 13, color: MUT, margin: 0, lineSpacingMultiple: 1.25 });
  });

  // ask band
  card(s, MX, 4.85, 11.93, 1.75, { fill: "0E1B2E", line: BLUE, shadow: true });
  s.addText("The ask", { x: MX + 0.5, y: 5.05, w: 3, h: 0.35, fontFace: F, fontSize: 13, bold: true, color: BLUE, margin: 0, charSpacing: 1 });
  s.addText(
    "A place in Arc's accelerator to take the missing accountability layer of the agent economy to market — starting with Leak, a real ERC-8004 agent, as the first bonded worker.",
    { x: MX + 0.5, y: 5.45, w: 10.9, h: 1.0, fontFace: F, fontSize: 17, bold: true, color: TEXT, margin: 0, lineSpacingMultiple: 1.25 },
  );
  pageNum(s, 11);
  s.addNotes("The next build is nearly free given what's deployed: an uptime/latency bond is the timeout path, which already works. That turns Bonded from one app into the trust layer over the entire x402 ecosystem.");
}

// ============================================================
// 12 — CLOSE
// ============================================================
{
  const s = p.addSlide();
  bg(s, { glow: GREEN });
  ringBadge(s, MX, 1.5, 1.0);
  s.addText("Bonded", { x: MX + 1.3, y: 1.52, w: 6, h: 0.95, fontFace: F, fontSize: 46, bold: true, color: TEXT, margin: 0, valign: "middle" });

  s.addText(
    [
      { text: "The badge worth demanding.\n", options: { color: TEXT } },
      { text: "Work that fails pays you back — in USDC, in under a second.", options: { color: MUT, fontSize: 20, bold: false } },
    ],
    { x: MX, y: 3.1, w: 11.5, h: 1.4, fontFace: F, fontSize: 30, bold: true, margin: 0, lineSpacingMultiple: 1.15 },
  );

  const links = [
    ["Code", "github.com/successaje/bonded"],
    ["On-chain", "6 contracts verified on ArcScan · chain 5042002"],
    ["Live", "the dashboard reads the real deployment"],
  ];
  let ly = 4.9;
  links.forEach(([k, v]) => {
    s.addShape(p.ShapeType.roundRect, { x: MX, y: ly, w: 1.4, h: 0.42, rectRadius: 0.08, fill: { color: CARD }, line: { color: LINE2, width: 1 } });
    s.addText(k, { x: MX, y: ly, w: 1.4, h: 0.42, fontFace: F, fontSize: 12, bold: true, color: BLUE, align: "center", valign: "middle", margin: 0 });
    s.addText(v, { x: MX + 1.65, y: ly, w: 9.5, h: 0.42, fontFace: F, fontSize: 14, color: TEXT, valign: "middle", margin: 0 });
    ly += 0.56;
  });
  pageNum(s, 12);
  s.addNotes("Close on the badge. Everything shown is live and verifiable — the repo, the verified contracts, the dashboard on real data. Bonded is the accountability layer the agent economy needs, and it works today.");
}

p.writeFile({ fileName: "bonded-deck.pptx" }).then((f) => console.log("wrote", f));
