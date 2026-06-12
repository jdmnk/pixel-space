// GET /s/XXX (rewritten to /api/share?seed=XXX) — the shareable link.
// Returns a tiny HTML doc carrying per-seed Open Graph tags so crawlers
// (iMessage, Discord, Slack, X, …) show the seed's own world, then bounces
// human visitors straight into the app at /?seed=XXX.

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { canonicalSeed, decodeSeed, TYPE_NAMES } from '../src/gen/seed.ts'

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

export default function handler(req: VercelRequest, res: VercelResponse) {
  const raw = req.query.seed
  const seed = canonicalSeed((Array.isArray(raw) ? raw[0] : raw)?.toString() || 'pixel space')
  const type = TYPE_NAMES[decodeSeed(seed).type]

  const proto = (req.headers['x-forwarded-proto'] as string) || 'https'
  const host = (req.headers['x-forwarded-host'] as string) || req.headers.host || 'pixel-space.vercel.app'
  const origin = `${proto}://${host}`
  const image = `${origin}/api/og?seed=${seed}`
  const appUrl = `${origin}/?seed=${seed}`
  const title = `pixel space · ${seed}`
  const desc = `a ${type} — open to roll your own pixel-art world`

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 'public, max-age=3600')
  res.end(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="pixel space" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(desc)}" />
<meta property="og:image" content="${esc(image)}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:url" content="${esc(appUrl)}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(title)}" />
<meta name="twitter:description" content="${esc(desc)}" />
<meta name="twitter:image" content="${esc(image)}" />
<meta http-equiv="refresh" content="0; url=${esc(appUrl)}" />
<script>location.replace(${JSON.stringify(appUrl)})</script>
</head>
<body></body>
</html>`)
}
