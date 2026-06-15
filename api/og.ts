// GET /api/og?seed=XXX — renders the exact world behind a seed as a
// 1200×630 PNG for social link previews. Deterministic, so it's cached
// immutably. Reuses the app's own renderer through the headless helpers.

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { decodeSeed } from '../src/gen/seed'
import { renderScene } from '../src/gen/render'
import { createPixelCanvas, encodePng, upscale } from '../src/gen/headless'

// render small for the chunky retro look, then nearest-neighbour upscale
const W0 = 240
const H0 = 126
const FACTOR = 5

export default function handler(req: VercelRequest, res: VercelResponse) {
  const raw = req.query.seed
  const seed = (Array.isArray(raw) ? raw[0] : raw)?.toString() || 'pixel space'
  const params = decodeSeed(seed)

  const { canvas, pixels } = createPixelCanvas(W0, H0)
  renderScene(canvas, params, { cx: W0 >> 1, cy: H0 >> 1, scale: 2 })
  const big = upscale(pixels, W0, H0, FACTOR)
  const png = encodePng(big.pixels, big.width, big.height)

  res.setHeader('Content-Type', 'image/png')
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
  res.end(png)
}
