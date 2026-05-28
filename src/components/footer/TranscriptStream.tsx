import { useRef, useEffect } from 'react'
import type { Message } from '../../types'
import { scoreMessage, hexToRgb } from '../../lib/sentiment'

const LABELS: Record<string, string> = {
  lilith: 'Kraliçe Lilith',
  generic: 'Varlık',
  user: 'Moderatör',
}

interface Props {
  messages: Message[]
  currentWord: string
  onCopy: () => void
  onDownload: () => void
}

export default function TranscriptStream({ messages, currentWord, onCopy, onDownload }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages.length, currentWord])

  return (
    <div style={{ padding: '16px 22px', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            width: 7, height: 7, borderRadius: '50%', background: '#10B981',
            animation: 'pulse 1.4s ease-in-out infinite',
            boxShadow: '0 0 8px rgba(16,185,129,0.7)',
            flexShrink: 0,
          }} />
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11, letterSpacing: '0.14em',
            color: 'rgba(255,255,255,0.75)',
          }}>
            REAL-TIME TRANSCRIPTION STREAM
          </span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <TranscriptBtn onClick={onCopy}>Kopyala</TranscriptBtn>
          <TranscriptBtn onClick={onDownload}>Dökümü İndir</TranscriptBtn>
        </div>
      </div>

      <div ref={scrollRef} style={{
        flex: 1, maxHeight: 190, overflowY: 'auto',
        display: 'flex', flexDirection: 'column', gap: 4, paddingRight: 6,
      }}>
        {messages.length === 0 ? (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            height: 140,
            fontFamily: "'Playfair Display', serif",
            fontStyle: 'italic', fontSize: 14,
            color: 'rgba(255,255,255,0.30)',
          }}>
            Başlatılmayı bekleyen simülasyon.
          </div>
        ) : (
          messages.map((m, i) => (
            <MessageRow
              key={m.id}
              msg={m}
              isLast={i === messages.length - 1}
              currentWord={currentWord}
            />
          ))
        )}
      </div>
    </div>
  )
}

function MessageRow({ msg, isLast, currentWord }: { msg: Message; isLast: boolean; currentWord: string }) {
  const isLilith = msg.sender === 'lilith'
  const isUser = msg.sender === 'user'
  const borderColor = isLilith ? '#D4AF37' : isUser ? '#A855F7' : 'rgba(255,255,255,0.20)'
  const textColor = isLilith ? '#D4AF37' : isUser ? '#C084FC' : 'rgba(255,255,255,0.55)'
  const s = scoreMessage(msg)
  const high = s.intensity === 'high'

  const textStyle: React.CSSProperties = {
    fontFamily: isLilith ? "'Playfair Display', serif" : "'JetBrains Mono', monospace",
    fontStyle: isLilith ? 'italic' : 'normal',
    fontSize: isLilith ? 13 : 12,
    color: textColor, lineHeight: 1.55, flex: 1, wordBreak: 'break-word',
  }

  let textNode: React.ReactNode
  if (isLast && currentWord && msg.text) {
    const words = msg.text.split(/(\s+)/)
    const highlightRgb = hexToRgb(isLilith ? '#D4AF37' : '#D0D0D0')
    textNode = (
      <span style={textStyle}>
        {words.map((w, i) => {
          const isCurr = w.trim() && w.trim() === currentWord
          return (
            <span key={i} style={{
              background: isCurr ? `rgba(${highlightRgb}, 0.18)` : 'transparent',
              borderRadius: 2, padding: isCurr ? '0 2px' : '0',
              transition: 'background 0.15s',
            }}>{w}</span>
          )
        })}
      </span>
    )
  } else {
    textNode = <span style={textStyle}>{msg.text}</span>
  }

  const bgRgb = hexToRgb(isLilith ? '#D4AF37' : isUser ? '#A855F7' : '#FFFFFF')

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 12,
      padding: '8px 10px 8px 12px',
      borderLeft: `2px solid ${borderColor}`,
      background: isLast ? `linear-gradient(90deg, rgba(${bgRgb}, 0.04) 0%, transparent 100%)` : 'transparent',
    }}>
      <div style={{
        minWidth: 92,
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 9, letterSpacing: '0.06em',
        color: 'rgba(255,255,255,0.40)', lineHeight: 1.55, paddingTop: 1,
      }}>
        {msg.timestamp}<br />
        <span style={{ color: 'rgba(255,255,255,0.55)' }}>{LABELS[msg.sender]}</span>
      </div>
      {textNode}
      <div style={{ paddingTop: 2 }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 9, letterSpacing: '0.06em',
          padding: '2px 7px',
          border: `1px solid rgba(${hexToRgb(s.color)}, ${high ? 0.55 : 0.22})`,
          color: s.color, opacity: high ? 1 : 0.7, borderRadius: 2, whiteSpace: 'nowrap',
          boxShadow: high ? `0 0 12px rgba(${hexToRgb(s.color)}, 0.35)` : 'none',
          animation: high ? 'softpulse 2s ease-in-out infinite' : 'none',
        }}>
          {s.label}
        </span>
      </div>
    </div>
  )
}

function TranscriptBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      background: 'transparent', border: '1px solid rgba(255,255,255,0.16)',
      color: 'rgba(255,255,255,0.65)', fontFamily: "'JetBrains Mono', monospace",
      fontSize: 10, letterSpacing: '0.08em', padding: '4px 10px',
      borderRadius: 2, cursor: 'pointer',
    }}>
      {children}
    </button>
  )
}
