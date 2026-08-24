import type { VoiceEngine } from '../../types'

export interface Telemetry {
  lastLatencyMs: number | null
  avgLatencyMs: number | null
  turns: number
  words: number
  /** Son turda sesi hangi katman verdi */
  servedBy: string | null
}

export interface LocalTtsStatus {
  configured: boolean
  ready: boolean
  warming: boolean
}

interface Props {
  voiceEngine: VoiceEngine
  setVoiceEngine: (v: VoiceEngine) => void
  localTts: LocalTtsStatus
  rate: number
  setRate: (v: number) => void
  pitch: number
  setPitch: (v: number) => void
  telemetry: Telemetry
}

const ENGINE_LABELS: Record<VoiceEngine, string> = {
  fish: 'Fish Audio',
  local: 'Chatterbox (yerel)',
  azure: 'Azure Neural',
  edge: 'Edge Neural',
  gemini: 'Gemini TTS',
  browser: 'Tarayıcı',
}

export default function SimParameters({ voiceEngine, setVoiceEngine, localTts, rate, setRate, pitch, setPitch, telemetry }: Props) {
  const isServerAudio = voiceEngine !== 'browser'
  const showLocalStatus = voiceEngine === 'local' && (localTts.configured || localTts.warming)
  const localStatusLabel = localTts.ready ? 'hazır' : localTts.warming ? 'ısınıyor…' : 'beklemede'
  const localStatusColor = localTts.ready ? '#10B981' : localTts.warming ? '#D4AF37' : 'rgba(255,255,255,0.35)'

  return (
    <div style={{
      padding: '16px 22px',
      borderRight: '1px solid rgba(255,255,255,0.08)',
      display: 'flex', flexDirection: 'column', gap: 9, minWidth: 260,
    }}>
      <div style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 10, letterSpacing: '0.18em',
        color: 'rgba(255,255,255,0.55)',
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
          <option value="fish" style={{ background: '#0A0A0A' }}>Fish Audio</option>
          <option value="local" style={{ background: '#0A0A0A' }}>Chatterbox (yerel)</option>
          <option value="azure" style={{ background: '#0A0A0A' }}>Azure Neural</option>
          <option value="edge" style={{ background: '#0A0A0A' }}>Edge Neural</option>
          <option value="gemini" style={{ background: '#0A0A0A' }}>Gemini TTS</option>
          <option value="browser" style={{ background: '#0A0A0A' }}>Tarayıcı</option>
        </select>
      </StatRow>

      {showLocalStatus && (
        <StatRow label="Chatterbox">
          <span style={{
            color: localStatusColor,
            animation: localTts.warming ? 'softpulse 1.6s ease-in-out infinite' : undefined,
          }}>
            ● {localStatusLabel}
          </span>
        </StatRow>
      )}

      <StatRow label="Son Tur">
        <span style={{ color: 'rgba(255,255,255,0.55)' }}>
          {telemetry.lastLatencyMs != null ? `${(telemetry.lastLatencyMs / 1000).toFixed(1)}s` : '—'}
        </span>
      </StatRow>
      <StatRow label="Ort. Tur">
        <span style={{ color: 'rgba(255,255,255,0.55)' }}>
          {telemetry.avgLatencyMs != null ? `${(telemetry.avgLatencyMs / 1000).toFixed(1)}s` : '—'}
        </span>
      </StatRow>
      <StatRow label="Ses Veren">
        <span style={{ color: telemetry.servedBy === 'local' ? '#10B981' : '#D4AF37' }}>
          {telemetry.servedBy ? ENGINE_LABELS[telemetry.servedBy as VoiceEngine] ?? telemetry.servedBy : '—'}
        </span>
      </StatRow>
      <StatRow label="Turs / Kelime">
        <span style={{ color: 'rgba(255,255,255,0.80)' }}>{telemetry.turns} · {telemetry.words}</span>
      </StatRow>

      <div style={{
        marginTop: 8, paddingTop: 8,
        borderTop: '1px dashed rgba(255,255,255,0.08)',
        display: 'flex', flexDirection: 'column', gap: 8,
      }}>
        <SliderRow
          label={isServerAudio ? 'Hız: sunucu sesi' : 'Hız'}
          min={0.5} max={1.8} step={0.05}
          value={rate} onChange={setRate}
          disabled={isServerAudio} color="#D4AF37"
        />
        <SliderRow
          label={isServerAudio ? 'Ton: sunucu sesi' : 'Ton'}
          min={0.6} max={1.4} step={0.05}
          value={pitch} onChange={setPitch}
          disabled={isServerAudio} color="#D0D0D0"
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
