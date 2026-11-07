# Pamper Time: Relaxing Minis

An original, relaxing HTML5 mini-game collection. 20 gentle minis — skincare,
make-up, tidying and pet care — with no timer and **no fail state**. Finish each
mini at your own pace to earn up to 3 stars.

All titles, characters (Momo, and Biscuit the puppy), art and music are
original. Art is drawn procedurally on canvas; sound is synthesized with
WebAudio. Nothing is copied from any existing game: no copied art, code, names,
characters or assets, no stock images, no licensed characters, no emoji-only
art, no copyrighted music.

## The 20 minis

| # | Mini | Mechanic |
|---|------|----------|
| 1 | Gentle Face Wash | Drag-clean bubbles |
| 2 | Moisturiser Dots | Tap cream dots |
| 3 | Sheet Mask | Drag pieces onto the face |
| 4 | Lip Care | Paint the lips |
| 5 | Blush Time | Paint both cheeks |
| 6 | Nail Polish | Paint five nails |
| 7 | Eye Sparkle | Tap stars in order 1→5 |
| 8 | Hair Brushing | Drag-clean tangles |
| 9 | Pretty Hair Bow | Drag the bow onto the hair |
| 10 | Tidy the Vanity | Drag bottles to shelf spots |
| 11 | Fold the Towels | Drag towels to the shelf |
| 12 | Dust the Shelf | Drag-clean dust |
| 13 | Sort the Drawer | Drag items to matching baskets |
| 14 | Water the Plant | Tap water drops |
| 15 | Biscuit's Snack | Drag biscuits to the puppy |
| 16 | Brush Biscuit | Drag-clean loose fur |
| 17 | Puppy Bath Bubbles | Tap bubbles |
| 18 | Treats in Order | Tap treats in order 1→6 |
| 19 | Tuck-In Time | Drag blanket/pillow/toy to the bed |
| 20 | Spa Finale | Paint the glow, then tap the sparkles |

Difficulty rises across the set: more items per mini, smaller targets, longer
tap-in-order sequences. A wrong tap just wobbles — nothing is lost, and there
is no game-over screen; the only end state is the win screen after mini 20.

## Features

- Start menu with How to Play, level-select grid (finish a mini to unlock the
  next), pause, mute, score and star totals, progress bar per mini.
- Stars: 3 for a perfect mini, 2 for 1–2 mistakes, 1 otherwise. Progress
  (stars + unlocks) persists in `localStorage`.
- Synthesized WebAudio: gentle pentatonic music loop plus pop / sparkle /
  swoosh / place / chime effects. No audio files.
- Portrait-friendly 480×800 canvas, touch (pointer events) + mouse, works on
  desktop and mobile browsers. Single self-contained `index.html` — no engine,
  no external assets, no network needed.
- Test hook `window.__pamper()` exposes screen/level/mode/progress and the
  current actionable targets (used by the test scripts; harmless in play).

## How to run

Open `index.html` directly in any modern browser (double-click, or serve it,
e.g. `python3 -m http.server` and visit `http://localhost:8000/`). No build
step, no install.

## How to test

Playwright + headless Chromium (the same harness used for the other
playables in this folder):

```sh
NODE_PATH=~/workspace/tools/pw-shot/node_modules node test.js \
  "file://$PWD/index.html" test-shots        # full sequential run
NODE_PATH=~/workspace/tools/pw-shot/node_modules node test-chunk.js \
  "file://$PWD/index.html" test-shots 4 10  # levels 4-10 (seeded unlock)
NODE_PATH=~/workspace/tools/pw-shot/node_modules node menu-shot.js  # menu shot
```

`test.js` plays the whole game with real mouse clicks/drags; `test-chunk.js`
seeds the game's own save file (unlocked = 20) via `addInitScript`, opens the
level-select grid, and plays a level range the same way.

## Test results (Nov 6, 2026, headless Chromium, real clicks/drags)

- **Loads / menu / How to Play / Start → level 1: PASS.** Pause → paused,
  Resume → playing, Mute on/off toggling: PASS.
- **Levels 1–3: PASS** in the sequential run (level 1 cleared with 3 stars,
  score 250; level 2 and 3 cleared with 3 stars each; Next advances).
- **Levels 4–20: PASS** in chunked runs (see below for why chunked):
  4 Lip Care, 5 Blush Time, 6 Nail Polish, 7 Eye Sparkle, 8 Hair Brushing,
  9 Pretty Hair Bow, 10 Tidy the Vanity, 11 Fold the Towels, 12 Dust the
  Shelf, 13 Sort the Drawer, 14 Water the Plant, 15 Biscuit's Snack,
  16 Brush Biscuit, 17 Puppy Bath Bubbles, 18 Treats in Order, 19 Tuck-In
  Time, **20 Spa Finale → WIN screen: PASS**. Every level-clear check
  recorded stars ≥ 1, and every chunk reported **zero page/console errors**.
- **All 5 mechanics verified with real input:** tap, drag-clean, drag-drop,
  tap-in-order, paint (including the Spa Finale's paint-then-tap-sparkles
  finish). Level select → chosen level: PASS. Play Again on the WIN screen →
  level 1 playing with done = 0: PASS (`again-check.js`, no errors).
- **Screenshots verified by eye:** `test-shots/01-menu.png` (menu),
  `02-level1.png`, `03-clear.png`, `10-level10.png`, `20-level20.png`,
  `21-win.png` — menu, level 10 and win screens re-checked after layout
  fixes (below).

### Honest caveats

1. **Long headless sessions die.** The stock headless Chromium in this VM
   closes itself ("Target page, context or browser has been closed") after
   roughly 90–130 s of sustained real mouse input; an idle page with the
   same music loop survived 150 s, and `/tmp` (440 MB free) and RAM
   (2.3 GB available) were not exhausted, so this looks like a
   headless-renderer stability limit under sustained input, not a game bug.
   That is why the full 20-level playthrough was verified in short chunked
   runs (2–3 levels per fresh browser session) instead of one long session.
   The sequential run therefore covers progression 1→2→3, and the chunks
   cover 4–20 level by level; no level was left unverified.
2. **Bugs found by testing and fixed:**
   - Paint levels could never complete: the completion check compared
     painted cells against the full cell count while the threshold was 85%.
     Fixed to complete at ≥ 85% painted; Spa Finale now holds at 85% until
     its sparkles are tapped.
   - Menu/win/drag-target layout overlaps found on screenshots: pets
     overlapping menu text, a star overlapping the title, win-screen text
     touching the face, and level-10 target circles/labels colliding.
     Fixed (pets moved to the sides, star removed, win layout re-spaced,
     target circles de-duplicated, shrunk to r=36, labels removed, towel
     and vanity targets spread along the shelf) and re-verified.
   - Slow headless input: the 60 fps redraw made CDP mouse actions take
     ~1 s each; the render loop is now throttled to ~8 fps with cached
     gradients (plenty for this calm game) and paint SFX throttled to
     120 ms. Chunk runtimes roughly halved after this change.

## Files

- `index.html` — the whole game (single file, ~31 KB).
- `README.md` — this file.
- `test.js` — full sequential real-click test.
- `test-chunk.js` — chunked real-click test (seeded unlock, level range).
- `again-check.js` — WIN → Play Again verification.
- `menu-shot.js` — menu screenshot helper.
- `test-shots/` — screenshots from the test runs.

Nothing has been submitted to any portal. Build only.
