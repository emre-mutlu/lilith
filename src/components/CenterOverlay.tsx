interface Props {
  currentWord: string
  currentWordIdx: number
  activeSpeaker: 'lilith' | 'generic' | null
  currentText: string
  onClose: () => void
}

export default function CenterOverlay({ currentWordIdx, activeSpeaker, currentText, onClose }: Props) {
  if (!currentText || !activeSpeaker) return null

  const isLilith = activeSpeaker === 'lilith'
  const gold = '#D4AF37'
  const white = 'rgba(208,208,208,0.90)'
  const activeColor = isLilith ? gold : white
  const dimColor = isLilith ? 'rgba(212,175,55,0.35)' : 'rgba(208,208,208,0.28)'

  // Split preserving whitespace tokens
  const tokens = currentText.split(/(\s+)/)
  let wordCount = 0
  const rendered = tokens.map((tok, i) => {
    if (/^\s+$/.test(tok)) return <span key={i}>{tok}</span>
    const idx = wordCount++
    const isActive = idx === currentWordIdx
    return (
      <span key={i} style={{
        color: isActive ? activeColor : dimColor,
        fontWeight: isActive ? 700 : 400,
        textShadow: isActive ? `0 0 18px ${activeColor}88` : 'none',
        transition: 'color 0.1s ease, text-shadow 0.1s ease',
      }}>{tok}</span>
    )
  })

  return (
    <div className="center-overlay" style={{
      position: 'fixed',
      left: '50%', top: '50%',
      transform: 'translate(-50%, -50%)',
      zIndex: 40,
      pointerEvents: 'none',
      width: 'min(620px, 82vw)',
    }}>
      <div style={{
        background: 'rgba(8, 6, 12, 0.72)',
        backdropFilter: 'blur(28px)',
        WebkitBackdropFilter: 'blur(28px)',
        border: `1px solid rgba(${isLilith ? '212,175,55' : '208,208,208'}, 0.14)`,
        borderRadius: 12,
        padding: '20px 28px 22px',
        boxShadow: `0 8px 48px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06)`,
        position: 'relative',
      }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 10, right: 12,
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'rgba(255,255,255,0.25)', fontSize: 14, lineHeight: 1,
            padding: 4, pointerEvents: 'all',
          }}
          title="Kapat"
        >✕</button>
        {/* Speaker badge */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: activeColor,
            boxShadow: `0 0 8px ${activeColor}`,
            display: 'inline-block',
            animation: 'pulse 1.8s ease-in-out infinite',
          }} />
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10, letterSpacing: '0.2em',
            color: `rgba(${isLilith ? '212,175,55' : '208,208,208'}, 0.55)`,
          }}>
            {isLilith ? 'KRALİÇE LİLİTH' : 'VARLIK'}
          </span>
        </div>

        {/* Text */}
        <p style={{
          margin: 0,
          fontFamily: isLilith ? "'Playfair Display', serif" : "'Inter', sans-serif",
          fontSize: isLilith ? 19 : 17,
          fontStyle: isLilith ? 'italic' : 'normal',
          lineHeight: 1.65,
          letterSpacing: isLilith ? '0.01em' : '0.02em',
        }}>
          {rendered}
        </p>
      </div>
    </div>
  )
}
