import { useMemo, useState } from 'react'
import type { ScenarioPrelude } from '../types'

interface Props {
  scenario: ScenarioPrelude | null
}

// Şimdilik "görülebilir bir yerde dursun" kararı — tasarım kararı gelince yeri değişir.
// Görsel Pollinations (key'siz, ücretsiz); senaryo eksenleri prompt'a sinir.
export default function SceneCard({ scenario }: Props) {
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1e6))
  const [loaded, setLoaded] = useState(false)

  const url = useMemo(() => {
    const doku = scenario?.tur_doku ?? 'gerilim'
    const renk = scenario?.duygu_rengi ?? 'melankolik'
    const oz = scenario?.gerilim_ozu ?? 'iki varlık arasındaki sessiz gerilim'
    const prompt =
      `oil painting, dark baroque theater stage, ${doku} mood, ${renk} atmosphere, ` +
      `tension of ${oz}, a golden queen silhouette and a pale figure facing each other, ` +
      `chiaroscuro, cinematic, moody`
    return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=512&height=512&nologo=true&seed=${seed}`
  }, [scenario, seed])

  return (
    <div style={{
      position: 'relative', width: 150,
      border: '1px solid rgba(212,175,55,0.30)',
      borderRadius: 4, overflow: 'hidden',
      background: 'rgba(10,8,4,0.7)', backdropFilter: 'blur(10px)',
    }}>
      <a href={url} target="_blank" rel="noreferrer" style={{ display: 'block' }}>
        <img
          src={url}
          alt="sahne"
          onLoad={() => setLoaded(true)}
          style={{
            display: 'block', width: 150, height: 150, objectFit: 'cover',
            opacity: loaded ? 0.85 : 0, transition: 'opacity 1s ease', cursor: 'zoom-in',
          }}
        />
      </a>
      {!loaded && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: '0.15em', color: 'rgba(212,175,55,0.5)' }}>
          SAHNE…
        </div>
      )}
      <button
        title="Yeni sahne üret"
        onClick={e => { e.preventDefault(); setLoaded(false); setSeed(Math.floor(Math.random() * 1e6)) }}
        style={{
          position: 'absolute', top: 4, right: 4, width: 20, height: 20,
          borderRadius: '50%', border: '1px solid rgba(255,255,255,0.2)',
          background: 'rgba(0,0,0,0.5)', color: 'rgba(255,255,255,0.7)',
          fontSize: 11, lineHeight: 1, cursor: 'pointer', padding: 0,
        }}
      >↻</button>
      <div style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: 8, letterSpacing: '0.18em',
        color: 'rgba(212,175,55,0.55)', textAlign: 'center', padding: '3px 0',
        borderTop: '1px solid rgba(212,175,55,0.15)',
      }}>SAHNE</div>
    </div>
  )
}
