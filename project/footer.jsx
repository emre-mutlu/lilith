// Footer (sim parameters + transcript stream) and bottom control bar.
const { useRef, useEffect: useFxEffect, useState: useFxState } = React;

function SentimentPill({ msg }) {
  const s = window.Sentiment.scoreMessage(msg);
  const high = s.intensity === "high";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 9, letterSpacing: "0.06em",
      padding: "2px 7px",
      border: `1px solid rgba(${window.Sentiment.hexToRgb(s.color)}, ${high ? 0.55 : 0.22})`,
      color: s.color,
      opacity: high ? 1 : 0.7,
      borderRadius: 2,
      whiteSpace: "nowrap",
      boxShadow: high ? `0 0 12px rgba(${window.Sentiment.hexToRgb(s.color)}, 0.35)` : "none",
      animation: high ? "softpulse 2s ease-in-out infinite" : "none"
    }}>
      {s.label}
    </span>
  );
}

function MessageRow({ msg, isLast, currentWord }) {
  const isLilith = msg.sender === "lilith";
  const isUser = msg.sender === "user";
  const borderColor = isLilith ? "#D4AF37" : isUser ? "#A855F7" : "rgba(255,255,255,0.20)";
  const textColor = isLilith ? "#D4AF37" : isUser ? "#C084FC" : "rgba(255,255,255,0.55)";
  const senderName = isLilith ? "Kraliçe Lilith" : isUser ? "Moderatör" : "Varlık";

  const fontStyle = {
    fontFamily: isLilith ? "'Playfair Display', serif" : "'JetBrains Mono', monospace",
    fontStyle: isLilith ? "italic" : "normal",
    fontSize: isLilith ? 13 : 12,
    color: textColor,
    lineHeight: 1.55,
    flex: 1,
    wordBreak: "break-word"
  };

  // If this message is currently being spoken, render words and highlight current
  let textNode;
  if (isLast && currentWord && msg.text) {
    const words = msg.text.split(/(\s+)/);
    textNode = (
      <span style={fontStyle}>
        {words.map((w, i) => {
          const isCurr = w.trim() && w.trim() === currentWord;
          return (
            <span key={i} style={{
              background: isCurr ? `rgba(${window.Sentiment.hexToRgb(isLilith ? "#D4AF37" : "#D0D0D0")}, 0.18)` : "transparent",
              borderRadius: 2,
              padding: isCurr ? "0 2px" : "0",
              transition: "background 0.15s"
            }}>{w}</span>
          );
        })}
      </span>
    );
  } else {
    textNode = <span style={fontStyle}>{msg.text}</span>;
  }

  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 12,
      padding: "8px 10px 8px 12px",
      borderLeft: `2px solid ${borderColor}`,
      background: isLast ? `linear-gradient(90deg, rgba(${window.Sentiment.hexToRgb(isLilith ? "#D4AF37" : isUser ? "#A855F7" : "#FFFFFF")}, 0.04) 0%, transparent 100%)` : "transparent"
    }}>
      <div style={{
        minWidth: 92,
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 9, letterSpacing: "0.06em",
        color: "rgba(255,255,255,0.40)",
        lineHeight: 1.55, paddingTop: 1
      }}>
        {msg.timestamp}<br/>
        <span style={{ color: "rgba(255,255,255,0.55)" }}>{senderName}</span>
      </div>
      {textNode}
      <div style={{ paddingTop: 2 }}>
        <SentimentPill msg={msg} />
      </div>
    </div>
  );
}

function TranscriptStream({ messages, currentWord, onCopy, onDownload }) {
  const scrollRef = useRef(null);
  useFxEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, currentWord]);

  return (
    <div style={{ gridColumn: "span 3", padding: "16px 22px 16px 22px", display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 10
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{
            width: 7, height: 7, borderRadius: "50%", background: "#10B981",
            animation: "pulse 1.4s ease-in-out infinite",
            boxShadow: "0 0 8px rgba(16,185,129,0.7)"
          }} />
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11, letterSpacing: "0.14em",
            color: "rgba(255,255,255,0.75)", textTransform: "uppercase"
          }}>
            Real-time Transcription Stream
          </span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={onCopy} style={transcriptBtn}>Kopyala</button>
          <button onClick={onDownload} style={transcriptBtn}>Dökümü İndir</button>
        </div>
      </div>
      <div ref={scrollRef} style={{
        flex: 1, maxHeight: 190, overflowY: "auto",
        display: "flex", flexDirection: "column", gap: 4,
        paddingRight: 6
      }}>
        {messages.length === 0 ? (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            height: 140,
            fontFamily: "'Playfair Display', serif",
            fontStyle: "italic", fontSize: 14,
            color: "rgba(255,255,255,0.30)"
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
  );
}

const transcriptBtn = {
  background: "transparent",
  border: "1px solid rgba(255,255,255,0.16)",
  color: "rgba(255,255,255,0.65)",
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 10, letterSpacing: "0.08em",
  padding: "4px 10px", borderRadius: 2, cursor: "pointer",
  textTransform: "uppercase"
};

function SimParameters({
  voiceEngine, setVoiceEngine,
  rate, setRate, pitch, setPitch,
  wordCount, sentiment
}) {
  const [latency, setLatency] = useFxState(18);
  const [syncRate, setSyncRate] = useFxState(99.87);
  useFxEffect(() => {
    const t = setInterval(() => {
      setLatency(10 + Math.floor(Math.random() * 26));
      setSyncRate(99.5 + Math.random() * 0.49);
    }, 1800);
    return () => clearInterval(t);
  }, []);
  const isGemini = voiceEngine === "google";

  return (
    <div style={{
      padding: "16px 22px",
      borderRight: "1px solid rgba(255,255,255,0.08)",
      display: "flex", flexDirection: "column", gap: 9, minWidth: 260
    }}>
      <div style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 10, letterSpacing: "0.18em",
        color: "rgba(255,255,255,0.55)", textTransform: "uppercase",
        marginBottom: 4
      }}>
        Simulation Parameters
      </div>

      <StatRow label="Ses Motoru">
        <select value={voiceEngine} onChange={e => setVoiceEngine(e.target.value)} style={{
          background: "transparent",
          border: "1px solid rgba(255,255,255,0.16)",
          color: "rgba(255,255,255,0.80)",
          fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
          padding: "2px 6px", borderRadius: 2, outline: "none"
        }}>
          <option value="google" style={{ background: "#0A0A0A" }}>Google-TTS</option>
          <option value="browser" style={{ background: "#0A0A0A" }}>Sistem</option>
        </select>
      </StatRow>
      <StatRow label="Latency">
        <span style={{ color: "rgba(255,255,255,0.55)" }}>{latency}ms</span>
      </StatRow>
      <StatRow label="Sync Rate">
        <span style={{ color: "#D4AF37" }}>{syncRate.toFixed(2)}%</span>
      </StatRow>
      <StatRow label="Words">
        <span style={{ color: "rgba(255,255,255,0.80)" }}>{wordCount}</span>
      </StatRow>
      <StatRow label="Environment">
        <span style={{ color: "#10B981" }}>TRS-9</span>
      </StatRow>

      <div style={{
        marginTop: 8, paddingTop: 8,
        borderTop: "1px dashed rgba(255,255,255,0.08)",
        display: "flex", flexDirection: "column", gap: 8
      }}>
        <SliderRow
          label={isGemini ? "AI Hızı: Oto" : "Hız"}
          min={0.5} max={1.8} step={0.05}
          value={rate} onChange={setRate}
          disabled={isGemini} color="#D4AF37"
        />
        <SliderRow
          label={isGemini ? "AI Tonu: Oto" : "Ton"}
          min={0.6} max={1.4} step={0.05}
          value={pitch} onChange={setPitch}
          disabled={isGemini} color="#D0D0D0"
        />
      </div>
    </div>
  );
}

function StatRow({ label, children }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
      letterSpacing: "0.06em"
    }}>
      <span style={{ color: "rgba(255,255,255,0.40)" }}>{label}</span>
      <span>{children}</span>
    </div>
  );
}

function SliderRow({ label, min, max, step, value, onChange, disabled, color }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <div style={{
        display: "flex", justifyContent: "space-between",
        fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
        letterSpacing: "0.08em",
        color: disabled ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.60)"
      }}>
        <span>{label}</span>
        <span style={{ color: disabled ? "rgba(255,255,255,0.30)" : color }}>
          {value.toFixed(2)}×
        </span>
      </div>
      <input
        type="range" min={min} max={max} step={step}
        value={value}
        disabled={disabled}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{
          width: "100%", accentColor: color,
          opacity: disabled ? 0.4 : 1, cursor: disabled ? "not-allowed" : "pointer"
        }}
      />
    </div>
  );
}

Object.assign(window, { TranscriptStream, SimParameters, SentimentPill, MessageRow });
