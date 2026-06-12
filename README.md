# pixel space ✦

A tiny generative pixel-art toy that draws little planets and stars, in the
spirit of the reference sheets in `examples/`.

```sh
npm install
npm run dev
```

- **generate** — rolls a brand new world
- **mutate** — nudges the current one (palette, rings, surface noise, …)
- **seed** (collapsed below the buttons) — read the current seed or paste any
  text and press *load*; the same seed always produces the same image

## How it works

A seed is a 33-bit parameter pack encoded as 7 base36 characters:
`type · palette · size · rings · ringStyle · companion · decay · feature · detail(16)`.
The renderer (`src/gen/render.js`) draws a 96×96 scene from those parameters
alone — body types are gas giant, terran world, ice world, moon, magma core,
star, neutron star and black hole, optionally with rings, a companion star or
a deteriorating crust. Because mutation only flips a few fields, mutants look
like siblings of the original instead of fresh rolls.

Visit `/?gallery` for a grid of 48 random worlds.
