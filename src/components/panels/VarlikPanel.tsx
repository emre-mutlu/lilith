import { useMemo } from 'react'
import type { Message, SpeakerState } from '../../types'
import { scoreMessage } from '../../lib/sentiment'

const BARS = [1, 3, 5, 3, 2, 4, 3, 2, 1, 4, 2]

interface Props {
  active: boolean
  state: SpeakerState
  lastMessage: Message | undefined
  messages: Message[]
}

export default function VarlikPanel({ active, state, lastMessage, messages }: Props) {
  const isGenerating = active && state === 'generating'
  const isSpeaking = active && state === 'speaking'

  const varlikMessages = useMemo(() => messages.filter(m => m.sender === 'generic'), [messages])

  const scores = useMemo(() =>
    varlikMessages.slice(-10).map(m => scoreMessage(m).score)
  , [varlikMessages])

  const avgScore = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0
  const maxScore = Math.max(...scores, 1)
  const fillPct = Math.min(100, Math.round((avgScore / 5) * 100))

  const statusLabel = varlikMessages.length === 0
    ? 'Sessiz'
    : avgScore >= 3 ? 'Yoğun'
    : avgScore >= 1.5 ? 'Aktif'
    : 'Düşük'

  return (
    <div style={{
      position: 'relative',
      background: 'rgba(14,14,16,0.35)',
      border: `1px solid rgba(255,255,255,${active ? 0.18 : 0.08})`,
      borderRadius: 6,
      padding: '28px 30px 0',
      overflow: 'hidden',
      minHeight: 360,
      display: 'flex', flexDirection: 'column',
      transition: 'border-color 1s ease, background 1s ease',
      boxShadow: active ? 'inset 0 0 60px rgba(208,208,208,0.04)' : 'none',
    }}>
      <div style={{ position: 'absolute', top: -20, right: -20, width: 140, height: 140,
        background: '#fff', filter: 'blur(70px)', opacity: 0.05, pointerEvents: 'none' }} />

      <div style={{ position: 'relative', zIndex: 1, flex: 1 }}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
          letterSpacing: '0.2em', color: 'rgba(255,255,255,0.30)' }}>
          SUBJECT B: TABULA RASA
        </div>

        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 68,
          lineHeight: 1, margin: '10px 0 8px', color: 'rgba(255,255,255,0.20)', fontWeight: 500 }}>
          Varlık<span style={{ color: 'rgba(255,255,255,0.30)' }}>.</span>
        </h2>

        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
          color: 'rgba(255,255,255,0.18)', letterSpacing: '0.05em', marginBottom: 8 }}>
          [Bellek: {varlikMessages.length === 0 ? 'Boş' : `${varlikMessages.length} iz`}]
        </div>

        <div style={{ marginTop: 20, minHeight: 110 }}>
          {!active && (
            <div style={{ fontFamily: "'JetBrains Mono', monospace",
              fontSize: 12, color: 'rgba(255,255,255,0.18)', letterSpacing: '0.06em' }}>
              [ boş. bekliyor. ]
            </div>
          )}
          {isGenerating && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <BouncingDots color="#fff" opacity={0.45} />
              <span style={{ fontFamily: "'JetBrains Mono', monospace",
                fontSize: 13, color: 'rgba(255,255,255,0.28)' }}>...</span>
            </div>
          )}
          {isSpeaking && (
            <>
              <SoundWave heights={BARS} color="#fff" opacity={0.38} />
              {lastMessage && (
                <div style={{ marginTop: 14, fontFamily: "'Inter', sans-serif",
                  fontSize: 20, lineHeight: 1.45, color: 'rgba(255,255,255,0.60)' }}>
                  "{lastMessage.text}"
                </div>
              )}
            </>
          )}
        </div>

        <div style={{ marginBottom: 20 }} />
      </div>

      {/* HUD */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', padding: '14px 0 18px',
        position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
              letterSpacing: '0.2em', color: 'rgba(255,255,255,0.28)', marginBottom: 3 }}>
              SİNYAL
            </div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13,
              color: varlikMessages.length ? 'rgba(208,208,208,0.85)' : 'rgba(255,255,255,0.28)',
              fontWeight: 500, letterSpacing: '0.01em' }}>
              {statusLabel}
            </div>
          </div>
          <Sparkline scores={scores} maxVal={maxScore} />
        </div>

        <div style={{ height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${fillPct}%`,
            background: 'linear-gradient(90deg, rgba(208,208,208,0.3), rgba(208,208,208,0.85))',
            borderRadius: 2, transition: 'width 0.8s ease',
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4,
          fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
          color: 'rgba(255,255,255,0.28)', letterSpacing: '0.08em' }}>
          <span>Yoğunluk</span>
          <span>{fillPct}%</span>
        </div>
      </div>
    </div>
  )
}

function Sparkline({ scores, maxVal }: { scores: number[]; maxVal: number }) {
  if (!scores.length) return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 24 }}>
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} style={{ width: 3, height: 4, background: 'rgba(255,255,255,0.10)', borderRadius: 1 }} />
      ))}
    </div>
  )
  const data = scores.slice(-8)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 24 }}>
      {data.map((s, i) => (
        <div key={i} style={{
          width: 3, borderRadius: 1,
          height: `${Math.max(12, Math.round((s / maxVal) * 100))}%`,
          background: 'rgba(208,208,208,0.65)',
          opacity: 0.3 + (i / data.length) * 0.65,
          transition: 'height 0.5s ease',
        }} />
      ))}
    </div>
  )
}

function SoundWave({ heights, color, opacity }: { heights: number[]; color: string; opacity: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 28 }}>
      {heights.map((h, i) => (
        <div key={i} style={{ width: 3, height: `${h * 20}%`, background: color, opacity,
          borderRadius: 1, animation: `wave 0.9s ease-in-out ${i * 0.07}s infinite alternate` }} />
      ))}
    </div>
  )
}

function BouncingDots({ color, opacity = 1 }: { color: string; opacity?: number }) {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: color,
          opacity, display: 'inline-block', animation: `bounce 1.2s ease-in-out ${i * 0.18}s infinite` }} />
      ))}
    </div>
  )
}
