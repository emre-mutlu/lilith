import { useState, useEffect } from 'react'
import type { VoiceEngine } from '../../types'

interface Props {
  voiceEngine: VoiceEngine
  setVoiceEngine: (v: VoiceEngine) => void
  rate: number
  setRate: (v: number) => void
  pitch: number
  setPitch: (v: number) => void
  wordCount: number
}

export default function SimParameters({ voiceEngine, setVoiceEngine, rate, setRate, pitch, setPitch, wordCount }: Props) {
  const [latency, setLatency] = useState(18)
  const [syncRate, setSyncRate] = useState(99.87)

  useEffect(() => {
    const t = setInterval(() => {
      setLatency(10 + Math.floor(Math.random() * 26))
      setSyncRate(99.5 + Math.random() * 0.49)
    }, 1800)
    return () => clearInterval(t)
  }, [])

  const isGemini = voiceEngine === 'gemini'

  return (
    <div style={{
      padding: '16px 22px',
      borderRight: '1px solid rgba(255,255,255,0.08)',
      display: 'flex', flexDirection: 'column', gap: 9, minWidth: 260,
    }}>
      <div style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 10, letterSpacing: '0.18em',
        color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase',
        marginBottom: 4,
      }}>
        Simulation Parameters
      </div>

      <StatRow label="Ses Motoru">
        <select
          value={voiceEngine}
          onChange={e => setVoiceEngine(e.target.value as VoiceEngine)}
          style={{
            background: 'transparent', border: '1px solid rgba(255,255,255,0.16)',
            color: 'rgba(255,255,255,0.80)',
            fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
            padding: '2px 6px', borderRadius: 2, outline: 'none',
          }}
        >
          <option value="gemini" style={{ background: '#0A0A0A' }}>Gemini-TTS</option>
          <option value="browser" style={{ background: '#0A0A0A' }}>Sistem</option>
        </select>
      </StatRow>

      <StatRow label="Latency">
        <span style={{ color: 'rgba(255,255,255,0.55)' }}>{latency}ms</span>
      </StatRow>
      <StatRow label="Sync Rate">
        <span style={{ color: '#D4AF37' }}>{syncRate.toFixed(2)}%</span>
      </StatRow>
      <StatRow label="Words">
        <span style={{ color: 'rgba(255,255,255,0.80)' }}>{wordCount}</span>
      </StatRow>
      <StatRow label="Environment">
        <span style={{ color: '#10B981' }}>TRS-9</span>
      </StatRow>

      <div style={{
        marginTop: 8, paddingTop: 8,
        borderTop: '1px dashed rgba(255,255,255,0.08)',
        display: 'flex', flexDirection: 'column', gap: 8,
      }}>
        <SliderRow
          label={isGemini ? 'AI Hızı: Oto' : 'Hız'}
          min={0.5} max={1.8} step={0.05}
          value={rate} onChange={setRate}
          disabled={isGemini} color="#D4AF37"
        />
        <SliderRow
          label={isGemini ? 'AI Tonu: Oto' : 'Ton'}
          min={0.6} max={1.4} step={0.05}
          value={pitch} onChange={setPitch}
          disabled={isGemini} color="#D0D0D0"
        />
      </div>
    </div>
  )
}

function StatRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: '0.06em',
    }}>
      <span style={{ color: 'rgba(255,255,255,0.40)' }}>{label}</span>
      <span>{children}</span>
    </div>
  )
}

function SliderRow({ label, min, max, step, value, onChange, disabled, color }: {
  label: string; min: number; max: number; step: number
  value: number; onChange: (v: number) => void
  disabled: boolean; color: string
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: '0.08em',
        color: disabled ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.60)',
      }}>
        <span>{label}</span>
        <span style={{ color: disabled ? 'rgba(255,255,255,0.30)' : color }}>{value.toFixed(2)}×</span>
      </div>
      <input
        type="range" min={min} max={max} step={step}
        value={value} disabled={disabled}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{ width: '100%', accentColor: color, opacity: disabled ? 0.4 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}
      />
    </div>
  )
}
