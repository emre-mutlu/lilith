interface Props {
  currentWord: string
  activeSpeaker: 'lilith' | 'generic' | null
}

export default function CenterOverlay({ currentWord, activeSpeaker }: Props) {
  const isLilith = activeSpeaker === 'lilith'
  return (
    <div className="center-overlay" style={{
      position: 'absolute',
      left: '50%', top: 28,
      transform: 'translateX(-50%)',
      pointerEvents: 'none',
      zIndex: 20,
      display: 'flex',
      justifyContent: 'center',
    }}>
      {currentWord ? (
        <div style={{
          border: `1px solid rgba(${isLilith ? '212,175,55' : '208,208,208'}, 0.35)`,
          background: 'rgba(10,10,10,0.85)',
          padding: '10px 18px 12px',
          borderRadius: 4,
          textAlign: 'center',
          backdropFilter: 'blur(6px)',
          boxShadow: `0 0 36px rgba(${isLilith ? '212,175,55' : '208,208,208'}, 0.18)`,
        }}>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
            letterSpacing: '0.18em',
            color: 'rgba(255,255,255,0.50)', textTransform: 'uppercase',
            marginBottom: 4,
          }}>
            Aktif Kelime Telaffuzu
          </div>
          <div style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 28, fontWeight: 600, fontStyle: 'italic',
            color: isLilith ? '#D4AF37' : 'rgba(255,255,255,0.65)',
            lineHeight: 1,
          }}>
            {currentWord}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 22 }}>
          {[2, 4, 6, 4, 2].map((h, i) => (
            <div key={i} style={{
              width: 2, height: h * 3, background: 'rgba(255,255,255,0.25)',
              animation: `wave 1.4s ease-in-out ${i * 0.18}s infinite alternate`,
            }} />
          ))}
        </div>
      )}
    </div>
  )
}
