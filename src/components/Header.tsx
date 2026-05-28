import type { GlobalSentiment } from '../types'

interface Props {
  sentiment: GlobalSentiment
  sentimentRgb: string
  activeSpeaker: 'lilith' | 'generic' | null
}

export default function Header({ sentiment, sentimentRgb, activeSpeaker }: Props) {
  return (
    <header style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 24,
      padding: '22px 32px 18px',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      flexWrap: 'wrap',
    }}>
      <div>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 9, letterSpacing: '0.22em',
          color: 'rgba(255,255,255,0.40)', textTransform: 'uppercase',
        }}>
          Project Simulation: 08-B
        </div>
        <h1 style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: 30, fontStyle: 'italic', fontWeight: 500,
          margin: '2px 0 0', letterSpacing: '-0.01em',
        }}>
          Duality / <span style={{ color: `rgba(${sentimentRgb}, 0.85)`, transition: 'color 1s ease' }}>Conversations</span>
        </h1>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        {/* Sentiment HUD */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          border: `1px solid rgba(${sentimentRgb}, 0.35)`,
          padding: '5px 12px', borderRadius: 3,
          background: `rgba(${sentimentRgb}, 0.04)`,
          transition: 'border-color 1s ease, background 1s ease',
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: sentiment.color,
            animation: 'softpulse 1.8s ease-in-out infinite',
            boxShadow: `0 0 8px rgba(${sentimentRgb}, 0.7)`,
            flexShrink: 0,
          }} />
          <span style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
            letterSpacing: '0.1em', color: sentiment.color,
            transition: 'color 1s ease',
            whiteSpace: 'nowrap',
          }}>
            {sentiment.label}{sentiment.percent > 0 ? ` (${sentiment.percent}%)` : ''}
          </span>
        </div>

        <StatusDot label="Queen Protocol" color="#D4AF37" active={activeSpeaker === 'lilith'} />
        <StatusDot label="Subject B" color="#D0D0D0" active={activeSpeaker === 'generic'} />
      </div>
    </header>
  )
}

function StatusDot({ label, color, active }: { label: string; color: string; active: boolean }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
      <span style={{
        width: 8, height: 8, borderRadius: '50%', background: color,
        opacity: active ? 1 : 0.45,
        boxShadow: active ? `0 0 10px ${color}` : 'none',
        animation: active ? 'softpulse 1.2s ease-in-out infinite' : 'none',
        flexShrink: 0,
        transition: 'opacity 0.5s, box-shadow 0.5s',
      }} />
      <span style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5,
        letterSpacing: '0.12em',
        color: active ? color : 'rgba(255,255,255,0.50)',
        textTransform: 'uppercase',
        transition: 'color 0.5s',
      }}>
        {label}
      </span>
    </div>
  )
}
