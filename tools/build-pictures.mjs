// Builds the profile README pictures, each in light and dark:
//   hero   - a split hero on paper, in the manner of Broadside's landing page: a heavy headline
//            whose verbs sit on highlighter marks that cycle through four printed tones, and
//            four poster cards that arrive as skeletons and then develop (Broadside's Load cards).
//   stack  - the same paper: a heavy heading on a highlighter mark and cover cards, one per area,
//            that develop in one after another.
// Text is drawn as outlines (Geist, OFL) so it looks the same everywhere. Logos are Simple Icons
// (CC0). Motion is CSS inside the SVG; with reduced motion everything shows at rest.
import fs from "node:fs";
import path from "node:path";
import opentype from "opentype.js";

const here = path.dirname(new URL(import.meta.url).pathname);
const out = path.join(here, "../assets");
fs.mkdirSync(out, { recursive: true });

const sans = (w) => opentype.parse(fs.readFileSync(path.join(here, `node_modules/geist/dist/fonts/geist-sans/Geist-${w}.ttf`)).buffer);
const mono = (w) => opentype.parse(fs.readFileSync(path.join(here, `node_modules/geist/dist/fonts/geist-mono/GeistMono-${w}.ttf`)).buffer);
const F = { regular: sans("Regular"), medium: sans("Medium"), semibold: sans("SemiBold"), black: sans("Black"), mono: mono("Medium") };

// Lays out a string glyph by glyph with kerning and tracking (in em). Returns the outline and its width.
function shape(font, str, x, y, size, track = 0) {
  const scale = size / font.unitsPerEm;
  const glyphs = font.stringToGlyphs(str);
  let pen = x, d = "";
  glyphs.forEach((g, i) => {
    d += g.getPath(pen, y, size).toPathData(2);
    pen += g.advanceWidth * scale + track * size;
    if (i < glyphs.length - 1) pen += font.getKerningValue(g, glyphs[i + 1]) * scale;
  });
  return { d, w: pen - x - track * size };
}
const text = (...a) => shape(...a).d;
const width = (font, str, size, track = 0) => shape(font, str, 0, 0, size, track).w;

const EASE = "cubic-bezier(.22,1,.36,1)"; // Broadside's SOFT_OUT
const TONES = ["#e3c48f", "#b3a4de", "#a9c5a0", "#ebd86a"]; // Broadside's printed pill tones
const GREENS = ["#161b22", "#0e4429", "#006d32", "#26a641", "#39d353"];

const palettes = {
  light: {
    paper: "#f1eee9", paper2: "#e7e2da", ink: "#3c3c3c", soft: "#646362", card: "#fbf9f6",
    cardInk: "#2a2420", faint: "#848381", skel: "#eae8e5", shine: "#f7f5f2", btn: "#3c3c3c", onBtn: "#f1eee9",
  },
  dark: {
    paper: "#1c1b19", paper2: "#262421", ink: "#efe9e0", soft: "#c5c0b8", card: "#2c2a26",
    cardInk: "#efe9e0", faint: "#9b9790", skel: "#3c3935", shine: "#4a4641", btn: "#efe9e0", onBtn: "#1c1b19",
  },
};

// Shared motion. `rise` is Broadside's develop: blur 6px, 8px down, 97% scale, eased out.
const baseCss = `
.rise{animation:rise .8s ${EASE} both;transform-box:fill-box;transform-origin:center}
@keyframes rise{from{opacity:0;transform:translateY(8px) scale(.97);filter:blur(6px)}to{opacity:1;transform:none;filter:blur(0)}}
.word{animation:word 1.1s ${EASE} both;transform-box:fill-box;transform-origin:center}
@keyframes word{from{opacity:0;transform:translateY(.22em);filter:blur(6px)}to{opacity:1;transform:none;filter:blur(0)}}
.skel{animation:skel .5s ease-out both}
@keyframes skel{from{opacity:1;filter:blur(0)}to{opacity:0;filter:blur(4px)}}
.shine{animation:shine 1.3s linear infinite}
@keyframes shine{from{transform:translateX(-160px)}to{transform:translateX(220px)}}
@media (prefers-reduced-motion:reduce){*{animation:none!important}.skel{opacity:0}}
`;

// The small 2x2 grid mark: a logo stand-in, and the icon on the hero's button.
function mark(x, y, size, fills) {
  const s = size * 0.41, g = size * 0.18;
  return [[0, 0], [1, 0], [0, 1], [1, 1]]
    .map(([i, j], k) => `<rect x="${(x + i * (s + g)).toFixed(1)}" y="${(y + j * (s + g)).toFixed(1)}" width="${s.toFixed(1)}" height="${s.toFixed(1)}" rx="${(s * 0.22).toFixed(1)}" fill="${fills[k]}"/>`)
    .join("");
}

// ---------------------------------------------------------------- hero
const HW = 1000, HH = 520, SPLIT = 560;

// Poster art, 150 x 150, drawn at the origin.
const art = {
  interfaces: () => `
<rect width="150" height="150" fill="${TONES[1]}"/>
<rect x="18" y="24" width="114" height="102" rx="8" fill="#fbf9f6"/>
<rect x="18" y="24" width="114" height="16" rx="8" fill="#2a2420"/><rect x="18" y="32" width="114" height="8" fill="#2a2420"/>
<circle cx="28" cy="32" r="2.4" fill="${TONES[0]}"/><circle cx="36" cy="32" r="2.4" fill="${TONES[3]}"/><circle cx="44" cy="32" r="2.4" fill="${TONES[2]}"/>
<rect x="28" y="50" width="56" height="8" rx="2" fill="#2a2420"/>
<rect x="28" y="64" width="44" height="34" rx="4" fill="${TONES[0]}"/>
<rect x="78" y="66" width="44" height="5" rx="2" fill="#d8d1c6"/><rect x="78" y="76" width="36" height="5" rx="2" fill="#d8d1c6"/><rect x="78" y="86" width="40" height="5" rx="2" fill="#d8d1c6"/>
<g class="press"><rect x="28" y="106" width="38" height="12" rx="3" fill="${TONES[3]}"/></g>
<path class="cursor" d="M70 104 l0 15 l4 -4 l3 6 l3 -1.5 l-3 -6 l5.5 0 z" fill="#2a2420" stroke="#fbf9f6" stroke-width="1.2" stroke-linejoin="round"/>`,
  everyday: () => {
    let cells = "", seed = 11;
    const rand = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
    for (let c = 0; c < 7; c++)
      for (let r = 0; r < 7; r++) {
        const v = rand(), l = v < 0.06 ? 0 : v < 0.28 ? 1 : v < 0.58 ? 2 : v < 0.84 ? 3 : 4;
        cells += `<rect class="cell" x="${9 + c * 19.5}" y="${9 + r * 19.5}" width="15" height="15" rx="3.2" style="--b:${GREENS[l]};animation-delay:${(c * 0.11 + r * 0.04).toFixed(2)}s"/>`;
      }
    return `<rect width="150" height="150" fill="#0d1117"/>${cells}`;
  },
  servers: () => {
    let bars = "";
    for (let i = 0; i < 4; i++) {
      const y = 22 + i * 28;
      bars += `<rect x="18" y="${y}" width="114" height="22" rx="5" fill="#2a2420"/>`;
      bars += `<rect x="27" y="${y + 9}" width="26" height="4" rx="2" fill="#5a524b"/>`;
      bars += `<rect x="58" y="${y + 9}" width="14" height="4" rx="2" fill="#5a524b"/>`;
      bars += `<circle class="led" cx="112" cy="${y + 11}" r="3.2" style="animation-delay:${(i * 0.37).toFixed(2)}s"/>`;
      bars += `<circle cx="122" cy="${y + 11}" r="3.2" fill="${TONES[0]}"/>`;
    }
    return `<rect width="150" height="150" fill="${TONES[2]}"/>${bars}`;
  },
  crawlers: () => {
    const c = [75, 74], nodes = [[30, 34], [118, 28], [128, 92], [96, 128], [36, 118], [16, 74]];
    const edges = [...nodes.map((n) => [c, n]), [nodes[0], nodes[1]], [nodes[2], nodes[3]], [nodes[4], nodes[5]], [nodes[1], nodes[2]]];
    const lines = edges
      .map(([a, b], i) => {
        const len = Math.hypot(b[0] - a[0], b[1] - a[1]).toFixed(1);
        return `<path class="edge" d="M${a[0]} ${a[1]}L${b[0]} ${b[1]}" style="stroke-dasharray:${len};stroke-dashoffset:${len};animation-delay:${(1.9 + i * 0.07).toFixed(2)}s"/>`;
      })
      .join("");
    const dots = nodes.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5.5" fill="#2a2420"/>`).join("");
    return `<rect width="150" height="150" fill="${TONES[3]}"/>${lines}<circle class="ping" cx="${c[0]}" cy="${c[1]}" r="10" fill="none" stroke="#2a2420" stroke-width="2"/>${dots}<circle cx="${c[0]}" cy="${c[1]}" r="9" fill="#2a2420"/><circle cx="${c[0]}" cy="${c[1]}" r="3.5" fill="${TONES[3]}"/>`;
  },
};

const posters = [
  { key: "interfaces", title: "Interfaces", meta: "design" },
  { key: "everyday", title: "Every day", meta: "commits" },
  { key: "servers", title: "Own servers", meta: "Linux" },
  { key: "crawlers", title: "Crawlers", meta: "Python" },
];

function hero(t) {
  const p = palettes[t];
  let s = "";

  // Paper halves.
  s += `<rect width="${HW}" height="${HH}" fill="${p.paper2}"/><rect width="${SPLIT}" height="${HH}" fill="${p.paper}"/>`;

  // Wordmark.
  s += `<path fill="${p.ink}" d="${text(F.black, "Hamid", 36, 62, 27, -0.045)}"/>`;

  // Headline: three short lines; each verb sits on a highlighter mark.
  const size = 80, lead = 84, x0 = 34, base0 = 178, track = -0.055;
  const lines = [[["Design", true], ["it,", false]], [["ship", true], ["it,", false]], [["host", true], ["it.", false]]];
  const space = width(F.black, " ", size, track) * 0.9;
  let wi = 0, mi = 0, marks = "", words = "";
  lines.forEach((line, li) => {
    let x = x0;
    const y = base0 + li * lead;
    for (const [w, hl] of line) {
      const { d, w: ww } = shape(F.black, w, x, y, size, track);
      const delay = (0.15 + wi * 0.07).toFixed(2);
      if (hl) {
        const mx = x - 0.07 * size, my = y - 0.76 * size, mw = ww + 0.14 * size, mh = 0.9 * size;
        marks += `<rect class="mark" x="${mx.toFixed(1)}" y="${my.toFixed(1)}" width="${mw.toFixed(1)}" height="${mh.toFixed(1)}" rx="${(0.06 * size).toFixed(1)}" fill="${TONES[mi]}" style="animation-delay:${(+delay + 0.35).toFixed(2)}s,${(-3 * mi).toFixed(0)}s"/>`;
        mi++;
      }
      words += `<g class="word" style="animation-delay:${delay}s"><path fill="${hl ? "#2a2420" : p.ink}" d="${d}"/></g>`;
      x += ww + space;
      wi++;
    }
  });
  s += marks + words;

  // Slogan and the ink button, bottom left.
  const slogan = ["Designer and full-stack engineer.", "The code is written with Claude Code,", "my coding agent."];
  s += `<g class="rise" style="animation-delay:.75s">`;
  slogan.forEach((l, i) => (s += `<path fill="${p.ink}" d="${text(F.regular, l, 36, 398 + i * 21, 16.5, -0.01)}"/>`));
  s += `</g>`;
  const label = "Shipping every day", lw = width(F.semibold, label, 15.5, -0.01);
  const bw = 18 + lw + 14 + 32 + 5;
  s += `<g class="rise" style="animation-delay:.9s"><rect x="36" y="458" width="${bw.toFixed(1)}" height="42" rx="7" fill="${p.btn}"/>`;
  s += `<path fill="${p.onBtn}" d="${text(F.semibold, label, 54, 484.5, 15.5, -0.01)}"/>`;
  s += `<rect x="${(36 + bw - 37).toFixed(1)}" y="463" width="32" height="32" rx="5" fill="${TONES[3]}"/>${mark(36 + bw - 37 + 8.5, 471.5, 15, Array(4).fill("#2a2420"))}</g>`;

  // Poster cards on the right half, staggered like Broadside's cover grid.
  const CW = 170, CH = 196, xs = [601, 789], ys = [[44, 258], [92, 306]];
  const order = [[0, 0], [1, 0], [0, 1], [1, 1]];
  let clips = "";
  posters.forEach((po, i) => {
    const [c, r] = order[i];
    const x = xs[c], y = ys[c][r];
    const enter = 0.3 + i * 0.09, develop = 1.15 + i * 0.16;
    clips += `<clipPath id="art${i}"><rect x="${x + 10}" y="${y + 10}" width="150" height="150" rx="3"/></clipPath>`;
    clips += `<clipPath id="sk${i}"><rect x="${x + 10}" y="${y + 10}" width="150" height="150" rx="3"/><rect x="${x + 10}" y="${y + 172}" width="78" height="9" rx="2.5"/><rect x="${x + 130}" y="${y + 172}" width="30" height="9" rx="2.5"/></clipPath>`;
    s += `<g class="rise" style="animation-delay:${enter.toFixed(2)}s">`;
    s += `<rect x="${x}" y="${y}" width="${CW}" height="${CH}" fill="${p.card}"/>`;
    // Skeleton, with a light running across it, until the card develops.
    s += `<g class="skel" style="animation-delay:${develop.toFixed(2)}s"><g clip-path="url(#sk${i})"><rect x="${x}" y="${y}" width="${CW}" height="${CH}" fill="${p.skel}"/>`;
    s += `<rect class="shine" x="${x - 60}" y="${y}" width="60" height="${CH}" fill="url(#shine)"/></g></g>`;
    // Content.
    s += `<g class="rise" style="animation-delay:${(develop + 0.08).toFixed(2)}s"><g clip-path="url(#art${i})"><g transform="translate(${x + 10} ${y + 10})">${art[po.key]()}</g></g></g>`;
    s += `<g class="rise" style="animation-delay:${(develop + 0.2).toFixed(2)}s">`;
    s += `<path fill="${p.cardInk}" d="${text(F.medium, po.title, x + 10, y + 181, 11.5, -0.01)}"/>`;
    const mw = width(F.regular, po.meta, 11.5);
    s += `<path fill="${p.faint}" d="${text(F.regular, po.meta, x + 160 - mw, y + 181, 11.5)}"/></g>`;
    s += `</g>`;
  });

  const css = `${baseCss}
.mark{animation:sweep 1.4s ${EASE} both,tones 12s linear infinite;transform-box:fill-box;transform-origin:0 50%}
@keyframes sweep{from{transform:scaleX(0)}to{transform:scaleX(1)}}
@keyframes tones{0%,21%{fill:${TONES[0]}}25%,46%{fill:${TONES[1]}}50%,71%{fill:${TONES[2]}}75%,96%{fill:${TONES[3]}}100%{fill:${TONES[0]}}}
.cell{fill:var(--b);animation:wave 6s ${EASE} infinite}
@keyframes wave{0%,14%,100%{fill:var(--b)}5%{fill:#7ee787}}
.led{fill:#39d353;animation:led 2.2s steps(1) infinite}
@keyframes led{0%,62%{fill:#39d353}63%,70%{fill:#0e4429}71%,82%{fill:#39d353}83%,88%{fill:#0e4429}}
.edge{fill:none;stroke:#2a2420;stroke-width:2;stroke-linecap:round;animation:draw .9s ${EASE} both}
@keyframes draw{to{stroke-dashoffset:0}}
.ping{animation:ping 2.4s ease-out infinite;transform-box:fill-box;transform-origin:center}
@keyframes ping{0%{transform:scale(1);opacity:.9}80%,100%{transform:scale(2.4);opacity:0}}
.press{animation:press 3s ${EASE} infinite;transform-box:fill-box;transform-origin:center}
@keyframes press{0%,40%,56%,100%{transform:none}46%{transform:scale(.9)}}
.cursor{animation:cursor 3s ${EASE} infinite}
@keyframes cursor{0%,100%{transform:translate(16px,10px)}30%,60%{transform:translate(0,0)}}
@media (prefers-reduced-motion:reduce){.edge{stroke-dashoffset:0!important}}`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${HW}" height="${HH}" viewBox="0 0 ${HW} ${HH}" role="img" aria-label="Hamid. Design it, ship it, host it.">
<defs><clipPath id="round"><rect width="${HW}" height="${HH}" rx="14"/></clipPath>
<linearGradient id="shine"><stop offset="0" stop-color="${p.shine}" stop-opacity="0"/><stop offset=".5" stop-color="${p.shine}"/><stop offset="1" stop-color="${p.shine}" stop-opacity="0"/></linearGradient>${clips}</defs>
<style>${css}</style>
<g clip-path="url(#round)">${s}</g>
</svg>
`;
}

// ---------------------------------------------------------------- stack
// Broadside's paper again: a heavy heading on a highlighter mark, then cover cards that arrive
// as skeletons and develop one after another. Logos are drawn in ink, like Broadside's icons.
const icon = (slug) => fs.readFileSync(path.join(here, `node_modules/simple-icons/icons/${slug}.svg`), "utf8").match(/ d="([^"]+)"/)[1];

// Cards in reading order, each with one of the four tones. A null logo draws the grid mark
// (tools without a Simple Icons logo).
const groups = [
  ["Coding agent", [["claude", "Claude Code"]]],
  ["Languages", [["typescript", "TypeScript"], ["python", "Python"], ["rust", "Rust"]]],
  ["Frontend and apps", [["react", "React"], ["nextdotjs", "Next.js"], ["tailwindcss", "Tailwind CSS"], ["threedotjs", "Three.js"], ["tauri", "Tauri"]]],
  ["Backend", [["nodedotjs", "Node.js"], ["nestjs", "NestJS"], ["fastify", "Fastify"], ["fastapi", "FastAPI"], ["rust", "Axum"]]],
  ["APIs and realtime", [["openapiinitiative", "REST and OpenAPI"], [null, "WebSockets"], ["socketdotio", "Socket.IO"], ["telegram", "Telegram bots"]]],
  ["Scraping and automation", [[null, "Playwright"], ["cheerio", "Cheerio"], [null, "Beautiful Soup"], [null, "Rotating proxies"]]],
  ["Data and queues", [["postgresql", "PostgreSQL"], ["redis", "Redis"], ["drizzle", "Drizzle"], [null, "BullMQ"]], { full: true }],
  ["Self-hosting", [["linux", "Linux servers"], ["docker", "Docker"]]],
  ["Cloud", [["cloudflare", "Cloudflare"], ["vercel", "Vercel"]]],
];

function stack(t) {
  const p = palettes[t];
  const M = 36, GAP = 16, colW = (HW - M * 2 - GAP) / 2, TP = 18, CAP = 34, chipH = 34, cg = 7, ICON = 15, LABEL = 14;

  const cards = groups.map(([name, items, opts], gi) => {
    const full = !!opts?.full, tw = full ? HW - M * 2 : colW, inner = tw - TP * 2;
    const chips = [];
    let x = 0, row = 0;
    for (const [slug, label] of items) {
      const w = 11 + ICON + 8 + width(F.medium, label, LABEL, -0.005) + 12;
      if (x > 0 && x + w > inner) { x = 0; row++; }
      chips.push({ slug, label, x, row, w });
      x += w + cg;
    }
    const rows = row + 1;
    return { name, chips, full, tw, tone: TONES[gi % 4], count: items.length, h: TP + CAP + rows * chipH + (rows - 1) * cg + TP };
  });
  let y = 150;
  for (let i = 0; i < cards.length; ) {
    const row = cards[i].full ? [cards[i]] : cards.slice(i, i + 2).filter((c) => !c.full);
    const h = Math.max(...row.map((c) => c.h));
    row.forEach((c, k) => { c.x = M + k * (colW + GAP); c.y = y; c.h = h; });
    y += h + GAP; i += row.length;
  }
  const SH = y - GAP + M;

  let s = `<rect width="${HW}" height="${SH}" fill="${p.paper2}"/>`;

  // Heading: "What I work with", the verb on a highlighter mark; a line under it.
  const size = 46, track = -0.05, base = 84;
  const parts = [["What I", false], ["work", true], ["with", false]];
  const space = width(F.black, " ", size, track) * 0.9;
  let x = M, marks = "", words = "";
  parts.forEach(([w, hl], i) => {
    if (hl) x += 0.1 * size; // room for the mark's overhang
    const { d, w: ww } = shape(F.black, w, x, base, size, track);
    const delay = (0.1 + i * 0.07).toFixed(2);
    if (hl) marks += `<rect class="mark" x="${(x - 0.07 * size).toFixed(1)}" y="${(base - 0.76 * size).toFixed(1)}" width="${(ww + 0.14 * size).toFixed(1)}" height="${(0.9 * size).toFixed(1)}" rx="${(0.06 * size).toFixed(1)}" fill="${TONES[1]}" style="animation-delay:${(+delay + 0.3).toFixed(2)}s,-3s"/>`;
    words += `<g class="word" style="animation-delay:${delay}s"><path fill="${hl ? "#2a2420" : p.ink}" d="${d}"/></g>`;
    x += ww + space + (hl ? 0.1 * size : 0);
  });
  s += marks + words;
  s += `<g class="rise" style="animation-delay:.45s"><path fill="${p.soft}" d="${text(F.regular, "Every tool here is in my own code.", M + 1, 120, 16, -0.01)}"/></g>`;

  // Cards.
  let clips = "";
  cards.forEach((c, i) => {
    const enter = 0.3 + i * 0.06, develop = 0.95 + i * 0.13;
    s += `<g class="rise" style="animation-delay:${enter.toFixed(2)}s">`;
    s += `<rect x="${c.x}" y="${c.y}" width="${c.tw}" height="${c.h}" rx="10" fill="${p.card}"/>`;
    // Skeleton with a running light.
    const nameW = width(F.medium, c.name, 13.5) + 22;
    let sk = `<rect x="${c.x + TP}" y="${c.y + TP + 2}" width="${nameW.toFixed(1)}" height="11" rx="3"/><rect x="${c.x + c.tw - TP - 46}" y="${c.y + TP + 2}" width="46" height="11" rx="3"/>`;
    c.chips.forEach((ch) => (sk += `<rect x="${(c.x + TP + ch.x).toFixed(1)}" y="${c.y + TP + CAP + ch.row * (chipH + cg)}" width="${ch.w.toFixed(1)}" height="${chipH}" rx="7"/>`));
    clips += `<clipPath id="sk${i}">${sk}</clipPath>`;
    s += `<g class="skel" style="animation-delay:${develop.toFixed(2)}s"><g clip-path="url(#sk${i})"><rect x="${c.x}" y="${c.y}" width="${c.tw}" height="${c.h}" fill="${p.skel}"/>`;
    s += `<rect class="shine" x="${c.x - 60}" y="${c.y}" width="60" height="${c.h}" fill="url(#shine)" style="animation-duration:${c.full ? 2.2 : 1.5}s"/></g></g>`;
    // Content: a tone square and the name, the count on the right, then the chips.
    s += `<g class="rise" style="animation-delay:${(develop + 0.06).toFixed(2)}s">`;
    s += `<rect x="${c.x + TP}" y="${c.y + TP + 1}" width="12" height="12" rx="3" fill="${c.tone}"/>`;
    s += `<path fill="${p.cardInk}" d="${text(F.medium, c.name, c.x + TP + 20, c.y + TP + 12, 13.5, -0.005)}"/>`;
    const count = `${c.count} ${c.count === 1 ? "tool" : "tools"}`, cw = width(F.regular, count, 12.5);
    s += `<path fill="${p.faint}" d="${text(F.regular, count, c.x + c.tw - TP - cw, c.y + TP + 12, 12.5)}"/>`;
    for (const ch of c.chips) {
      const x2 = c.x + TP + ch.x, y2 = c.y + TP + CAP + ch.row * (chipH + cg), iy = y2 + (chipH - ICON) / 2;
      s += `<rect x="${x2.toFixed(1)}" y="${y2}" width="${ch.w.toFixed(1)}" height="${chipH}" rx="7" fill="${p.paper}"/>`;
      s += ch.slug
        ? `<path fill="${p.cardInk}" transform="translate(${(x2 + 11).toFixed(1)} ${iy}) scale(${ICON / 24})" d="${icon(ch.slug)}"/>`
        : mark(x2 + 12, iy + 1, ICON - 2, Array(4).fill(p.cardInk));
      s += `<path fill="${p.cardInk}" d="${text(F.medium, ch.label, x2 + 11 + ICON + 8, y2 + chipH / 2 + 4.8, LABEL, -0.005)}"/>`;
    }
    s += `</g></g>`;
  });

  const css = `${baseCss}
.mark{animation:sweep 1.4s ${EASE} both,tones 12s linear infinite;transform-box:fill-box;transform-origin:0 50%}
@keyframes sweep{from{transform:scaleX(0)}to{transform:scaleX(1)}}
@keyframes tones{0%,21%{fill:${TONES[0]}}25%,46%{fill:${TONES[1]}}50%,71%{fill:${TONES[2]}}75%,96%{fill:${TONES[3]}}100%{fill:${TONES[0]}}}`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${HW}" height="${SH}" viewBox="0 0 ${HW} ${SH}" role="img" aria-label="What I work with">
<defs><clipPath id="round"><rect width="${HW}" height="${SH}" rx="14"/></clipPath>
<linearGradient id="shine"><stop offset="0" stop-color="${p.shine}" stop-opacity="0"/><stop offset=".5" stop-color="${p.shine}"/><stop offset="1" stop-color="${p.shine}" stop-opacity="0"/></linearGradient>${clips}</defs>
<style>${css}</style>
<g clip-path="url(#round)">${s}</g>
</svg>
`;
}

for (const t of ["light", "dark"]) {
  fs.writeFileSync(path.join(out, `hero-${t}.svg`), hero(t));
  fs.writeFileSync(path.join(out, `stack-${t}.svg`), stack(t));
}
for (const f of fs.readdirSync(out)) console.log(f, fs.statSync(path.join(out, f)).size);
