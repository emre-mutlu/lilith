import type { SessionState, InterventionMode } from '../types'

// Inline SVG icons (no external dependency needed)
function IconPlay() {
  return <svg width={13} height={13} viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
}
function IconPause() {
  return <svg width={13} height={13} viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/></svg>
}
function IconReset() {
  return <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7"/><polyline points="3 4 3 10 9 10"/></svg>
}
function IconVolume() {
  return <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M19 5a9 9 0 0 1 0 14"/></svg>
}
function IconMute() {
  return <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="22" y1="9" x2="16" y2="15"/><line x1="16" y1="9" x2="22" y2="15"/></svg>
}
function IconAlert() {
  return <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
}
function IconSend() {
  return <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
}

interface Props {
  sessionState: SessionState
  muted: boolean
  onStart: () => void
  onReset: () => void
  onMute: () => void
  userInput: string
  setUserInput: (v: string) => void
  onSubmit: (e: React.FormEvent) => void
  placeholder: string
  disabled: boolean
  error: string
  /** Araya-gir türü — her biri karakterlerce farklı algılanır */
  intMode: InterventionMode
  setIntMode: (m: InterventionMode) => void
  fisTarget: 'lilith' | 'generic'
  setFisTarget: (t: 'lilith' | 'generic') => void
}

const MODES: Array<{ id: InterventionMode; label: string; color: string }> = [
  { id: 'soz', label: 'SÖZ', color: '#A855F7' },
  { id: 'sahne', label: 'SAHNE', color: '#2DD4BF' },
  { id: 'fisilti', label: 'FISILTI', color: '#818CF8' },
  { id: 'yon', label: 'YÖN', color: '#9CA3AF' },
]

export default function ControlBar({
  sessionState, muted,
  onStart, onReset, onMute,
  userInput, setUserInput, onSubmit,
  placeholder, disabled, error,
  intMode, setIntMode, fisTarget, setFisTarget,
}: Props) {
  const running = sessionState === 'running'

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 16,
      padding: '12px 22px',
      background: '#040404',
      borderTop: '1px solid rgba(255,255,255,0.08)',
      flexWrap: 'wrap',
    }}>
      {/* Left cluster */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={onStart} style={{
          display: 'inline-flex', alignItems: 'center', gap: 9,
          padding: '8px 16px', borderRadius: 3, cursor: 'pointer',
          background: running
            ? 'linear-gradient(180deg, #2A2A2A 0%, #1A1A1A 100%)'
            : 'linear-gradient(180deg, #E5C158 0%, #B08D1F 100%)',
          color: running ? '#E0E0E0' : '#0A0A0A',
          border: running ? '1px solid rgba(255,255,255,0.16)' : '1px solid rgba(255,220,140,0.6)',
          boxShadow: running ? 'none' : '0 0 22px rgba(212,175,55,0.32)',
          transition: 'filter 0.2s',
          fontSize: 14,
        }}>
          {running ? <IconPause /> : <IconPlay />}
          <span style={{ fontFamily: "'Playfair Display', serif", fontStyle: 'italic', fontSize: 15, fontWeight: 500 }}>
            {running ? 'Durdur' : sessionState === 'paused' ? 'Devam Et' : 'Simülasyonu Başlat'}
          </span>
        </button>

        <IconBtn onClick={onReset} title="Sıfırla">
          <IconReset />
        </IconBtn>

        <IconBtn
          onClick={onMute}
          title="Sesi kapat"
          style={{
            background: muted ? 'rgba(239,68,68,0.18)' : 'transparent',
            borderColor: muted ? 'rgba(239,68,68,0.55)' : 'rgba(255,255,255,0.16)',
            color: muted ? '#FCA5A5' : 'rgba(255,255,255,0.75)',
          }}
        >
          {muted ? <IconMute /> : <IconVolume />}
        </IconBtn>
      </div>

      {/* Error bar */}
      {error && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          border: '1px solid rgba(239,68,68,0.55)',
          background: 'rgba(239,68,68,0.10)',
          color: '#FCA5A5',
          padding: '5px 12px', borderRadius: 3,
          fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
          letterSpacing: '0.06em',
        }}>
          <IconAlert />
          <span>{error}</span>
        </div>
      )}

      {/* Intervention form */}
      <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, maxWidth: 560, marginLeft: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          {MODES.map(m => {
            const active = intMode === m.id
            return (
              <button
                key={m.id}
                type="button"
                title={
                  m.id === 'soz' ? 'Sahne dışından seslen — duyarlar, serbestçe dokurlar'
                  : m.id === 'sahne' ? 'Dünyaya ekleme/değişiklik — kalıcı sahne durumu'
                  : m.id === 'fisilti' ? 'Tek karakterin zihnine telkin — diğeri bilmez'
                  : 'Görünmez yönetmen notu — replik değil, performans yönetimi'
                }
                onClick={() => setIntMode(m.id)}
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 9, letterSpacing: '0.14em',
                  padding: '3px 9px', borderRadius: 2, cursor: 'pointer',
                  border: `1px solid ${active ? m.color : 'rgba(255,255,255,0.14)'}`,
                  color: active ? m.color : 'rgba(255,255,255,0.45)',
                  background: active ? `${m.color}1A` : 'transparent',
                  transition: 'all 0.15s',
                }}
              >
                {m.label}
              </button>
            )
          })}
          {intMode === 'fisilti' && (
            <span style={{ display: 'inline-flex', gap: 4, marginLeft: 6 }}>
              {(['lilith', 'generic'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setFisTarget(t)}
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 9, letterSpacing: '0.10em',
                    padding: '3px 8px', borderRadius: 2, cursor: 'pointer',
                    border: `1px solid ${fisTarget === t ? (t === 'lilith' ? '#D4AF37' : '#D0D0D0') : 'rgba(255,255,255,0.14)'}`,
                    color: fisTarget === t ? (t === 'lilith' ? '#D4AF37' : '#E0E0E0') : 'rgba(255,255,255,0.40)',
                    background: fisTarget === t ? 'rgba(255,255,255,0.06)' : 'transparent',
                  }}
                >
                  → {t === 'lilith' ? 'LİLİTH' : 'VARLIK'}
                </button>
              ))}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input
          type="text"
          value={userInput}
          onChange={e => setUserInput(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          style={{
            flex: 1,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.12)',
            color: '#E0E0E0',
            padding: '8px 12px', borderRadius: 3,
            fontFamily: "'Inter', sans-serif", fontSize: 13,
            outline: 'none', transition: 'border-color 0.2s',
            opacity: disabled ? 0.5 : 1,
          }}
        />
        <button
          type="submit"
          disabled={disabled || !userInput.trim()}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            padding: '8px 14px',
            background: 'rgba(168,85,247,0.14)',
            border: '1px solid rgba(168,85,247,0.50)',
            color: '#D8B4FE',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11, letterSpacing: '0.12em',
            borderRadius: 3, cursor: 'pointer',
            transition: 'all 0.18s',
            opacity: (disabled || !userInput.trim()) ? 0.35 : 1,
          }}
        >
          <IconSend />
          <span>Araya Gir</span>
        </button>
        </div>
      </form>
    </div>
  )
}

function IconBtn({ onClick, title, children, style }: {
  onClick: () => void
  title?: string
  children: React.ReactNode
  style?: React.CSSProperties
}) {
  return (
    <button onClick={onClick} title={title} style={{
      width: 34, height: 34,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      border: '1px solid rgba(255,255,255,0.16)',
      background: 'transparent',
      color: 'rgba(255,255,255,0.75)',
      borderRadius: 3, cursor: 'pointer', transition: 'all 0.18s',
      ...style,
    }}>
      {children}
    </button>
  )
}
