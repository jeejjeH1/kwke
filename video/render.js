// Usage: node render.js preview 1.0 3.5 ...   -> PNG stills in out/preview
//        node render.js video [fps]           -> out/frames.mp4 (silent)
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path'), { spawn } = require('child_process');
const root = __dirname, out = path.join(root, 'out');
fs.mkdirSync(path.join(out, 'preview'), { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.woff2': 'font/woff2' };
const server = http.createServer((q, r) => {
  const f = path.join(root, decodeURIComponent(q.url.split('?')[0]));
  fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); r.end(d); });
}).listen(0);
(async () => {
  const [mode, ...args] = process.argv.slice(2);
  const browser = await chromium.launch({ args: ['--disable-gpu-vsync'] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  page.on('console', m => console.log('[page]', m.text()));
  page.on('pageerror', e => console.log('[err]', e.message));
  await page.goto(`http://localhost:${server.address().port}/index.html`);
  await page.evaluate(() => window.ready);
  const grab = async t => Buffer.from((await page.evaluate(t => { renderFrame(t); return document.getElementById('c').toDataURL('image/png'); }, t)).split(',')[1], 'base64');
  if (mode === 'preview') {
    for (const a of args) fs.writeFileSync(path.join(out, process.env.PDIR || 'preview', `t${(+a).toFixed(2)}.png`), await grab(+a));
  } else {
    const fps = +(args[0] || 30), total = await page.evaluate(() => TOTAL), n = Math.round(total * fps);
    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-', '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', path.join(out, 'frames.mp4')], { stdio: ['pipe', 'inherit', 'inherit'] });
    const t0 = Date.now();
    for (let f = 0; f < n; f++) {
      const buf = await grab(f / fps);
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      if (f % 150 === 0) console.log(`frame ${f}/${n}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    }
    ff.stdin.end(); await new Promise(r => ff.on('close', r));
  }
  await browser.close(); server.close();
})();
