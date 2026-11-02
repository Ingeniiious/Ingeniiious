// Builds the profile README pictures: header and stack, each in light and dark.
// Text is drawn as outlines (Geist, OFL) so it looks the same on every machine.
import fs from "node:fs";
import path from "node:path";
import opentype from "opentype.js";

const here = path.dirname(new URL(import.meta.url).pathname);
const out = path.join(here, "../assets");
fs.mkdirSync(out, { recursive: true });

const fontDir = path.join(here, "node_modules/geist/dist/fonts/geist-sans");
const font = (w) => opentype.parse(fs.readFileSync(path.join(fontDir, `Geist-${w}.ttf`)).buffer);
const F = { regular: font("Regular"), medium: font("Medium"), semibold: font("SemiBold") };

const text = (f, s, x, y, size) => f.getPath(s, x, y, size).toPathData(2);
const width = (f, s, size) => f.getAdvanceWidth(s, size);

const themes = {
  dark: {
    card: "#0d1117", border: "#3d444d", ink: "#f0f6fc", muted: "#9198a1", chip: "#151b23",
    levels: ["#151b23", "#033a16", "#196c2e", "#2ea043", "#56d364"], hi: "#7ee787",
  },
  light: {
    card: "#ffffff", border: "#d1d9e0", ink: "#1f2328", muted: "#59636e", chip: "#f6f8fa",
    levels: ["#eff2f5", "#aceebb", "#4ac26b", "#2da44e", "#116329"], hi: "#0b4a1f",
  },
};

// ---------- header ----------
const W = 1000, H = 260;
const COLS = 22, ROWS = 7, CELL = 13, GAP = 4, PITCH = CELL + GAP;
const gridW = COLS * PITCH - GAP, gridH = ROWS * PITCH - GAP;
const gx = W - 48 - gridW, gy = (H - gridH) / 2;

// A steady, busy year: mostly filled days, a few quiet ones. Fixed seed, so the file never changes.
let seed = 7;
const rand = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const cells = [];
for (let c = 0; c < COLS; c++)
  for (let r = 0; r < ROWS; r++) {
    const v = rand();
    const level = v < 0.08 ? 0 : v < 0.3 ? 1 : v < 0.6 ? 2 : v < 0.85 ? 3 : 4;
    cells.push({ c, r, level });
  }

function header(t) {
  const th = themes[t];
  const levelCss = th.levels.map((f, i) => `.l${i}{--b:${f}}`).join("");
  const rects = cells
    .map(({ c, r, level }) => {
      const d = (c * 0.09 + r * 0.035).toFixed(3);
      return `<rect class="c l${level}" x="${gx + c * PITCH}" y="${gy + r * PITCH}" width="${CELL}" height="${CELL}" rx="3" style="animation-delay:${d}s"/>`;
    })
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Hamid, designer and full-stack engineer">
<style>
${levelCss}
.c{fill:var(--b);animation:wave 7s cubic-bezier(.22,1,.36,1) infinite}
@keyframes wave{0%,14%,100%{fill:var(--b)}5%{fill:${th.hi}}}
@media (prefers-reduced-motion:reduce){.c{animation:none}}
</style>
<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="12" fill="${th.card}" stroke="${th.border}"/>
<path fill="${th.ink}" d="${text(F.semibold, "Hamid", 48, 112, 64)}"/>
<path fill="${th.ink}" d="${text(F.medium, "Designer and full-stack engineer", 50, 152, 22)}"/>
<path fill="${th.muted}" d="${text(F.regular, "I design products and ship them end to end.", 50, 188, 17)}"/>
<path fill="${th.muted}" d="${text(F.regular, "The code is written with Claude Code, my coding agent.", 50, 212, 17)}"/>
${rects}
</svg>
`;
}

// ---------- stack ----------
const icon = (slug) => {
  const svg = fs.readFileSync(path.join(here, `node_modules/simple-icons/icons/${slug}.svg`), "utf8");
  return svg.match(/ d="([^"]+)"/)[1];
};
const brand = JSON.parse(fs.readFileSync(path.join(here, "node_modules/simple-icons/data/simple-icons.json"), "utf8"));
const hexOf = (slug) => {
  const list = Array.isArray(brand) ? brand : brand.icons;
  const hit = list.find((i) => (i.slug ?? i.title.toLowerCase().replace(/[^a-z0-9]/g, "")) === slug);
  return "#" + (hit?.hex ?? "888888");
};
const lum = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

// Tiles of the stack, in reading order. A null logo draws the small grid mark instead
// (tools without a logo in Simple Icons).
const groups = [
  ["Coding agent", [["claude", "Claude Code"]]],
  ["Languages", [["typescript", "TypeScript"], ["python", "Python"], ["rust", "Rust"]]],
  ["Frontend and apps", [["react", "React"], ["nextdotjs", "Next.js"], ["tailwindcss", "Tailwind CSS"], ["threedotjs", "Three.js"], ["tauri", "Tauri"]]],
  ["Backend", [["nodedotjs", "Node.js"], ["nestjs", "NestJS"], ["fastify", "Fastify"], ["fastapi", "FastAPI"], ["rust", "Axum"]]],
  ["APIs and realtime", [["openapiinitiative", "REST and OpenAPI"], [null, "WebSockets"], ["socketdotio", "Socket.IO"], ["telegram", "Telegram bots"]]],
  ["Scraping and automation", [[null, "Playwright"], ["cheerio", "Cheerio"], [null, "Beautiful Soup"], [null, "Rotating proxies"]]],
  ["AI", [["anthropic", "Claude API"], [null, "OpenAI API"], ["googlegemini", "Gemini"], ["elevenlabs", "ElevenLabs"], ["modelcontextprotocol", "MCP servers"]]],
  ["Data and queues", [["postgresql", "PostgreSQL"], ["redis", "Redis"], ["drizzle", "Drizzle"], [null, "BullMQ"]]],
  ["Self-hosting", [["linux", "Linux servers"], ["docker", "Docker"]]],
  ["Cloud", [["cloudflare", "Cloudflare"], ["vercel", "Vercel"]]],
];

function stack(t) {
  const th = themes[t];
  const GAP = 16, colW = (W - GAP) / 2, PAD = 22, HEAD = 30, chipH = 38, cg = 8, ICON = 17, LABEL = 15;
  const inner = colW - PAD * 2;

  // Lay out each tile's chips, wrapping inside the tile.
  const tiles = groups.map(([name, items]) => {
    const chips = [];
    let x = 0, row = 0;
    for (const [slug, label] of items) {
      const w = 12 + ICON + 9 + width(F.medium, label, LABEL) + 14;
      if (x > 0 && x + w > inner) { x = 0; row++; }
      chips.push({ slug, label, x, row, w });
      x += w + cg;
    }
    const rows = row + 1;
    return { name, chips, h: PAD + HEAD + rows * chipH + (rows - 1) * cg + PAD };
  });

  // Tiles sit in pairs, left and right; both tiles of a row take the taller one's height.
  let y = 0;
  for (let i = 0; i < tiles.length; i += 2) {
    const row = tiles.slice(i, i + 2), h = Math.max(...row.map((t) => t.h));
    row.forEach((t, c) => { t.col = c; t.y = y; t.h = h; });
    y += h + GAP;
  }
  const SH = y - GAP;

  const mark = (x, y) => {
    const s = 7, g = 2.5, o = (ICON - (s * 2 + g)) / 2, L = th.levels;
    return [[0, 0, L[4]], [1, 0, L[2]], [0, 1, L[3]], [1, 1, L[4]]]
      .map(([i, j, f]) => `<rect x="${(x + o + i * (s + g)).toFixed(1)}" y="${(y + o + j * (s + g)).toFixed(1)}" width="${s}" height="${s}" rx="1.6" fill="${f}"/>`)
      .join("");
  };

  let body = "";
  for (const tile of tiles) {
    const tx = tile.col * (colW + GAP);
    body += `<rect x="${tx + 0.5}" y="${tile.y + 0.5}" width="${colW - 1}" height="${tile.h - 1}" rx="12" fill="${th.card}" stroke="${th.border}"/>`;
    body += `<path fill="${th.muted}" d="${text(F.medium, tile.name, tx + PAD, tile.y + PAD + 12, 14)}"/>`;
    for (const c of tile.chips) {
      const x = tx + PAD + c.x, y = tile.y + PAD + HEAD + c.row * (chipH + cg), iy = y + (chipH - ICON) / 2;
      body += `<rect x="${x + 0.5}" y="${y + 0.5}" width="${(c.w - 1).toFixed(1)}" height="${chipH - 1}" rx="9" fill="${th.chip}" stroke="${th.border}"/>`;
      if (c.slug) {
        let color = hexOf(c.slug);
        if (t === "dark" && lum(color) < 0.25) color = th.ink;
        if (t === "light" && lum(color) > 0.85) color = th.ink;
        body += `<path fill="${color}" transform="translate(${x + 12} ${iy}) scale(${ICON / 24})" d="${icon(c.slug)}"/>`;
      } else body += mark(x + 12, iy);
      body += `<path fill="${th.ink}" d="${text(F.medium, c.label, x + 12 + ICON + 9, y + chipH / 2 + 5.2, LABEL)}"/>`;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${SH}" viewBox="0 0 ${W} ${SH}" role="img" aria-label="Stack">
${body}
</svg>
`;
}

for (const t of ["dark", "light"]) {
  fs.writeFileSync(path.join(out, `header-${t}.svg`), header(t));
  fs.writeFileSync(path.join(out, `stack-${t}.svg`), stack(t));
}
for (const f of fs.readdirSync(out)) console.log(f, fs.statSync(path.join(out, f)).size);
