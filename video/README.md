# Seismic — The Stablecoin Stack (motion piece)

16:9, 1920×1080, 30 fps, ~71 s, for an X/Twitter thread. Final render: `../seismic-stablecoin-stack.mp4`.

Everything is code: a deterministic canvas animation (`anim.js`), a shared timeline (`timeline.js`),
and a synthesised score + sound design (`sound.js`). The logo is rebuilt as vector facets so it can
assemble/shatter on screen. Palette: Mauve #825A6D, Purple #523542, greys #FCFCFC → #161616.

```bash
export NODE_PATH=$(npm root -g)          # needs playwright + chromium, ffmpeg
open index.html                          # live preview (?t=30 to jump)
node render.js preview 12 30.5           # stills -> out/preview
node render.js video 30                  # frames -> out/frames.mp4
node sound.js                            # -> out/audio.wav
ffmpeg -i out/frames.mp4 -i out/audio.wav -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart ../seismic-stablecoin-stack.mp4
```

Scenes: intro (gem assembles from a seismic tremor) → hook → Claude chat #1 (token ≠ financial system) →
the stack → virtual accounts → cross-border rails → Claude chat #2 (privacy) + shielded ledger →
controlled access → `uint256` → `suint256` → Claude chat #3 (the real competition) → outro.
