// Builds the profile README pictures, each in light and dark. Together they tell one story, in
// the order of Broadside's landing page:
//   hero   - a split hero on paper: a heavy headline whose key words sit on highlighter marks that
//            cycle through four printed tones, and four poster cards that arrive as skeletons and
//            then develop (Broadside's Load cards).
//   how    - "How I work": three numbered cards, like Broadside's "How it works", that a darker
//            paper panel wipes over in turn, then a big sliding band of what I am good at.
//   built  - "What I've built": cover cards, one per kind of system.
//   outro  - the closing line and a large wordmark whose letters take the tones in a wave, like
//            Broadside's footer.
// Every illustration is a small isometric scene that takes itself apart or puts itself together:
// flat solid faces, no shadows, the printed tones plus paper and ink.
// Text is drawn as outlines (Geist, OFL) so it looks the same everywhere. Motion is CSS inside the
// SVG; with reduced motion everything shows at rest.
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
    d += g.getPath(pen, y, size).toPathData(1);
    pen += g.advanceWidth * scale + track * size;
    if (i < glyphs.length - 1) pen += font.getKerningValue(g, glyphs[i + 1]) * scale;
  });
  return { d, w: pen - x - track * size };
}
const text = (...a) => shape(...a).d;
const width = (font, str, size, track = 0) => shape(font, str, 0, 0, size, track).w;

// Small text is placed glyph by glyph with <use>: each glyph outline is written once per picture
// and reused, which keeps the files small. `glyphReset` starts a picture; `svg` writes the defs.
const fontName = new Map(Object.entries(F).map(([k, f]) => [f, k]));
let glyphIds = new Map(), glyphDefs = "";
const glyphReset = () => { glyphIds = new Map(); glyphDefs = ""; };
function tu(fill, font, str, x, y, size, track = 0) {
  const scale = size / font.unitsPerEm;
  const glyphs = font.stringToGlyphs(str);
  let pen = x, uses = "";
  glyphs.forEach((g, i) => {
    const key = `${fontName.get(font)}|${size}|${g.index}`;
    if (!glyphIds.has(key)) {
      const d = g.getPath(0, 0, size).toPathData(1);
      const id = d ? `g${glyphIds.size}` : null;
      if (id) glyphDefs += `<path id="${id}" d="${d}"/>`;
      glyphIds.set(key, id);
    }
    const id = glyphIds.get(key);
    if (id) uses += `<use href="#${id}" x="${+pen.toFixed(1)}" y="${+y.toFixed(1)}"/>`;
    pen += g.advanceWidth * scale + track * size;
    if (i < glyphs.length - 1) pen += font.getKerningValue(g, glyphs[i + 1]) * scale;
  });
  return `<g fill="${fill}">${uses}</g>`;
}

// Breaks a string into lines no wider than `max`.
function wrap(font, str, size, max, track = 0) {
  const lines = [];
  let cur = "";
  for (const word of str.split(" ")) {
    const next = cur ? `${cur} ${word}` : word;
    if (cur && width(font, next, size, track) > max) { lines.push(cur); cur = word; } else cur = next;
  }
  if (cur) lines.push(cur);
  return lines;
}

// Like wrap, but as narrow as it can be without adding a line, so the lines come out even and
// the last one is never a lone word.
function balance(font, str, size, max, track = 0) {
  const n = wrap(font, str, size, max, track).length;
  let lo = max * 0.5, hi = max;
  while (hi - lo > 1) {
    const mid = (lo + hi) / 2;
    if (wrap(font, str, size, mid, track).length > n) lo = mid; else hi = mid;
  }
  return wrap(font, str, size, hi, track);
}

const EASE = "cubic-bezier(.22,1,.36,1)"; // Broadside's SOFT_OUT
const TONES = ["#e3c48f", "#b3a4de", "#a9c5a0", "#ebd86a"]; // Broadside's printed pill tones
const INK = "#2a2420"; // ink on the tones and inside the art, the same in both themes
const LIGHT = "#fbf9f6"; // paper inside the art
const W = 1000, M = 36;

// Broadside's paper and ink (apps/web/src/app/globals.css).
const palettes = {
  light: {
    paper: "#f1eee9", paper2: "#e7e2da", paper3: "#d7d1c7", paper4: "#cdc0b0", ink: "#3c3c3c", soft: "#646362", faint: "#848381",
    card: "#fbf9f6", cardInk: "#2a2420", cardSoft: "#646362", skel: "#eae8e5", shine: "#f7f5f2",
    btn: "#3c3c3c", onBtn: "#f1eee9", onBtnSoft: "#d7d1c7", btnSkel: "#4a4a4a",
  },
  dark: {
    paper: "#1c1b19", paper2: "#262421", paper3: "#33302c", paper4: "#45403a", ink: "#efe9e0", soft: "#c5c0b8", faint: "#9b9790",
    card: "#2c2a26", cardInk: "#efe9e0", cardSoft: "#c5c0b8", skel: "#3c3935", shine: "#4a4641",
    btn: "#efe9e0", onBtn: "#1c1b19", onBtnSoft: "#55504a", btnSkel: "#e2dbd0",
  },
};

// Shared motion. `rise` is Broadside's develop: blur 6px, 8px down, 97% scale, eased out. Marks
// sweep in from the left, then cycle the four tones every 3 s, each starting on its own tone.
const baseCss = `
.rise{animation:rise .8s ${EASE} both;transform-box:fill-box;transform-origin:center}
@keyframes rise{from{opacity:0;transform:translateY(8px) scale(.97);filter:blur(6px)}to{opacity:1;transform:none;filter:blur(0)}}
.word{animation:word 1.1s ${EASE} both;transform-box:fill-box;transform-origin:center}
@keyframes word{from{opacity:0;transform:translateY(.22em);filter:blur(6px)}to{opacity:1;transform:none;filter:blur(0)}}
.skel{animation:skel .5s ease-out both}
@keyframes skel{from{opacity:1;filter:blur(0)}to{opacity:0;filter:blur(4px)}}
.shine{animation:shine 1.3s linear infinite}
@keyframes shine{from{transform:translateX(-160px)}to{transform:translateX(260px)}}
.mark{animation:sweep 1.4s ${EASE} both,tones 12s linear infinite;transform-box:fill-box;transform-origin:0 50%}
@keyframes sweep{from{transform:scaleX(0)}to{transform:scaleX(1)}}
@keyframes tones{0%,21%{fill:${TONES[0]}}25%,46%{fill:${TONES[1]}}50%,71%{fill:${TONES[2]}}75%,96%{fill:${TONES[3]}}100%{fill:${TONES[0]}}}
.blink{animation:blink 1.1s steps(1) infinite}
@keyframes blink{50%{opacity:0}}
.led{animation:led 2.2s steps(1) infinite}
@keyframes led{0%,62%{fill:#39d353}63%,70%{fill:#0e4429}71%,82%{fill:#39d353}83%,88%{fill:#0e4429}}
@media (prefers-reduced-motion:reduce){*{animation:none!important}.skel{opacity:0}}
`;

const shineDef = (p) =>
  `<linearGradient id="shine"><stop offset="0" stop-color="${p.shine}" stop-opacity="0"/><stop offset=".5" stop-color="${p.shine}"/><stop offset="1" stop-color="${p.shine}" stop-opacity="0"/></linearGradient>`;

function svg(h, label, css, defs, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${h}" viewBox="0 0 ${W} ${h}" role="img" aria-label="${label}">
<defs><clipPath id="round"><rect width="${W}" height="${h}" rx="14"/></clipPath>${glyphDefs}${defs}</defs>
<style>${baseCss}${css}</style>
<g clip-path="url(#round)">${body}</g>
</svg>
`;
}

// A heavy line of words. Parts are [word, tone, glued]: a word with a tone (0-3) sits on a mark,
// and a glued part (a comma) follows the word before it with no space. Returns the marks (drawn
// first), the words, and the time the last word starts.
function headline(parts, x0, base, size, { ink, track = -0.055, delay = 0.1, step = 0.07 }) {
  const space = width(F.black, " ", size, track) * 0.9;
  let x = x0, marks = "", words = "", t = delay;
  parts.forEach(([w, tone, glued], i) => {
    if (i > 0 && !glued) x += space;
    const { d, w: ww } = shape(F.black, w, x, base, size, track);
    const marked = typeof tone === "number";
    if (marked) {
      marks += `<rect class="mark" x="${(x - 0.07 * size).toFixed(1)}" y="${(base - 0.76 * size).toFixed(1)}" width="${(ww + 0.14 * size).toFixed(1)}" height="${(0.9 * size).toFixed(1)}" rx="${(0.06 * size).toFixed(1)}" fill="${TONES[tone]}" style="animation-delay:${(t + 0.3).toFixed(2)}s,${-3 * tone}s"/>`;
    }
    words += `<g class="word" style="animation-delay:${t.toFixed(2)}s"><path fill="${marked ? INK : ink}" d="${d}"/></g>`;
    x += ww;
    t += step;
  });
  return { marks, words, end: x, t };
}

// The small 2x2 grid mark: the icon on the hero's button.
function mark(x, y, size, fill) {
  const s = size * 0.41, g = size * 0.18;
  return [[0, 0], [1, 0], [0, 1], [1, 1]]
    .map(([i, j]) => `<rect x="${(x + i * (s + g)).toFixed(1)}" y="${(y + j * (s + g)).toFixed(1)}" width="${s.toFixed(1)}" height="${s.toFixed(1)}" rx="${(s * 0.22).toFixed(1)}" fill="${fill}"/>`)
    .join("");
}

// ---------------------------------------------------------------- isometric scenes
// x runs to the right and down, y to the left and down, z straight up. A box shows three faces:
// the top keeps its colour; the faces toward the viewer get it mixed with ink, a fifth and a
// third of the way (a dark colour is mixed with black instead).
const IA = 0.9, IB = 0.4;
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, f) => "#" + rgb(a).map((v, i) => Math.round(v + (rgb(b)[i] - v) * f).toString(16).padStart(2, "0")).join("");
const shade = (c, f) => { const [r, g, b] = rgb(c); return mix(c, (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.25 ? "#000000" : INK, f); };
const bg = (c, w, h) => `<rect width="${w}" height="${h}" fill="${c}"/>`;
const tr = ([x, y]) => `translate(${x}px,${y}px)`;
const ty = (y) => `translateY(${y}px)`;
const pct = (n) => `${+n.toFixed(2)}%`;

// Fits the scene box [x0,x1] x [y0,y1] x [z0,z1] into a w x h frame and returns drawing helpers
// in frame pixels.
function scene(x0, x1, y0, y1, z0, z1, w, h, pad = 10) {
  const corners = [];
  for (const x of [x0, x1]) for (const y of [y0, y1]) for (const z of [z0, z1]) corners.push([x, y, z]);
  return fitScene(corners, w, h, pad);
}

// Like scene, but fits exactly the given points.
function fitScene(points, w, h, pad = 10) {
  const sx = points.map(([x, y]) => (x - y) * IA), sy = points.map(([x, y, z]) => (x + y) * IB - z);
  const k = Math.min((w - pad * 2) / (Math.max(...sx) - Math.min(...sx)), (h - pad * 2) / (Math.max(...sy) - Math.min(...sy)));
  const ox = w / 2 - ((Math.max(...sx) + Math.min(...sx)) / 2) * k;
  const oy = h / 2 - ((Math.max(...sy) + Math.min(...sy)) / 2) * k;
  const f = (n) => +n.toFixed(1);
  const P = (x, y, z = 0) => [ox + (x - y) * IA * k, oy + ((x + y) * IB - z) * k];
  const pts = (list) => list.map((q) => P(...q).map(f).join(",")).join(" ");
  const poly = (list, fill, extra = "") => `<polygon points="${pts(list)}" fill="${fill}"${extra ? " " + extra : ""}/>`;
  const box = (x, y, z, bw, bd, bh, c, o = {}) =>
    poly([[x, y + bd, z], [x + bw, y + bd, z], [x + bw, y + bd, z + bh], [x, y + bd, z + bh]], o.left ?? shade(c, 0.2)) +
    poly([[x + bw, y, z], [x + bw, y + bd, z], [x + bw, y + bd, z + bh], [x + bw, y, z + bh]], o.right ?? shade(c, 0.36)) +
    poly([[x, y, z + bh], [x + bw, y, z + bh], [x + bw, y + bd, z + bh], [x, y + bd, z + bh]], o.top ?? c, o.topExtra ?? "");
  const sil = (x, y, z, bw, bd, bh) => pts([[x, y, z + bh], [x + bw, y, z + bh], [x + bw, y, z], [x + bw, y + bd, z], [x, y + bd, z], [x, y + bd, z + bh]]);
  // Flat shapes on a top (constant z), a front (constant y) or a side (constant x).
  const top = (x, y, z, bw, bd, c, extra) => poly([[x, y, z], [x + bw, y, z], [x + bw, y + bd, z], [x, y + bd, z]], c, extra);
  const front = (x, y, z, bw, bh, c, extra) => poly([[x, y, z], [x + bw, y, z], [x + bw, y, z + bh], [x, y, z + bh]], c, extra);
  const line = (list) => "M" + list.map((q) => P(...q).map(f).join(" ")).join("L");
  const vec = (dx, dy, dz = 0) => [f((dx - dy) * IA * k), f(((dx + dy) * IB - dz) * k)];
  const px = (n) => f(n * k);
  // A box that rises out of the floor: drawn inside its own outline, starting below it.
  const grow = (cid, b, c, cls, style = "", o = {}) =>
    `<clipPath id="${cid}"><polygon points="${sil(...b)}"/></clipPath><g clip-path="url(#${cid})"><g class="${cls}" style="${style}">${box(...b, c, o)}</g></g>`;
  // The edges of a box as one path, for dashed plans.
  const wire = (x, y, z, bw, bd, bh) => {
    const c = [x + bw, y + bd, z + bh];
    return line([[x, y, z + bh], [x + bw, y, z + bh], [x + bw, y, z], [x + bw, y + bd, z], [x, y + bd, z], [x, y + bd, z + bh], [x, y, z + bh]]) +
      line([c, [x, y + bd, z + bh]]) + line([c, [x + bw, y, z + bh]]) + line([c, [x + bw, y + bd, z]]);
  };
  // An upright cylinder: its side, then its top.
  const cyl = (cx, cy, z, r, ch, c) => {
    const [tx, tyy] = P(cx, cy, z + ch), [bx, by] = P(cx, cy, z);
    const rx = r * Math.SQRT2 * IA * k, ry = r * Math.SQRT2 * IB * k;
    return `<path d="M${f(tx - rx)} ${f(tyy)}L${f(bx - rx)} ${f(by)}A${f(rx)} ${f(ry)} 0 0 0 ${f(bx + rx)} ${f(by)}L${f(tx + rx)} ${f(tyy)}Z" fill="${shade(c, 0.28)}"/><ellipse cx="${f(tx)}" cy="${f(tyy)}" rx="${f(rx)}" ry="${f(ry)}" fill="${c}"/>`;
  };
  // A matrix that lays a flat drawing (its own units, y down) on the plane z, reading along x.
  const floor = (x, y, z, s = 1) => {
    const [e, g] = P(x, y, z), m = (n) => +(n * k * s).toFixed(4);
    return `matrix(${m(IA)} ${m(IB)} ${m(-IA)} ${m(IB)} ${f(e)} ${f(g)})`;
  };
  return { P, poly, box, sil, top, front, line, vec, px, grow, wire, cyl, floor };
}

// A move-and-back loop: hold at `a`, travel to `b`, hold, travel back.
const loop = (name, dur, a, b, { delay = 0, hold = [12, 38, 82] } = {}) =>
  `.${name}{animation:${name} ${dur}s ${EASE} ${delay}s infinite backwards}@keyframes ${name}{0%,${hold[0]}%{transform:${a}}${hold[1]}%,${hold[2]}%{transform:${b}}100%{transform:${a}}}`;

// ---------------------------------------------------------------- hero
const HH = 520, SPLIT = 560;

// Poster art, 150 x 150. Each returns its markup and its CSS; `id` keeps names apart.
const posterArt = {
  // Reverse engineering: an exploded view. Three layers (screens, logic, data) pull apart, hold,
  // and close again. At rest they stay apart.
  teardown: (id) => {
    const plate = (y, topc, side) => {
      const hw = 50, hh = 22, th = 7;
      return `<path d="M${75 - hw} ${y}L75 ${y + hh}L${75 + hw} ${y}L${75 + hw} ${y + th}L75 ${y + hh + th}L${75 - hw} ${y + th}Z" fill="${side}"/>` +
        `<path d="M75 ${y - hh}L${75 + hw} ${y}L75 ${y + hh}L${75 - hw} ${y}Z" fill="${topc}"/>`;
    };
    const guides = [25, 125].map((x) => `<path d="M${x} 44V112" stroke="${INK}" stroke-width="1.2" stroke-dasharray="2 3"/>`).join("");
    const ui = `<path d="M60 38L80 28L88 32L68 42Z" fill="${INK}"/><path d="M72 46L92 36L100 40L80 50Z" fill="${TONES[1]}"/>`;
    const s = bg(TONES[3], 150, 150) + guides +
      `<g class="${id}-lo">${plate(108, INK, "#120f0d")}</g>` + plate(76, TONES[1], "#8f80bd") + `<g class="${id}-hi">${plate(44, LIGHT, "#d8d1c6")}${ui}</g>`;
    return { s, css: loop(`${id}-hi`, 5, ty(26), "none", { hold: [14, 38, 82] }) + loop(`${id}-lo`, 5, ty(-26), "none", { hold: [14, 38, 82] }) };
  },

  // System design: the parts as blocks, the lines between them, and data leaving the centre.
  systems: (id) => {
    const S = scene(0, 82, 0, 82, 0, 34, 150, 150, 8);
    let s = bg(TONES[1], 150, 150);
    for (const end of [[38, 8, 0], [8, 38, 0], [74, 38, 0], [38, 74, 0]]) {
      const d = S.line([[38, 38, 0], end]);
      s += `<path d="${d}" fill="none" stroke="${INK}" stroke-width="2.2"/><path class="${id}-f" d="${d}" fill="none" stroke="${TONES[3]}" stroke-width="2.2" stroke-dasharray="3 9" stroke-linecap="round"/>`;
    }
    s += S.box(28, 0, 0, 20, 16, 12, LIGHT) + S.top(31, 5, 12, 11, 3.5, INK);
    s += S.box(0, 28, 0, 16, 20, 12, LIGHT) + S.top(5, 31, 12, 3.5, 11, INK);
    s += S.box(28, 28, 0, 20, 20, 34, INK) + S.top(33, 33, 34, 10, 10, TONES[3], `class="${id}-p"`);
    s += S.box(66, 28, 0, 16, 20, 12, LIGHT) + S.top(70, 31, 12, 3.5, 11, INK);
    s += S.box(28, 66, 0, 20, 16, 12, LIGHT) + S.top(31, 70, 12, 11, 3.5, INK);
    s += `<g class="${id}-a">${S.box(49, 36, 0, 4, 4, 4, TONES[3])}</g><g class="${id}-b">${S.box(36, 49, 0, 4, 4, 4, TONES[3])}</g>`;
    const travel = (n, v, delay) => `.${id}-${n}{animation:${id}-${n} 1.8s ${EASE} ${delay}s infinite backwards}@keyframes ${id}-${n}{0%{transform:none;opacity:0}15%,75%{opacity:1}100%{transform:${tr(v)};opacity:0}}`;
    const css = `.${id}-f{animation:${id}-f 1.6s linear infinite}@keyframes ${id}-f{to{stroke-dashoffset:-24}}` +
      travel("a", S.vec(13, 0), 0) + travel("b", S.vec(0, 13), 0.9) +
      `.${id}-p{animation:${id}-p 2.4s steps(1) infinite}@keyframes ${id}-p{50%{fill:${LIGHT}}}`;
    return { s, css };
  },

  // Better flows: the long way round stays as a trace; the straight way lifts, and a runner takes it.
  flows: (id) => {
    const S = scene(0, 82, 0, 82, 0, 26, 150, 150, 6);
    const tc = mix(TONES[2], LIGHT, 0.4);
    let s = bg(TONES[2], 150, 150);
    for (let sum = 0; sum <= 8; sum++)
      for (let i = 0; i <= 4; i++) {
        const j = sum - i;
        if (j < 0 || j > 4) continue;
        const d = `animation-delay:${(i * 0.22).toFixed(2)}s`;
        s += sum === 4 && i > 0 && i < 4
          ? `<g class="${id}-t" style="${d}">${S.box(i * 17, j * 17, 0, 14, 14, 3, tc, { topExtra: `class="${id}-c" style="${d}"` })}</g>`
          : S.box(i * 17, j * 17, 0, 14, 14, 3, tc);
      }
    s += `<path d="${S.line([[7, 75, 3], [7, 7, 3], [75, 7, 3]])}" fill="none" stroke="${shade(TONES[2], 0.4)}" stroke-width="2" stroke-dasharray="3 4" stroke-linejoin="round"/>`;
    s += S.box(2, 70, 3, 10, 10, 16, INK) + S.box(70, 2, 3, 10, 10, 16, INK, { top: TONES[3] });
    s += `<g class="${id}-r">${S.box(4, 72, 19, 6, 6, 6, LIGHT)}</g>`;
    const v = tr(S.vec(68, -68));
    const css = `.${id}-t{animation:${id}-t 5s ${EASE} infinite backwards}@keyframes ${id}-t{0%,8%{transform:none}18%,82%{transform:${ty(-S.px(5))}}92%,100%{transform:none}}` +
      `.${id}-c{animation:${id}-c 5s ${EASE} infinite backwards}@keyframes ${id}-c{0%,8%{fill:${tc}}18%,82%{fill:${TONES[3]}}92%,100%{fill:${tc}}}` +
      `.${id}-r{animation:${id}-r 5s ${EASE} infinite}@keyframes ${id}-r{0%,22%{transform:none;opacity:0}28%{transform:none;opacity:1}62%{transform:${v};opacity:1}70%,100%{transform:${v};opacity:0}}`;
    return { s, css };
  },

  // Taste: an interface taken apart into its layers, the way a designer sees it, then put back.
  taste: (id) => {
    const S = scene(0, 70, 0, 56, 0, 44, 150, 150, 6);
    let s = bg(TONES[0], 150, 150), css = "";
    s += `<path d="${S.line([[0, 56, 4], [0, 56, 42]])}${S.line([[70, 0, 4], [70, 0, 42]])}" stroke="${INK}" stroke-width="1.2" stroke-dasharray="2 3" fill="none"/>`;
    s += S.box(0, 0, 0, 70, 56, 4, LIGHT);
    const parts = [
      [4, 4, 16, 62, 10, 3, INK],
      [38, 20, 22, 26, 4, 2, "#d8d1c6"], [38, 27, 22, 20, 4, 2, "#d8d1c6"], [38, 34, 22, 24, 4, 2, "#d8d1c6"],
      [6, 20, 28, 26, 30, 3, TONES[1]],
      [38, 42, 36, 20, 9, 4, TONES[3]],
    ];
    parts.forEach(([x, y, z, w, d, h, c], i) => {
      s += `<g class="${id}-${i}">${S.box(x, y, z, w, d, h, c)}</g>`;
      css += loop(`${id}-${i}`, 5, ty(S.px(z - 4)), "none", { delay: -2.5, hold: [14, 38, 82] });
    });
    return { s, css };
  },
};

const posters = [
  { key: "teardown", title: "Reverse engineering" },
  { key: "systems", title: "System design" },
  { key: "flows", title: "Better flows" },
  { key: "taste", title: "Taste", meta: "interfaces" },
];

function hero(t) {
  glyphReset();
  const p = palettes[t];
  let s = `<rect width="${W}" height="${HH}" fill="${p.paper2}"/><rect width="${SPLIT}" height="${HH}" fill="${p.paper}"/>`;

  // Wordmark: the name as a small solid block, its sides in a tone.
  const wm = text(F.black, "Hamid", 36, 62, 27, -0.045);
  for (let j = 5; j >= 1; j--) s += `<path fill="${TONES[1]}" transform="translate(${+(j * IA).toFixed(1)} ${+(-j * IB).toFixed(1)})" d="${wm}"/>`;
  s += `<path fill="${p.ink}" d="${wm}"/>`;

  // Headline: the three things I do, each key word on a mark.
  const lines = [
    [["Take"], ["it"], ["apart", 0], [",", false, true]],
    [["see"], ["how"], ["it"], ["flows", 1], [",", false, true]],
    [["make"], ["it"], ["better", 2], [".", false, true]],
  ];
  const plain = lines.map((l) => l.map(([w, , g]) => (g ? w : ` ${w}`)).join("").trim());
  const fit = Math.max(...plain.map((l) => width(F.black, l, 100, -0.055))) / 100;
  const size = Math.min(78, 488 / fit), lead = size * 1.06;
  let marks = "", words = "", tt = 0.15;
  lines.forEach((parts, i) => {
    const h = headline(parts, 34, 164 + size * 0.2 + i * lead, size, { ink: p.ink, delay: tt });
    marks += h.marks; words += h.words; tt = h.t;
  });
  s += marks + words;

  // Slogan and the ink button, bottom left.
  const slogan = ["Designer and system thinker. I learn how anything", "works, then rebuild it simpler and faster.", "The code is written with Claude Code, my coding agent."];
  s += `<g class="rise" style="animation-delay:.85s">`;
  slogan.forEach((l, i) => (s += `${tu(p.ink, F.regular, l, 36, 398 + i * 21, 16.5, -0.01)}`));
  s += `</g>`;
  const label = "Shipping every day", lw = width(F.semibold, label, 15.5, -0.01);
  const bw = 18 + lw + 14 + 32 + 5;
  s += `<g class="rise" style="animation-delay:1s"><rect x="36" y="458" width="${bw.toFixed(1)}" height="42" rx="7" fill="${p.btn}"/>`;
  s += `${tu(p.onBtn, F.semibold, label, 54, 484.5, 15.5, -0.01)}`;
  s += `<rect x="${(36 + bw - 37).toFixed(1)}" y="463" width="32" height="32" rx="5" fill="${TONES[3]}"/>${mark(36 + bw - 37 + 8.5, 471.5, 15, INK)}</g>`;

  // Poster cards on the right half, staggered like Broadside's cover grid.
  const CW = 170, CH = 196, xs = [601, 789], ys = [[44, 258], [92, 306]];
  const order = [[0, 0], [1, 0], [0, 1], [1, 1]];
  let clips = "", css = "";
  posters.forEach((po, i) => {
    const [c, r] = order[i];
    const x = xs[c], y = ys[c][r];
    const enter = 0.3 + i * 0.09, develop = 1.15 + i * 0.16;
    const art = posterArt[po.key](`h${i}`);
    css += art.css;
    clips += `<clipPath id="art${i}"><rect x="${x + 10}" y="${y + 10}" width="150" height="150" rx="3"/></clipPath>`;
    clips += `<clipPath id="sk${i}"><rect x="${x + 10}" y="${y + 10}" width="150" height="150" rx="3"/><rect x="${x + 10}" y="${y + 172}" width="96" height="9" rx="2.5"/></clipPath>`;
    s += `<g class="rise" style="animation-delay:${enter.toFixed(2)}s">`;
    s += `<rect x="${x}" y="${y}" width="${CW}" height="${CH}" fill="${p.card}"/>`;
    s += `<g class="skel" style="animation-delay:${develop.toFixed(2)}s"><g clip-path="url(#sk${i})"><rect x="${x}" y="${y}" width="${CW}" height="${CH}" fill="${p.skel}"/>`;
    s += `<rect class="shine" x="${x - 60}" y="${y}" width="60" height="${CH}" fill="url(#shine)"/></g></g>`;
    s += `<g class="rise" style="animation-delay:${(develop + 0.08).toFixed(2)}s"><g clip-path="url(#art${i})"><g transform="translate(${x + 10} ${y + 10})">${art.s}</g></g></g>`;
    s += `<g class="rise" style="animation-delay:${(develop + 0.2).toFixed(2)}s">`;
    s += `${tu(p.cardInk, F.medium, po.title, x + 10, y + 181, 11.5, -0.01)}`;
    if (po.meta) s += `${tu(p.faint, F.regular, po.meta, x + 160 - width(F.regular, po.meta, 11.5), y + 181, 11.5)}`;
    s += `</g></g>`;
  });

  return svg(HH, "Hamid. Take it apart, see how it flows, make it better.", css, shineDef(p) + clips, s);
}

// ---------------------------------------------------------------- how
// Broadside's "How it works": a heading with its lede, three numbered cards, then the sliding band.
// Each card has its own small scene, 160 x 116, drawn on the card's paper.
const AWH = 160, AHH = 116;
const howArt = [
  // 01 Take it apart: the lid lifts and the parts inside come up out of the box.
  (id, p) => {
    const S = scene(0, 50, 0, 50, 0, 62, AWH, AHH, 4);
    let s = `<path d="${S.line([[0, 50, 22], [0, 50, 56]])}${S.line([[50, 0, 22], [50, 0, 56]])}${S.line([[50, 50, 22], [50, 50, 56]])}" stroke="${p.faint}" stroke-width="1.2" stroke-dasharray="2 3" fill="none"/>`;
    s += S.box(0, 0, 0, 50, 50, 22, TONES[0]);
    s += `<g class="${id}-m">${S.box(6, 6, 28, 14, 14, 14, TONES[1])}${S.box(28, 6, 30, 16, 14, 10, TONES[2])}${S.box(6, 28, 26, 16, 16, 8, TONES[3])}${S.box(30, 30, 28, 12, 12, 16, LIGHT)}</g>`;
    s += `<g class="${id}-l">${S.box(0, 0, 56, 50, 50, 6, TONES[0])}</g>`;
    const css = loop(`${id}-l`, 5.5, ty(S.px(34)), "none", { delay: -1 }) +
      `.${id}-m{animation:${id}-m 5.5s ${EASE} -1s infinite}@keyframes ${id}-m{0%,14%{transform:${ty(S.px(16))};opacity:0}40%,78%{transform:none;opacity:1}96%,100%{transform:${ty(S.px(16))};opacity:0}}`;
    return { s, css };
  },
  // 02 Draw the system: four parts, the lines between them, and data moving along every line.
  (id, p) => {
    const S = scene(0, 66, 0, 66, 0, 30, AWH, AHH, 6);
    let s = "", css = "";
    const links = [[[22, 11, 0], [44, 11, 0]], [[11, 22, 0], [11, 44, 0]], [[55, 22, 0], [55, 44, 0]], [[22, 55, 0], [44, 55, 0]]];
    links.forEach((l) => (s += `<path d="${S.line(l)}" fill="none" stroke="${p.ink}" stroke-width="2"/>`));
    s += S.box(0, 0, 0, 22, 22, 12, LIGHT) + S.top(4, 5, 12, 12, 3, INK);
    s += S.box(44, 0, 0, 22, 22, 22, TONES[1]) + S.top(48, 5, 22, 12, 3, INK);
    s += S.box(0, 44, 0, 22, 22, 16, TONES[2]) + S.top(4, 49, 16, 12, 3, INK);
    s += S.box(44, 44, 0, 22, 22, 30, TONES[0]) + S.top(49, 49, 30, 12, 12, INK);
    const packets = [[23, 9, 16, 0], [9, 23, 0, 16], [53, 23, 0, 16], [23, 53, 16, 0]];
    packets.forEach(([x, y, dx, dy], i) => {
      s += `<g class="${id}-${i}">${S.box(x, y, 0, 4, 4, 4, TONES[3])}</g>`;
      css += `.${id}-${i}{animation:${id}-${i} 1.8s ${EASE} ${(i * 0.45).toFixed(2)}s infinite backwards}@keyframes ${id}-${i}{0%{transform:none;opacity:0}15%,75%{opacity:1}100%{transform:${tr(S.vec(dx, dy))};opacity:0}}`;
    });
    return { s, css };
  },
  // 03 Make it better: scattered parts fly into a neat block inside their plan, hold, scatter again.
  (id, p) => {
    const S = scene(-16, 72, -16, 56, 0, 44, AWH, AHH, 4);
    let s = `<path d="${S.line([[-3, -3, 0], [59, -3, 0], [59, 39, 0], [-3, 39, 0]])}Z" fill="none" stroke="${p.faint}" stroke-width="1.2" stroke-dasharray="3 3"/>`, css = "";
    const cubes = [[0, 0, 0, [-14, -10, 20]], [1, 0, 1, [2, -16, 6]], [0, 1, 2, [-16, 6, 10]], [2, 0, 3, [16, -6, 28]], [1, 1, 1, [0, 16, 24]], [2, 1, 0, [16, 12, 4]]];
    cubes.forEach(([i, j, tone, away], n) => {
      s += `<g class="${id}-${n}">${S.box(i * 20, j * 20, 0, 16, 16, 16, TONES[tone])}</g>`;
      css += loop(`${id}-${n}`, 6, tr(S.vec(...away)), "none", { delay: n * 0.05, hold: [10, 40, 84] });
    });
    return { s, css };
  },
];

const steps = [
  ["Take it apart", "Any app, site or API. I trace its screens, requests and data until I know how it really works, edge cases included."],
  ["Draw the system", "I map every part and how the parts talk: where it waits, where it breaks, where the same work is done twice."],
  ["Make it better", "Then I redesign it: fewer steps, faster answers, a cleaner look. Claude Code writes the code and we put it live."],
];

// What I am good at, for the band. Each word is followed by a tone square with its icon
// (drawn on a 24 grid, stroked in ink).
const band = [
  ["system design", `<path d="M6.5 6.5L17.5 6.5M6.5 6.5L12 17.5M17.5 6.5L12 17.5"/><circle cx="6.5" cy="6.5" r="3" fill="${INK}"/><circle cx="17.5" cy="6.5" r="3" fill="${INK}"/><circle cx="12" cy="17.5" r="3" fill="${INK}"/>`],
  ["reverse engineering", `<circle cx="10.5" cy="10.5" r="6"/><path d="M15 15L20 20"/>`],
  ["flows", `<path d="M3 17H7C11 17 12 7 16 7H21M17.5 3.5L21 7L17.5 10.5"/>`],
  ["interfaces", `<rect x="3" y="4.5" width="18" height="15" rx="3"/><path d="M3 9.5H21"/>`],
  ["performance", `<path d="M4.5 17A8 8 0 1 1 19.5 17M12 14.5L16 9.5"/><circle cx="12" cy="14.5" r="1.8" fill="${INK}"/>`],
  ["self-hosting", `<rect x="3.5" y="4" width="17" height="7" rx="2"/><rect x="3.5" y="13" width="17" height="7" rx="2"/><circle cx="7.5" cy="7.5" r="1.3" fill="${INK}"/><circle cx="7.5" cy="16.5" r="1.3" fill="${INK}"/>`],
];

function how(t) {
  glyphReset();
  const p = palettes[t];
  let s = "", defs = "", css = "";

  // Heading on the left, lede on the right; both end on the same baseline.
  const base = 96;
  const h = headline([["How"], ["I"], ["work", 1]], M, base, 58, { ink: p.ink, track: -0.05 });
  s += h.marks + h.words;
  const lede = balance(F.regular, "Give me an idea, or a product that already exists. I find out how it works, then we build it better.", 17, 360, -0.01);
  s += `<g class="rise" style="animation-delay:.4s">`;
  lede.forEach((l, i) => (s += `${tu(p.soft, F.regular, l, W - M - 360, base - (lede.length - 1 - i) * 23, 17, -0.01)}`));
  s += `</g>`;

  // Cards: the number top left, the scene top right, then the title and the text.
  const top = 134, gap = 14, cw = (W - M * 2 - gap * 2) / 3, pad = 24;
  const bodies = steps.map(([, b]) => wrap(F.regular, b, 15.5, cw - pad * 2, -0.005));
  const tb = 14 + AHH + 30;
  const ch = tb + 28 + (Math.max(...bodies.map((b) => b.length)) - 1) * 21.5 + pad + 6;
  steps.forEach(([title], i) => {
    const x = M + i * (cw + gap), y = top;
    const art = howArt[i](`w${i}`, p);
    css += art.css;
    defs += `<clipPath id="card${i}"><rect x="${x}" y="${y}" width="${cw.toFixed(1)}" height="${ch}" rx="8"/></clipPath>`;
    s += `<g class="rise" style="animation-delay:${(0.35 + i * 0.12).toFixed(2)}s">`;
    s += `<rect x="${x}" y="${y}" width="${cw.toFixed(1)}" height="${ch}" rx="8" fill="${p.paper2}"/>`;
    // Broadside's hover: a darker paper panel wipes up over the card and back down. Here it tours
    // the three cards in turn, as if a pointer moved across them.
    s += `<g clip-path="url(#card${i})"><rect class="wipe" x="${x}" y="${y + ch}" width="${cw.toFixed(1)}" height="${ch}" fill="${p.paper4}" style="animation-delay:${(2.4 + i * 3).toFixed(1)}s"/></g>`;
    s += `<path fill="${p.faint}" d="${text(F.black, String(i + 1).padStart(2, "0"), x + pad, y + pad + 36, 48, -0.05)}"/>`;
    s += `<g transform="translate(${(x + cw - AWH - 14).toFixed(1)} ${y + 14})">${art.s}</g>`;
    s += `<path fill="${p.ink}" d="${text(F.black, title, x + pad, y + tb, 27, -0.045)}"/>`;
    bodies[i].forEach((l, k) => (s += `${tu(p.soft, F.regular, l, x + pad, y + tb + 28 + k * 21.5, 15.5, -0.005)}`));
    s += `</g>`;
  });

  // The band: what I am good at, as one big sliding line. Three copies of the same group, the
  // first one off to the left; the track slides by exactly one copy, so the loop has no seam and
  // the left edge is never bare.
  const size = 72, by = top + ch + 46 + size * 0.74;
  let x = 0, items = "";
  band.forEach(([word, icon], i) => {
    const { d, w } = shape(F.black, word, x, 0, size, -0.05);
    items += `<path fill="${p.ink}" d="${d}"/>`;
    x += w + 0.14 * size;
    const pw = 0.95 * size, ph = 0.68 * size, py = -0.36 * size - ph / 2;
    items += `<rect x="${x.toFixed(1)}" y="${py.toFixed(1)}" width="${pw.toFixed(1)}" height="${ph.toFixed(1)}" rx="${(0.14 * size).toFixed(1)}" fill="${TONES[i % 4]}"/>`;
    const is = 0.42 * size;
    items += `<g transform="translate(${(x + (pw - is) / 2).toFixed(1)} ${(py + (ph - is) / 2).toFixed(1)}) scale(${(is / 24).toFixed(3)})" fill="none" stroke="${INK}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${icon}</g>`;
    x += pw + 0.06 * size + 0.4 * size;
    items += `<circle cx="${(x + 0.06 * size).toFixed(1)}" cy="${(-0.36 * size).toFixed(1)}" r="${(0.06 * size).toFixed(1)}" fill="${p.ink}"/>`;
    x += 0.12 * size + 0.4 * size;
  });
  const gw = x;
  defs += `<g id="band">${items}</g>`;
  const copies = [0, 1, 2].map((k) => `<use href="#band" xlink:href="#band" x="${(k * gw).toFixed(1)}"/>`).join("");
  s += `<g class="rise" style="animation-delay:.9s"><g transform="translate(${(M - gw).toFixed(1)} ${by.toFixed(1)})"><g class="track">${copies}</g></g></g>`;
  const H = Math.round(by + size * 0.3 + 40);

  css += `
.wipe{animation:wipe 9s ${EASE} infinite}
@keyframes wipe{0%{transform:none}7%,24%{transform:translateY(-${ch}px)}31%,100%{transform:none}}
.track{animation:track 40s linear infinite}
@keyframes track{to{transform:translateX(-${gw.toFixed(1)}px)}}`;

  return svg(H, `How I work. 1, take it apart. 2, draw the system. 3, make it better. Good at ${band.map(([w]) => w).join(", ")}.`, css, defs, `<rect width="${W}" height="${H}" fill="${p.paper}"/>` + s);
}

// ---------------------------------------------------------------- built
// One cover card per kind of system, each with a scene 200 x 120 on one of the tones.
const AW = 200, AH = 120;
const builtArt = {
  // A crypto exchange: candles that grow out of the board and sink back.
  exchange: (id, bgc) => {
    const S = scene(0, 112, 0, 34, 0, 50, AW, AH, 10);
    let s = bg(bgc, AW, AH) + S.box(0, 0, 0, 112, 34, 4, mix(bgc, LIGHT, 0.4));
    const hs = [16, 24, 18, 30, 26, 38, 48], up = [1, 1, 0, 1, 0, 1, 1];
    hs.forEach((h, i) => (s += S.grow(`${id}-c${i}`, [5 + i * 15, 12, 4, 10, 10, h], up[i] ? LIGHT : INK, `${id}-g`, `animation-delay:${(i * 0.12).toFixed(2)}s`)));
    return { s, css: loop(`${id}-g`, 6, ty(S.px(60)), "none", { hold: [0, 18, 84] }) };
  },
  // A crypto wallet: a vault, and coins dropping onto its stacks.
  wallet: (id, bgc) => {
    const S = scene(0, 92, 0, 44, 0, 48, AW, AH, 10);
    let s = bg(bgc, AW, AH) + S.box(0, 0, 0, 42, 40, 42, INK);
    s += S.front(5, 40, 5, 32, 32, "#3c3632") + S.front(14, 40, 18, 14, 6, TONES[3]);
    const stack = (cx, cy, n, delay) => {
      let t = "";
      for (let i = 0; i < n; i++) {
        const coin = S.cyl(cx, cy, i * 4, 8, 3, TONES[0]);
        t += i === n - 1 ? `<g class="${id}-d" style="animation-delay:${delay}s">${coin}</g>` : coin;
      }
      return t;
    };
    s += stack(60, 14, 4, 0) + stack(76, 32, 6, 1.6);
    const css = `.${id}-d{animation:${id}-d 3.2s ${EASE} infinite backwards}@keyframes ${id}-d{0%{transform:${ty(-S.px(30))};opacity:0}25%{opacity:1}45%,85%{transform:none;opacity:1}100%{transform:none;opacity:0}}`;
    return { s, css };
  },
  // Trading systems: a price line drawn on the wall, two bots trading against each other below.
  trading: (id, bgc) => {
    const S = scene(0, 100, 0, 44, 0, 46, AW, AH, 8);
    let s = bg(bgc, AW, AH) + S.box(0, 0, 0, 100, 4, 46, LIGHT);
    for (const z of [12, 24, 36]) s += `<path d="${S.line([[4, 4, z], [96, 4, z]])}" stroke="#e7e2da" stroke-width="1" fill="none"/>`;
    const zs = [12, 18, 15, 25, 21, 31, 27, 38];
    s += `<path class="${id}-l" d="${S.line(zs.map((z, i) => [8 + i * 12, 4, z]))}" fill="none" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round" pathLength="100" style="stroke-dasharray:100;stroke-dashoffset:100"/>`;
    s += S.box(0, 4, 0, 100, 40, 3, mix(bgc, LIGHT, 0.45));
    s += `<g class="${id}-a">${S.box(10, 12, 3, 10, 10, 10, INK, { top: TONES[3] })}</g><g class="${id}-b">${S.box(78, 28, 3, 10, 10, 10, LIGHT)}</g>`;
    const css = `.${id}-l{animation:${id}-l 6s ${EASE} infinite}@keyframes ${id}-l{0%{stroke-dashoffset:100}40%,85%{stroke-dashoffset:0}100%{stroke-dashoffset:100}}` +
      loop(`${id}-a`, 4, "none", tr(S.vec(68, 0)), { hold: [10, 45, 55] }) + loop(`${id}-b`, 4, "none", tr(S.vec(-68, 0)), { hold: [10, 45, 55] });
    return { s, css };
  },
  // AI apps: a voice on one bubble, an answer being written on the other.
  ai: (id, bgc) => {
    const S = scene(0, 86, 0, 66, 0, 40, AW, AH, 8);
    let a = S.box(6, 26, 14, 8, 6, 10, LIGHT) + S.box(0, 0, 24, 56, 30, 6, LIGHT), css = "";
    [5, 9, 13, 7, 11, 15, 8, 4].forEach((h, i) => (a += S.grow(`${id}-w${i}`, [8 + i * 5.5, 13, 30, 3, 3, h], INK, `${id}-w`, `animation-delay:${(-i * 0.17).toFixed(2)}s`)));
    let b = S.box(30, 36, 6, 56, 30, 6, INK);
    for (const [x, y] of [[36, 42], [42, 42], [36, 48], [42, 48]]) b += S.top(x, y, 12, 4.5, 4.5, TONES[3]);
    [24, 18, 22].forEach((w, i) => (b += S.top(54, 42 + i * 6, 12, w, 3, "#8a8079", `class="${id}-t" style="animation-delay:${(i * 0.4).toFixed(1)}s"`)));
    const s = bg(bgc, AW, AH) + `<g class="${id}-a">${a}</g><g class="${id}-b">${b}</g>`;
    css += `.${id}-w{animation:${id}-w .9s ease-in-out infinite alternate}@keyframes ${id}-w{from{transform:${ty(S.px(8))}}to{transform:none}}`;
    css += `.${id}-a,.${id}-b{animation:${id}-bob 2.4s ease-in-out infinite alternate}.${id}-b{animation-delay:-1.2s}@keyframes ${id}-bob{to{transform:${ty(-S.px(4))}}}`;
    css += `.${id}-t{animation:${id}-t 4s ${EASE} infinite backwards}@keyframes ${id}-t{0%,10%{opacity:0}25%,85%{opacity:1}95%,100%{opacity:0}}`;
    return { s, css };
  },
  // A study app: a lesson card lifting off the stack of books and being ticked off.
  study: (id, bgc) => {
    const S = scene(0, 60, 0, 44, 0, 50, AW, AH, 10);
    let s = bg(bgc, AW, AH);
    s += S.box(0, 0, 0, 60, 44, 8, TONES[1]) + S.box(3, 2, 8, 55, 40, 7, LIGHT, { left: "#e7e2da", right: "#d8d1c6" }) + S.box(0, 0, 15, 60, 44, 8, TONES[2]);
    s += `<g class="${id}-c">${S.box(8, 6, 36, 44, 32, 3, LIGHT)}<path class="${id}-k" d="${S.line([[17, 20, 39], [25, 29, 39], [42, 12, 39]])}" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" pathLength="100" style="stroke-dasharray:100;stroke-dashoffset:100"/></g>`;
    const css = `.${id}-c{animation:${id}-c 2.6s ease-in-out infinite alternate}@keyframes ${id}-c{to{transform:${ty(-S.px(5))}}}` +
      `.${id}-k{animation:${id}-k 4s ${EASE} infinite}@keyframes ${id}-k{0%,15%{stroke-dashoffset:100}35%,85%{stroke-dashoffset:0}95%,100%{stroke-dashoffset:100}}`;
    return { s, css };
  },
  // News sites: pages leave the press and land on three channels.
  news: (id, bgc) => {
    const S = scene(0, 100, 0, 100, 0, 30, AW, AH, 8);
    let s = bg(bgc, AW, AH), css = "";
    s += S.box(38, 38, 0, 24, 24, 26, INK) + S.top(44, 44, 26, 12, 12, TONES[3]);
    const dests = [[82, 38, TONES[0]], [38, 82, TONES[3]], [80, 80, TONES[2]]];
    for (const [x, y, c] of dests) s += S.box(x, y, 0, 18, 18, 4, LIGHT) + S.box(x + 3, y + 3, 4, 12, 12, 3, c) + S.box(x + 3, y + 3, 7, 12, 12, 3, c);
    dests.forEach(([x, y], i) => {
      const d = [x + 4 - 45, y + 5 - 46, 14 - 26];
      s += `<g class="${id}-${i}">${S.box(45, 46, 26, 10, 8, 2, LIGHT)}</g>`;
      const mid = tr(S.vec(d[0] / 2, d[1] / 2, d[2] / 2 + 14)), end = tr(S.vec(...d));
      css += `.${id}-${i}{animation:${id}-${i} 3.6s ${EASE} ${(-i * 1.2).toFixed(1)}s infinite}@keyframes ${id}-${i}{0%{transform:none;opacity:0}8%{transform:none;opacity:1}45%{transform:${mid}}75%{transform:${end};opacity:1}88%,100%{transform:${end};opacity:0}}`;
    });
    return { s, css };
  },
  // A gaming platform: the podium, the winner bouncing on top.
  gaming: (id, bgc) => {
    const S = scene(0, 72, 0, 24, 0, 54, AW, AH, 10);
    const dots = (x, z, n) => Array.from({ length: n }, (_, i) => S.front(x + 12 - ((n - 1) * 5 + 3) / 2 + i * 5, 24, z - 9, 3, 3, INK)).join("");
    let s = bg(bgc, AW, AH);
    s += S.box(0, 0, 0, 24, 24, 20, LIGHT) + dots(0, 20, 2) + S.box(8, 8, 20, 8, 8, 8, TONES[1]);
    s += S.box(24, 0, 0, 24, 24, 32, TONES[3]) + dots(24, 32, 1) + `<g class="${id}-w">${S.box(32, 8, 32, 8, 8, 8, INK, { top: TONES[3] })}</g>`;
    s += S.box(48, 0, 0, 24, 24, 12, LIGHT) + dots(48, 12, 3) + S.box(56, 8, 12, 8, 8, 8, TONES[2]);
    return { s, css: `.${id}-w{animation:${id}-w .6s cubic-bezier(.3,0,.5,1) infinite alternate}@keyframes ${id}-w{to{transform:${ty(-S.px(12))}}}` };
  },
  // Publishing: a QR code whose squares rise in a wave, next to the phone that opens it.
  publishing: (id, bgc) => {
    const S = scene(0, 92, 0, 56, 0, 12, AW, AH, 10);
    let s = bg(bgc, AW, AH) + S.box(0, 0, 0, 56, 56, 3, LIGHT), n = 0;
    const qr = ["1110101", "1010010", "1110111", "0001010", "1011101", "0100101", "1101011"];
    for (let sum = 0; sum <= 12; sum++)
      for (let i = 0; i < 7; i++) {
        const j = sum - i;
        if (j < 0 || j > 6 || qr[j][i] !== "1") continue;
        s += S.grow(`${id}-q${n++}`, [i * 8 + 1, j * 8 + 1, 3, 6, 6, 5], INK, `${id}-q`, `animation-delay:${(sum * 0.1).toFixed(1)}s`);
      }
    s += S.box(66, 6, 0, 24, 46, 4, INK) + S.top(68, 9, 4, 20, 40, LIGHT) + S.top(70, 12, 4, 16, 12, TONES[1]);
    s += S.top(70, 27, 4, 16, 3, "#d8d1c6") + S.top(70, 33, 4, 11, 3, "#d8d1c6") + S.top(70, 40, 4, 16, 7, TONES[3]);
    return { s, css: loop(`${id}-q`, 5, ty(S.px(12)), "none", { hold: [0, 15, 80] }) };
  },
  // Crawlers: a crawler hopping from page to page; every page it reads turns green.
  crawlers: (id, bgc) => {
    const S = scene(0, 74, 0, 74, 0, 24, AW, AH, 8);
    const route = [[0, 0], [1, 0], [2, 0], [2, 1], [1, 1], [0, 1], [0, 2], [1, 2], [2, 2]];
    let s = bg(bgc, AW, AH), css = "";
    s += `<path d="${S.line(route.map(([i, j]) => [i * 28 + 9, j * 28 + 9, 0]))}" fill="none" stroke="${INK}" stroke-width="1.6" stroke-dasharray="3 3"/>`;
    for (let sum = 0; sum <= 4; sum++)
      for (let i = 0; i <= 2; i++) {
        const j = sum - i;
        if (j < 0 || j > 2) continue;
        const k = route.findIndex(([a, b]) => a === i && b === j), at = 4 + k * 10;
        s += S.box(i * 28, j * 28, 0, 18, 18, 4, LIGHT, { topExtra: `class="${id}-t${k}"` });
        css += `.${id}-t${k}{animation:${id}-t${k} 9s ${EASE} infinite}@keyframes ${id}-t${k}{0%,${at}%{fill:${LIGHT}}${at + 3}%,94%{fill:${TONES[2]}}100%{fill:${LIGHT}}}`;
      }
    s += `<g class="${id}-c">${S.box(4, 4, 4, 10, 10, 10, INK, { top: TONES[3] })}</g>`;
    let frames = "";
    route.forEach(([i, j], k) => {
      frames += `${4 + k * 10}%{transform:${tr(S.vec(i * 28, j * 28))};opacity:1}`;
      if (k < route.length - 1) {
        const [ni, nj] = route[k + 1];
        frames += `${9 + k * 10}%{transform:${tr(S.vec((i + ni) * 14, (j + nj) * 14, 8))};opacity:1}`;
      }
    });
    const end = tr(S.vec(56, 56));
    css += `.${id}-c{animation:${id}-c 9s ${EASE} infinite}@keyframes ${id}-c{0%{transform:none;opacity:1}${frames}90%{transform:${end};opacity:1}94%{transform:${end};opacity:0}96%{transform:none;opacity:0}100%{transform:none;opacity:1}}`;
    return { s, css };
  },
  // Agents: a bot looking around while its messages pop up beside it.
  agents: (id, bgc) => {
    const S = scene(0, 84, 0, 52, 0, 46, AW, AH, 8);
    let s = bg(bgc, AW, AH) + S.box(0, 0, 0, 84, 52, 3, mix(bgc, LIGHT, 0.4)), css = "";
    s += S.box(8, 14, 3, 22, 22, 24, INK) + `<g class="${id}-e">${S.front(12, 36, 15, 5, 5, TONES[3])}${S.front(21, 36, 15, 5, 5, TONES[3])}</g>`;
    s += S.box(17, 23, 27, 3, 3, 8, INK) + S.box(16, 22, 35, 5, 5, 5, TONES[3]);
    [[44, 4, 30, 34, LIGHT, "#d8d1c6"], [50, 20, 20, 28, TONES[3], INK], [44, 36, 10, 34, LIGHT, "#d8d1c6"]].forEach(([x, y, z, w, c, barc], i) => {
      s += `<g class="${id}-m" style="animation-delay:${(i * 0.5).toFixed(1)}s">${S.box(x, y, z, w, 12, 4, c)}${S.top(x + 4, y + 3, z + 4, w * 0.6, 2.5, barc)}${S.top(x + 4, y + 7, z + 4, w * 0.4, 2.5, barc)}</g>`;
    });
    css += loop(`${id}-e`, 4, "none", tr(S.vec(3, 0)), { hold: [30, 40, 70] });
    css += `.${id}-m{animation:${id}-m 5s ${EASE} infinite backwards}@keyframes ${id}-m{0%,5%{opacity:0;transform:${ty(S.px(6))}}15%,80%{opacity:1;transform:none}90%,100%{opacity:0;transform:none}}`;
    return { s, css };
  },
  // Rebuilds: an app scanned on the left, its copy built layer by layer on the right.
  rebuilds: (id, bgc) => {
    const S = scene(-4, 96, -4, 40, 0, 46, AW, AH, 8);
    const layers = (x0) => [[x0, 0, 0, 36, 36, 10, LIGHT], [x0 + 5, 5, 10, 26, 26, 10, TONES[3]], [x0 + 10, 10, 20, 16, 16, 12, INK]];
    let s = bg(bgc, AW, AH);
    layers(0).forEach((b) => (s += S.box(...b)));
    s += `<path class="${id}-s" d="${S.line([[-3, -3, 0], [39, -3, 0], [39, 39, 0], [-3, 39, 0]])}Z" fill="none" stroke="${INK}" stroke-width="1.4" stroke-dasharray="3 3"/>`;
    s += `<path d="${S.line([[42, 18, 0], [56, 18, 0]])}" stroke="${INK}" stroke-width="1.6" stroke-dasharray="2 3" fill="none"/>`;
    layers(60).forEach((b, i) => (s += `<g class="${id}-d" style="animation-delay:${(i * 0.5).toFixed(1)}s">${S.box(...b)}</g>`));
    const css = `.${id}-s{animation:${id}-s 3s ${EASE} infinite}@keyframes ${id}-s{0%{transform:none;opacity:0}10%{opacity:1}80%{transform:${ty(-S.px(34))};opacity:1}90%,100%{transform:${ty(-S.px(34))};opacity:0}}` +
      `.${id}-d{animation:${id}-d 6s ${EASE} infinite backwards}@keyframes ${id}-d{0%,4%{transform:${ty(-S.px(30))};opacity:0}18%,84%{transform:none;opacity:1}96%,100%{transform:none;opacity:0}}`;
    return { s, css };
  },
  // Business websites: three pages stand up one after another.
  websites: (id, bgc) => {
    const S = scene(0, 96, 0, 6, 0, 46, AW, AH, 10);
    let s = bg(bgc, AW, AH);
    [TONES[1], TONES[2], TONES[3]].forEach((c, i) => {
      const x = i * 33, fy = 3;
      let g = S.box(x, 0, 0, 30, 3, 44, LIGHT);
      g += S.front(x + 3, fy, 36, 24, 4, INK) + S.front(x + 3, fy, 14, 11, 18, c);
      [0, 1, 2].forEach((k) => (g += S.front(x + 16, fy, 26 - k * 6, 11 - k * 2, 2.5, "#d8d1c6")));
      g += S.front(x + 3, fy, 5, 24, 5, "#e7e2da");
      s += `<g class="${id}-p" style="animation-delay:${(i * 0.4).toFixed(1)}s">${g}</g>`;
    });
    return { s, css: `.${id}-p{animation:${id}-p 6s ${EASE} infinite backwards}@keyframes ${id}-p{0%,5%{transform:${ty(S.px(16))};opacity:0}20%,82%{transform:none;opacity:1}94%,100%{transform:none;opacity:0}}` };
  },
  // Taad: the phone and the laptop record, the voice turns into notes and lands in the calendar.
  // Each part is moved back by its own x, so the parts line up across the screen.
  taad: (id, bgc, w) => {
    const parts = { phone: 0, laptop: 22, notes: 92, cal: 140 };
    const pts = [];
    for (const [x0, x1, y0, y1, z1, a] of [[0, 16, 30, 33, 34, 0], [22, 74, 6, 44, 35, 22], [92, 126, 10, 40, 11, 92], [140, 188, 4, 48, 8, 140]])
      for (const x of [x0, x1]) for (const y of [y0, y1]) for (const z of [0, z1]) pts.push([x, y - a, z]);
    const S0 = fitScene(pts, w, AH, 8);
    // Shifted helpers: every call names the part it belongs to.
    const at = (part) => {
      const a = parts[part];
      return {
        box: (x, y, z, ...r) => S0.box(x, y - a, z, ...r),
        top: (x, y, z, ...r) => S0.top(x, y - a, z, ...r),
        front: (x, y, z, ...r) => S0.front(x, y - a, z, ...r),
        grow: (cid, b, ...r) => S0.grow(cid, [b[0], b[1] - a, ...b.slice(2)], ...r),
        P: (x, y, z) => [x, y - a, z],
      };
    };
    const others = TONES.filter((c) => c !== bgc);
    let s = bg(bgc, w, AH), css = "";
    const ph = at("phone"), lp = at("laptop"), nt = at("notes"), cl = at("cal");
    s += ph.box(0, 30, 0, 16, 3, 34, INK) + ph.front(2, 33, 3, 12, 28, "#0d1117");
    [6, 10, 14, 9, 5].forEach((h, i) => (s += ph.front(3.5 + i * 2, 33, 17 - h / 2, 1.2, h, TONES[3], `class="${id}-v" style="animation-delay:${(-i * 0.15).toFixed(2)}s"`)));
    s += lp.box(22, 6, 0, 52, 38, 3, LIGHT) + lp.top(26, 13, 3, 44, 17, "#e7e2da") + lp.top(40, 33, 3, 16, 7, "#e7e2da");
    s += lp.box(22, 6, 3, 52, 3, 32, INK) + lp.front(25, 9, 6, 46, 26, "#0d1117") + lp.front(28, 9, 29, 3, 3, TONES[0], `class="blink"`);
    [5, 9, 14, 8, 12, 18, 10, 15, 7, 11, 6, 4].forEach((h, i) => (s += lp.front(29 + i * 3.4, 9, 19 - h / 2, 1.8, h, others[i % 3], `class="${id}-v" style="animation-delay:${(-i * 0.11).toFixed(2)}s"`)));
    for (const [a, b] of [[lp.P(76, 26, 0), nt.P(90, 26, 0)], [nt.P(128, 26, 0), cl.P(138, 26, 0)]]) s += `<path class="${id}-f" d="${S0.line([a, b])}" fill="none" stroke="${INK}" stroke-width="2" stroke-dasharray="3 6" stroke-linecap="round"/>`;
    s += nt.box(92, 10, 0, 34, 30, 3, LIGHT) + nt.box(92, 10, 4, 34, 30, 3, LIGHT) + nt.box(92, 10, 8, 34, 30, 3, LIGHT) + nt.top(96, 14, 11, 20, 3, INK);
    [0, 1, 2].forEach((i) => (s += nt.top(96, 20 + i * 6, 11, 3, 3, INK) + nt.top(101, 20 + i * 6, 11, [18, 14, 20][i], 3, "#d8d1c6", `class="${id}-t" style="animation-delay:${(i * 0.5).toFixed(1)}s"`)));
    s += cl.box(140, 4, 0, 48, 44, 3, LIGHT) + cl.top(140, 4, 3, 48, 7, INK);
    for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) s += cl.top(143 + c * 11, 14 + r * 11, 3, 9, 9, "#e7e2da");
    [[1, 0], [3, 1], [0, 2], [2, 2]].forEach(([c, r], n) => (s += cl.grow(`${id}-e${n}`, [144 + c * 11, 15 + r * 11, 3, 7, 7, 5], others[n % 3], `${id}-e`, `animation-delay:${(n * 0.4).toFixed(1)}s`)));
    css += `.${id}-v{animation:${id}-v .8s ease-in-out infinite alternate;transform-box:fill-box;transform-origin:center}@keyframes ${id}-v{from{transform:scaleY(.35)}to{transform:none}}`;
    css += `.${id}-f{animation:${id}-f 1.6s linear infinite}@keyframes ${id}-f{to{stroke-dashoffset:-18}}`;
    css += `.${id}-t{animation:${id}-t 5s ${EASE} infinite backwards}@keyframes ${id}-t{0%,10%{opacity:0}22%,85%{opacity:1}95%,100%{opacity:0}}`;
    css += loop(`${id}-e`, 5, ty(S0.px(14)), "none", { hold: [16, 30, 86] });
    return { s, css };
  },
  // Mobile apps: three phones, each with its own app, bobbing in turn.
  mobile: (id, bgc) => {
    const S = scene(0, 92, 0, 17, 0, 56, AW, AH, 8);
    let s = bg(bgc, AW, AH);
    const phone = (x, inner, i) => `<g class="${id}-p" style="animation-delay:${(-i * 0.7).toFixed(1)}s">${S.box(x, 14, 0, 26, 3, 52, INK)}${S.front(x + 2, 17, 3, 22, 46, LIGHT)}${S.front(x + 4, 17, 44, 18, 3, INK)}${inner}${S.front(x + 9, 17, 4.5, 8, 1.5, "#d8d1c6")}</g>`;
    let a = "";
    [8, 12, 9, 14, 11, 16].forEach((h, i) => (a += S.front(5 + i * 3, 17, 20, 2, h, i % 2 ? INK : TONES[2])));
    a += S.front(4, 17, 9, 18, 5, TONES[2]);
    let b = S.front(37, 17, 34, 18, 3, "#d8d1c6");
    [4, 8, 12, 7, 10, 5].forEach((h, i) => (b += S.front(38 + i * 3, 17, 22 - h / 2, 1.8, h, TONES[1])));
    b += S.front(42, 17, 7, 8, 7, TONES[0]);
    let c = S.front(68, 17, 26, 18, 14, TONES[0]) + [0, 1, 2].map((k) => S.front(68, 17, 20 - k * 5, [18, 14, 16][k], 2.5, "#d8d1c6")).join("");
    s += phone(0, a, 0) + phone(32, b, 1) + phone(64, c, 2);
    return { s, css: `.${id}-p{animation:${id}-p 2.1s ease-in-out infinite alternate}@keyframes ${id}-p{to{transform:${ty(-S.px(5))}}}` };
  },
  // An online academy: a lesson playing on the board, the AI teacher beside it, the class answering.
  academy: (id, bgc) => {
    const S = scene(0, 86, 0, 62, 0, 44, AW, AH, 8);
    let s = bg(bgc, AW, AH), css = "";
    s += S.box(8, 0, 0, 64, 3, 42, INK) + S.front(11, 3, 8, 58, 31, LIGHT);
    s += S.poly([[36, 3, 17], [36, 3, 31], [46, 3, 24]], TONES[3]) + S.front(14, 3, 11, 52, 2.5, "#d8d1c6") + S.front(14, 3, 11, 52, 2.5, TONES[2], `class="${id}-g"`);
    s += S.box(76, 6, 0, 9, 9, 16, INK, { top: TONES[3] });
    const tones = TONES.filter((c) => c !== bgc);
    let n = 0;
    for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) s += `<g class="${id}-h" style="animation-delay:${((n++ * 0.37) % 3).toFixed(2)}s">${S.box(12 + c * 16, 22 + r * 13, 0, 9, 9, 9, LIGHT, { top: tones[(r + c) % 3] })}</g>`;
    css += `.${id}-g{animation:${id}-g 6s linear infinite;transform-box:fill-box;transform-origin:0 50%}@keyframes ${id}-g{from{transform:scaleX(0)}to{transform:none}}`;
    css += `.${id}-h{animation:${id}-h 3s ${EASE} infinite backwards}@keyframes ${id}-h{0%,30%,100%{transform:none}12%{transform:${ty(-S.px(6))}}}`;
    return { s, css };
  },
  // A verification platform: an ID card scanned by a beam, then the check rises beside it.
  verification: (id, bgc) => {
    const S = scene(-4, 96, 0, 56, 0, 30, AW, AH, 8);
    let s = bg(bgc, AW, AH) + S.box(0, 6, 0, 64, 44, 3, LIGHT);
    s += S.top(5, 11, 3, 18, 22, TONES[1]) + S.top(28, 13, 3, 28, 3.5, INK) + S.top(28, 20, 3, 22, 3, "#d8d1c6") + S.top(28, 26, 3, 26, 3, "#d8d1c6") + S.top(5, 38, 3, 50, 3, "#d8d1c6");
    s += `<g class="${id}-s">${S.box(-3, 2, 3, 3, 52, 12, TONES[3])}</g>`;
    s += S.grow(`${id}-c`, [74, 18, 0, 20, 20, 20], INK, `${id}-b`, "", { top: TONES[2] });
    s += `<path class="${id}-k" d="${S.line([[78, 28, 20], [83, 33, 20], [91, 22, 20]])}" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" pathLength="100" style="stroke-dasharray:100;stroke-dashoffset:100"/>`;
    const css = `.${id}-s{animation:${id}-s 5s ${EASE} infinite}@keyframes ${id}-s{0%{transform:none;opacity:0}6%{opacity:1}42%{transform:${tr(S.vec(66, 0))};opacity:1}50%,100%{transform:${tr(S.vec(66, 0))};opacity:0}}` +
      `.${id}-b{animation:${id}-b 5s ${EASE} infinite}@keyframes ${id}-b{0%,44%{transform:${ty(S.px(40))}}58%,90%{transform:none}100%{transform:${ty(S.px(40))}}}` +
      `.${id}-k{animation:${id}-k 5s ${EASE} infinite}@keyframes ${id}-k{0%,58%{stroke-dashoffset:100}70%,88%{stroke-dashoffset:0}92%,100%{stroke-dashoffset:100;opacity:0}}`;
    return { s, css };
  },
  // An AI support desk: a ticket moves from new to open to solved, the AI watching over the board.
  support: (id, bgc) => {
    const S = scene(0, 100, 0, 60, 0, 30, AW, AH, 8);
    let s = bg(bgc, AW, AH);
    for (let c = 0; c < 3; c++) s += S.box(c * 34, 0, 0, 30, 60, 2, mix(bgc, LIGHT, 0.45));
    const ticket = (x, y, c, bar) => S.box(x, y, 2, 22, 12, 3, c) + S.top(x + 3, y + 3, 5, 12, 2.5, bar) + S.top(x + 3, y + 7, 5, 8, 2.5, bar);
    for (const [x, y] of [[4, 6], [4, 24], [38, 6], [38, 24], [72, 6], [72, 24]]) s += ticket(x, y, LIGHT, "#d8d1c6");
    s += `<g class="${id}-t">${ticket(4, 42, TONES[3], INK)}</g>`;
    let ai = S.box(56, 16, 18, 24, 16, 4, INK);
    for (const [x, y] of [[60, 20], [65, 20], [60, 25], [65, 25]]) ai += S.top(x, y, 22, 4, 4, TONES[3]);
    ai += S.top(71, 21, 22, 6, 2.5, "#8a8079") + S.top(71, 26, 22, 4, 2.5, "#8a8079");
    s += `<g class="${id}-a">${ai}</g>`;
    const v1 = tr(S.vec(34, 0)), v2 = tr(S.vec(68, 0));
    const css = `.${id}-t{animation:${id}-t 6s ${EASE} infinite}@keyframes ${id}-t{0%{transform:none;opacity:0}6%,18%{transform:none;opacity:1}32%,48%{transform:${v1};opacity:1}62%,86%{transform:${v2};opacity:1}96%,100%{transform:${v2};opacity:0}}` +
      `.${id}-a{animation:${id}-a 2.4s ease-in-out infinite alternate}@keyframes ${id}-a{to{transform:${ty(-S.px(4))}}}`;
    return { s, css };
  },
  // Interactive stories: a gift whose lid pops and lets small surprises float out.
  gift: (id, bgc) => {
    const S = scene(0, 60, 0, 60, 0, 66, AW, AH, 6);
    let s = bg(bgc, AW, AH) + S.box(10, 10, 0, 40, 40, 28, LIGHT);
    s += S.front(26, 50, 0, 8, 28, INK) + S.poly([[50, 26, 0], [50, 34, 0], [50, 34, 28], [50, 26, 28]], INK);
    const others = TONES.filter((c) => c !== bgc);
    [[16, 16, 0], [32, 22, 1], [22, 32, 2]].forEach(([x, y, t], i) => (s += `<g class="${id}-c" style="animation-delay:${(i * 0.18).toFixed(2)}s">${S.box(x, y, 30, 8, 8, 8, others[t])}</g>`));
    s += `<g class="${id}-l">${S.box(8, 8, 28, 44, 44, 7, LIGHT)}${S.top(26, 8, 35, 8, 44, INK)}${S.top(8, 26, 35, 44, 8, INK)}</g>`;
    const css = loop(`${id}-l`, 4.5, "none", ty(-S.px(22)), { hold: [10, 30, 78] }) +
      `.${id}-c{animation:${id}-c 4.5s ${EASE} infinite backwards}@keyframes ${id}-c{0%,22%{transform:none;opacity:0}30%{opacity:1}62%{transform:${ty(-S.px(26))};opacity:1}74%,100%{transform:${ty(-S.px(30))};opacity:0}}`;
    return { s, css };
  },
  // Animated icons: icon tiles that hop one after another.
  icons: (id, bgc) => {
    const S = scene(0, 90, 0, 58, 0, 18, AW, AH, 8);
    let s = bg(bgc, AW, AH), n = 0;
    for (let sum = 0; sum <= 3; sum++)
      for (let i = 0; i <= 2; i++) {
        const j = sum - i;
        if (j < 0 || j > 1) continue;
        const x = i * 32, y = j * 32;
        s += `<g class="${id}-h" style="animation-delay:${((i + j * 3) * 0.3).toFixed(1)}s">${S.box(x, y, 0, 26, 26, 5, LIGHT)}` +
          `<g transform="${S.floor(x + 3, y + 3, 5, 20 / 24)}" fill="none" stroke="${INK}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${band[n++ % band.length][1]}</g></g>`;
      }
    return { s, css: `.${id}-h{animation:${id}-h 3.6s ${EASE} infinite backwards}@keyframes ${id}-h{0%,22%,100%{transform:none}9%{transform:${ty(-S.px(9))}}}` };
  },
  // VoidBunny: a terminal on the phone, wired to your own server.
  voidbunny: (id) => {
    const S = scene(0, 92, 0, 70, 0, 46, AW, AH, 10);
    let s = bg("#0d1117", AW, AH);
    s += `<path class="${id}-f" d="${S.line([[34, 44, 0], [50, 44, 0], [50, 37, 0], [64, 37, 0]])}" fill="none" stroke="#a9c5a0" stroke-width="2" stroke-dasharray="3 6" stroke-linecap="round"/>`;
    s += S.box(0, 18, 0, 34, 52, 5, "#2c2a26") + S.top(3, 21, 5, 28, 46, "#0d1117");
    s += S.top(6, 26, 5, 14, 2.5, "#a9c5a0") + [31, 36, 41].map((y, i) => S.top(6, y, 5, [20, 16, 22][i], 2.5, "#45403a")).join("") + S.top(6, 47, 5, 3, 3, TONES[3], `class="blink"`);
    s += S.box(64, 24, 0, 26, 26, 44, LIGHT);
    [6, 18, 30].forEach((z, i) => (s += S.front(67, 50, z, 20, 8, "#d8d1c6") + S.front(82, 50, z + 2.5, 3, 3, "#39d353", `class="led" style="animation-delay:${(i * 0.4).toFixed(1)}s"`)));
    return { s, css: `.${id}-f{animation:${id}-f 1.6s linear infinite}@keyframes ${id}-f{to{stroke-dashoffset:-18}}` };
  },
  // Vibe Base: a database whose top disk lifts, next to its dashboard.
  vibebase: (id, bgc) => {
    const S = scene(0, 88, 0, 50, 0, 50, AW, AH, 8);
    let s = bg(bgc, AW, AH) + S.box(38, 0, 0, 50, 4, 46, INK) + S.front(43, 4, 38, 30, 2.5, "#5a524b");
    [14, 22, 18, 30, 26].forEach((h, i) => (s += S.front(44 + i * 8, 4, 6, 5, h, [TONES[1], TONES[2], TONES[0], TONES[1], TONES[2]][i], `class="${id}-b" style="animation-delay:${(-i * 0.3).toFixed(1)}s"`)));
    s += S.cyl(20, 34, 0, 14, 10, LIGHT) + S.cyl(20, 34, 12, 14, 10, LIGHT) + `<g class="${id}-l">${S.cyl(20, 34, 24, 14, 10, TONES[2])}</g>`;
    const css = loop(`${id}-l`, 4.5, "none", ty(-S.px(12)), { hold: [15, 40, 80] }) +
      `.${id}-b{animation:${id}-b 1.5s ease-in-out infinite alternate;transform-box:fill-box;transform-origin:50% 100%}@keyframes ${id}-b{from{transform:scaleY(.45)}to{transform:none}}`;
    return { s, css };
  },
  // Hosting: two racks of my own servers, lights on.
  hosting: (id, bgc) => {
    const S = scene(0, 74, 0, 28, 0, 60, AW, AH, 10);
    let s = bg(bgc, AW, AH);
    for (const x of [0, 44]) {
      s += S.box(x, 0, 0, 30, 28, 60, INK) + S.top(x + 4, 4, 60, 22, 2, "#3c3632") + S.top(x + 4, 9, 60, 22, 2, "#3c3632");
      for (let u = 0; u < 5; u++) {
        const z = 4 + u * 11;
        s += S.front(x + 3, 28, z, 24, 8, "#3c3632") + S.front(x + 17, 28, z + 2.5, 3, 3, TONES[0]);
        s += S.front(x + 22, 28, z + 2.5, 3, 3, "#39d353", `class="led" style="animation-delay:${((u * 0.37 + x * 0.01) % 2).toFixed(2)}s"`);
      }
    }
    return { s, css: "" };
  },
  // Your idea: a plan in dashed lines whose parts become solid one by one.
  idea: (id, bgc) => {
    const S = scene(0, 80, 0, 60, 0, 30, AW, AH, 12);
    const blocks = [[0, 0, 0, 80, 60, 6, LIGHT], [6, 6, 6, 30, 22, 18, TONES[1]], [44, 6, 6, 30, 22, 10, TONES[0]], [6, 34, 6, 68, 20, 8, TONES[2]]];
    let s = bg(bgc, AW, AH);
    blocks.forEach(([x, y, z, w, d, h, c], i) => {
      s += `<g class="${id}-r" style="animation-delay:${(i * 0.5).toFixed(1)}s">${S.box(x, y, z, w, d, h, c)}</g>`;
      s += `<path d="${S.wire(x, y, z, w, d, h)}" fill="none" stroke="${INK}" stroke-width="1.3" stroke-dasharray="4 3" stroke-linejoin="round"/>`;
    });
    return { s, css: `.${id}-r{animation:${id}-r 7s ${EASE} infinite backwards}@keyframes ${id}-r{0%,12%{opacity:0}20%,82%{opacity:1}92%,100%{opacity:0}}` };
  },
};

// Kinds of systems, not project names (Taad is named on purpose). Tones are set so no two
// neighbours share one and no scene sits on a tone it uses itself. `span: 2` takes two columns.
const built = [
  { key: "taad", tone: 1, span: 2, title: "Taad", meta: "web, desktop and phone", body: "Records your meetings and your day, then writes the notes, the to-dos and the calendar events. Built in 15 days." },
  { key: "exchange", tone: 2, title: "Crypto exchange", body: "Trading, from the screens to the systems behind them." },
  { key: "mobile", tone: 0, title: "Mobile apps", body: "The exchange's app, Taad on the phone, a news app for iOS." },
  { key: "wallet", tone: 3, title: "Crypto wallet", body: "Self-custody wallets and crypto payments." },
  { key: "trading", tone: 2, title: "Trading systems", body: "Live prices and broker audits for traders." },
  { key: "verification", tone: 0, title: "Verification platform", body: "Liveness, face and document checks for any business." },
  { key: "support", tone: 1, title: "AI support desk", body: "AI agents, live chat and tickets: a light CRM for websites." },
  { key: "ai", tone: 0, title: "AI avatars", body: "A human-like AI that runs interviews and sales calls." },
  { key: "study", tone: 3, title: "Study app", body: "Lessons and practice for students." },
  { key: "academy", tone: 2, title: "Online academy", body: "Courses with an AI teacher beside every lesson." },
  { key: "news", tone: 0, title: "News sites", body: "Game news in a dozen languages, published on its own." },
  { key: "gaming", tone: 1, title: "Gaming platform", body: "Tournaments, player stats and game servers." },
  { key: "publishing", tone: 2, title: "Publishing", body: "Brochures shared by link or QR code." },
  { key: "crawlers", tone: 3, title: "Crawlers", body: "Data from sites that never offered an API." },
  { key: "agents", tone: 1, title: "Agents and bots", body: "Bots that browse, post and reply on their own." },
  { key: "rebuilds", tone: 0, title: "Rebuilds", body: "Apps rebuilt from the outside, just by studying them." },
  { key: "websites", tone: 3, title: "Business websites", body: "Showcase sites and catalogs for companies." },
  { key: "gift", tone: 1, title: "Interactive stories", body: "Small experiences with music, gifts and surprises." },
  { key: "icons", tone: 2, title: "Animated icons", body: "An icon set where every icon has its own motion." },
  { key: "voidbunny", title: "VoidBunny", meta: "open source", body: "Your coding agents, on your phone." },
  { key: "vibebase", tone: 0, title: "Vibe Base", meta: "open source", body: "A database dashboard you host yourself." },
  { key: "hosting", tone: 2, title: "Hosting", body: "Servers hardened from a bare box, with safe deploys." },
  { key: "idea", tone: 3, title: "Your idea", body: "Bring it. I'll map the system, then we build it.", ink: true },
];

function builtPicture(t) {
  glyphReset();
  const p = palettes[t];
  let s = "", clips = "", css = "";

  const base = 96;
  const h = headline([["What"], ["I've"], ["built", 2]], M, base, 58, { ink: p.ink, track: -0.05 });
  s += h.marks + h.words;
  const lede = balance(F.regular, "Very different systems, one way of working. I designed every one of them; Claude Code and I built them together.", 17, 360, -0.01);
  s += `<g class="rise" style="animation-delay:.4s">`;
  lede.forEach((l, i) => (s += `${tu(p.soft, F.regular, l, W - M - 360, base - (lede.length - 1 - i) * 23, 17, -0.01)}`));
  s += `</g>`;

  const top = 134, gap = 16, cols = 4, colW = (W - M * 2 - gap * (cols - 1)) / cols, inset = 10;
  // Place the cards left to right; a wide card takes two columns.
  let col = 0, row = 0;
  const place = built.map((b) => {
    const span = b.span ?? 1;
    if (col + span > cols) { col = 0; row++; }
    const at = { r: row, c: col, span, cw: colW * span + gap * (span - 1) };
    col += span;
    return at;
  });
  const bodies = built.map((b, i) => wrap(F.regular, b.body, 13, place[i].cw - inset * 2, -0.005));
  const nrows = row + 1;
  const rows = Array.from({ length: nrows }, (_, r) => Math.max(...bodies.filter((_, i) => place[i].r === r).map((b) => b.length)));
  const cardH = (lines) => inset + AH + 26 + 22 + (lines - 1) * 18 + 14;
  const rowY = [top];
  for (let r = 1; r < nrows; r++) rowY.push(rowY[r - 1] + cardH(rows[r - 1]) + gap);
  built.forEach((b, i) => {
    const { r, c, cw } = place[i], aw = cw - inset * 2;
    const x = M + c * (colW + gap), y = rowY[r], ch = cardH(rows[r]);
    const bgc = b.ink ? p.btn : p.card, ink = b.ink ? p.onBtn : p.cardInk, soft = b.ink ? p.onBtnSoft : p.cardSoft;
    const enter = 0.3 + i * 0.05, develop = 1.0 + i * 0.08;
    const art = builtArt[b.key](`b${i}`, TONES[b.tone ?? 0], aw);
    css += art.css;
    clips += `<clipPath id="art${i}"><rect x="${x + inset}" y="${y + inset}" width="${aw}" height="${AH}" rx="4"/></clipPath>`;
    clips += `<clipPath id="sk${i}"><rect x="${x + inset}" y="${y + inset}" width="${aw}" height="${AH}" rx="4"/><rect x="${x + inset}" y="${y + inset + AH + 14}" width="96" height="11" rx="3"/><rect x="${x + inset}" y="${y + inset + AH + 34}" width="${aw - 20}" height="8" rx="3"/></clipPath>`;
    s += `<g class="rise" style="animation-delay:${enter.toFixed(2)}s">`;
    s += `<rect x="${x.toFixed(1)}" y="${y}" width="${cw.toFixed(1)}" height="${ch}" rx="8" fill="${bgc}"/>`;
    s += `<g class="skel" style="animation-delay:${develop.toFixed(2)}s"><g clip-path="url(#sk${i})"><rect x="${x}" y="${y}" width="${cw}" height="${ch}" fill="${b.ink ? p.btnSkel : p.skel}"/>`;
    s += `<rect class="shine" x="${x - 60}" y="${y}" width="60" height="${ch}" fill="url(#shine)"/></g></g>`;
    s += `<g class="rise" style="animation-delay:${(develop + 0.08).toFixed(2)}s"><g clip-path="url(#art${i})"><g transform="translate(${(x + inset).toFixed(1)} ${y + inset})">${art.s}</g></g></g>`;
    s += `<g class="rise" style="animation-delay:${(develop + 0.2).toFixed(2)}s">`;
    const ty0 = y + inset + AH + 26;
    s += `${tu(ink, F.semibold, b.title, x + inset + 1, ty0, 15.5, -0.015)}`;
    if (b.meta) s += `${tu(p.faint, F.regular, b.meta, x + cw - inset - 1 - width(F.regular, b.meta, 12), ty0, 12)}`;
    bodies[i].forEach((l, k) => (s += `${tu(soft, F.regular, l, x + inset + 1, ty0 + 22 + k * 18, 13, -0.005)}`));
    s += `</g></g>`;
  });
  const H = rowY[nrows - 1] + cardH(rows[nrows - 1]) + M;

  const label = `What I've built. ${built.map((b) => `${b.title}: ${b.body}`).join(" ")}`;
  return svg(H, label.replace(/"/g, ""), css, shineDef(p) + clips, `<rect width="${W}" height="${H}" fill="${p.paper2}"/>` + s);
}


// ---------------------------------------------------------------- fast
// "Built fast": only my own products, from their repositories' dates (GitHub, 2026-11-02).
// Client work stays confidential, so it never appears here. Three cards, like "How I work":
// the number as a small solid block, what it was, and a strip of days that light up in turn.
const runs = [
  { num: "15 days", title: "Taad", body: "Web, desktop and phone apps, from the first commit. 1,252 commits.", days: 15 },
  { num: "8 days", title: "VoidBunny", body: "The first working version, now open source. 131 commits.", days: 8 },
  { num: "8,960", title: "Contributions", body: "In the last year, most of them in private repositories.", grid: true },
];
const LIGHT_GREENS = ["#dcd6cc", "#9be9a8", "#40c463", "#30a14e", "#216e39"];
const DARK_GREENS = ["#33302c", "#0e4429", "#006d32", "#26a641", "#39d353"];

// The days as a grid of tiles, five to a row; each lights up in a tone, one after another.
function dayStrip(id, p, n, w, h) {
  const S = scene(0, 5 * 15 - 3, 0, 3 * 15 - 3, 0, 12, w, h, 4);
  const tiles = Array.from({ length: n }, (_, i) => [i % 5, Math.floor(i / 5), i]).sort((a, b) => a[0] + a[1] - (b[0] + b[1]));
  let s = "";
  for (const [c, r, i] of tiles) {
    const d = `animation-delay:${(i * 0.18).toFixed(2)}s`;
    s += `<g class="${id}-u" style="${d}">${S.box(c * 15, r * 15, 0, 12, 12, 4, p.paper3, { topExtra: `class="${id}-c${i % 4}" style="${d}"` })}</g>`;
  }
  let css = `.${id}-u{animation:${id}-u 6s ${EASE} infinite backwards}@keyframes ${id}-u{0%,4%{transform:none}10%,80%{transform:${ty(-S.px(5))}}90%,100%{transform:none}}`;
  for (let k = 0; k < 4; k++) css += `.${id}-c${k}{animation:${id}-c${k} 6s ${EASE} infinite backwards}@keyframes ${id}-c${k}{0%,4%{fill:${p.paper3}}10%,80%{fill:${TONES[k]}}90%,100%{fill:${p.paper3}}}`;
  return { s, css };
}

// A small contribution graph in 3D: green tiles whose height follows the level, a wave along the weeks.
function graphStrip(id, p, t, w, h) {
  const greens = t === "light" ? LIGHT_GREENS : DARK_GREENS, cols = 6, rows = 3;
  const S = scene(0, cols * 15 - 3, 0, rows * 15 - 3, 0, 14, w, h, 4);
  let s = "", seed = 7;
  const rand = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  for (let sum = 0; sum < cols + rows; sum++)
    for (let c = 0; c < cols; c++) {
      const r = sum - c;
      if (r < 0 || r >= rows) continue;
      const v = rand(), l = v < 0.1 ? 0 : v < 0.3 ? 1 : v < 0.6 ? 2 : v < 0.85 ? 3 : 4;
      s += `<g class="${id}-g" style="animation-delay:${(c * 0.12).toFixed(2)}s">${S.box(c * 15, r * 15, 0, 12, 12, 3 + l * 2.5, greens[l])}</g>`;
    }
  return { s, css: `.${id}-g{animation:${id}-g 4s ${EASE} infinite backwards}@keyframes ${id}-g{0%,8%,30%,100%{transform:none}18%{transform:${ty(-S.px(4))}}}` };
}

function fastPicture(t) {
  glyphReset();
  const p = palettes[t];
  let s = "", defs = "", css = "";
  const base = 96;
  const h = headline([["Built"], ["fast", 3]], M, base, 58, { ink: p.ink, track: -0.05 });
  s += h.marks + h.words;
  const lede = balance(F.regular, "Dates from my own repositories, first commit to a working product. Client work stays confidential.", 17, 360, -0.01);
  s += `<g class="rise" style="animation-delay:.4s">`;
  lede.forEach((l, i) => (s += tu(p.soft, F.regular, l, W - M - 360, base - (lede.length - 1 - i) * 23, 17, -0.01)));
  s += `</g>`;

  const top = 134, gap = 14, cw = (W - M * 2 - gap * 2) / 3, pad = 24, SW = cw - pad * 2, SH = 96;
  const bodies = runs.map((r) => wrap(F.regular, r.body, 15, SW, -0.005));
  const nb = 58, tb = nb + 38, bb = tb + 26;
  const ch = bb + (Math.max(...bodies.map((b) => b.length)) - 1) * 21 + 22 + SH + pad;
  runs.forEach((r, i) => {
    const x = M + i * (cw + gap), y = top, tone = TONES[(i + 1) % 4], side = t === "light" ? INK : mix(tone, INK, 0.62);
    s += `<g class="rise" style="animation-delay:${(0.35 + i * 0.12).toFixed(2)}s">`;
    s += `<rect x="${x.toFixed(1)}" y="${y}" width="${cw.toFixed(1)}" height="${ch}" rx="8" fill="${p.paper2}"/>`;
    defs += `<path id="num${i}" d="${text(F.black, r.num, x + pad, y + nb, 52, -0.02)}"/>`;
    for (let j = 5; j >= 1; j--) s += `<use href="#num${i}" x="${+(j * IA).toFixed(1)}" y="${+(-j * IB).toFixed(1)}" fill="${side}"/>`;
    s += `<use href="#num${i}" fill="${tone}"/>`;
    s += tu(p.ink, F.semibold, r.title, x + pad, y + tb, 18, -0.015);
    bodies[i].forEach((l, k) => (s += tu(p.soft, F.regular, l, x + pad, y + bb + k * 21, 15, -0.005)));
    const strip = r.grid ? graphStrip(`f${i}`, p, t, SW, SH) : dayStrip(`f${i}`, p, r.days, SW, SH);
    css += strip.css;
    s += `<g transform="translate(${(x + pad).toFixed(1)} ${y + ch - pad - SH})">${strip.s}</g>`;
    s += `</g>`;
  });
  const H = top + ch + M;
  const label = `Built fast, from my own repositories; client work stays confidential. ${runs.map((r) => `${r.title}: ${r.num}. ${r.body}`).join(" ")}`;
  return svg(H, label, css, defs, `<rect width="${W}" height="${H}" fill="${p.paper}"/>` + s);
}

// ---------------------------------------------------------------- outro
// Broadside's footer: the closing line, then the name as large as the width allows. Every few
// seconds a wave passes along the letters and each one takes a tone, then goes back to ink.
function outro(t) {
  glyphReset();
  const p = palettes[t];
  let s = "";
  const size = 44, b1 = 84, b2 = b1 + 52;
  const l1 = headline([["I"], ["design", 0], ["it."], ["Claude"], ["Code"], ["writes", 1], ["it."]], M, b1, size, { ink: p.ink, track: -0.05 });
  const l2 = headline([["We"], ["ship", 2], ["it"], ["together."]], M, b2, size, { ink: p.ink, track: -0.05, delay: l1.t });
  s += l1.marks + l2.marks + l1.words + l2.words;

  // The name: one path per letter, so each can change on its own. Laid out once at 100px to
  // measure its ink, then again at the size whose ink spans the width exactly.
  const name = "Hamid", track = -0.045, glyphs = F.black.stringToGlyphs(name);
  const layout = (size, x0, y0) => {
    const scale = size / F.black.unitsPerEm;
    let pen = x0;
    return glyphs.map((g, i) => {
      const q = g.getPath(pen, y0, size);
      pen += g.advanceWidth * scale + track * size;
      if (i < glyphs.length - 1) pen += F.black.getKerningValue(g, glyphs[i + 1]) * scale;
      return q;
    });
  };
  const ink = (paths) => paths.map((q) => q.getBoundingBox()).reduce((a, b) => ({ x1: Math.min(a.x1, b.x1), y1: Math.min(a.y1, b.y1), x2: Math.max(a.x2, b.x2), y2: Math.max(a.y2, b.y2) }));
  // Each letter is a solid block: its face in a tone, then copies of it stepped back along the
  // scenes' depth axis (right and up) for the sides. Every few seconds the letters hop in a wave.
  const D = 26, dx = IA, dy = -IB;
  const at100 = ink(layout(100, 0, 0));
  const ws = ((W - M * 2 - D * dx) / (at100.x2 - at100.x1)) * 100, k = ws / 100;
  const bb = { x1: at100.x1 * k, y1: at100.y1 * k, y2: at100.y2 * k };
  const base = Math.round(b2 + 56 - D * dy - bb.y1);
  let css = "", defs = "";
  layout(ws, M - bb.x1, base).forEach((q, i) => {
    const tone = TONES[(i + 1) % 4], side = t === "light" ? INK : mix(tone, INK, 0.62);
    defs += `<path id="nm${i}" d="${q.toPathData(1)}"/>`;
    let solid = "";
    for (let j = D; j >= 1; j--) solid += `<use href="#nm${i}" x="${+(j * dx).toFixed(1)}" y="${+(j * dy).toFixed(1)}" fill="${side}"/>`;
    solid += `<use href="#nm${i}" fill="${tone}"/>`;
    s += `<g class="word" style="animation-delay:${(0.5 + i * 0.08).toFixed(2)}s"><g class="hop" style="animation-delay:${(1.8 + i * 0.1).toFixed(2)}s">${solid}</g></g>`;
  });
  css += `.hop{animation:hop 4.5s ${EASE} infinite backwards}@keyframes hop{0%,26%,100%{transform:none}11%{transform:translateY(-20px)}}`;
  const H = Math.round(base + bb.y2 + M);
  return svg(H, "I design it. Claude Code writes it. We ship it together. Hamid.", css, defs, `<rect width="${W}" height="${H}" fill="${p.paper2}"/>` + s);
}

for (const f of fs.readdirSync(out)) fs.unlinkSync(path.join(out, f));
for (const t of ["light", "dark"]) {
  fs.writeFileSync(path.join(out, `hero-${t}.svg`), hero(t));
  fs.writeFileSync(path.join(out, `how-${t}.svg`), how(t));
  fs.writeFileSync(path.join(out, `built-${t}.svg`), builtPicture(t));
  fs.writeFileSync(path.join(out, `fast-${t}.svg`), fastPicture(t));
  fs.writeFileSync(path.join(out, `outro-${t}.svg`), outro(t));
}
for (const f of fs.readdirSync(out)) console.log(f, fs.statSync(path.join(out, f)).size);
