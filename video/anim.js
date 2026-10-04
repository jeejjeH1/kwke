/* Seismic — "The Stablecoin Stack" motion piece. Deterministic: renderFrame(t) draws time t. */
const W = 1920, H = 1080;
const C = {
  mauve: '#825A6D', purple: '#523542', white: '#FFFFFF', g50: '#FCFCFC', g200: '#E8E8E8',
  g300: '#D4D4D4', g400: '#A4A3A1', g500: '#737373', g800: '#282826', black: '#161616',
  mauveLt: '#B48CA0', mauveXl: '#D9BFCB', claude: '#D97757', panel: '#1C1C1B', line: '#2E2E2C',
};
const F = 'Inter', M = 'JetBrains Mono';
const cv = document.getElementById('c');
const ctx = cv.getContext('2d');

// ---------- math ----------
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const prog = (t, a, d) => clamp((t - a) / d);
const eo3 = t => 1 - Math.pow(1 - t, 3);
const ei3 = t => t * t * t;
const eio3 = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const eoX = t => t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
const eiX = t => t <= 0 ? 0 : Math.pow(2, 10 * t - 10);
const eoBack = t => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
const hash = (a, b = 0) => { let h = Math.imul(a * 374761393 + b * 668265263, 1274126177); h ^= h >>> 13; h = Math.imul(h, 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// ---------- text ----------
function setFont(size, weight = 500, fam = F, ls = 0) { ctx.font = `${weight} ${size}px ${fam}`; ctx.letterSpacing = ls + 'px'; }
function txt(s, x, y, o = {}) {
  ctx.save();
  setFont(o.size || 32, o.weight || 500, o.fam || F, o.ls || 0);
  ctx.fillStyle = o.color || C.white;
  ctx.globalAlpha *= (o.alpha ?? 1);
  ctx.textAlign = o.align || 'left';
  ctx.textBaseline = o.base || 'alphabetic';
  if (o.glow) { ctx.shadowColor = o.glow; ctx.shadowBlur = o.glowBlur || 30; }
  ctx.fillText(s, x, y);
  ctx.restore();
}
function tw(s, size, weight = 500, fam = F, ls = 0) { ctx.save(); setFont(size, weight, fam, ls); const w = ctx.measureText(s).width; ctx.restore(); return w; }

// Word-by-word masked reveal. Words prefixed with ~ get the accent colour.
function reveal(lines, x, y, o, lt) {
  const size = o.size, lh = o.lh || size * 1.12, wt = o.weight || 600, ls = o.ls ?? -size * 0.03;
  const t0 = o.t0 || 0, ws = o.ws ?? 0.05, lsg = o.lsg ?? 0.12, dur = o.dur || 0.8;
  lines.forEach((line, li) => {
    const words = line.split(' ');
    const ly = y + li * lh;
    let cx = x;
    if (o.align === 'center') cx = x - tw(line.replace(/~/g, ''), size, wt, F, ls) / 2;
    ctx.save();
    ctx.beginPath(); ctx.rect(0, ly - size * 1.05, W, size * 1.4); ctx.clip();
    words.forEach((w, wi) => {
      const acc = w.startsWith('~'); const ww = acc ? w.slice(1) : w;
      const p = eoX(prog(lt, t0 + li * lsg + wi * ws, dur));
      txt(ww, cx, ly + (1 - p) * size * 1.2, { size, weight: wt, ls, color: acc ? (o.accent || C.mauve) : (o.color || C.white), alpha: p * (o.alpha ?? 1) });
      cx += tw(ww + ' ', size, wt, F, ls);
    });
    ctx.restore();
  });
}
function tokens(s) { return s.split(' ').map(w => ({ w: w.replace(/^~/, ''), acc: w[0] === '~' })); }
function wrapTokens(toks, maxW, size, wt = 400, fam = F) {
  const lines = []; let cur = [];
  for (const t of toks) {
    const test = cur.concat(t).map(k => k.w).join(' ');
    if (cur.length && tw(test, size, wt, fam) > maxW) { lines.push(cur); cur = [t]; } else cur.push(t);
  }
  if (cur.length) lines.push(cur);
  return lines;
}
// Typewriter over wrapped tokens; p in [0,1]. Returns {h, caret:[x,y]}
function typeText(s, x, y, maxW, o, p) {
  const size = o.size || 30, wt = o.weight || 400, lh = o.lh || size * 1.45, fam = o.fam || F;
  const lines = wrapTokens(tokens(s), maxW, size, wt, fam);
  const total = lines.reduce((a, l) => a + l.reduce((b, k) => b + k.w.length + 1, 0), 0);
  let left = Math.floor(p * total);
  let caret = [x, y];
  lines.forEach((l, li) => {
    let cx = x; const ly = y + li * lh;
    for (const k of l) {
      if (left <= 0) break;
      const part = k.w.slice(0, left);
      txt(part, cx, ly, { size, weight: k.acc ? Math.max(wt, 600) : wt, fam, color: k.acc ? (o.accent || C.mauveLt) : (o.color || C.white) });
      const pw = tw(part, size, k.acc ? Math.max(wt, 600) : wt, fam);
      caret = [cx + pw, ly];
      cx += tw(k.w + ' ', size, k.acc ? Math.max(wt, 600) : wt, fam);
      left -= k.w.length + 1;
    }
  });
  return { h: lines.length * lh, lines: lines.length, caret };
}
function caret(x, y, size, lt, col = C.white) {
  if (Math.floor(lt * 2.2) % 2 === 0) { ctx.fillStyle = col; ctx.fillRect(x + 4, y - size * 0.8, size * 0.08 + 1, size * 0.95); }
}
const SCR = 'ABCDEF0123456789abcdef#$%&*+=/<>';
function scramble(final, p, seed, lt) {
  let out = '';
  for (let i = 0; i < final.length; i++) {
    const thr = i / final.length * 0.7;
    if (p > thr + 0.3) out += final[i];
    else if (p > thr) out += SCR[Math.floor(hash(i + seed, Math.floor(lt * 26)) * SCR.length)];
    else out += ' ';
  }
  return out;
}

// ---------- shapes ----------
function rr(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
function poly(pts) { ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); }
function line(x1, y1, x2, y2, col, w = 1, a = 1) { ctx.save(); ctx.globalAlpha *= a; ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.restore(); }
function circle(x, y, r, fill, stroke, lw = 2) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); } }
function lock(x, y, s, col) {
  ctx.save(); ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = s * 0.14;
  ctx.beginPath(); ctx.arc(x, y - s * 0.15, s * 0.3, Math.PI, 0); ctx.stroke();
  rr(x - s * 0.45, y - s * 0.15, s * 0.9, s * 0.7, s * 0.12); ctx.fill(); ctx.restore();
}
function sparkle(x, y, r, rot = 0, col = C.claude, a = 1) {
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y); ctx.rotate(rot); ctx.fillStyle = col;
  const n = 12;
  for (let i = 0; i < n; i++) {
    const len = r * (i % 2 ? 0.74 : 1) * (0.88 + 0.12 * Math.sin(i * 2.7));
    ctx.save(); ctx.rotate(i / n * Math.PI * 2); rr(-r * 0.08, r * 0.08, r * 0.16, len - r * 0.08, r * 0.08); ctx.fill(); ctx.restore();
  }
  ctx.restore();
}

// ---------- the gem (logo, rebuilt as vectors) ----------
const GEM = [
  [[95, 233], [196, 106], [264, 205], [166, 346]],
  [[113, 197], [190, 49], [194, 99]],
  [[199, 48], [276, 79], [268, 196], [203, 101]],
  [[279, 106], [301, 192], [272, 207]],
  [[267, 213], [300, 199], [298, 322], [171, 352]],
];
const GEM_SHADE = [0, 0, 1, 3, 2];
const GEM_LIGHT = ['#523542', '#6B4E5C', '#7C6270', '#8E7684'];
const GEM_DARK = ['#6E4A5B', '#8A6676', '#9E8090', '#B59BA8'];
const GEM_CX = 198, GEM_CY = 200, GEM_H = 304;
const GEM_SCATTER = (() => { const r = rng(7); return GEM.map(() => ({ a: r() * Math.PI * 2, d: 500 + r() * 400, rot: (r() - .5) * 3, s: 0.3 + r() * 0.4 })); })();
// ps: per-facet progress (1 = assembled)
function gem(cx, cy, h, o = {}) {
  const k = h / GEM_H, pal = o.pal || GEM_DARK;
  GEM.forEach((pts, i) => {
    const p = o.ps ? o.ps[i] : 1;
    if (p <= 0) return;
    const sc = GEM_SCATTER[i];
    const cxF = pts.reduce((a, q) => a + q[0], 0) / pts.length, cyF = pts.reduce((a, q) => a + q[1], 0) / pts.length;
    const q = 1 - p;
    ctx.save();
    ctx.globalAlpha *= clamp(p * 1.6) * (o.alpha ?? 1);
    ctx.translate(cx + (cxF - GEM_CX) * k + Math.cos(sc.a) * sc.d * q * (o.spread ?? 1), cy + (cyF - GEM_CY) * k + Math.sin(sc.a) * sc.d * q * (o.spread ?? 1));
    ctx.rotate(sc.rot * q); const s = lerp(1, sc.s, q); ctx.scale(s, s);
    poly(pts.map(([x, y]) => [(x - cxF) * k, (y - cyF) * k]));
    ctx.fillStyle = o.flash ? mix(pal[GEM_SHADE[i]], '#FFFFFF', o.flash) : pal[GEM_SHADE[i]];
    if (o.glow) { ctx.shadowColor = C.mauve; ctx.shadowBlur = o.glow; }
    ctx.fill();
    if (o.outline) { ctx.strokeStyle = o.outline; ctx.lineWidth = 1.5; ctx.stroke(); }
    ctx.restore();
  });
}
function mix(a, b, t) {
  const pa = [1, 3, 5].map(i => parseInt(a.slice(i, i + 2), 16)), pb = [1, 3, 5].map(i => parseInt(b.slice(i, i + 2), 16));
  return '#' + pa.map((v, i) => Math.round(lerp(v, pb[i], t)).toString(16).padStart(2, '0')).join('');
}

// ---------- chat UI ----------
function chat(o, lt) {
  const { x, y, w, h } = o;
  const ap = eo3(prog(lt, 0.05, 0.6));
  ctx.save();
  ctx.globalAlpha *= ap; ctx.translate(0, (1 - ap) * 40);
  // window
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 80; ctx.shadowOffsetY = 30;
  rr(x, y, w, h, 28); ctx.fillStyle = C.panel; ctx.fill(); ctx.restore();
  rr(x, y, w, h, 28); ctx.strokeStyle = C.line; ctx.lineWidth = 1.5; ctx.stroke();
  // header
  const thinking = lt > o.send && lt < o.a0;
  sparkle(x + 44, y + 46, 15, thinking ? lt * 5 : lt * 0.4);
  txt('Claude', x + 72, y + 56, { size: 26, weight: 600, color: C.white });
  txt(o.tag || '', x + w - 36, y + 55, { size: 16, fam: M, color: C.g500, align: 'right', ls: 2 });
  line(x, y + 92, x + w, y + 92, C.line, 1.5);
  // input
  const iy = y + h - 96, ix = x + 32, iw = w - 64;
  rr(ix, iy, iw, 64, 18); ctx.fillStyle = '#232322'; ctx.fill(); ctx.strokeStyle = '#363634'; ctx.lineWidth = 1.5; ctx.stroke();
  const qs = o.qSize || 26;
  if (lt < o.send) {
    const qp = prog(lt, o.q0, o.q1 - o.q0);
    if (qp <= 0) txt('Reply to Claude…', ix + 24, iy + 41, { size: 24, color: C.g500 });
    else {
      ctx.save(); rr(ix, iy, iw - 70, 64, 18); ctx.clip();
      let str = o.q.slice(0, Math.floor(qp * o.q.length));
      const maxw = iw - 120; let off = Math.max(0, tw(str, 24) - maxw);
      txt(str, ix + 24 - off, iy + 41, { size: 24, color: C.white });
      caret(ix + 24 - off + tw(str, 24), iy + 41, 24, lt);
      ctx.restore();
    }
  } else txt('Reply to Claude…', ix + 24, iy + 41, { size: 24, color: C.g500 });
  const sendPulse = 1 - prog(lt, o.send, 0.35);
  circle(ix + iw - 34, iy + 32, 20 + (lt >= o.send ? sendPulse * 6 : 0), lt > o.q1 - 0.2 ? C.claude : '#3A3A38');
  ctx.save(); ctx.strokeStyle = C.white; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath();
  ctx.moveTo(ix + iw - 34, iy + 42); ctx.lineTo(ix + iw - 34, iy + 22); ctx.moveTo(ix + iw - 42, iy + 30); ctx.lineTo(ix + iw - 34, iy + 22); ctx.lineTo(ix + iw - 26, iy + 30); ctx.stroke(); ctx.restore();

  // messages
  let cy = y + 130;
  if (lt >= o.send) {
    const bp = eoX(prog(lt, o.send, 0.6));
    const maxW = w * 0.62;
    const ls = wrapTokens(tokens(o.q), maxW, qs, 400);
    const bw = Math.max(...ls.map(l => tw(l.map(k => k.w).join(' '), qs))) + 56;
    const bh = ls.length * qs * 1.42 + 34;
    const bx = x + w - 36 - bw;
    ctx.save(); ctx.globalAlpha *= bp; ctx.translate(0, (1 - bp) * 60);
    rr(bx, cy, bw, bh, 22); ctx.fillStyle = C.purple; ctx.fill();
    ls.forEach((l, i) => txt(l.map(k => k.w).join(' '), bx + 28, cy + 17 + qs * 1.0 + i * qs * 1.42, { size: qs, color: C.white }));
    ctx.restore();
    cy += bh + 40;
  }
  let ansBottom = cy;
  if (lt > o.send + 0.1) {
    const ax = x + 92;
    sparkle(x + 50, cy + 20, 16, thinking ? lt * 6 : 0.3 + lt * 0.3);
    if (lt < o.a0) {
      // shimmer "Thinking"
      const s = 'Thinking…'; let cx = ax;
      for (let i = 0; i < s.length; i++) {
        const sh = 0.35 + 0.65 * Math.max(0, Math.cos((i * 0.5 - lt * 9)));
        txt(s[i], cx, cy + 30, { size: 26, color: C.g400, alpha: sh });
        cx += tw(s[i], 26);
      }
      ansBottom = cy + 50;
    } else {
      const as = o.aSize || 30;
      const pr = prog(lt, o.a0, o.a1 - o.a0);
      const r = typeText(o.a, ax, cy + as * 0.95, w - 140, { size: as, lh: as * 1.45, color: '#ECECEC', accent: C.mauveXl, weight: o.aWeight || 400 }, pr);
      if (pr < 1) caret(r.caret[0], r.caret[1], as, lt, C.claude);
      const lines = wrapTokens(tokens(o.a), w - 140, as, o.aWeight || 400).length;
      ansBottom = cy + lines * as * 1.45 + 10;
    }
  }
  if (o.after) o.after(x + 92, ansBottom, lt);
  ctx.restore();
}

// ---------- background, HUD, wipe ----------
const noise = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  const d = g.createImageData(256, 256); const r = rng(42);
  for (let i = 0; i < d.data.length; i += 4) { const v = r() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
  g.putImageData(d, 0, 0); return c;
})();
let noisePat = null;

function background(theme, lt, idx) {
  const dark = theme === 'dark';
  ctx.fillStyle = dark ? C.black : C.g50; ctx.fillRect(0, 0, W, H);
  const ga = idx === 0 ? eo3(prog(lt, 0.1, 1.4)) : 1;
  ctx.save(); ctx.globalAlpha = ga;
  ctx.strokeStyle = dark ? '#1E1E1D' : '#F0F0EF'; ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= W; x += 80) { ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, H); }
  for (let y = 0; y <= H; y += 80) { ctx.moveTo(0, y + 0.5); ctx.lineTo(W, y + 0.5); }
  ctx.stroke();
  // crosshair marks
  ctx.strokeStyle = dark ? '#2C2C2A' : '#DCDCDA';
  ctx.beginPath();
  for (let x = 160; x <= W - 160; x += 320) for (let y = 160; y <= H - 160; y += 320) { ctx.moveTo(x - 6, y + .5); ctx.lineTo(x + 7, y + .5); ctx.moveTo(x + .5, y - 6); ctx.lineTo(x + .5, y + 7); }
  ctx.stroke();
  ctx.restore();
  if (dark) {
    const g = ctx.createRadialGradient(W / 2, H * 0.45, 100, W / 2, H / 2, 1100);
    g.addColorStop(0, 'rgba(130,90,109,0.10)'); g.addColorStop(0.5, 'rgba(22,22,22,0)'); g.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
}

function seismo(t, y, x0, x1, col, alpha, ampMul = 1) {
  let env = 0;
  for (const sc of SCENES) { const d = t - sc.start; env += 34 * Math.exp(-Math.pow(d / 0.28, 2)); }
  const xc = lerp(x0, x1, ((t * 0.21) % 1));
  ctx.save(); ctx.globalAlpha *= alpha; ctx.strokeStyle = col; ctx.lineWidth = 1.6; ctx.beginPath();
  for (let x = x0; x <= x1; x += 3) {
    const n = Math.sin(x * 0.045 + t * 9) * 0.5 + Math.sin(x * 0.13 - t * 14) * 0.3 + Math.sin(x * 0.37 + t * 23) * 0.2;
    const local = Math.exp(-Math.pow((x - xc) / 140, 2));
    const edge = Math.min(1, (x - x0) / 80, (x1 - x) / 80);
    const a = (1.5 + local * 7 + env * Math.exp(-Math.pow((x - (x0 + x1) / 2) / 420, 2))) * ampMul * edge;
    const yy = y + n * a;
    x === x0 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy);
  }
  ctx.stroke(); ctx.restore();
}

function hud(t, sc, idx, lt) {
  const dark = sc.theme === 'dark';
  const a = idx === 0 ? prog(lt, 4.3, 0.8) : 1;
  if (a <= 0) { seismo(t, 1000, 160, W - 160, C.mauve, idx === 0 ? prog(lt, 0.2, 1) * 0.5 : 0.5); return; }
  ctx.save(); ctx.globalAlpha = a;
  const fg = dark ? C.g400 : C.g500;
  gem(173, 78, 30, { pal: dark ? GEM_DARK : GEM_LIGHT });
  txt('SEISMIC', 200, 85, { size: 16, fam: M, weight: 500, color: dark ? C.white : C.black, ls: 4 });
  txt('/  THE STABLECOIN STACK', 302, 85, { size: 16, fam: M, color: fg, ls: 2 });
  if (sc.ch) {
    txt(`${sc.ch} / 10`, W - 160, 85, { size: 16, fam: M, color: fg, align: 'right', ls: 2 });
    const pw = 120, px = W - 160 - pw - 130;
    line(px, 79, px + pw, 79, dark ? C.g800 : C.g200, 2);
    line(px, 79, px + pw * (+sc.ch / 10), 79, C.mauve, 2);
  }
  ctx.restore();
  seismo(t, 1000, 160, W - 160, C.mauve, 0.5);
}

function wipe(p, destTheme) {
  // diagonal faceted bands: cover in (p<.5), reveal out (p>.5)
  const cols = [C.mauve, C.purple, destTheme === 'dark' ? C.black : C.g50];
  const n = cols.length, d = 0.17, s = 340;
  const pin = clamp(p / 0.5), pout = clamp((p - 0.5) / 0.5);
  for (let i = 0; i < n; i++) {
    const lead = lerp(-s, W + s, eo3(clamp((pin - i * d) / (1 - (n - 1) * d))));
    const trail = lerp(-s, W + s, ei3(clamp((pout - (n - 1 - i) * d) / (1 - (n - 1) * d))));
    if (lead <= trail) continue;
    poly([[trail + s, 0], [lead + s, 0], [lead - s, H], [trail - s, H]]);
    ctx.fillStyle = cols[i]; ctx.fill();
    if (i < n - 1) line(lead + s, 0, lead - s, H, 'rgba(255,255,255,0.35)', 2);
  }
}

// ======================= SCENES =======================
const DRAW = {};

DRAW.intro = (lt) => {
  // central seismograph tremor that collapses into the gem
  const env = eo3(prog(lt, 0.2, 0.9)) * (1 - eiX(prog(lt, 1.15, 0.5)));
  if (env > 0.001) {
    ctx.save(); ctx.strokeStyle = C.mauveLt; ctx.lineWidth = 3; ctx.shadowColor = C.mauve; ctx.shadowBlur = 20;
    ctx.beginPath();
    const span = lerp(1700, 200, eiX(prog(lt, 1.1, 0.5)));
    for (let x = -span / 2; x <= span / 2; x += 3) {
      const win = Math.exp(-Math.pow(x / (span * 0.28), 2));
      const n = Math.sin(x * 0.06 + lt * 30) * 0.6 + Math.sin(x * 0.17 - lt * 41) * 0.4 + Math.sin(x * 0.011 + lt * 6) * 0.3;
      const yy = 540 + n * win * env * 170;
      x === -span / 2 ? ctx.moveTo(960 + x, yy) : ctx.lineTo(960 + x, yy);
    }
    ctx.stroke(); ctx.restore();
  }
  // gem assembles
  const move = eio3(prog(lt, 3.0, 1.0));
  const gx = lerp(960, 670, move), gy = 540, gh = lerp(440, 300, move);
  const ps = GEM.map((_, i) => eoX(prog(lt, 1.25 + i * 0.08, 0.9)));
  const flash = Math.max(0, 1 - prog(lt, 2.05, 0.6)) * (lt > 2.0 ? 0.6 : 0);
  gem(gx, gy, gh, { ps, flash, glow: 40 * flash });
  // shockwaves
  for (let k = 0; k < 3; k++) {
    const p = prog(lt, 2.0 + k * 0.14, 1.5);
    if (p > 0 && p < 1) { ctx.save(); ctx.globalAlpha = (1 - p) * 0.7; circle(gx, gy, 120 + eo3(p) * 1000, null, k ? C.g500 : C.mauveLt, 2.5 - k * 0.6); ctx.restore(); }
  }
  // wordmark
  const wp = eoX(prog(lt, 3.35, 1.0));
  if (wp > 0) {
    ctx.save(); ctx.beginPath(); ctx.rect(831, 300, 1000 * wp, 400); ctx.clip();
    txt('Seismic', 831 - (1 - wp) * 60, 590, { size: 150, weight: 600, color: C.white, ls: -5 });
    ctx.restore();
    line(835, 625, 835 + 540 * eoX(prog(lt, 3.6, 0.9)), 625, C.mauve, 2);
    txt('THE COMPLETE STABLECOIN STACK', 835, 668, { size: 22, fam: M, color: C.g400, ls: 6, alpha: prog(lt, 3.9, 0.6) });
  }
};

DRAW.hook = (lt) => {
  const mv = eio3(prog(lt, 2.45, 0.8));
  ctx.save();
  ctx.translate(160, lerp(400, 196, mv)); ctx.scale(lerp(1, 0.42, mv), lerp(1, 0.42, mv));
  const col = mix(C.black, '#A4A3A1', mv);
  reveal(['Stablecoins may not', 'replace banks.'], 0, 0, { size: 132, lh: 150, color: col, t0: 0.25, ws: 0.07 }, lt);
  const sp = eo3(prog(lt, 1.85, 0.45));
  if (sp > 0) { ctx.fillStyle = C.mauve; ctx.fillRect(-6, 150 - 44, (tw('replace banks.', 132, 600, F, -4) + 12) * sp, 11); }
  ctx.restore();
  reveal(['They may become the'], 160, 455, { size: 92, color: C.black, t0: 2.95, ws: 0.06 }, lt);
  reveal(['~infrastructure'], 160, 630, { size: 150, weight: 700, color: C.black, accent: C.mauve, t0: 3.2, ls: -6 }, lt);
  reveal(['banks & fintechs are built on.'], 160, 760, { size: 72, color: C.black, t0: 3.45, ws: 0.05 }, lt);
  // building blocks on the right
  const bx = 1450, by = 810;
  const fp = eoX(prog(lt, 3.4, 0.8));
  if (fp > 0) {
    ctx.save(); ctx.globalAlpha = fp;
    rr(bx, by - 70 + (1 - fp) * 40, 330, 70, 10); ctx.fillStyle = C.purple; ctx.fill();
    txt('STABLECOIN RAILS', bx + 165, by - 28 + (1 - fp) * 40, { size: 18, fam: M, color: C.white, align: 'center', ls: 3 });
    ctx.restore();
  }
  ['Banks', 'Fintechs', 'Apps'].forEach((s, i) => {
    const p = eoBack(prog(lt, 3.8 + i * 0.14, 0.6));
    if (p <= 0) return;
    const w = 100, x = bx + i * 115, y = by - 84 - 120 - (1 - p) * 300;
    ctx.save(); ctx.globalAlpha = clamp(p);
    rr(x, y, w, 120, 10); ctx.fillStyle = C.white; ctx.fill(); ctx.strokeStyle = C.black; ctx.lineWidth = 2; ctx.stroke();
    txt(s, x + w / 2, y + 68, { size: 20, weight: 600, color: C.black, align: 'center' });
    ctx.restore();
  });
};

DRAW.chat1 = (lt) => {
  chat({
    x: 340, y: 190, w: 1240, h: 700, tag: 'STABLECOINS · 01', qSize: 29, aSize: 34,
    q: "Claude, isn't a stablecoin just a dollar-pegged token? USDC, USDT…",
    q0: 0.45, q1: 1.6, send: 1.7, a0: 2.4, a1: 4.0,
    a: "A token alone isn't a ~financial ~system. Real-world payments also need:",
    after: (x, y, lt) => {
      const chips = ['Accounts', 'Payments', 'KYC', 'Compliance', 'Cards', 'FX', 'On/off-ramps', 'Settlement'];
      let cx = x, cy = y + 6;
      chips.forEach((c, i) => {
        const w = tw(c, 26, 500) + 48;
        if (cx + w > x + 1080) { cx = x; cy += 70; }
        const p = eoBack(prog(lt, 4.05 + i * 0.07, 0.5));
        if (p > 0) {
          ctx.save(); ctx.globalAlpha *= clamp(p); ctx.translate(cx + w / 2, cy + 26); ctx.scale(p, p);
          rr(-w / 2, -28, w, 56, 28);
          const last = i === chips.length - 1;
          ctx.fillStyle = last ? C.purple : '#252524'; ctx.fill();
          ctx.strokeStyle = last ? C.mauve : '#474745'; ctx.lineWidth = 1.5; ctx.stroke();
          txt(c, 0, 9, { size: 26, weight: 500, color: C.white, align: 'center' });
          ctx.restore();
        }
        cx += w + 12;
      });
    },
  }, lt);
};

function isoPt(cx, cy, x, y, z) { const c = Math.cos(Math.PI / 6), s = Math.sin(Math.PI / 6); return [cx + (x - y) * c, cy + (x + y) * s - z]; }
DRAW.stack = (lt) => {
  txt('A COMPLETE STACK', 160, 300, { size: 20, fam: M, color: C.mauve, ls: 4, alpha: prog(lt, 0.3, 0.5) });
  reveal(['Not another token.', 'A ~stablecoin ~stack.'], 160, 420, { size: 92, color: C.black, accent: C.mauve, t0: 0.4 }, lt);
  ['Infrastructure built around stablecoins', 'so they can actually power', 'real financial products.'].forEach((s, i) =>
    txt(s, 160, 600 + i * 44, { size: 30, color: C.g500, alpha: eo3(prog(lt, 1.4 + i * 0.1, 0.6)) }));
  const labels = ['Stablecoin settlement', 'On/off-ramps', 'FX', 'Cards', 'Compliance', 'KYC', 'Payments', 'Accounts'];
  const cx = 1250, cy = 600, w = 280, d = 280, h = 30, gap = 16;
  const pulse = prog(lt, 3.6, 1.4);
  labels.forEach((lab, i) => {
    const p = prog(lt, 0.45 + i * 0.16, 0.7);
    if (p <= 0) return;
    const z = i * (h + gap) - 180 + (1 - eoX(p)) * 600;
    const P = (x, y, zz) => isoPt(cx, cy, x - w / 2, y - d / 2, zz);
    const bottom = i === 0, top = i === labels.length - 1;
    const hl = Math.max(0, 1 - Math.abs(pulse * 9 - i - 0.5) / 1.2) * (pulse > 0 && pulse < 1 ? 1 : 0);
    let ft = bottom ? C.mauve : top ? C.mauveXl : C.white, fl = bottom ? C.purple : top ? C.mauveLt : C.g200, fr = bottom ? '#3E2833' : top ? C.mauve : C.g300;
    if (hl) { ft = mix(ft, C.mauveLt, hl * 0.7); }
    ctx.save(); ctx.globalAlpha = clamp(p * 3);
    ctx.lineJoin = 'round'; ctx.strokeStyle = C.black; ctx.lineWidth = 1.6;
    poly([P(0, d, z), P(w, d, z), P(w, d, z + h), P(0, d, z + h)]); ctx.fillStyle = fl; ctx.fill(); ctx.stroke();
    poly([P(w, 0, z), P(w, d, z), P(w, d, z + h), P(w, 0, z + h)]); ctx.fillStyle = fr; ctx.fill(); ctx.stroke();
    poly([P(0, 0, z + h), P(w, 0, z + h), P(w, d, z + h), P(0, d, z + h)]); ctx.fillStyle = ft; ctx.fill(); ctx.stroke();
    // label
    const a = P(w, 0, z + h / 2);
    const lp = eo3(prog(lt, 0.75 + i * 0.16, 0.5));
    line(a[0] + 10, a[1], a[0] + 10 + 90 * lp, a[1], C.black, 1.2, lp);
    circle(a[0] + 10, a[1], 3, C.black);
    txt(lab, a[0] + 115, a[1] + 9, { size: 26, weight: bottom ? 700 : 500, color: bottom ? C.mauve : C.black, alpha: lp });
    ctx.restore();
  });
};

DRAW.accounts = (lt) => {
  txt('VIRTUAL ACCOUNTS', 160, 330, { size: 20, fam: M, color: C.mauve, ls: 4, alpha: prog(lt, 0.3, 0.5) });
  reveal(['The blockchain', "doesn't have to be", 'the ~user ~experience.'], 160, 440, { size: 78, lh: 92, color: C.black, accent: C.mauve, t0: 0.4 }, lt);
  txt('Familiar accounts on top.', 160, 700, { size: 30, color: C.g500, alpha: eo3(prog(lt, 2.6, 0.6)) });
  txt('Stablecoins settle underneath.', 160, 744, { size: 30, color: C.g500, alpha: eo3(prog(lt, 2.75, 0.6)) });

  const cx = 1390;
  const addr = '0x8F3c9B7e41D2a6F0A92';
  const morph = eio3(prog(lt, 1.8, 0.9));
  // address: big -> settlement strip
  const ap = prog(lt, 0.3, 0.9);
  const ay = lerp(540, 868, morph), asz = lerp(54, 22, morph);
  const shown = morph > 0 && morph < 0.6 ? scramble(addr, 1 - morph * 0.8, 3, lt) : scramble(addr, ap, 9, lt);
  txt(morph > 0.6 ? 'SETTLEMENT  ·  0x8F…A92' : shown, cx, ay, { size: asz, fam: M, weight: 500, color: mix(C.black, C.g500, morph), align: 'center', ls: morph > .6 ? 3 : 0 });
  txt('what users used to see', cx, 600, { size: 20, fam: M, color: C.g400, align: 'center', alpha: prog(lt, 1.0, 0.4) * (1 - prog(lt, 1.7, 0.3)) });
  // card
  const cp = eoX(prog(lt, 2.05, 1.0));
  if (cp > 0) {
    const cw = 600, ch = 360, x = cx - cw / 2, y = 330 + (1 - cp) * 120;
    // connector
    ctx.save(); ctx.globalAlpha = cp; ctx.setLineDash([6, 8]); ctx.lineDashOffset = -lt * 40;
    line(cx, y + ch, cx, 838, C.mauve, 2); ctx.restore();
    ctx.save(); ctx.globalAlpha = clamp(cp * 1.5);
    ctx.save(); ctx.shadowColor = 'rgba(82,53,66,0.35)'; ctx.shadowBlur = 70; ctx.shadowOffsetY = 30;
    rr(x, y, cw, ch, 30); ctx.fillStyle = C.black; ctx.fill(); ctx.restore();
    const g = ctx.createLinearGradient(x, y, x + cw, y + ch); g.addColorStop(0, 'rgba(130,90,109,0.35)'); g.addColorStop(0.6, 'rgba(130,90,109,0)');
    rr(x, y, cw, ch, 30); ctx.fillStyle = g; ctx.fill();
    gem(x + 52, y + 58, 40, { pal: GEM_DARK });
    txt('Business Account', x + 84, y + 66, { size: 24, weight: 600, color: C.white });
    rr(x + cw - 104, y + 38, 70, 36, 18); ctx.strokeStyle = C.g500; ctx.lineWidth = 1.5; ctx.stroke();
    txt('USD', x + cw - 69, y + 63, { size: 18, fam: M, color: C.g300, align: 'center' });
    txt('Available balance', x + 44, y + 160, { size: 20, color: C.g400 });
    const v = 248930 * eo3(prog(lt, 2.3, 1.4));
    txt('$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), x + 44, y + 236, { size: 68, weight: 600, color: C.white, ls: -2 });
    txt('Account  ••••  4821', x + 44, y + 312, { size: 22, fam: M, color: C.g400 });
    circle(x + cw - 210, y + 305, 5, C.mauveLt);
    txt('settled onchain', x + cw - 44, y + 312, { size: 20, color: C.mauveXl, align: 'right' });
    ctx.restore();
  }
};

DRAW.border = (lt) => {
  txt('CROSS-BORDER', 160, 200, { size: 20, fam: M, color: C.mauveLt, ls: 4, alpha: prog(lt, 0.3, 0.5) });
  reveal(['A US company pays a contractor in India.'], 160, 280, { size: 60, color: C.white, t0: 0.4, ws: 0.04 }, lt);
  const X0 = 220, X1 = 1700, Y1 = 520, Y2 = 790;
  const nodes = ['Bank', 'Correspondent', 'FX provider', 'Processor', 'Local bank'];
  const nx = k => lerp(X0, X1, k / 6);
  const rowA = eo3(prog(lt, 0.5, 0.6));
  ctx.save(); ctx.globalAlpha = rowA;
  txt('LEGACY RAILS', X0 - 40, Y1 - 82, { size: 18, fam: M, color: C.g500, ls: 3 });
  ctx.setLineDash([4, 8]); line(X0, Y1, X1, Y1, '#3A3A38', 2); ctx.setLineDash([]);
  // traveling dot with stops
  const t0 = 0.8, hop = 0.4, stop = 0.4;
  const el = Math.max(0, lt - t0);
  const seg = Math.floor(el / (hop + stop)), inSeg = el - seg * (hop + stop);
  let pos = Math.min(6, seg + eio3(clamp(inSeg / hop)));
  nodes.forEach((n, i) => {
    const k = i + 1, x = nx(k), reached = pos >= k;
    const pp = reached ? 1 - prog(el, k * (hop + stop) - stop, 0.6) : 0;
    circle(x, Y1, 11, reached ? C.g400 : C.black, reached ? C.g400 : C.g500, 2);
    if (pp > 0 && pp < 1) { ctx.save(); ctx.globalAlpha *= pp; circle(x, Y1, 11 + (1 - pp) * 26, null, C.g400, 1.5); ctx.restore(); }
    txt(n, x, Y1 + 48, { size: 22, color: reached ? C.g300 : C.g500, align: 'center' });
    if (reached) { const fp = prog(el, k * (hop + stop) - stop, 0.8); txt('− fee', x, Y1 - 30 - fp * 20, { size: 18, fam: M, color: C.g400, align: 'center', alpha: 1 - fp }); }
  });
  circle(lerp(X0, X1, pos / 6), Y1, 8, C.white);
  const daysP = clamp(el / 5);
  txt(`T + ${(daysP * 4).toFixed(1)} days`, X1 + 40, Y1 - 82, { size: 18, fam: M, color: C.g500, align: 'right', ls: 2 });
  ctx.restore();
  // endpoints
  [[X0, 'US'], [X1, 'IN']].forEach(([x, s]) => [Y1, Y2].forEach(y => {
    circle(x, y, 34, C.black, C.white, 2); txt(s, x, y + 8, { size: 22, fam: M, weight: 700, color: C.white, align: 'center', alpha: 1 });
  }));
  // stablecoin rail
  const rp = eoX(prog(lt, 1.6, 0.7));
  txt('STABLECOIN RAIL', X0 - 40, Y2 - 82, { size: 18, fam: M, color: C.mauveLt, ls: 3, alpha: rp });
  if (rp > 0) {
    ctx.save(); ctx.shadowColor = C.mauve; ctx.shadowBlur = 20;
    line(X0 + 34, Y2, lerp(X0 + 34, X1 - 34, rp), Y2, C.mauve, 5); ctx.restore();
  }
  const zp = eio3(prog(lt, 2.4, 0.55));
  if (zp > 0 && zp < 1) {
    const x = lerp(X0 + 34, X1 - 34, zp);
    const g = ctx.createLinearGradient(x - 360, 0, x, 0); g.addColorStop(0, 'rgba(217,191,203,0)'); g.addColorStop(1, 'rgba(255,255,255,0.95)');
    ctx.fillStyle = g; ctx.fillRect(Math.max(X0 + 34, x - 360), Y2 - 3, Math.min(360, x - X0 - 34), 6);
    ctx.save(); ctx.shadowColor = C.white; ctx.shadowBlur = 30; circle(x, Y2, 10, C.white); ctx.restore();
  }
  const arr = prog(lt, 2.95, 1.0);
  if (arr > 0) {
    ctx.save(); ctx.globalAlpha = 1 - arr; circle(X1, Y2, 34 + eo3(arr) * 90, null, C.mauveXl, 2); ctx.restore();
    txt('Settled  ·  seconds', X1 + 40, Y2 - 82, { size: 18, fam: M, color: C.white, ls: 2, align: 'right', alpha: eo3(prog(lt, 2.95, 0.4)) });
  }
  reveal(['The blockchain becomes the ~settlement ~rail.'], 160, 940, { size: 46, color: C.white, accent: C.mauveXl, t0: 3.5, ws: 0.04 }, lt);
};

DRAW.chat2 = (lt) => {
  chat({
    x: 120, y: 140, w: 820, h: 800, tag: 'PRIVACY · 02', qSize: 25,
    q: 'Would a company really put its payroll on a public blockchain?',
    q0: 0.35, q1: 1.5, send: 1.6, a0: 2.2, a1: 4.4, aSize: 31,
    a: 'Not if everyone can see it. Balances, payroll, supplier payments, trading activity — ~public ~by ~default is a dealbreaker. Privacy has to be ~first-class.',
  }, lt);
  // ledger
  const lp = eo3(prog(lt, 0.3, 0.7));
  const x = 1000, y = 140, w = 800, h = 800;
  ctx.save(); ctx.globalAlpha = lp; ctx.translate(0, (1 - lp) * 40);
  rr(x, y, w, h, 28); ctx.fillStyle = '#191918'; ctx.fill(); ctx.strokeStyle = C.line; ctx.lineWidth = 1.5; ctx.stroke();
  const scanY = lerp(y + 100, y + h, eio3(prog(lt, 4.6, 1.0)));
  const shielded = lt > 4.6;
  const hd = lt > 5.3;
  if (hd) { lock(x + 46, y + 58, 22, C.mauveXl); txt('SHIELDED LEDGER', x + 72, y + 64, { size: 18, fam: M, color: C.mauveXl, ls: 3 }); }
  else { circle(x + 46, y + 56, 6, C.g400); txt('PUBLIC LEDGER  ·  VISIBLE TO EVERYONE', x + 66, y + 64, { size: 18, fam: M, color: C.g400, ls: 3 }); }
  line(x, y + 100, x + w, y + 100, C.line, 1.5);
  const rows = [
    ['BALANCE', 'Treasury wallet', '$18,420,000.00'],
    ['PAYROLL', '142 employees · monthly', '$1,284,550.00'],
    ['SUPPLIER', 'Manufacturing partner', '$412,900.00'],
    ['TRADE', 'USDC → EUR', '$2,000,000.00'],
    ['CUSTOMER', 'Invoice #20931', '$8,240.00'],
    ['PAYROLL', 'Contractor · India', '$6,500.00'],
  ];
  rows.forEach((r, i) => {
    const ry = y + 130 + i * 108;
    const p = eoX(prog(lt, 0.5 + i * 0.1, 0.7));
    ctx.save(); ctx.globalAlpha *= p; ctx.translate((1 - p) * 40, 0);
    const masked = shielded && scanY > ry + 50;
    txt(r[0], x + 40, ry + 26, { size: 16, fam: M, color: masked ? C.mauveLt : C.g500, ls: 3 });
    if (masked) {
      ctx.save(); ctx.filter = 'blur(9px)'; txt(r[1], x + 40, ry + 66, { size: 26, color: C.g300, alpha: 0.7 }); ctx.restore();
      const bw = 250; rr(x + w - 40 - bw, ry + 22, bw, 56, 14); ctx.fillStyle = 'rgba(130,90,109,0.22)'; ctx.fill(); ctx.strokeStyle = C.mauve; ctx.lineWidth = 1.5; ctx.stroke();
      lock(x + w - 40 - bw + 34, ry + 52, 18, C.mauveXl);
      txt('••••••••', x + w - 64, ry + 59, { size: 26, fam: M, color: C.mauveXl, align: 'right' });
    } else {
      txt(r[1], x + 40, ry + 66, { size: 26, color: C.white });
      txt(r[2], x + w - 40, ry + 60, { size: 28, fam: M, weight: 500, color: C.white, align: 'right' });
    }
    if (i < rows.length - 1) line(x + 40, ry + 100, x + w - 40, ry + 100, '#262625', 1);
    ctx.restore();
  });
  if (shielded && lt < 5.7) {
    ctx.save(); ctx.globalAlpha = 1 - prog(lt, 5.5, 0.2);
    const g = ctx.createLinearGradient(0, scanY - 80, 0, scanY); g.addColorStop(0, 'rgba(130,90,109,0)'); g.addColorStop(1, 'rgba(180,140,160,0.35)');
    ctx.fillStyle = g; ctx.fillRect(x + 2, scanY - 80, w - 4, 80);
    ctx.shadowColor = C.mauveLt; ctx.shadowBlur = 20; line(x, scanY, x + w, scanY, C.mauveXl, 3);
    ctx.restore();
  }
  ctx.restore();
};

DRAW.access = (lt) => {
  txt('CONTROLLED ACCESS', 160, 200, { size: 20, fam: M, color: C.mauveLt, ls: 4, alpha: prog(lt, 0.3, 0.5) });
  reveal(['Privacy ≠ zero visibility.'], 160, 300, { size: 88, color: C.white, t0: 0.4, ws: 0.06 }, lt);
  const cx = 1360, cy = 630;
  const R = [100, 195, 290];
  const fills = ['rgba(130,90,109,0.9)', 'rgba(130,90,109,0.32)', 'rgba(130,90,109,0.10)'];
  const strokes = [C.mauveXl, C.mauve, C.g500];
  // public particles
  const pp = prog(lt, 2.6, 0.6);
  if (pp > 0) {
    const r = rng(11);
    for (let i = 0; i < 46; i++) {
      const a0 = r() * Math.PI * 2, sp = (r() - .5) * 0.25, rad = 330 + r() * 160, ph = r() * 6;
      const a = a0 + lt * sp;
      const bump = Math.max(0, Math.sin(lt * 1.8 + ph)) * 25;
      const rr2 = rad - bump;
      ctx.save(); ctx.globalAlpha = pp * 0.8; circle(cx + Math.cos(a) * rr2, cy + Math.sin(a) * rr2, 3.5, C.g500); ctx.restore();
    }
  }
  for (let i = 2; i >= 0; i--) {
    const p = eoX(prog(lt, 0.8 + (2 - i) * 0.0 + i * 0.6, 0.9));
    if (p <= 0) continue;
    ctx.save(); ctx.globalAlpha = clamp(p * 2);
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R[i] * lerp(0.7, 1, p), -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p); ctx.closePath();
    ctx.fillStyle = fills[i]; ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy, R[i] * lerp(0.7, 1, p), -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p); ctx.strokeStyle = strokes[i]; ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();
  }
  const kp = eoBack(prog(lt, 1.0, 0.6));
  if (kp > 0) { ctx.save(); ctx.translate(cx, cy); ctx.scale(kp, kp); lock(0, 6, 46, C.white); ctx.restore(); }
  const rows = [
    ['Users', 'control their financial information', C.white, 0.8, [cx - 70, cy - 70]],
    ['Protocols', 'access only what they need', C.white, 1.4, [cx - 150, cy - 122]],
    ['Authorized entities', 'access by defined rules', C.white, 2.0, [cx - 260, cy + 130]],
    ['The public', "doesn't automatically see everything", C.g500, 2.6, [cx - 400, cy + 250]],
  ];
  rows.forEach(([a, b, col, t0, pt], i) => {
    const y = 450 + i * 130, p = eo3(prog(lt, t0 + 0.2, 0.6));
    if (p <= 0) return;
    ctx.save(); ctx.globalAlpha = p; ctx.translate((1 - p) * -30, 0);
    txt(a, 160, y, { size: 38, weight: 600, color: col });
    txt(b, 160, y + 42, { size: 26, color: C.g400 });
    ctx.restore();
    const sx = 160 + tw(a, 38, 600) + 24;
    ctx.save(); ctx.globalAlpha = p * 0.8; ctx.strokeStyle = i === 3 ? C.g800 : C.g500; ctx.lineWidth = 1.2; ctx.setLineDash([3, 5]);
    ctx.beginPath(); ctx.moveTo(sx, y - 12); ctx.lineTo(lerp(sx, pt[0], p), lerp(y - 12, pt[1], p)); ctx.stroke(); ctx.restore();
    circle(pt[0], pt[1], 4 * p, col);
  });
};

DRAW.code = (lt) => {
  txt('DEVELOPER EXPERIENCE', 160, 200, { size: 20, fam: M, color: C.mauve, ls: 4, alpha: prog(lt, 0.3, 0.5) });
  reveal(['EVM-compatible. Solidity. ~Shielded ~types.'], 160, 280, { size: 60, color: C.black, accent: C.mauve, t0: 0.4, ws: 0.05 }, lt);
  const x = 160, y = 350, w = 980, h = 460;
  const cp = eo3(prog(lt, 0.5, 0.7));
  ctx.save(); ctx.globalAlpha = cp; ctx.translate(0, (1 - cp) * 40);
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.25)'; ctx.shadowBlur = 60; ctx.shadowOffsetY = 24; rr(x, y, w, h, 26); ctx.fillStyle = C.black; ctx.fill(); ctx.restore();
  [0, 1, 2].forEach(i => circle(x + 36 + i * 26, y + 36, 7, '#333331'));
  txt('Payroll.sol', x + w / 2, y + 43, { size: 18, fam: M, color: C.g500, align: 'center' });
  line(x, y + 72, x + w, y + 72, '#262625', 1.5);
  const s1 = prog(lt, 1.4, 0.25), s2 = prog(lt, 1.9, 0.25);
  const L = [
    [['contract ', C.mauveLt], ['Payroll ', C.white], ['{', C.g400]],
    [['    ', null], ['s', 'S1'], ['uint256 ', 'T1'], ['balance;', C.white]],
    [['    ', null], ['s', 'S2'], ['uint256 ', 'T2'], ['salary;', C.white]],
    [['    function ', C.mauveLt], ['pay', C.white], ['() ', C.g400], ['external ', C.mauveLt], ['{ … }', C.g400]],
    [['}', C.g400]],
  ];
  const fs = 32, lh = 58;
  L.forEach((ln, li) => {
    const ly = y + 140 + li * lh;
    txt(String(li + 1), x + 50, ly, { size: fs - 6, fam: M, color: '#3E3E3C', align: 'right' });
    let cx = x + 90;
    ln.forEach(([s, col]) => {
      if (col === 'S1' || col === 'S2') {
        const p = col === 'S1' ? s1 : s2;
        if (p <= 0) return;
        const ww = tw('s', fs, 500, M) * eo3(p);
        txt('s', cx, ly - (1 - eoBack(p)) * 30, { size: fs, fam: M, weight: 700, color: C.mauveLt, alpha: p, glow: C.mauve, glowBlur: 25 * (1 - p * 0.5) });
        cx += ww; return;
      }
      if (col === 'T1' || col === 'T2') { const on = (col === 'T1' ? s1 : s2) >= 1; col = on ? C.mauveXl : C.g300; }
      if (col) txt(s, cx, ly, { size: fs, fam: M, weight: 500, color: col });
      cx += tw(s, fs, 500, M);
    });
  });
  // typing caret
  if (lt > 1.1 && lt < 2.4) { const ln = lt < 1.65 ? 1 : 2; const p = ln === 1 ? s1 : s2; caret(x + 90 + tw('    ', fs, 500, M) + tw('s', fs, 500, M) * eo3(p) - 4, y + 140 + ln * lh, fs, lt * 2, C.mauveLt); }
  ctx.restore();
  // right column
  const rx = 1470;
  const u = eo3(prog(lt, 1.0, 0.5));
  txt('uint256', rx, 470, { size: 60, fam: M, weight: 500, color: C.g400, align: 'center', alpha: u });
  if (lt > 1.4) { const sp = eo3(prog(lt, 1.4, 0.4)); line(rx - 140, 452, rx - 140 + 280 * sp, 452, C.g400, 4); }
  const ap = eo3(prog(lt, 1.6, 0.5));
  ctx.save(); ctx.globalAlpha = ap; ctx.strokeStyle = C.g400; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(rx, 505); ctx.lineTo(rx, 545); ctx.moveTo(rx - 10, 535); ctx.lineTo(rx, 547); ctx.lineTo(rx + 10, 535); ctx.stroke(); ctx.restore();
  const sp = eoBack(prog(lt, 1.95, 0.6));
  if (sp > 0) {
    ctx.save(); ctx.translate(rx, 625); ctx.scale(sp, sp);
    const wS = tw('s', 76, 700, M), wT = tw('suint256', 76, 700, M);
    txt('s', -wT / 2, 0, { size: 76, fam: M, weight: 700, color: C.mauve, glow: 'rgba(130,90,109,0.5)', glowBlur: 30 });
    txt('uint256', -wT / 2 + wS, 0, { size: 76, fam: M, weight: 700, color: C.black });
    ctx.restore();
  }
  txt('Looks like a small change.', rx, 730, { size: 34, color: C.g500, align: 'center', alpha: eo3(prog(lt, 2.6, 0.5)) });
  const ip = eoBack(prog(lt, 3.3, 0.6));
  if (ip > 0) { ctx.save(); ctx.translate(rx, 830); ctx.scale(ip, ip); txt("It isn't.", 0, 0, { size: 88, weight: 700, color: C.mauve, align: 'center', ls: -3 }); ctx.restore(); }
};

DRAW.chat3 = (lt) => {
  chat({
    x: 340, y: 190, w: 1240, h: 700, tag: 'THE BIGGER PICTURE · 03', qSize: 29,
    q: "So what's the real competition here — banks vs. crypto?",
    q0: 0.35, q1: 1.4, send: 1.5, a0: 2.1, a1: 4.4, aSize: 42, aWeight: 500,
    a: "Probably not. It's ~legacy ~financial ~infrastructure vs. ~programmable, ~private, ~stablecoin-based ~infrastructure.",
    after: (x, y, lt) => {
      const p = eoX(prog(lt, 4.6, 0.8));
      if (p <= 0) return;
      ctx.save(); ctx.globalAlpha *= p; ctx.translate(0, (1 - p) * 30);
      const yy = y + 24;
      rr(x, yy, 300, 80, 16); ctx.fillStyle = '#262625'; ctx.fill(); ctx.strokeStyle = '#3A3A38'; ctx.lineWidth = 1.5; ctx.stroke();
      txt('LEGACY', x + 150, yy + 49, { size: 22, fam: M, color: C.g400, align: 'center', ls: 4 });
      txt('vs', x + 345, yy + 50, { size: 28, weight: 600, color: C.g500, align: 'center' });
      const bw = 590 * eoX(prog(lt, 4.75, 0.8));
      ctx.save(); ctx.shadowColor = C.mauve; ctx.shadowBlur = 30; rr(x + 390, yy, bw, 80, 16); ctx.fillStyle = C.mauve; ctx.fill(); ctx.restore();
      ctx.save(); rr(x + 390, yy, bw, 80, 16); ctx.clip();
      txt('PROGRAMMABLE · PRIVATE · ONCHAIN', x + 390 + 295, yy + 49, { size: 22, fam: M, weight: 700, color: C.white, align: 'center', ls: 3 });
      ctx.restore();
      ctx.restore();
    },
  }, lt);
};

DRAW.outro = (lt) => {
  const out = eio3(prog(lt, 2.6, 0.6));
  if (out < 1) {
    ctx.save(); ctx.globalAlpha = 1 - out; ctx.translate(960, 540); ctx.scale(1 - out * 0.08, 1 - out * 0.08); ctx.translate(-960, -540);
    txt('A stablecoin can move from', 960, 330, { size: 30, fam: M, color: C.g500, align: 'center', ls: 2, alpha: eo3(prog(lt, 0.2, 0.5)) });
    reveal(['a crypto asset'], 960, 470, { size: 96, color: C.g500, align: 'center', t0: 0.35 }, lt);
    const sp = eo3(prog(lt, 1.15, 0.4));
    if (sp > 0) { const ww = tw('a crypto asset', 96, 600, F, -2.9); ctx.fillStyle = C.mauve; ctx.fillRect(960 - ww / 2 - 10, 438, (ww + 20) * sp, 9); }
    const ap = eo3(prog(lt, 1.3, 0.4));
    ctx.save(); ctx.globalAlpha *= ap; ctx.strokeStyle = C.g500; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(960, 515); ctx.lineTo(960, 560); ctx.moveTo(950, 550); ctx.lineTo(960, 562); ctx.lineTo(970, 550); ctx.stroke(); ctx.restore();
    reveal(['a financial ~settlement ~rail.'], 960, 670, { size: 108, color: C.white, accent: C.mauveXl, align: 'center', t0: 1.45, ws: 0.08 }, lt);
    ctx.restore();
  }
  if (lt > 2.7) {
    const ps = GEM.map((_, i) => eoX(prog(lt, 2.8 + i * 0.07, 0.9)));
    const flash = lt > 3.4 ? Math.max(0, 1 - prog(lt, 3.4, 0.6)) * 0.6 : 0;
    const breathe = 1 + Math.sin(lt * 2) * 0.006;
    gem(960, 420, 300 * breathe, { ps, flash, glow: 40 * flash });
    for (let k = 0; k < 3; k++) {
      const p = prog(lt, 3.4 + k * 0.14, 1.6);
      if (p > 0 && p < 1) { ctx.save(); ctx.globalAlpha = (1 - p) * 0.6; circle(960, 420, 120 + eo3(p) * 1100, null, k ? C.g500 : C.mauveLt, 2.5 - k * 0.6); ctx.restore(); }
    }
    const wp = eoX(prog(lt, 3.6, 1.0));
    if (wp > 0) {
      ctx.save(); ctx.beginPath(); ctx.rect(0, 610, W, 140); ctx.clip();
      txt('Seismic', 960, 720 + (1 - wp) * 100, { size: 110, weight: 600, color: C.white, align: 'center', ls: -4 });
      ctx.restore();
    }
    txt('PROGRAMMABLE  ·  PRIVATE  ·  STABLECOIN INFRASTRUCTURE', 960, 790, { size: 20, fam: M, color: C.g400, align: 'center', ls: 5, alpha: eo3(prog(lt, 4.1, 0.6)) });
    txt("That's the part worth watching.", 960, 910, { size: 34, weight: 500, color: C.mauveXl, align: 'center', alpha: eo3(prog(lt, 4.7, 0.7)) });
  }
};

// ======================= RENDER =======================
function sceneAt(t) { for (let i = SCENES.length - 1; i >= 0; i--) if (t >= SCENES[i].start) return i; return 0; }
const TD = 0.9;
function renderFrame(t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1; ctx.filter = 'none';
  const i = sceneAt(t), sc = SCENES[i], lt = t - sc.start;
  background(sc.theme, lt, i);
  ctx.save();
  const z = 1 + 0.03 * (lt / sc.dur);
  ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-W / 2, -H / 2);
  DRAW[sc.id](lt);
  ctx.restore();
  hud(t, sc, i, lt);
  for (let j = 1; j < SCENES.length; j++) {
    const b = SCENES[j].start;
    if (Math.abs(t - b) < TD / 2) wipe((t - b) / TD + 0.5, SCENES[j].theme);
  }
  // fade from / to black
  const fin = 1 - prog(t, 0, 0.4), fout = prog(t, TOTAL - 0.6, 0.6);
  if (fin > 0 || fout > 0) { ctx.fillStyle = `rgba(0,0,0,${Math.max(fin, fout)})`; ctx.fillRect(0, 0, W, H); }
  // grain
  if (!noisePat) noisePat = ctx.createPattern(noise, 'repeat');
  ctx.save(); ctx.globalAlpha = sc.theme === 'dark' ? 0.045 : 0.03; ctx.globalCompositeOperation = 'overlay';
  ctx.translate(Math.floor(hash(Math.floor(t * 30)) * 256), Math.floor(hash(Math.floor(t * 30), 1) * 256));
  ctx.fillStyle = noisePat; ctx.fillRect(-256, -256, W + 512, H + 512); ctx.restore();
}
window.renderFrame = renderFrame;
window.TOTAL = TOTAL;
window.ready = document.fonts.ready.then(() => Promise.all([
  ...[400, 500, 600, 700].map(w => document.fonts.load(`${w} 40px Inter`)),
  ...[400, 500, 700].map(w => document.fonts.load(`${w} 40px "JetBrains Mono"`)),
]));
