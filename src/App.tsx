import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import type { Message, SessionState, SpeakerState, VoiceEngine } from './types'
import { globalSentiment, hexToRgb, scoreMessage } from './lib/sentiment'
import Header from './components/Header'
import LilithPanel from './components/panels/LilithPanel'
import VarlikPanel from './components/panels/VarlikPanel'
import CenterOverlay from './components/CenterOverlay'
import ControlBar from './components/ControlBar'
import SimParameters from './components/footer/SimParameters'
import TranscriptStream from './components/footer/TranscriptStream'

const CONTEXT_WINDOW = 12

// ── helpers ──────────────────────────────────────────────────────────────────

function nowStamp(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

function makeId(): string {
  return Math.random().toString(36).slice(2, 10)
}

// ── Voice helpers ─────────────────────────────────────────────────────────────

function listTtsVoices(): SpeechSynthesisVoice[] {
  if (!window.speechSynthesis) return []
  return window.speechSynthesis.getVoices()
}

const FEMALE_HINTS = ['female', 'feminine', 'woman', 'girl', 'yelda', 'filiz', 'emel', 'seda',
  'samantha', 'victoria', 'kathy', 'ava', 'allison', 'google türkçe', 'zira', 'jenny', 'aria', 'elsa']
const MALE_HINTS = ['male', 'masculine', 'man', 'boy', 'tolga', 'ahmet',
  'alex', 'fred', 'daniel', 'tom', 'david', 'mark', 'guy', 'ryan', 'thomas']

function classifyVoice(v: SpeechSynthesisVoice): 'f' | 'm' | '?' {
  const name = v.name.toLowerCase()
  if (FEMALE_HINTS.some(h => name.includes(h))) return 'f'
  if (MALE_HINTS.some(h => name.includes(h))) return 'm'
  return '?'
}

function autoPickVoices(voices: SpeechSynthesisVoice[]): [string, string] {
  if (!voices.length) return ['', '']
  const turkish = voices.filter(v => /^tr/i.test(v.lang))
  const pool = turkish.length ? turkish : voices
  let lilith = pool.find(v => classifyVoice(v) === 'f') ?? pool[0]
  let varlik = pool.find(v => classifyVoice(v) === 'm' && v.voiceURI !== lilith.voiceURI)
           ?? pool.find(v => v.voiceURI !== lilith.voiceURI)
           ?? lilith
  return [lilith.voiceURI, varlik.voiceURI]
}

const CHAR_PROSODY: Record<string, { rate: number; pitch: number }> = {
  lilith:  { rate: 0.88, pitch: 0.82 },
  generic: { rate: 1.02, pitch: 1.18 },
}

function emotionalProsody(msg: Message): { rate: number; pitch: number } {
  const base = CHAR_PROSODY[msg.sender as keyof typeof CHAR_PROSODY] ?? { rate: 1, pitch: 1 }
  const s = scoreMessage(msg)
  let { rate, pitch } = base
  if (msg.sender === 'lilith') {
    if (s.intensity === 'high') { rate *= 0.92; pitch *= 0.94 }
    else if (s.intensity === 'mid') { rate *= 0.96 }
  } else if (msg.sender === 'generic') {
    if (s.intensity === 'high') { pitch *= 0.96; rate *= 0.98 }
    else if (s.intensity === 'low') { pitch *= 1.04; rate *= 1.04 }
  }
  rate = Math.max(0.5, Math.min(1.6, rate))
  pitch = Math.max(0.5, Math.min(1.6, pitch))
  return { rate, pitch }
}

function splitForProsody(text: string): string[] {
  const parts: string[] = []
  const sentences: string[] = []
  let buf = ''
  for (const ch of text) {
    buf += ch
    if (/[.!?…]/.test(ch)) { sentences.push(buf.trim()); buf = '' }
  }
  if (buf.trim()) sentences.push(buf.trim())
  for (const s of sentences) {
    if (s.length <= 60) { parts.push(s); continue }
    const clauses = s.split(/(?<=[,;:])\s+/)
    for (const c of clauses) parts.push(c)
  }
  return parts.filter(Boolean)
}

// ── Web Audio API PCM decoder ────────────────────────────────────────────────

async function decodePcmToBuffer(base64Audio: string, ctx: AudioContext): Promise<AudioBuffer> {
  const bytes = Uint8Array.from(atob(base64Audio), c => c.charCodeAt(0))
  // Detect RIFF/WAV container
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) {
    return ctx.decodeAudioData(bytes.buffer.slice(0))
  }
  // Raw 16-bit signed little-endian PCM at 24000 Hz
  const samples = bytes.length / 2
  const buffer = ctx.createBuffer(1, samples, 24000)
  const channel = buffer.getChannelData(0)
  const view = new DataView(bytes.buffer)
  for (let i = 0; i < samples; i++) {
    channel[i] = view.getInt16(i * 2, true) / 32768.0
  }
  return buffer
}

// ── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [messages, setMessages] = useState<Message[]>([])
  const [sessionState, setSessionState] = useState<SessionState>('inactive')
  const [activeSpeaker, setActiveSpeaker] = useState<'lilith' | 'generic' | null>(null)
  const [speakerState, setSpeakerState] = useState<SpeakerState>('idle')
  const [currentWord, setCurrentWord] = useState('')
  const [error, setError] = useState('')
  const [muted, setMuted] = useState(false)
  const [userInput, setUserInput] = useState('')
  const [tab, setTab] = useState<'lilith' | 'varlik' | 'dual'>('dual')

  const [voiceEngine, setVoiceEngine] = useState<VoiceEngine>('gemini')
  const [rate, setRate] = useState(1.0)
  const [pitch, setPitch] = useState(1.0)

  const [allVoices, setAllVoices] = useState<SpeechSynthesisVoice[]>([])
  const [lilithVoiceId, setLilithVoiceId] = useState('')
  const [varlikVoiceId, setVarlikVoiceId] = useState('')

  // Stable refs
  const messagesRef = useRef(messages)
  messagesRef.current = messages
  const sessionStateRef = useRef(sessionState)
  sessionStateRef.current = sessionState
  const mutedRef = useRef(muted)
  mutedRef.current = muted
  const voiceEngineRef = useRef(voiceEngine)
  voiceEngineRef.current = voiceEngine
  const rateRef = useRef(rate)
  rateRef.current = rate
  const pitchRef = useRef(pitch)
  pitchRef.current = pitch
  const lilithVoiceIdRef = useRef(lilithVoiceId)
  lilithVoiceIdRef.current = lilithVoiceId
  const varlikVoiceIdRef = useRef(varlikVoiceId)
  varlikVoiceIdRef.current = varlikVoiceId
  const allVoicesRef = useRef(allVoices)
  allVoicesRef.current = allVoices

  const cancelTokenRef = useRef(0)
  const wordTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null)

  // Load browser voices
  useEffect(() => {
    if (!window.speechSynthesis) return
    const refresh = () => {
      const list = listTtsVoices()
      setAllVoices(list)
      const [lId, vId] = autoPickVoices(list)
      setLilithVoiceId(prev => prev || lId)
      setVarlikVoiceId(prev => prev || vId)
    }
    refresh()
    window.speechSynthesis.onvoiceschanged = refresh
  }, [])

  const sentiment = useMemo(() => globalSentiment(messages), [messages])
  const sentimentRgb = useMemo(() => hexToRgb(sentiment.color), [sentiment.color])

  // ── Audio helpers ────────────────────────────────────────────────────────

  const unlockAudioContext = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext({ sampleRate: 24000 })
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {})
    }
    // Also unlock SpeechSynthesis
    if (window.speechSynthesis) {
      try {
        const u = new SpeechSynthesisUtterance(' ')
        u.volume = 0
        window.speechSynthesis.speak(u)
      } catch {}
    }
  }, [])

  const stopAllAudio = useCallback(() => {
    if (audioSourceRef.current) {
      try { audioSourceRef.current.stop() } catch {}
      audioSourceRef.current = null
    }
    try { if (window.speechSynthesis) window.speechSynthesis.cancel() } catch {}
    if (wordTimerRef.current) { clearTimeout(wordTimerRef.current); wordTimerRef.current = null }
    setCurrentWord('')
  }, [])

  // ── speakMessage ────────────────────────────────────────────────────────────

  const speakMessage = useCallback((msg: Message, audio?: string | null, mimeType?: string | null): Promise<void> => {
    return new Promise(async resolve => {
      const token = cancelTokenRef.current
      const text = msg.text ?? ''
      if (!text) { resolve(); return }

      const words = text.split(/\s+/).filter(Boolean)
      let wordIdx = 0

      const startWordTimer = (perWord: number) => {
        const tick = () => {
          if (token !== cancelTokenRef.current) return
          if (wordIdx >= words.length) { setCurrentWord(''); return }
          setCurrentWord(words[wordIdx].replace(/[.,!?;:"'`…—–]/g, ''))
          wordIdx++
          wordTimerRef.current = setTimeout(tick, perWord)
        }
        tick()
      }

      const stopWordTimer = () => {
        if (wordTimerRef.current) { clearTimeout(wordTimerRef.current); wordTimerRef.current = null }
        setCurrentWord('')
      }

      const { rate: charRate, pitch: charPitch } = emotionalProsody(msg)

      // Muted: just simulate timing
      if (mutedRef.current) {
        const wpm = 165 * (charRate * rateRef.current)
        const perWord = Math.max(150, 60000 / wpm)
        startWordTimer(perWord)
        const totalMs = perWord * Math.max(1, words.length) + 200
        setTimeout(() => { if (token === cancelTokenRef.current) { stopWordTimer(); resolve() } }, totalMs)
        return
      }

      // ── Path A: Web Audio API with Gemini PCM ────────────────────────────
      const tryWebAudio = async (): Promise<void> => {
        if (!audio) throw new Error('no audio data')
        const ctx = audioCtxRef.current
        if (!ctx) throw new Error('no audio context')

        const buffer = await decodePcmToBuffer(audio, ctx)
        const durationMs = buffer.duration * 1000
        const perWord = Math.max(120, durationMs / Math.max(1, words.length))
        startWordTimer(perWord)

        return new Promise((res, rej) => {
          if (token !== cancelTokenRef.current) { rej(new Error('cancelled')); return }
          const source = ctx.createBufferSource()
          source.buffer = buffer
          source.connect(ctx.destination)
          audioSourceRef.current = source
          source.onended = () => { audioSourceRef.current = null; res() }
          source.start(0)
        })
      }

      // ── Path B: Browser SpeechSynthesis ─────────────────────────────────
      const trySpeechSynthesis = (): Promise<void> => new Promise(res => {
        if (!window.speechSynthesis) { res(); return }
        try { window.speechSynthesis.cancel() } catch {}

        const effRate = Math.max(0.4, Math.min(1.8, charRate * rateRef.current))
        const effPitch = Math.max(0.4, Math.min(1.6, charPitch * pitchRef.current))
        const targetId = msg.sender === 'lilith' ? lilithVoiceIdRef.current : varlikVoiceIdRef.current
        const voice = allVoicesRef.current.find(x => x.voiceURI === targetId) ?? null

        const wpm = 165 * effRate
        const perWord = Math.max(150, 60000 / wpm)
        if (wordTimerRef.current) clearTimeout(wordTimerRef.current)
        wordIdx = 0
        startWordTimer(perWord)

        const chunks = splitForProsody(text)
        let i = 0
        const next = () => {
          if (token !== cancelTokenRef.current) return res()
          if (i >= chunks.length) return res()
          const part = chunks[i++]
          const utter = new SpeechSynthesisUtterance(part)
          utter.lang = 'tr-TR'
          utter.rate = effRate
          utter.pitch = effPitch
          if (voice) utter.voice = voice
          utter.onend = () => {
            if (token !== cancelTokenRef.current) return res()
            setTimeout(next, /[.!?…]$/.test(part) ? 200 : 70)
          }
          utter.onerror = () => { if (token !== cancelTokenRef.current) return res(); setTimeout(next, 40) }
          try { window.speechSynthesis.speak(utter) } catch { setTimeout(next, 40) }
        }
        next()
      })

      try {
        if (voiceEngineRef.current === 'gemini' && audio) {
          try {
            await tryWebAudio()
          } catch {
            // Fallback to browser TTS
            wordIdx = 0
            await trySpeechSynthesis()
          }
        } else {
          await trySpeechSynthesis()
        }
      } finally {
        if (token === cancelTokenRef.current) stopWordTimer()
        resolve()
      }
    })
  }, [])

  // ── Generate via backend ──────────────────────────────────────────────────

  const generateTurn = useCallback(async (speaker: 'lilith' | 'generic'): Promise<{ text: string; audio?: string | null; mimeType?: string | null }> => {
    const history = messagesRef.current
    const skipTts = voiceEngineRef.current === 'browser'
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ speaker, history, skipTts }),
    })
    const data = await res.json()
    if (!res.ok || data.error) throw new Error(data.error ?? 'API hatası')
    return data
  }, [])

  // ── Conversation loop ─────────────────────────────────────────────────────

  const runTurnRef = useRef<((speaker: 'lilith' | 'generic', token: number) => Promise<void>) | null>(null)

  const runTurn = useCallback(async (speaker: 'lilith' | 'generic', token: number) => {
    if (token !== cancelTokenRef.current) return
    if (sessionStateRef.current !== 'running') return

    setActiveSpeaker(speaker)
    setSpeakerState('generating')
    setError('')

    let result: { text: string; audio?: string | null; mimeType?: string | null }
    try {
      result = await generateTurn(speaker)
    } catch (e) {
      setError((e as Error).message ?? 'Hata oluştu.')
      setSessionState('paused')
      setSpeakerState('idle')
      setActiveSpeaker(null)
      return
    }

    if (token !== cancelTokenRef.current) return
    if (sessionStateRef.current !== 'running') return
    if (!result.text) { setSpeakerState('idle'); setActiveSpeaker(null); return }

    const msg: Message = { id: makeId(), sender: speaker, text: result.text, timestamp: nowStamp() }
    setMessages(prev => [...prev, msg])
    setSpeakerState('speaking')

    await speakMessage(msg, result.audio, result.mimeType)

    if (token !== cancelTokenRef.current) return
    if (sessionStateRef.current !== 'running') {
      setSpeakerState('idle'); setActiveSpeaker(null); return
    }

    setSpeakerState('idle')
    setActiveSpeaker(null)
    const next = speaker === 'lilith' ? 'generic' : 'lilith'
    runTurnRef.current?.(next, token)
  }, [generateTurn, speakMessage])

  runTurnRef.current = runTurn

  // ── Controls ──────────────────────────────────────────────────────────────

  const handleStart = () => {
    unlockAudioContext()
    if (sessionState === 'running') {
      cancelTokenRef.current++
      stopAllAudio()
      setActiveSpeaker(null)
      setSpeakerState('idle')
      setSessionState('paused')
      return
    }
    setSessionState('running')
    const token = ++cancelTokenRef.current
    const last = messagesRef.current[messagesRef.current.length - 1]
    const next: 'lilith' | 'generic' = !last ? 'lilith' : last.sender === 'lilith' ? 'generic' : 'lilith'
    setTimeout(() => runTurnRef.current?.(next, token), 60)
  }

  const handleReset = () => {
    cancelTokenRef.current++
    stopAllAudio()
    setMessages([])
    setSessionState('inactive')
    setActiveSpeaker(null)
    setSpeakerState('idle')
    setCurrentWord('')
    setError('')
  }

  const handleMute = () => {
    setMuted(m => {
      if (!m) stopAllAudio()
      return !m
    })
  }

  const handleIntervention = (e: React.FormEvent) => {
    e.preventDefault()
    const text = userInput.trim()
    if (!text) return
    setUserInput('')

    cancelTokenRef.current++
    stopAllAudio()

    const msg: Message = { id: makeId(), sender: 'user', text, timestamp: nowStamp() }
    const prevMessages = messagesRef.current
    setMessages([...prevMessages, msg])

    let lastSpeaker: 'lilith' | 'generic' | null = null
    for (let i = prevMessages.length - 1; i >= 0; i--) {
      if (prevMessages[i].sender !== 'user') {
        lastSpeaker = prevMessages[i].sender as 'lilith' | 'generic'
        break
      }
    }
    const next: 'lilith' | 'generic' = lastSpeaker === 'lilith' ? 'generic' : 'lilith'

    setSessionState('running')
    const token = ++cancelTokenRef.current
    setTimeout(() => runTurnRef.current?.(next, token), 100)
  }

  const handleCopy = async () => {
    const labels: Record<string, string> = { lilith: 'Kraliçe Lilith', generic: 'Varlık', user: 'Moderatör (Kullanıcı)' }
    const txt = messages.map(m => `[${m.timestamp}] ${labels[m.sender]}: ${m.text}`).join('\n')
    try { await navigator.clipboard.writeText(txt) } catch {}
  }

  const handleDownload = () => {
    const labels: Record<string, string> = { lilith: 'Kraliçe Lilith', generic: 'Varlık', user: 'Moderatör (Kullanıcı)' }
    const txt = messages.map(m => `[${m.timestamp}] ${labels[m.sender]}: ${m.text}`).join('\n')
    const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'lilith-dialog.txt'
    document.body.appendChild(a); a.click(); a.remove()
    URL.revokeObjectURL(url)
  }

  const wordCount = useMemo(() =>
    messages.reduce((n, m) => n + (m.text ? m.text.split(/\s+/).filter(Boolean).length : 0), 0)
  , [messages])

  const lastLilith = useMemo(() => [...messages].reverse().find(m => m.sender === 'lilith'), [messages])
  const lastVarlik = useMemo(() => [...messages].reverse().find(m => m.sender === 'generic'), [messages])

  const ambientStyle: React.CSSProperties = {
    boxShadow: `inset 0 0 220px rgba(${sentimentRgb}, 0.05)`,
    backgroundImage: `radial-gradient(ellipse at 50% 40%, rgba(${sentimentRgb}, 0.04) 0%, transparent 65%)`,
    transition: 'box-shadow 1s ease, background-image 1s ease',
  }

  let inputPlaceholder = 'Diyaloga müdahale et...'
  if (sessionState === 'inactive' && messages.length === 0)
    inputPlaceholder = 'Simülasyon başlatıldığında müdahale edebilirsin.'
  else if (sessionState === 'paused')
    inputPlaceholder = 'Duraklatıldı. Yeni bir cümle yaz...'
  else if (activeSpeaker === 'lilith')
    inputPlaceholder = 'Lilith konuşuyor — kesintiyi yaz...'
  else if (activeSpeaker === 'generic')
    inputPlaceholder = 'Varlık konuşuyor — kesintiyi yaz...'

  const inputDisabled = sessionState === 'inactive' && messages.length === 0
  const showLeft = tab !== 'varlik'
  const showRight = tab !== 'lilith'

  return (
    <div
      style={{ position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column', ...ambientStyle }}
    >
      <Header sentiment={sentiment} sentimentRgb={sentimentRgb} activeSpeaker={activeSpeaker} />

      {/* Mobile tabs */}
      <div className="mobile-tabs" style={{
        display: 'none',
        position: 'sticky', top: 0, zIndex: 30,
        background: 'rgba(10,10,10,0.85)',
        backdropFilter: 'blur(8px)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}>
        {([
          { id: 'lilith', label: '👸 Lilith' },
          { id: 'varlik', label: '○ Varlık' },
          { id: 'dual',   label: '⚔️ İkili' },
        ] as const).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, background: 'transparent', border: 'none',
            borderBottom: tab === t.id ? `2px solid ${sentiment.color}` : '2px solid transparent',
            color: tab === t.id ? sentiment.color : 'rgba(255,255,255,0.55)',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11, letterSpacing: '0.1em',
            padding: '10px 0', cursor: 'pointer',
          }}>{t.label}</button>
        ))}
      </div>

      {/* Main panels */}
      <main style={{
        position: 'relative',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 24,
        padding: '28px 32px',
        flex: 1,
      }}>
        {showLeft && (
          <LilithPanel
            active={activeSpeaker === 'lilith'}
            state={speakerState}
            lastMessage={lastLilith}
            voiceEngine={voiceEngine}
            voices={allVoices}
            voiceId={lilithVoiceId}
            setVoiceId={setLilithVoiceId}
          />
        )}
        {showRight && (
          <VarlikPanel
            active={activeSpeaker === 'generic'}
            state={speakerState}
            lastMessage={lastVarlik}
            voiceEngine={voiceEngine}
            voices={allVoices}
            voiceId={varlikVoiceId}
            setVoiceId={setVarlikVoiceId}
          />
        )}
        <CenterOverlay currentWord={currentWord} activeSpeaker={activeSpeaker} />
      </main>

      {/* Mobile current-word banner */}
      {currentWord && (
        <div style={{
          display: 'none',
          padding: '8px 18px',
          background: 'rgba(212,175,55,0.08)',
          borderTop: '1px solid rgba(212,175,55,0.18)',
          borderBottom: '1px solid rgba(212,175,55,0.18)',
        }} className="mobile-word">
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'rgba(212,175,55,0.65)', letterSpacing: '0.12em' }}>OKUNAN KELİME: </span>
          <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: activeSpeaker === 'lilith' ? '#D4AF37' : 'rgba(255,255,255,0.7)', fontStyle: 'italic' }}>{currentWord}</span>
        </div>
      )}

      {/* Footer */}
      <footer style={{
        display: 'grid',
        gridTemplateColumns: '280px 1fr',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(0,0,0,0.35)',
        minHeight: 240,
      }}>
        <SimParameters
          voiceEngine={voiceEngine} setVoiceEngine={setVoiceEngine}
          rate={rate} setRate={setRate}
          pitch={pitch} setPitch={setPitch}
          wordCount={wordCount}
        />
        <TranscriptStream
          messages={messages}
          currentWord={currentWord}
          onCopy={handleCopy}
          onDownload={handleDownload}
        />
      </footer>

      <ControlBar
        sessionState={sessionState}
        muted={muted}
        onStart={handleStart}
        onReset={handleReset}
        onMute={handleMute}
        userInput={userInput}
        setUserInput={setUserInput}
        onSubmit={handleIntervention}
        placeholder={inputPlaceholder}
        disabled={inputDisabled}
        error={error}
      />

      {/* Responsive styles injected globally */}
      <style>{`
        @media (max-width: 980px) {
          main { grid-template-columns: 1fr !important; padding: 20px !important; }
          footer { grid-template-columns: 1fr !important; }
          .mobile-tabs { display: flex !important; }
          .mobile-word { display: block !important; }
          .center-overlay { display: none !important; }
        }
      `}</style>
    </div>
  )
}
