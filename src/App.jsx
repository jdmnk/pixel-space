import { useEffect, useMemo, useRef, useState } from 'react'
import { TYPE_NAMES, canonicalSeed, decodeSeed, mutateSeed, randomSeed } from './gen/seed.js'
import { renderScene } from './gen/render.js'

function useSceneCanvas(seed) {
  const ref = useRef(null)
  useEffect(() => {
    if (ref.current) renderScene(ref.current, decodeSeed(seed))
  }, [seed])
  return ref
}

export default function App() {
  if (typeof window !== 'undefined' && window.location.search.includes('gallery')) {
    return <Gallery />
  }
  return <Generator />
}

function Generator() {
  const [seed, setSeed] = useState(randomSeed)
  const [field, setField] = useState(seed)
  const [seedOpen, setSeedOpen] = useState(true)
  const canvasRef = useSceneCanvas(seed)
  const params = decodeSeed(seed)

  useEffect(() => setField(seed), [seed])

  const load = () => {
    if (field.trim()) setSeed(canonicalSeed(field))
  }

  const ringCount =
    params.type <= 4 ? [0, 1, 1, 2][params.rings] : params.type === 7 ? (params.rings >= 2 ? 2 : 1) : null
  const traits = [
    ['type', TYPE_NAMES[params.type]],
    ['size', `${params.size + 1} / 8`],
    ['palette', `${params.palette + 1} / 8`],
    ['rings', ringCount === null ? '—' : String(ringCount)],
    ['buddy ✦', params.companion ? 'yes' : 'no'],
    ['decay', params.type === 6 ? '—' : params.decay ? 'yes' : 'no'],
  ]

  return (
    <main className="app">
      <span className="deco deco-a">✦</span>
      <span className="deco deco-b">✦</span>
      <span className="deco deco-c">✧</span>
      <span className="deco deco-d">✧</span>

      <h1 className="title">pixel space</h1>

      <div className="frame" key={seed}>
        <div className="frame-inner">
          <canvas ref={canvasRef} width={96} height={96} />
        </div>
      </div>

      <div className="buttons">
        <button className="btn pink" onClick={() => setSeed(randomSeed())}>
          generate
        </button>
        <button className="btn mint" onClick={() => setSeed(mutateSeed(seed))}>
          mutate
        </button>
      </div>

      <details className="seedbox" open={seedOpen} onToggle={(e) => setSeedOpen(e.target.open)}>
        <summary>seed</summary>
        <div className="seedrow">
          <input
            value={field}
            onChange={(e) => setField(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load()}
            spellCheck={false}
            aria-label="seed"
          />
          <button className="btn small" onClick={load}>
            load
          </button>
        </div>
        <ul className="traits">
          {traits.map(([k, v]) => (
            <li key={k}>
              <span>{k}</span>
              {v}
            </li>
          ))}
        </ul>
      </details>
    </main>
  )
}

// hidden helper: /?gallery renders a grid of random worlds for browsing
function Gallery() {
  const seeds = useMemo(() => Array.from({ length: 48 }, randomSeed), [])
  return (
    <main className="gallery">
      {seeds.map((s) => (
        <Tile key={s} seed={s} />
      ))}
    </main>
  )
}

function Tile({ seed }) {
  const ref = useSceneCanvas(seed)
  return <canvas ref={ref} width={96} height={96} title={seed} />
}
