<img src="docs/preview.png" alt="pixel space — a sky full of generated pixel-art worlds" width="100%" />

<div align="center">

# ✦ pixel space ✦

**roll a planet · mutate it · share its seed**

<br/>

[![License: MIT](https://img.shields.io/badge/license-MIT-f4a8bc?style=for-the-badge)](LICENSE)
[![React 18](https://img.shields.io/badge/react-18-b8e6c9?style=for-the-badge&logo=react&logoColor=2b2b3a)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/typescript-strict-aecbfa?style=for-the-badge&logo=typescript&logoColor=2b2b3a)](https://www.typescriptlang.org)
[![Vite 5](https://img.shields.io/badge/vite-5-c9b8e6?style=for-the-badge&logo=vite&logoColor=2b2b3a)](https://vitejs.dev)
[![runtime deps](https://img.shields.io/badge/renderer_deps-zero-f9d29d?style=for-the-badge)](#-how-a-world-fits-in-7-characters)

<br/>

_A tiny generative toy that draws retro pixel-art planets, stars and stranger things._
_Every world is deterministic — the same seven characters always paint the same sky._

</div>

<br/>

## ✦ what is it

Two buttons. That's the whole interface.

|     | button       | what it does                                                |
| --- | ------------ | ----------------------------------------------------------- |
| 🎲  | **generate** | rolls a completely new world                                |
| 🧬  | **mutate**   | nudges the current one — same neighbourhood, different face |

A **world / cosmos** switch picks the view: a single portrait of your world, or a wider sky where it hangs among a few deterministic neighbours — each colour-matched to the featured world's dominant hue so every cosmos reads as one sky. Same seed, same cosmos.

Below them sits the **seed** panel: the current world's seed, its main traits (type, size, rings, …), and a field to load your own — paste anything: `1vxi380`, `banana`, your name. Arbitrary text hashes to a valid world; canonical seeds round-trip exactly. Same seed in, same pixels out. Forever.

<br/>

## ✦ the worlds

Eight body types, each with eight hand-tuned colour ramps:

|     | type                                                      |     | type                                             |
| --- | --------------------------------------------------------- | --- | ------------------------------------------------ |
| 🪐  | **gas giant** — banded atmosphere, storm spots            | ☀️  | **star** — radiant corona, directional rays      |
| 🌍  | **terran world** — oceans, continents, clouds, polar caps | 💫  | **neutron star** — pulsar jets and pulse rings   |
| 🧊  | **ice world** — frozen crust, cracked fault lines         | 🕳️  | **black hole** — tilted accretion disks, lensed light, feeding jets |
| 🌑  | **moon** — cratered grey rock                             | 🌋  | **magma core** — lava veins through dark crust   |

…and any of them can carry **rings** (one or two, varied tilt), a little **companion star**, or a **deteriorating crust** that crumbles into drifting debris.

<br/>

## ✦ how a world fits in 7 characters

The seed _is_ the artwork — 33 bits packed into base36:

```
        1 v x i 3 8 0          ← the big pink gas giant up top
        └─────┬─────┘
        33 bits of world DNA

  ┌──────┬─────────┬──────┬───────┬──────┬─────────┬───────┬─────────┬─────────┐
  │ type │ palette │ size │ rings │ tilt │ buddy ★ │ decay │ feature │  noise  │
  │  3b  │   3b    │  3b  │  2b   │  2b  │   1b    │  1b   │   2b    │   16b   │
  └──────┴─────────┴──────┴───────┴──────┴─────────┴───────┴─────────┴─────────┘
```

The 16-bit `noise` field seeds every surface detail — continents, craters, cracks, storms. **Mutation** flips a handful of noise bits and occasionally touches another field, so mutants come out looking like _siblings_ of the original world instead of fresh rolls.

The renderer ([`src/gen/render.js`](src/gen/render.js)) is **dependency-free**: a seeded PRNG, two-octave value noise, and raw pixels on a 96×96 canvas. The same code draws the app, the gallery, and the hero image at the top of this page.

<br/>

## ✦ quickstart

```sh
git clone https://github.com/jdmnk/pixel-space.git
cd pixel-space
npm install
npm run dev     # → http://localhost:5173
```

No API keys. No backend. No config.

| command         |                                                        |
| --------------- | ------------------------------------------------------ |
| `npm run dev`   | start the toy                                          |
| `npm run build` | production build → `dist/`                             |
| `npm run hero`  | regenerate the README hero + social card from curated seeds |

### deploy

It's a static Vite site — one click puts it on Vercel:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fjdmnk%2Fpixel-space)

> **hidden gallery** — add `?gallery` to the URL for a grid of 48 random worlds at once.

<br/>

## ✦ try these seeds

Paste any of these into the seed field — they're the exact worlds from the hero image:

|   seed    | world                                 |
| :-------: | ------------------------------------- |
| `1vxi380` | 🪐 the big pink ringed gas giant      |
| `15lnedd` | 🌍 terran world with a companion star |
| `0guy9ad` | ☀️ the radiant star                   |
| `3oqju3a` | 💫 neutron star with polar jets       |
| `2j4ukhu` | 🧊 ringed ice world                   |
| `0qpi6a7` | 🕳️ feeding black hole with jets       |
| `0jpejuz` | 🌑 crumbling moon                     |

<br/>

## ✦ project structure

```
src/
  gen/
    seed.ts     ← pack · unpack · mutate · hash — all seed logic
    render.ts   ← deterministic pixel renderer (world + cosmos), zero deps
  App.tsx       ← UI: generator, mode switch, hidden gallery
  styles.css    ← pastel pixel-toy aesthetic
scripts/
  hero.ts       ← paints docs/preview.png + public/og.png with the app's own renderer
public/
  og.png        ← 1200×630 social share card (generated)
```

<br/>

## ✦ contributing

Spotted a weird render? Have an idea for a new world type? PRs welcome.

- keep `render.js` dependency-free
- new body types: add a renderer to the `switch` in `render.js` + a name in `TYPE_NAMES` in `seed.js`
- new colour ramps are a perfect first contribution — the palettes live at the top of `render.js`

Not every generated world is beautiful. That's part of the charm. ✦

<br/>

## ✦ license

[MIT](LICENSE) — use it, fork it, ship it, remix it.

<br/>

<div align="center">

<sub>made with ✦ and too many pastel colours</sub>

</div>
