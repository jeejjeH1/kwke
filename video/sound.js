// Synthesised score + sound design, driven by timeline.js. Writes out/audio.wav (48k stereo).
const fs = require('fs'), path = require('path');
const { SCENES, TOTAL, CUES } = require('./timeline.js');
const SR = 48000, N = Math.ceil((TOTAL + 0.5) * SR);
const L = new Float32Array(N), R = new Float32Array(N);       // dry bus
const RL = new Float32Array(N), RR = new Float32Array(N);     // reverb send
let seed = 1; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
const at = s => Math.floor(s * SR);
const startOf = id => SCENES.find(s => s.id === id).start;

function put(i, v, pan = 0, send = 0) {
  if (i < 0 || i >= N) return;
  const gl = Math.cos((pan + 1) * Math.PI / 4), gr = Math.sin((pan + 1) * Math.PI / 4);
  L[i] += v * gl; R[i] += v * gr; RL[i] += v * gl * send; RR[i] += v * gr * send;
}
// generic voice: freq(t), env(t), wave
function tone(t0, dur, freq, env, { amp = 0.2, pan = 0, send = 0.2, wave = 'sine' } = {}) {
  let ph = 0; const i0 = at(t0), n = at(dur);
  for (let k = 0; k < n; k++) {
    const t = k / SR, f = typeof freq === 'function' ? freq(t) : freq;
    ph += 2 * Math.PI * f / SR;
    let s = Math.sin(ph);
    if (wave === 'tri') s = 2 / Math.PI * Math.asin(Math.sin(ph));
    if (wave === 'saw') s = ((ph / Math.PI) % 2) - 1;
    put(i0 + k, s * env(t, dur) * amp, pan, send);
  }
}
// filtered noise with state-variable filter; fc(t) and q
function noise(t0, dur, fc, env, { amp = 0.2, q = 1, mode = 'bp', pan = 0, send = 0.3 } = {}) {
  let lo = 0, bp = 0; const i0 = at(t0), n = at(dur);
  for (let k = 0; k < n; k++) {
    const t = k / SR, f = Math.min(0.99, 2 * Math.sin(Math.PI * Math.min(fc(t), SR / 6) / SR));
    const x = rnd() * 2 - 1;
    lo += f * bp; const hi = x - lo - bp / q; bp += f * hi;
    const s = mode === 'bp' ? bp : mode === 'hp' ? hi : lo;
    const p = typeof pan === 'function' ? pan(t) : pan;
    put(i0 + k, s * env(t, dur) * amp, p, send);
  }
}
const exp = k => (t) => Math.exp(-t * k);
const adsr = (a, r) => (t, d) => Math.min(1, t / a) * Math.min(1, Math.max(0, (d - t) / r));

// ---------- sound vocabulary ----------
const S = {
  boom(t) {
    tone(t, 2.5, tt => 30 + 70 * Math.exp(-tt * 9), exp(1.8), { amp: 0.9, send: 0.15 });
    noise(t, 1.6, tt => 3000 * Math.exp(-tt * 3) + 200, exp(3), { amp: 0.5, q: 0.7, mode: 'lp', send: 0.6 });
    tone(t, 3, 55, (tt) => Math.exp(-tt * 1.2) * 0.5, { amp: 0.25, wave: 'tri', send: 0.5 });
  },
  hit(t) {
    tone(t, 1.2, tt => 45 + 90 * Math.exp(-tt * 18), exp(4), { amp: 0.75, send: 0.1 });
    noise(t, 0.6, tt => 6000 * Math.exp(-tt * 6) + 300, exp(8), { amp: 0.35, q: 0.8, mode: 'lp', send: 0.5 });
  },
  rise(t, d) { noise(t, d + 0.1, tt => 300 + 5000 * Math.pow(tt / d, 2), (tt) => Math.pow(Math.min(1, tt / d), 2.2) * (tt > d ? Math.max(0, 1 - (tt - d) / 0.1) : 1), { amp: 0.35, q: 2.5, send: 0.5, pan: tt => Math.sin(tt * 3) * 0.4 }); },
  whoosh(t) { // centred on t
    noise(t - 0.45, 0.9, tt => 400 + 4500 * Math.sin(Math.PI * tt / 0.9), (tt) => Math.pow(Math.sin(Math.PI * tt / 0.9), 2), { amp: 0.32, q: 1.6, send: 0.35, pan: tt => -0.7 + 1.4 * tt / 0.9 });
  },
  shimmer(t) {
    [880, 1318.5, 1760, 2637].forEach((f, i) => tone(t + i * 0.06, 2.2, f, (tt, d) => Math.min(1, tt / 0.02) * Math.exp(-tt * 2.2), { amp: 0.05, send: 0.9, pan: (i - 1.5) * 0.4 }));
  },
  type(t0, t1, soft = 1) {
    let t = t0;
    while (t < t1) {
      noise(t, 0.03, () => 2500 + rnd() * 2500, exp(160), { amp: 0.16 * soft * (0.6 + rnd() * 0.4), q: 3, pan: (rnd() - 0.5) * 0.3, send: 0.05 });
      tone(t, 0.02, 180 + rnd() * 60, exp(250), { amp: 0.06 * soft, send: 0 });
      t += 0.045 + rnd() * 0.05;
    }
  },
  blip(t) { tone(t, 0.25, tt => 660 + 600 * Math.min(1, tt / 0.05), (tt) => Math.min(1, tt / 0.004) * Math.exp(-tt * 18), { amp: 0.16, send: 0.4 }); },
  pops(t0, n, dt) { for (let i = 0; i < n; i++) tone(t0 + i * dt, 0.15, 900 + i * 110, (tt) => Math.min(1, tt / 0.003) * Math.exp(-tt * 30), { amp: 0.12, pan: -0.6 + 1.2 * i / n, send: 0.35 }); },
  thuds(t0, n, dt) { for (let i = 0; i < n; i++) { const t = t0 + i * dt; tone(t, 0.4, tt => 70 + 120 * Math.exp(-tt * 30), exp(14), { amp: 0.4, send: 0.1 }); noise(t, 0.08, () => 1800, exp(60), { amp: 0.12, q: 1, send: 0.2 }); } },
  ticks(t0, t1) { for (let t = t0; t < t1; t += 0.035) tone(t, 0.02, 2000 + rnd() * 3000, exp(300), { amp: 0.05, pan: (rnd() - 0.5) * 0.8, send: 0.1 }); },
  tick1(t) { noise(t, 0.05, () => 3500, exp(90), { amp: 0.25, q: 2, send: 0.2 }); tone(t, 0.3, 1500, (tt) => Math.exp(-tt * 20), { amp: 0.1, send: 0.5 }); },
  pings(t0, n, dt) { for (let i = 0; i < n; i++) tone(t0 + (i + 1) * dt - 0.4, 0.6, 520, (tt) => Math.min(1, tt / 0.003) * Math.exp(-tt * 9), { amp: 0.09, pan: -0.6 + 1.2 * i / n, send: 0.5, wave: 'tri' }); },
  ping(t, f = 1) { tone(t, 1.6, 1046.5 * f, (tt) => Math.min(1, tt / 0.003) * Math.exp(-tt * 3.5), { amp: 0.11, send: 0.8, pan: 0.6 }); tone(t, 1.6, 1568 * f, (tt) => Math.min(1, tt / 0.003) * Math.exp(-tt * 4), { amp: 0.05, send: 0.8, pan: 0.6 }); },
  zip(t) { noise(t - 0.05, 0.65, tt => 800 + 7000 * tt / 0.65, (tt) => Math.sin(Math.PI * tt / 0.65), { amp: 0.35, q: 4, send: 0.3, pan: tt => -0.8 + 1.6 * tt / 0.65 }); },
  scan(t, d) { tone(t, d, tt => 200 + 600 * tt / d, (tt) => Math.sin(Math.PI * tt / d), { amp: 0.07, wave: 'saw', send: 0.5 }); noise(t, d, tt => 1000 + 3000 * tt / d, (tt) => Math.sin(Math.PI * tt / d), { amp: 0.12, q: 6, send: 0.4 }); },
  tone(t, i) { const f = [523.25, 659.25, 783.99, 392][i]; tone(t, 2, f, (tt) => Math.min(1, tt / 0.01) * Math.exp(-tt * 2.5), { amp: 0.08, send: 0.8, pan: [-0.3, 0, 0.3, 0][i] }); },
};

for (const sc of SCENES) for (const [kind, ...a] of CUES[sc.id] || []) {
  const args = a.map((v, i) => (i === 0 || (kind === 'type' && i === 1) || (kind === 'ticks' && i === 1)) ? v + sc.start : v);
  S[kind](...args);
}
// transitions
SCENES.slice(1).forEach(sc => S.whoosh(sc.start));

// ---------- music ----------
const BPM = 112, beat = 60 / BPM, bar = beat * 4;
const m0 = startOf('hook'), m1 = startOf('outro') + 2.6;
const prog = [[55, 65.41, 82.41], [43.65, 65.41, 87.31], [65.41, 82.41, 98], [49, 73.42, 98]]; // Am F C G
// pad across whole piece
for (let b = 0; b * bar < TOTAL; b++) {
  const t = b * bar, ch = prog[b % 4];
  const lvl = t < m0 ? 0.6 : 1;
  ch.forEach((f, i) => [1, 2, 4].forEach((mul, j) => {
    tone(t, bar + 0.6, f * mul * (1 + (j - 1) * 0.002 * (i + 1)), (tt, d) => Math.min(1, tt / 0.6) * Math.min(1, (d - tt) / 0.8), { amp: 0.026 * lvl / (j + 1), wave: j ? 'tri' : 'sine', pan: (i - 1) * 0.5, send: 0.7 });
  }));
}
// drums + bass while the story runs
for (let k = 0, t = m0; t < m1; k++, t = m0 + k * beat) {
  const barIdx = Math.floor((t) / bar), root = prog[barIdx % 4][0];
  tone(t, 0.45, tt => 48 + 110 * Math.exp(-tt * 35), exp(9), { amp: 0.55, send: 0.03 });
  noise(t + beat / 2, 0.06, () => 9000, exp(70), { amp: 0.08, q: 0.8, mode: 'hp', pan: 0.25, send: 0.1 });
  if (k % 4 === 2) noise(t, 0.25, tt => 1800, exp(18), { amp: 0.18, q: 0.6, send: 0.35 });
  tone(t + beat / 2, beat * 0.45, root, (tt, d) => Math.min(1, tt / 0.01) * Math.exp(-tt * 5), { amp: 0.22, wave: 'tri', send: 0.05 });
  if (k % 2 === 1) tone(t + beat * 0.75, 0.12, root * 4 * (k % 8 === 3 ? 1.5 : 2), (tt) => Math.exp(-tt * 25), { amp: 0.03, send: 0.6, pan: -0.4 });
}

// ---------- reverb (Schroeder) ----------
function reverb(inp, out, off) {
  const combs = [1557, 1617, 1491, 1422].map(d => ({ d: d + off, b: new Float32Array(d + off), i: 0, f: 0 }));
  const aps = [225, 556, 441].map(d => ({ d, b: new Float32Array(d), i: 0 }));
  for (let n = 0; n < N; n++) {
    let s = 0; const x = inp[n] * 0.2;
    for (const c of combs) { const y = c.b[c.i]; c.f = y * 0.75 + c.f * 0.25; c.b[c.i] = x + c.f * 0.86; c.i = (c.i + 1) % c.d; s += y; }
    for (const a of aps) { const y = a.b[a.i]; const v = s + y * 0.5; a.b[a.i] = v; s = y - v * 0.5; a.i = (a.i + 1) % a.d; }
    out[n] += s * 0.9;
  }
}
reverb(RL, L, 0); reverb(RR, R, 23);

// ---------- master: fade, soft clip, normalise ----------
let peak = 0;
for (let n = 0; n < N; n++) {
  const t = n / SR, f = Math.min(1, t / 0.3) * Math.min(1, Math.max(0, (TOTAL - t) / 1.2));
  L[n] = Math.tanh(L[n] * 1.1) * f; R[n] = Math.tanh(R[n] * 1.1) * f;
  peak = Math.max(peak, Math.abs(L[n]), Math.abs(R[n]));
}
const g = 0.89 / peak, buf = Buffer.alloc(44 + N * 4);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16);
buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
buf.write('data', 36); buf.writeUInt32LE(N * 4, 40);
for (let n = 0; n < N; n++) { buf.writeInt16LE(Math.round(L[n] * g * 32767), 44 + n * 4); buf.writeInt16LE(Math.round(R[n] * g * 32767), 46 + n * 4); }
fs.mkdirSync(path.join(__dirname, 'out'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'out', 'audio.wav'), buf);
console.log('audio.wav', (N / SR).toFixed(1) + 's', 'peak', peak.toFixed(2));
