import type { Message, SpeakerState, VoiceEngine } from '../../types'

const BARS = [1, 3, 5, 3, 2, 4, 3, 2, 1, 4, 2]

interface Props {
  active: boolean
  state: SpeakerState
  lastMessage: Message | undefined
  voiceEngine: VoiceEngine
  voices: SpeechSynthesisVoice[]
  voiceId: string
  setVoiceId: (id: string) => void
}

export default function VarlikPanel({ active, state, lastMessage, voiceEngine, voices, voiceId, setVoiceId }: Props) {
  const isGenerating = active && state === 'generating'
  const isSpeaking = active && state === 'speaking'

  return (
    <div style={{
      position: 'relative',
      background: 'rgba(14, 14, 16, 0.35)',
      border: `1px solid rgba(255,255,255,${active ? 0.16 : 0.08})`,
      borderRadius: 6,
      padding: '28px 30px 22px',
      overflow: 'hidden',
      minHeight: 360,
      transition: 'border-color 1s ease, background 1s ease',
      boxShadow: active ? 'inset 0 0 60px rgba(208,208,208,0.04)' : 'none',
    }}>
      {/* White radial blur */}
      <div style={{
        position: 'absolute', top: -20, right: -20, width: 140, height: 140,
        background: '#FFFFFF', filter: 'blur(70px)', opacity: 0.05, pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10, letterSpacing: '0.22em',
          color: 'rgba(255,255,255,0.30)', textTransform: 'uppercase',
        }}>
          Subject B: Tabula Rasa
        </div>

        <h2 style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: 64, lineHeight: 1, margin: '10px 0 8px',
          color: 'rgba(255,255,255,0.20)', fontWeight: 500,
        }}>
          Varlık<span style={{ color: 'rgba(255,255,255,0.32)' }}>.</span>
        </h2>

        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10.5, color: 'rgba(255,255,255,0.18)',
          letterSpacing: '0.06em', marginBottom: 8,
        }}>
          [Kimlik: Tanımsız / Bellek: Boş / Kişilik: Henüz Yok]
        </div>

        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11, color: 'rgba(255,255,255,0.38)',
          lineHeight: 1.6, maxWidth: 480,
        }}>
          Geçmişi yok. Rolü yok. Amacı yok.<br />
          Bu diyalog onu yavaş yavaş şekillendirecek — belki.
        </div>

        <div style={{ marginTop: 26, minHeight: 110 }}>
          {!active && (
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11, color: 'rgba(255,255,255,0.18)', letterSpacing: '0.06em',
            }}>
              [ boş. bekliyor. ]
            </div>
          )}

          {isGenerating && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <BouncingDots color="#FFFFFF" opacity={0.5} />
              <span style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 13, color: 'rgba(255,255,255,0.30)',
              }}>
                ...
              </span>
            </div>
          )}

          {isSpeaking && (
            <>
              <SoundWave heights={BARS} color="#FFFFFF" opacity={0.4} />
              {lastMessage && (
                <div style={{
                  marginTop: 14,
                  fontFamily: "'Playfair Display', serif",
                  fontStyle: 'italic', fontSize: 20, lineHeight: 1.35,
                  color: 'rgba(255,255,255,0.62)',
                }}>
                  "{lastMessage.text}"
                </div>
              )}
            </>
          )}
        </div>

        {/* Voice selector */}
        <div style={{ marginTop: 24 }}>
          {voiceEngine === 'gemini' ? (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 10,
              border: '1px solid rgba(255,255,255,0.12)',
              padding: '7px 14px', borderRadius: 3,
              fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
              color: 'rgba(255,255,255,0.65)', letterSpacing: '0.08em',
            }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'rgba(255,255,255,0.65)', animation: 'pulse 1.6s ease-in-out infinite', flexShrink: 0 }} />
              Charon (Nötr Türkçe)
            </div>
          ) : (
            <select value={voiceId} onChange={e => setVoiceId(e.target.value)} style={{
              background: 'transparent', border: '1px solid rgba(255,255,255,0.18)',
              color: 'rgba(255,255,255,0.75)', padding: '7px 12px', borderRadius: 3,
              fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
              letterSpacing: '0.06em', outline: 'none',
            }}>
              {voices.length === 0 && <option value="">— sistem sesi —</option>}
              {voices.map(v => (
                <option key={v.voiceURI} value={v.voiceURI} style={{ background: '#0A0A0A' }}>
                  {v.name} ({v.lang})
                </option>
              ))}
            </select>
          )}
        </div>
      </div>
    </div>
  )
}

function SoundWave({ heights, color, opacity }: { heights: number[]; color: string; opacity: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 28 }}>
      {heights.map((h, i) => (
        <div key={i} style={{
          width: 3, height: `${h * 20}%`, background: color, opacity,
          borderRadius: 1, animation: `wave 0.9s ease-in-out ${i * 0.07}s infinite alternate`,
        }} />
      ))}
    </div>
  )
}

function BouncingDots({ color, opacity = 1 }: { color: string; opacity?: number }) {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          width: 7, height: 7, borderRadius: '50%', background: color, opacity,
          display: 'inline-block', animation: `bounce 1.2s ease-in-out ${i * 0.18}s infinite`,
        }} />
      ))}
    </div>
  )
}
