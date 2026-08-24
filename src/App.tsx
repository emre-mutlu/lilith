import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import type { Message, SessionState, SpeakerState, VoiceEngine, ScenarioPrelude, InterventionMode } from '../shared/types'
import { globalSentiment, hexToRgb, scoreMessage } from './lib/sentiment'
import { listTtsVoices, autoPickVoices, emotionalProsody, splitForProsody, decodeAudioData } from './lib/browserTts'
import Header from './components/Header'
import LilithPanel from './components/panels/LilithPanel'
import VarlikPanel from './components/panels/VarlikPanel'
import CenterOverlay from './components/CenterOverlay'
import ControlBar from './components/ControlBar'
import TranscriptStream from './components/footer/TranscriptStream'
import SimParameters, { type Telemetry } from './components/footer/SimParameters'
import SceneCard from './components/SceneCard'
import { AmbientEngine } from './lib/ambient'

// ── helpers ──────────────────────────────────────────────────────────────────

function nowStamp(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

function makeId(): string {
  return Math.random().toString(36).slice(2, 10)
}

const CHAR_LABELS: Record<string, string> = {
  lilith: 'Kraliçe Lilith', generic: 'Varlık', user: 'Moderatör (Kullanıcı)',
}

function transcriptText(messages: Message[]): string {
  return messages.map(m => `[${m.timestamp}] ${CHAR_LABELS[m.sender]}: ${m.text}`).join('\n')
}
// ── Voice helpers → src/lib/browserTts.ts ────────────────────────────────────

// ── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [messages, setMessages] = useState<Message[]>([])
  const [sessionState, setSessionState] = useState<SessionState>('inactive')
  const [activeSpeaker, setActiveSpeaker] = useState<'lilith' | 'generic' | null>(null)
  const [speakerState, setSpeakerState] = useState<SpeakerState>('idle')
  const [currentWord, setCurrentWord] = useState('')
  const [currentWordIdx, setCurrentWordIdx] = useState(-1)
  const [error, setError] = useState('')
  const [muted, setMuted] = useState(false)
  const [userInput, setUserInput] = useState('')
  const [tab, setTab] = useState<'lilith' | 'varlik' | 'dual'>('dual')
  const [showKaraoke, setShowKaraoke] = useState(true)

  // Senaryo sistemi: prelüd istemcide yaşar, her /api/generate'e eklenir
  const [scenario, setScenario] = useState<ScenarioPrelude | null>(null)
  const sessionIdRef = useRef<string | null>(null)

  const [voiceEngine, setVoiceEngine] = useState<VoiceEngine>('fish')

  // Araya-gir modu — tür, algı ve zamanlamayı belirler (tasarim_notlari "menteşe")
  const [intMode, setIntMode] = useState<InterventionMode>('soz')
  const [fisTarget, setFisTarget] = useState<'lilith' | 'generic'>('lilith')
  // Söz/fısıltı konuşan replik bitene kadar burada bekler; sahne/yön anında uygulanır
  const queuedInterventionsRef = useRef<Message[]>([])

  // Yerel TTS (Chatterbox) ısınma durumu — /api/tts/status'tan beslenir
  const [localTts, setLocalTts] = useState<{ configured: boolean; ready: boolean; warming: boolean }>({
    configured: false, ready: false, warming: false,
  })
  useEffect(() => {
    let stop = false
    let timer: ReturnType<typeof setTimeout>
    const tick = async () => {
      try {
        const r = await fetch('/api/tts/status')
        if (r.ok && !stop) setLocalTts(await r.json())
      } catch { /* server yok — sessizce tekrar dene */ }
      if (!stop) timer = setTimeout(tick, 2000)
    }
    void tick()
    return () => { stop = true; clearTimeout(timer) }
  }, [])

  // Gerçek telemetri: /api/generate'in döndürdüğü latencyMs + engine'den beslenir
  const [telemetry, setTelemetry] = useState<Telemetry>({
    lastLatencyMs: null, avgLatencyMs: null, turns: 0, words: 0, servedBy: null,
  })
  const latenciesRef = useRef<number[]>([])

  // Tarayıcı-TTS kullanıcı trimleri (sunucu seslerinde etkisiz)
  const [browserRate, setBrowserRate] = useState(1)
  const [browserPitch, setBrowserPitch] = useState(1)
  const browserRateRef = useRef(browserRate); browserRateRef.current = browserRate
  const browserPitchRef = useRef(browserPitch); browserPitchRef.current = browserPitch

  // Faz 4: prosedürel ambient underscore (kullanıcı hareketiyle başlar, Safari-güvenli)
  const ambientRef = useRef<AmbientEngine | null>(null)
  const [ambientOn, setAmbientOn] = useState(false)

  const toggleAmbient = useCallback(async () => {
    if (!ambientRef.current) {
      ambientRef.current = new AmbientEngine(p => setAmbientOn(p))
    }
    const ok = await ambientRef.current.toggle()
    if (!ok && !ambientRef.current.playing) setAmbientOn(false)
  }, [])

  useEffect(() => () => ambientRef.current?.dispose(), [])

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
  const scenarioRef = useRef(scenario)
  scenarioRef.current = scenario
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

  // Sentiment → mood sürüşü v2: baskın konuşanın tabanı + son repliklerin
  // tırmanış eğimi + high-intensity dalgası → ambient'i canlı nefes aldırır.
  useEffect(() => {
    if (!ambientRef.current?.playing) return
    const recent = messages.slice(-6)
    const half = Math.floor(recent.length / 2)
    const avgScore = (arr: typeof recent) => arr.length ? arr.reduce((a, m) => a + scoreMessage(m).score, 0) / arr.length : 0
    const trendN = recent.length >= 4 ? Math.max(-1, Math.min(1, avgScore(recent.slice(half)) - avgScore(recent.slice(0, half)))) : 0
    const surge = messages.slice(-4).filter(m => m.intensity === 'high').length / 4
    const base = sentiment.dominant === 'user' ? 0.65 : sentiment.dominant === 'lilith' ? 0.35 : 0.15
    const tension = Math.min(1, base * 0.6 + Math.max(0, trendN) * 0.25 + surge * 0.3)
    const brightness = Math.min(1, (sentiment.percent / 100) * 0.9 + surge * 0.1)
    ambientRef.current.setMood({ brightness, tension })
  }, [sentiment, messages])

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
    setCurrentWordIdx(-1)
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
          if (wordIdx >= words.length) { setCurrentWord(''); setCurrentWordIdx(-1); return }
          setCurrentWord(words[wordIdx].replace(/[.,!?;:"'`…—–]/g, ''))
          setCurrentWordIdx(wordIdx)
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
        const wpm = 165 * charRate
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

        const buffer = await decodeAudioData(audio, mimeType, ctx)
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

        const effRate = Math.max(0.4, Math.min(1.8, charRate * browserRateRef.current))
        const effPitch = Math.max(0.4, Math.min(1.6, charPitch * browserPitchRef.current))
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
        // Sunucudan ses geldiyse (fish/local/gemini) Web Audio ile çal;
        // yoksa (browser motoru ya da tüm merdiven düştüyse) tarayıcı TTS'e geç
        if (audio) {
          try {
            await tryWebAudio()
          } catch {
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

  const generateTurn = useCallback(async (speaker: 'lilith' | 'generic'): Promise<{ text: string; mood?: string; intensity?: 'low' | 'mid' | 'high'; audio?: string | null; mimeType?: string | null }> => {
    const history = messagesRef.current
    // Motor seçimi: mute -> ses üretme (tarayıcı yok) · aksi halde seçili motor
    const engine = mutedRef.current ? 'browser' : voiceEngineRef.current
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        speaker, history, ttsEngine: engine,
        scenario: scenarioRef.current ?? undefined,
        sessionId: sessionIdRef.current ?? undefined,
      }),
    })
    const data = await res.json()
    if (!res.ok || data.error) throw new Error(data.error ?? 'API hatası')
    // Telemetri kaydı (gerçek sunucu ölçümü)
    if (typeof data.latencyMs === 'number') {
      latenciesRef.current.push(data.latencyMs)
      const lats = latenciesRef.current
      setTelemetry({
        lastLatencyMs: data.latencyMs,
        avgLatencyMs: Math.round(lats.reduce((a, b) => a + b, 0) / lats.length),
        servedBy: data.engine ?? null,
        turns: 0, words: 0, // tur/kelime render'da mesajlardan hesaplanır
      })
    }
    return data
  }, [])

  // ── Conversation loop ─────────────────────────────────────────────────────

  type TurnResult = { text: string; mood?: string; intensity?: 'low' | 'mid' | 'high'; audio?: string | null; mimeType?: string | null }
  const runTurnRef = useRef<((speaker: 'lilith' | 'generic', token: number, prefetched?: TurnResult | null) => Promise<void>) | null>(null)

  const runTurn = useCallback(async (
    speaker: 'lilith' | 'generic',
    token: number,
    prefetched?: TurnResult | null,
  ) => {
    if (token !== cancelTokenRef.current) return
    if (sessionStateRef.current !== 'running') return

    setActiveSpeaker(speaker)
    setError('')

    let result: TurnResult
    if (prefetched) {
      result = prefetched
      setSpeakerState('speaking')
    } else {
      setSpeakerState('generating')
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
      setSpeakerState('speaking')
    }

    if (!result.text) { setSpeakerState('idle'); setActiveSpeaker(null); return }

    const msg: Message = {
      id: makeId(), sender: speaker, text: result.text, timestamp: nowStamp(),
      mood: result.mood, intensity: result.intensity,
    }
    // Update ref immediately so prefetch reads correct history
    messagesRef.current = [...messagesRef.current, msg]
    setMessages(messagesRef.current)

    // Prefetch next speaker while current is playing
    const next: 'lilith' | 'generic' = speaker === 'lilith' ? 'generic' : 'lilith'
    const prefetchPromise: Promise<TurnResult | null> =
      token === cancelTokenRef.current && sessionStateRef.current === 'running'
        ? generateTurn(next).catch(() => null)
        : Promise.resolve(null)

    await speakMessage(msg, result.audio, result.mimeType)

    if (token !== cancelTokenRef.current) return
    if (sessionStateRef.current !== 'running') {
      setSpeakerState('idle'); setActiveSpeaker(null); return
    }

    // Replik bitti — bekleyen söz/fısıltıları sahneye düşür (sonraki tur görür)
    if (queuedInterventionsRef.current.length) {
      messagesRef.current = [...messagesRef.current, ...queuedInterventionsRef.current]
      setMessages(messagesRef.current)
      queuedInterventionsRef.current = []
    }

    setSpeakerState('idle')
    setActiveSpeaker(null)
    const nextResult = await prefetchPromise
    runTurnRef.current?.(next, token, nextResult)
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

    const begin = () => {
      if (token !== cancelTokenRef.current) return
      const last = messagesRef.current[messagesRef.current.length - 1]
      const next: 'lilith' | 'generic' = !last ? 'lilith' : last.sender === 'lilith' ? 'generic' : 'lilith'
      runTurnRef.current?.(next, token)
    }

    // Yeni oturum: yönetmen prelüdü üret (sessiz — kullanıcı beklemez, döngü hemen başlar)
    if (!sessionIdRef.current) {
      fetch('/api/director', { method: 'POST' })
        .then(r => r.json())
        .then(d => {
          if (d?.scenario) {
            setScenario(d.scenario as ScenarioPrelude)
            sessionIdRef.current = d.sessionId ?? null
          }
        })
        .catch(() => {})
        .finally(begin)
    } else {
      begin()
    }
  }

  const handleReset = () => {
    cancelTokenRef.current++
    stopAllAudio()
    queuedInterventionsRef.current = []
    setMessages([])
    setSessionState('inactive')
    setActiveSpeaker(null)
    setSpeakerState('idle')
    setCurrentWord('')
    setError('')
    // Yeni senaryo: sıfırlamada prelüd de yenilenir
    sessionIdRef.current = null
    setScenario(null)
    latenciesRef.current = []
    setTelemetry({ lastLatencyMs: null, avgLatencyMs: null, turns: 0, words: 0, servedBy: null })
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

    const msg: Message = {
      id: makeId(), sender: 'user', text, timestamp: nowStamp(),
      mode: intMode,
      target: intMode === 'fisilti' ? fisTarget : undefined,
    }

    // Sahne/yön konuşmayı zaten bozmaz → anında uygula.
    // Söz/fısıltı: replik ortasında geldiyse kuyruğa girer (replik sonunda düşer);
    // boşta/pozada ise doğrudan sahneye yazılır. HİÇBİR DURUMDA ses kesilmez.
    if (intMode === 'sahne' || intMode === 'yon' || sessionStateRef.current !== 'running') {
      messagesRef.current = [...messagesRef.current, msg]
      setMessages(messagesRef.current)
      // Boşta kaldıysa ve oturum çalışıyor değilse: döngü zaten duruyor, mesaj
      // bir sonraki Başlat/Devam'da doğal olarak geçmişe dahil olur.
    } else {
      queuedInterventionsRef.current.push(msg)
    }
  }

  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(transcriptText(messages)) } catch {}
  }

  const handleDownload = () => {
    const blob = new Blob([transcriptText(messages)], { type: 'text/plain;charset=utf-8' })
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
  else if (intMode === 'soz')
    inputPlaceholder = 'Karakterlere seslen... ("Lilith, ona yalan söyleme!")'
  else if (intMode === 'sahne')
    inputPlaceholder = 'Sahneye bir şey ekle/değiştir... ("uzakta bir çan çalar")'
  else if (intMode === 'fisilti')
    inputPlaceholder = `Fısılda → ${fisTarget === 'lilith' ? 'Lilith' : 'Varlık'}'in zihnine...`
  else if (intMode === 'yon')
    inputPlaceholder = 'Yönetmen notu — kimse duymaz... ("tempoyu düşür")'

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
            messages={messages}
          />
        )}
        {showRight && (
          <VarlikPanel
            active={activeSpeaker === 'generic'}
            state={speakerState}
            lastMessage={lastVarlik}
            messages={messages}
          />
        )}
        {showKaraoke && (
          <CenterOverlay
            currentWordIdx={currentWordIdx}
            activeSpeaker={activeSpeaker}
            currentText={activeSpeaker === 'lilith' ? (lastLilith?.text ?? '') : (lastVarlik?.text ?? '')}
            onClose={() => setShowKaraoke(false)}
          />
        )}
        {!showKaraoke && activeSpeaker && (
          <button
            onClick={() => setShowKaraoke(true)}
            style={{
              position: 'fixed', bottom: 90, right: 24,
              zIndex: 40, background: 'rgba(10,8,16,0.75)',
              backdropFilter: 'blur(12px)',
              border: `1px solid rgba(${activeSpeaker === 'lilith' ? '212,175,55' : '208,208,208'}, 0.25)`,
              color: activeSpeaker === 'lilith' ? '#D4AF37' : 'rgba(208,208,208,0.8)',
              fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
              letterSpacing: '0.15em', padding: '7px 14px', borderRadius: 20,
              cursor: 'pointer',
            }}
          >
            ◈ ALTYAZI
          </button>
        )}
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
        borderTop: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(0,0,0,0.35)',
        minHeight: 200,
        display: 'grid',
        gridTemplateColumns: 'auto 1fr',
      }}>
        <div style={{ display: 'flex', alignItems: 'stretch', minWidth: 0 }}>
          {messages.length > 0 && (
            <div style={{
              display: 'flex', flexDirection: 'column', justifyContent: 'center',
              alignItems: 'center', gap: 10, padding: '10px 0 10px 16px',
            }}>
              <SceneCard scenario={scenario} />
              <button
                onClick={toggleAmbient}
                title="Prosedürel ambiyans (duygu rengine nefes verir)"
                style={{
                  background: ambientOn ? 'rgba(212,175,55,0.12)' : 'rgba(10,8,16,0.75)',
                  backdropFilter: 'blur(12px)',
                  border: `1px solid ${ambientOn ? 'rgba(212,175,55,0.45)' : 'rgba(255,255,255,0.18)'}`,
                  color: ambientOn ? '#D4AF37' : 'rgba(255,255,255,0.6)',
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
                  letterSpacing: '0.15em', padding: '7px 14px', borderRadius: 20,
                  cursor: 'pointer',
                }}
              >
                ♪ AMBİYANS
              </button>
            </div>
          )}
          <SimParameters
            voiceEngine={voiceEngine}
            setVoiceEngine={setVoiceEngine}
            localTts={localTts}
            rate={browserRate}
            setRate={setBrowserRate}
            pitch={browserPitch}
            setPitch={setBrowserPitch}
            telemetry={{
              ...telemetry,
              turns: messages.filter(m => m.sender !== 'user').length,
              words: wordCount,
            }}
          />
        </div>
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
        intMode={intMode}
        setIntMode={setIntMode}
        fisTarget={fisTarget}
        setFisTarget={setFisTarget}
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
