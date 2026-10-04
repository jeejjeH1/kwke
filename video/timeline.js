// Shared timeline: used by the canvas animation (browser) and the sound design (node).
(function (root) {
  const SCENES = [
    { id: 'intro',    dur: 5.5, theme: 'dark',  ch: '' },
    { id: 'hook',     dur: 5.5, theme: 'light', ch: '01' },
    { id: 'chat1',    dur: 7.0, theme: 'dark',  ch: '02' },
    { id: 'stack',    dur: 6.0, theme: 'light', ch: '03' },
    { id: 'accounts', dur: 6.0, theme: 'light', ch: '04' },
    { id: 'border',   dur: 7.0, theme: 'dark',  ch: '05' },
    { id: 'chat2',    dur: 7.5, theme: 'dark',  ch: '06' },
    { id: 'access',   dur: 6.0, theme: 'dark',  ch: '07' },
    { id: 'code',     dur: 5.5, theme: 'light', ch: '08' },
    { id: 'chat3',    dur: 6.5, theme: 'dark',  ch: '09' },
    { id: 'outro',    dur: 8.0, theme: 'dark',  ch: '10' },
  ];
  let s = 0;
  for (const sc of SCENES) { sc.start = s; s += sc.dur; }
  const TOTAL = s;

  // Scene-relative sound cues. Kinds: boom, whoosh, type, blip, pop, thud, tick, ping, zip, scan, tone, hit
  const CUES = {
    intro:    [['rise', 0.5, 1.5], ['boom', 2.0], ['shimmer', 3.1]],
    hook:     [['hit', 1.9], ['whoosh', 2.6]],
    chat1:    [['type', 0.45, 1.6], ['blip', 1.7], ['type', 2.4, 4.0, 0.6], ['pops', 4.05, 8, 0.07]],
    stack:    [['thuds', 0.75, 8, 0.16], ['shimmer', 3.8]],
    accounts: [['ticks', 0.3, 1.2], ['ticks', 1.8, 2.6], ['whoosh', 2.0]],
    border:   [['pings', 0.8, 5, 0.8], ['zip', 2.4], ['ping', 2.95, 1.6]],
    chat2:    [['type', 0.35, 1.5], ['blip', 1.6], ['type', 2.2, 4.4, 0.6], ['scan', 4.6, 1.0]],
    access:   [['tone', 0.8, 0], ['tone', 1.4, 1], ['tone', 2.0, 2], ['tone', 2.6, 3]],
    code:     [['tick1', 1.4], ['tick1', 1.9], ['hit', 3.3]],
    chat3:    [['type', 0.35, 1.4], ['blip', 1.5], ['type', 2.1, 4.4, 0.6], ['hit', 4.65]],
    outro:    [['hit', 1.2], ['whoosh', 2.7], ['boom', 3.4], ['shimmer', 4.3]],
  };

  const api = { SCENES, TOTAL, CUES };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else Object.assign(root, api);
})(this);
