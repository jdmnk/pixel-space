import { useEffect, useMemo, useRef, useState } from 'react'
import { TYPE_NAMES, canonicalSeed, decodeSeed, mutateSeed, randomSeed } from './gen/seed.ts'
import { renderScene, renderSpace } from './gen/render.ts'

type SceneMode = 'world' | 'cosmos'
type Theme = 'light' | 'dark'

const META_THEME = { light: '#faf3ea', dark: '#1b1626' }

function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('theme')
    if (saved === 'light' || saved === 'dark') return saved
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('theme', theme)
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', META_THEME[theme])
  }, [theme])
  return [theme, () => setTheme((t) => (t === 'light' ? 'dark' : 'light'))]
}

function useSceneCanvas(seed: string, mode: SceneMode = 'world') {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    if (!ref.current) return
    const params = decodeSeed(seed)
    if (mode === 'cosmos') renderSpace(ref.current, params)
    else renderScene(ref.current, params)
  }, [seed, mode])
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
  const [mode, setMode] = useState<SceneMode>('world')
  const [theme, toggleTheme] = useTheme()
  const canvasRef = useSceneCanvas(seed, mode)
  const params = decodeSeed(seed)

  useEffect(() => setField(seed), [seed])

  const load = () => {
    if (field.trim()) setSeed(canonicalSeed(field))
  }

  const ringCount =
    params.type <= 4 ? [0, 1, 1, 2][params.rings] : params.type === 7 ? (params.rings >= 2 ? 2 : 1) : null
  const traits: [string, string][] = [
    ['type', TYPE_NAMES[params.type]],
    ['size', `${params.size + 1} / 8`],
    ['palette', `${params.palette + 1} / 8`],
    ['rings', ringCount === null ? '—' : String(ringCount)],
    ['buddy ✦', params.companion ? 'yes' : 'no'],
    ['decay', params.type === 6 ? '—' : params.decay ? 'yes' : 'no'],
  ]

  return (
    <main className="app">
      <button
        className="theme-toggle"
        onClick={toggleTheme}
        aria-label={theme === 'light' ? 'switch to dark mode' : 'switch to light mode'}
        title={theme === 'light' ? 'dark mode' : 'light mode'}
      >
        {theme === 'light' ? '☾' : '☀'}
      </button>

      <span className="deco deco-a">✦</span>
      <span className="deco deco-b">✦</span>
      <span className="deco deco-c">✧</span>
      <span className="deco deco-d">✧</span>

      <h1 className="title">pixel space</h1>

      <div className="modes" role="tablist" aria-label="scene mode">
        <button className={mode === 'world' ? 'mode on' : 'mode'} onClick={() => setMode('world')}>
          world
        </button>
        <button className={mode === 'cosmos' ? 'mode on' : 'mode'} onClick={() => setMode('cosmos')}>
          cosmos
        </button>
      </div>

      <div className="frame" key={seed + mode}>
        <div className="frame-inner">
          <canvas
            ref={canvasRef}
            width={mode === 'cosmos' ? 192 : 96}
            height={mode === 'cosmos' ? 120 : 96}
            className={mode === 'cosmos' ? 'wide' : ''}
          />
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

      <details className="seedbox" open={seedOpen} onToggle={(e) => setSeedOpen(e.currentTarget.open)}>
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

function Tile({ seed }: { seed: string }) {
  const ref = useSceneCanvas(seed)
  return <canvas ref={ref} width={96} height={96} title={seed} />
}
