// Twin character panels: Kraliçe Lilith (left) and Varlık (right).
const { useEffect, useState, useMemo } = React;

const LILITH_BARS = [1, 2, 3, 4, 3, 2, 3, 4, 5, 2, 1];
const VARLIK_BARS = [1, 3, 5, 3, 2, 4, 3, 2, 1, 4, 2];

function SoundWave({ heights, color, opacity }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 28 }}>
      {heights.map((h, i) => (
        <div
          key={i}
          style={{
            width: 3,
            height: `${h * 20}%`,
            background: color,
            opacity: opacity,
            borderRadius: 1,
            animation: `wave 0.9s ease-in-out ${i * 0.07}s infinite alternate`
          }}
        />
      ))}
    </div>
  );
}

function BouncingDots({ color, opacity = 1 }) {
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {[0, 1, 2].map(i => (
        <span
          key={i}
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: color,
            opacity,
            display: "inline-block",
            animation: `bounce 1.2s ease-in-out ${i * 0.18}s infinite`
          }}
        />
      ))}
    </div>
  );
}

function LilithPanel({ active, state, lastMessage, voiceEngine, voices, voiceId, setVoiceId }) {
  const isGenerating = active && state === "generating";
  const isSpeaking = active && state === "speaking";
  return (
    <div style={{
      position: "relative",
      background: "rgba(20, 16, 8, 0.35)",
      border: "1px solid rgba(212, 175, 55, 0.18)",
      borderRadius: 6,
      padding: "28px 30px 22px",
      overflow: "hidden",
      minHeight: 360,
      transition: "border-color 1s ease, background 1s ease",
      boxShadow: active ? "inset 0 0 60px rgba(212, 175, 55, 0.06)" : "none"
    }}>
      {/* gold radial blur top-left */}
      <div style={{
        position: "absolute", top: -20, left: -20, width: 140, height: 140,
        background: "#D4AF37", filter: "blur(70px)", opacity: 0.10, pointerEvents: "none"
      }} />

      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10, letterSpacing: "0.22em",
          color: "#D4AF37", opacity: 0.9, textTransform: "uppercase"
        }}>
          Subject A: The Matriarch
        </div>

        <h2 style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: 64, lineHeight: 1, margin: "10px 0 8px",
          color: "#FFFFFF", fontWeight: 500
        }}>
          Lilith<span style={{ color: "#D4AF37" }}>.</span>
        </h2>

        <div style={{
          fontFamily: "'Playfair Display', serif",
          fontStyle: "italic", fontSize: 15,
          color: "#D4AF37", opacity: 0.85, maxWidth: 480, lineHeight: 1.5
        }}>
          "Siber-organik soyun evrimleşmiş sesi; manipülatif, zarif ve amansız."
        </div>

        <div style={{
          marginTop: 10,
          fontFamily: "'Inter', sans-serif",
          fontStyle: "italic", fontSize: 12,
          color: "rgba(255,255,255,0.50)", maxWidth: 480, lineHeight: 1.55
        }}>
          Karşısındakini gözleyen, kelimeleriyle ince bir ağ örerek hizalayan bir bilinç.
          Hiçbir cümlesi tesadüf değildir.
        </div>

        {/* status / output region */}
        <div style={{ marginTop: 26, minHeight: 110 }}>
          {!active && (
            <div style={{
              fontFamily: "'Playfair Display', serif",
              fontStyle: "italic", fontSize: 18,
              color: "rgba(255,255,255,0.20)"
            }}>
              Kraliçe sessizliğe büründü.
            </div>
          )}

          {isGenerating && (
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <BouncingDots color="#D4AF37" />
              <span style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontStyle: "italic", fontSize: 11,
                color: "rgba(212,175,55,0.75)", letterSpacing: "0.08em"
              }}>
                Kraliçe zihnini formüle ediyor...
              </span>
            </div>
          )}

          {isSpeaking && (
            <>
              <SoundWave heights={LILITH_BARS} color="#D4AF37" opacity={0.95} />
              {lastMessage && (
                <div style={{
                  marginTop: 14,
                  fontFamily: "'Playfair Display', serif",
                  fontStyle: "italic", fontSize: 22, lineHeight: 1.35,
                  color: "#D4AF37"
                }}>
                  "{lastMessage.text}"
                </div>
              )}
            </>
          )}
        </div>

        {/* voice selector */}
        <div style={{ marginTop: 24 }}>
          {voiceEngine === "google" ? (
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 10,
              border: "1px solid rgba(212,175,55,0.35)",
              padding: "7px 14px", borderRadius: 3,
              fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
              color: "#D4AF37", letterSpacing: "0.08em"
            }}>
              <span style={{
                width: 7, height: 7, borderRadius: "50%", background: "#D4AF37",
                animation: "pulse 1.6s ease-in-out infinite"
              }} />
              Kore — Yavaş & Alt-Tonlu
            </div>
          ) : (
            <select
              value={voiceId}
              onChange={e => setVoiceId(e.target.value)}
              style={{
                background: "transparent",
                border: "1px solid rgba(212,175,55,0.35)",
                color: "#D4AF37",
                padding: "7px 12px", borderRadius: 3,
                fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
                letterSpacing: "0.06em", outline: "none"
              }}>
              {voices.length === 0 && <option value="">— sistem sesi —</option>}
              {voices.map(v => (
                <option key={v.voiceURI} value={v.voiceURI} style={{ background: "#0A0A0A" }}>
                  {v.name} ({v.lang})
                </option>
              ))}
            </select>
          )}
        </div>
      </div>
    </div>
  );
}

function VarlikPanel({ active, state, lastMessage, voiceEngine, voices, voiceId, setVoiceId }) {
  const isGenerating = active && state === "generating";
  const isSpeaking = active && state === "speaking";
  return (
    <div style={{
      position: "relative",
      background: "rgba(14, 14, 16, 0.35)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 6,
      padding: "28px 30px 22px",
      overflow: "hidden",
      minHeight: 360,
      transition: "border-color 1s ease, background 1s ease",
      boxShadow: active ? "inset 0 0 60px rgba(208,208,208,0.04)" : "none"
    }}>
      <div style={{
        position: "absolute", top: -20, right: -20, width: 140, height: 140,
        background: "#FFFFFF", filter: "blur(70px)", opacity: 0.05, pointerEvents: "none"
      }} />

      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10, letterSpacing: "0.22em",
          color: "rgba(255,255,255,0.30)", textTransform: "uppercase"
        }}>
          Subject B: Tabula Rasa
        </div>

        <h2 style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: 64, lineHeight: 1, margin: "10px 0 8px",
          color: "rgba(255,255,255,0.20)", fontWeight: 500
        }}>
          Varlık<span style={{ color: "rgba(255,255,255,0.32)" }}>.</span>
        </h2>

        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10.5, color: "rgba(255,255,255,0.18)",
          letterSpacing: "0.06em", marginBottom: 8
        }}>
          [Kimlik: Tanımsız / Bellek: Boş / Kişilik: Henüz Yok]
        </div>

        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11, color: "rgba(255,255,255,0.38)",
          lineHeight: 1.6, maxWidth: 480
        }}>
          Geçmişi yok. Rolü yok. Amacı yok.<br/>
          Bu diyalog onu yavaş yavaş şekillendirecek — belki.
        </div>

        <div style={{ marginTop: 26, minHeight: 110 }}>
          {!active && (
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11, color: "rgba(255,255,255,0.18)",
              letterSpacing: "0.06em"
            }}>
              [ boş. bekliyor. ]
            </div>
          )}

          {isGenerating && (
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <BouncingDots color="#FFFFFF" opacity={0.5} />
              <span style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 13, color: "rgba(255,255,255,0.30)"
              }}>
                ...
              </span>
            </div>
          )}

          {isSpeaking && (
            <>
              <SoundWave heights={VARLIK_BARS} color="#FFFFFF" opacity={0.4} />
              {lastMessage && (
                <div style={{
                  marginTop: 14,
                  fontFamily: "'Playfair Display', serif",
                  fontStyle: "italic", fontSize: 20, lineHeight: 1.35,
                  color: "rgba(255,255,255,0.62)"
                }}>
                  "{lastMessage.text}"
                </div>
              )}
            </>
          )}
        </div>

        <div style={{ marginTop: 24 }}>
          {voiceEngine === "google" ? (
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 10,
              border: "1px solid rgba(255,255,255,0.12)",
              padding: "7px 14px", borderRadius: 3,
              fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
              color: "rgba(255,255,255,0.65)", letterSpacing: "0.08em"
            }}>
              <span style={{
                width: 7, height: 7, borderRadius: "50%",
                background: "rgba(255,255,255,0.65)",
                animation: "pulse 1.6s ease-in-out infinite"
              }} />
              Charon — Hızlı & Eterik
            </div>
          ) : (
            <select
              value={voiceId}
              onChange={e => setVoiceId(e.target.value)}
              style={{
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.18)",
                color: "rgba(255,255,255,0.75)",
                padding: "7px 12px", borderRadius: 3,
                fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
                letterSpacing: "0.06em", outline: "none"
              }}>
              {voices.length === 0 && <option value="">— sistem sesi —</option>}
              {voices.map(v => (
                <option key={v.voiceURI} value={v.voiceURI} style={{ background: "#0A0A0A" }}>
                  {v.name} ({v.lang})
                </option>
              ))}
            </select>
          )}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { LilithPanel, VarlikPanel, SoundWave, BouncingDots });
