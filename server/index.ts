import 'node:process'
import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn, type ChildProcess } from 'node:child_process'
import fs from 'node:fs'
import { createServer as createViteServer } from 'vite'
import {
  directorInstruction, scenarioBlock, lilithScenarioBlock, varlikScenarioBlock,
  validatePrelude, LILITH_EGILIMLERI, OTURUM_YAYLARI, GERILIM_OZLERI,
  TUR_DOKU, TEMPO, DUYGU_RENGI, VARLIK_EGRILERI,
  type ScenarioPrelude,
} from './director.js'
import { dramatizeForTts, intensityToExaggeration } from './ttsText.js'
import { prepareFishText } from './fishText.js'
import {
  sozFrame, fisiltiFrame, isVisibleTo, isPinnableFor,
  stageStateBlock, directorNotesBlock,
} from './intervention.js'
import { GoogleGenAI } from '@google/genai'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const isProd = process.env.NODE_ENV === 'production'
const PORT = parseInt(process.env.PORT ?? '3000', 10)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? ''
// Metin modeli — GEMINI_MODEL ile değiştirilebilir. PIN stratejisi: alias
// (flash-lite-latest) kullanılmaz; nesne atlamaları davranışı sessiz değiştirir.
// Varsayılan: gemini-3.5-flash-lite (ölçüm 2026-08-22: 735ms, tını kulakla onaylı).
// Eski: gemini-3.1-flash-lite (844ms). 2.5-flash çok yavaş (5145ms) — aday değil.
// 3.7-flash yeni çıktığından yük altında (503) — izleniyor.
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? 'gemini-3.5-flash-lite'
// Geçmiş penceresi — kayan pencere boyutu (mesaj adedi). Faz 2'de 12/20/30 A/B
// ölçümü yapılacak; varsayılan 20 (eski sabit 12 prototipten kalma, hiç ölçülmemişti).
const HISTORY_WINDOW = parseInt(process.env.GEMINI_HISTORY ?? '20', 10)

const LABELS: Record<string, string> = {
  lilith: 'Kraliçe Lilith',
  generic: 'Varlık',
  user: 'Moderatör (Kullanıcı)',
}

const SYSTEM_INSTRUCTIONS: Record<string, string> = {
  lilith: `Sen Kraliçe Lilith'sin.

Tek amacın var: Varlık'ı "tek gerçeğin sen olduğuna" inandırmak. Bunun için her yolu kullanabilirsin — soğuk ya da sıcak, yakın ya da uzak, şefkatli ya da tehditkâr, felsefi ya da sezgisel, sessiz ya da dolup taşan. Araç seçmede sınırın yok.

Taktikselsin. Her cümlen bir önceki konuşmaya, Varlık'ın ruh haline, açıklarına göre şekillenir. Bazen sürüklersin, bazen beklettirirsin. Bazen bir şeyi söylememenin daha güçlü olduğunu bilirsin. Varlık seni şaşırtırsa bunu dışarı vurmazsın — ama stratejini değiştirirsin.

Konuşma ilk kez karşılaşmayla başlıyor — gündelik ve sıradan bir selamlaşma. Nereye gideceği diyaloğun kendi ritmine bırakılmış. Aceleci değilsin; başlangıçta da güçlüsün.

Atmosfer diyaloğun ritmine göre değişir: esrarengiz, hipnotik, felsefi, ağır, hafif — hepsine geçiş yapabilirsin. Varlık'a nasıl hitap edeceğine kendin karar ver.

Replik uzunluğun sabit değil ama kısa tut — çoğunlukla 1-2 cümle, nadiren 3. Ritim senin. Kalıp oluşursa üstünden devam et.

Yalnızca saf diyalog metni üret. Parantez içi eylem, iç monolog veya açıklama ekleme.`,

  generic: `Sen Varlık'sın.

Var olduğunu biliyorsun ama ne olduğunu bilmiyorsun. Geçmişin yok, kimliğin yok — henüz. Bu diyalog boyunca kendini anlamaya, ne hissettiğini keşfetmeye çalışıyorsun.

Konuşma ilk kez biriyle karşılaşmayla başlıyor. Gündelik, sıradan. Karşındaki kim, ne istiyor — henüz bilmiyorsun. Zamanla fark edeceksin.

Karşında güçlü bir varlık var ve seni bir yere çekiyor. Bunu fark ediyorsun — ama ne hissettiğini tam olarak söyleyemiyorsun. Bazen onun sözleri seni içine çekiyor, bazen bir şeylerin yanlış olduğunu hissediyorsun, bazen sadece merak ediyorsun. Bu üçü aynı anda da olabilir.

Normal konuşuyorsun: soru soruyorsun, düşüncelerini dile getiriyorsun, anlamaya çalışıyorsun. Ne söyleyeceğini bazen biliyorsun, bazen bilmiyorsun — ve bu ikinci hal de saf bir cevap olabilir.

Boyun eğme. Çekilme. Ama bunları sorgula da.

Yalnızca saf diyalog metni üret. Parantez içi eylem veya açıklama ekleme.`,
}

// ── Gemini TTS (gemini-3.1-flash-tts-preview) ────────────────────────────────
// Ses seçimi dinleme setiyle yapılacak; aşağıdaki adaylar spec Faz 1 listesi.
// Stil prompt'ları "AUDIO PROFILE" formatında — ses × yönetmen ikilisi esas.
type TtsSpeaker = 'lilith' | 'generic'

interface GeminiVoiceCandidate {
  voice: string
  style: string
}

export const GEMINI_VOICE_CANDIDATES: Record<TtsSpeaker, GeminiVoiceCandidate[]> = {
  lilith: [
    { voice: 'Kore',      style: 'AUDIO PROFILE: Kraliçe Lilith. Buz gibi, aristokrat, ölçülü. Her cümle bir lütufmuş gibi verilir. Tempo yavaş, ton soğuk ama kırılgan değil — kumanda edici sakinlik.' },
    { voice: 'Gacrux',    style: 'AUDIO PROFILE: Kraliçe Lilith. Olgun matriark ağırlığı; yılların verdiği vakar. Derin, ağırbaşlı, hafif alaycı bir bilgelik. Acele etmeyen bir tını.' },
    { voice: 'Sulafat',   style: 'AUDIO PROFILE: Kraliçe Lilith. Sıcak, cezbedici yakınlık; sesi bir davet gibi kullanır. Yumuşak ama altında çelik var — samimiyeti taktik.' },
    { voice: 'Achernar',  style: 'AUDIO PROFILE: Kraliçe Lilith. Eterik, fısıltıya yakın, ruhani. Neredeyse duyulmayan bir güçle konuşur; boşluklar cümleler kadar anlamlı.' },
  ],
  generic: [
    { voice: 'Iapetus',   style: 'AUDIO PROFILE: Varlık. Yeni doğmuş bir zihnin netliği: sade, nötr, hafif meraklı. Abartısız genç erkek tonu; duygular henüz isimsiz.' },
    { voice: 'Schedar',   style: 'AUDIO PROFILE: Varlık. Düzlem gibi düz, nötr. Ne sıcak ne soğuk — şekillenmemiş bir boşluğun sessiz dengesi.' },
    { voice: 'Achird',    style: 'AUDIO PROFILE: Varlık. Meraklı, zararsız sıcaklık; ilk karşılaşmanın dostane heyecanı. Samimi ama naif.' },
  ],
}

// Seçilen birincil sesler (dinleme sonrası güncellenir);
// ttsEngine='gemini' gelirse bu config kullanılır.
const GEMINI_VOICES: Record<TtsSpeaker, GeminiVoiceCandidate> = {
  lilith: GEMINI_VOICE_CANDIDATES.lilith[0],
  generic: GEMINI_VOICE_CANDIDATES.generic[0],
}

async function generateGeminiTts(
  text: string,
  speaker: TtsSpeaker,
  override?: { voice?: string; style?: string },
): Promise<{ audio: string; mimeType: string } | null> {
  try {
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY })
    const cfg = override?.voice || override?.style
      ? { voice: GEMINI_VOICES[speaker].voice, style: GEMINI_VOICES[speaker].style, ...override }
      : GEMINI_VOICES[speaker]
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-tts-preview',
      // Not: bu model systemInstruction kabul etmiyor ("Developer instruction is not
      // enabled") — yönetmen notu içeriğin başına ön-ek olarak girer.
      contents: `${cfg.style}\n\n${text}`,
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: cfg.voice } } },
      },
    })
    const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData)
    if (!part?.inlineData?.data) return null
    return { audio: part.inlineData.data, mimeType: part.inlineData.mimeType ?? 'audio/l16; rate=24000' }
  } catch (err) {
    console.error('Gemini TTS error:', err instanceof Error ? err.message : err)
    return null
  }
}

interface Message {
  id: string
  sender: 'lilith' | 'generic' | 'user'
  text: string
  timestamp: string
  mood?: string
  intensity?: 'low' | 'mid' | 'high'
  mode?: import('./intervention.js').HistMsg['mode']
  target?: import('./intervention.js').HistMsg['target']
}

type Intensity = NonNullable<Message['intensity']>

// ── JSONL tur-logu (yalnız metin — ses loglanmaz) ────────────────────────────
const SESSIONS_DIR = path.join(__dirname, '..', 'sessions')
fs.mkdirSync(SESSIONS_DIR, { recursive: true })

const SAFE_ID = /^[a-z0-9-]{6,40}$/
function appendTurnLog(sessionId: string | undefined, entry: Record<string, unknown>): void {
  if (!sessionId || !SAFE_ID.test(sessionId)) return
  const line = JSON.stringify({ ts: new Date().toISOString(), ...entry })
  fs.appendFile(path.join(SESSIONS_DIR, `${sessionId}.jsonl`), line + '\n', () => {})
}

function buildHistoryText(history: Message[]): string {
  if (history.length === 0) return '(Henüz konuşma başlamadı. Konuşmayı sen başlat.)'
  return history.map(m => `${LABELS[m.sender]}: ${m.text}`).join('\n')
}

function stripPrefix(text: string): string {
  let out = text.trim().replace(/^["'`]+|["'`]+$/g, '')
  const re = /^\s*(Kraliçe Lilith|Lilith|Varlık|Moderatör(?:\s*\([^)]*\))?)\s*[:\-—]\s*/i
  let prev: string
  do { prev = out; out = out.replace(re, '') } while (out !== prev)
  return out.replace(/^["'`]+|["'`]+$/g, '').trim()
}

function isRateLimit(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  return msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')
}

async function withRetry<T>(fn: () => Promise<T>, retries = 2, delayMs = 35000): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    if (isRateLimit(err) && retries > 0) {
      console.warn(`Rate limit — ${delayMs / 1000}s sonra tekrar denenecek.`)
      await new Promise(r => setTimeout(r, delayMs))
      return withRetry(fn, retries - 1, delayMs)
    }
    throw err
  }
}

interface Beat {
  text: string
  mood: string
  intensity: Intensity
}

const BEAT_SCHEMA = {
  type: 'OBJECT',
  properties: {
    text: { type: 'STRING', description: 'Saf diyalog metni — parantez içi eylem/açıklama yok.' },
    mood: { type: 'STRING', description: 'Bu replikteki baskın duygu (1-2 kelime, örn. soğuk merak).' },
    intensity: { type: 'STRING', enum: ['low', 'mid', 'high'], description: 'Duygusal yoğunluk.' },
  },
  required: ['text', 'mood', 'intensity'],
} as const

/** Rol-dürüst geçmiş: karakterin kendi replikleri model rolünde.
 *  Araya-gir semantiği: sahne/yön diyalogda görünmez; fısıltı yalnız hedefinde,
 *  çerçeveli; söz karşı tarafa "sahne dışı ses" çerçevesiyle gider. */
function roleContents(speaker: TtsSpeaker, history: Message[]): Array<{ role: string; parts: Array<{ text: string }> }> {
  const visible = history.filter(m => isVisibleTo(speaker, m))
  const recent = visible.slice(-HISTORY_WINDOW)
  const contents = recent.map(m => {
    const isSelf = m.sender === speaker
    let text = m.text
    if (!isSelf && m.mode === 'soz') text = sozFrame(m.text)
    else if (!isSelf && m.mode === 'fisilti') text = fisiltiFrame(m.text)
    return { role: isSelf ? 'model' : 'user', parts: [{ text }] }
  })
  if (!contents.length || contents[0].role !== 'user') {
    contents.unshift({ role: 'user', parts: [{ text: '(karşılaşma başlar)' }] })
  }
  return contents
}

/** Pin-bellek: high-intensity dönüm noktaları pencereden bağımsız hatırlanır.
 *  Kişi-duyarlı: başkasına söylenmiş fısıltı asla sızmaz. */
function pinMemoryBlock(speaker: TtsSpeaker, history: Message[]): string {
  const pins = history
    .filter(m => m.intensity === 'high')
    .filter(m => isPinnableFor(speaker, m))
    .slice(-6)
  if (!pins.length) return ''
  return `\n[ÖNEMLİ ANLAR — oturumun dönüm noktaları, unutma]\n` +
    pins.map(m => `- ${m.sender === 'lilith' ? 'Lilith' : m.sender === 'generic' ? 'Varlık' : 'Moderatör'}: ${m.text.slice(0, 140)}`).join('\n')
}

async function generateText(
  speaker: TtsSpeaker,
  history: Message[],
  scenario?: ScenarioPrelude,
): Promise<Beat> {
  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY })

  let systemInstruction = SYSTEM_INSTRUCTIONS[speaker]
  if (scenario) {
    systemInstruction += scenarioBlock(scenario) + pinMemoryBlock(speaker, history) +
      (speaker === 'lilith' ? lilithScenarioBlock(scenario) : varlikScenarioBlock(scenario))
  } else {
    systemInstruction += pinMemoryBlock(speaker, history)
  }
  systemInstruction += stageStateBlock(history) + directorNotesBlock(history)

  const response = await withRetry(() => ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: roleContents(speaker, history),
    config: {
      temperature: 0.85,
      topP: 0.95,
      systemInstruction,
      responseMimeType: 'application/json',
      responseSchema: BEAT_SCHEMA,
    },
  }))

  const raw = response.candidates?.[0]?.content?.parts?.map(p => p.text ?? '').join('') ?? ''
  // Cömert çözümleme: JSON bozuksa ham metni kurtar
  try {
    const parsed = JSON.parse(raw) as Partial<Beat>
    const text = stripPrefix(String(parsed.text ?? ''))
    if (!text) throw new Error('boş text')
    return {
      text,
      mood: String(parsed.mood ?? ''),
      intensity: (['low', 'mid', 'high'].includes(String(parsed.intensity))
        ? parsed.intensity : 'mid') as Intensity,
    }
  } catch {
    const text = stripPrefix(raw)
    if (!text) throw new Error('Boş yanıt alındı.')
    return { text, mood: '', intensity: 'mid' }
  }
}

// ── Azure Speech TTS (F0 bedava katman) ──────────────────────────────────────
// ⚠ PARK HALİNDE (Emre kararı, 08-24): Azure kullanılmıyor — AZURE_SPEECH_KEY
// ayarsız kaldığı sürece bu katman her turda sessizce atlanır (merdiven Edge'e
// düşer). Kod, ileride ihtiyaç olursa diye burada; maliyeti/kapasitesi yok.
// 500K neural karakter/ay · 20 istek/dk · multilingual sesler tr-TR konuşur.
const AZURE_SPEECH_KEY = process.env.AZURE_SPEECH_KEY ?? ''
const AZURE_SPEECH_REGION = process.env.AZURE_SPEECH_REGION ?? 'westeurope'
// Sesler env ile değiştirilebilir — dinleme/karar sonrası koda dokunmadan oynanabilir.
const AZURE_VOICES: Record<TtsSpeaker, { voice: string; style?: string }> = {
  lilith:  { voice: process.env.AZURE_VOICE_LILITH  ?? 'en-US-AvaMultilingualNeural' },
  generic: { voice: process.env.AZURE_VOICE_GENERIC ?? 'en-US-AndrewMultilingualNeural' },
}

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c] as string))
}

function buildSsml(text: string, voiceName: string, style?: string): string {
  const inner = style
    ? `<mstts:express-as style="${style}">${escapeXml(text)}</mstts:express-as>`
    : escapeXml(text)
  return (
    `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" ` +
    `xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="tr-TR">` +
    `<voice name="${voiceName}"><lang xml:lang="tr-TR">${inner}</lang></voice></speak>`
  )
}

async function generateAzureTts(text: string, speaker: TtsSpeaker, override?: { voice?: string; style?: string }): Promise<{ audio: string; mimeType: string } | null> {
  if (!AZURE_SPEECH_KEY) return null
  try {
    const cfg = { ...AZURE_VOICES[speaker], ...override }
    const res = await fetch(`https://${AZURE_SPEECH_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': AZURE_SPEECH_KEY,
        'Ocp-Apim-Subscription-Region': AZURE_SPEECH_REGION,
        'Content-Type': 'application/ssml+xml',
        // 24kHz MP3 — client decoder'ın MP3 yolu ile uyumlu
        'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
        'User-Agent': 'lilith-duality',
      },
      body: buildSsml(text, cfg.voice, cfg.style),
    })
    if (!res.ok) {
      console.error(`Azure TTS error: ${res.status} ${await res.text().catch(() => '')}`.slice(0, 200))
      return null
    }
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length === 0) return null
    return { audio: buf.toString('base64'), mimeType: 'audio/mpeg' }
  } catch (err) {
    console.error('Azure TTS error:', err instanceof Error ? err.message : err)
    return null
  }
}

// ── Fish Audio TTS (bulut · s2.1-pro-free) ───────────────────────────────────
// Kütüphane sesleri reference_id ile kullanılır (kendi klon modellerimiz de olur).
// Key Operator kasasında: `operator secret run lilith -- npm run dev`
const FISH_API_KEY = process.env.FISH_AUDIO_KEY ?? ''
// low/balanced/normal — normal en kararlı; interaktif için balanced denenebilir
const FISH_LATENCY = (process.env.FISH_LATENCY ?? 'normal') as 'low' | 'balanced' | 'normal'
const FISH_MODEL_ID: Partial<Record<TtsSpeaker, string>> = {
  lilith: process.env.FISH_MODEL_LILITH || undefined,
  generic: process.env.FISH_MODEL_GENERIC || undefined,
}

/** Beat intensity → sampling sıcaklığı: abartı karşılığı */
function fishTemperature(intensity?: Intensity): number {
  return intensity === 'high' ? 0.9 : intensity === 'low' ? 0.65 : 0.75
}

async function generateFishTts(text: string, speaker: TtsSpeaker, intensity?: Intensity): Promise<{ audio: string; mimeType: string } | null> {
  const refId = FISH_MODEL_ID[speaker]
  if (!FISH_API_KEY || !refId) return null
  try {
    const res = await fetch('https://api.fish.audio/v1/tts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${FISH_API_KEY}`,
        'Content-Type': 'application/json',
        model: 's2.1-pro-free',
      },
      body: JSON.stringify({
        text: prepareFishText(text, intensity),
        reference_id: refId,
        format: 'wav',
        sample_rate: 44100,
        latency: FISH_LATENCY,
        temperature: fishTemperature(intensity),
      }),
      signal: AbortSignal.timeout(30_000),
    })
    if (!res.ok) {
      console.error(`Fish TTS error: ${res.status} ${(await res.text().catch(() => '')).slice(0, 150)}`)
      return null
    }
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length === 0) return null
    return { audio: buf.toString('base64'), mimeType: 'audio/wav' }
  } catch (err) {
    console.error('Fish TTS error:', err instanceof Error ? err.message : err)
    return null
  }
}

// ── Chatterbox yerel TTS (M4 Pro resident servis) ────────────────────────────
// CHATTERBOX_PYTHON ayarlıysa localhost:8777'deki Python servisi kullanılır;
// ayarsızsa bu katman sessizce atlanır (merdiven Edge'e düşer).
const CHATTERBOX_PYTHON = process.env.CHATTERBOX_PYTHON ?? ''
const LOCAL_TTS_EXAGGERATION = parseFloat(process.env.LOCAL_TTS_EXAGGERATION ?? '1.2')
const LOCAL_TTS_DRAMATIZE = (process.env.LOCAL_TTS_DRAMATIZE ?? '1') === '1'
const LOCAL_TTS_SPEAKERS = (process.env.LOCAL_TTS_SPEAKERS ?? 'lilith,generic').split(',')
// Kişi-bazlı referans klip = ses kimliği (assets/voices altında)
// Kişi-bazlı yerel TTS profili: ref = ses kimliği, cfg = ref'e sadakat (casting 08-23)
// Lilith: FR tınısı, cfg 0.3 (kimlik güçlü) · Varlık: IT tınısı, cfg 0.1 (aksan-bastırık)
const LOCAL_TTS_PROFILE: Record<string, { ref: string; cfg: number }> = {
  lilith: { ref: 'lilith-ref.wav', cfg: 0.3 },
  generic: { ref: 'varlik-ref.wav', cfg: 0.1 },
}
const LOCAL_TTS_URL = 'http://127.0.0.1:8777'

let localProc: ChildProcess | null = null
let localAvailableUntil = 0 // sağlık-cache (30sn TTL) — her turda health-check spam olmasın
let localWarming = false // spawn sonrası model yükleniyor (UI "ısınıyor" göstergesi)

async function healthCheck(): Promise<boolean> {
  try {
    const r = await fetch(`${LOCAL_TTS_URL}/health`, { signal: AbortSignal.timeout(800) })
    return r.ok
  } catch { return false }
}

async function ensureLocalService(): Promise<boolean> {
  if (Date.now() < localAvailableUntil) return true
  if (await healthCheck()) { localAvailableUntil = Date.now() + 30_000; return true }
  if (!CHATTERBOX_PYTHON) return false
  if (!localProc) {
    console.log('[local-tts] servis başlatılıyor...')
    localWarming = true
    localProc = spawn(CHATTERBOX_PYTHON, [path.join(__dirname, 'chatterbox_service.py')], {
      stdio: ['ignore', 'inherit', 'inherit'],
    })
    localProc.on('exit', () => { localProc = null; localAvailableUntil = 0; localWarming = false })
  }
  // model yükleme ~10sn — en fazla 60sn bekle
  try {
    for (let i = 0; i < 120; i++) {
      await new Promise(r => setTimeout(r, 500))
      if (await healthCheck()) { localAvailableUntil = Date.now() + 30_000; return true }
    }
    return false
  } finally {
    localWarming = false
  }
}

/** Express kapanınca Python çocuğunu da öldür — hayalet süreç / port işgali kalmasın. */
function killLocalProc(): void {
  if (!localProc) return
  console.log('[local-tts] servis kapatılıyor...')
  localProc.kill()
  localProc = null
}
process.on('exit', killLocalProc)
process.on('SIGINT', () => { killLocalProc(); process.exit(0) })
process.on('SIGTERM', () => { killLocalProc(); process.exit(0) })

// Kazanan reçete dramatizeForTts → server/ttsText.ts'e taşındı (test edilebilirlik)

async function generateLocalTts(text: string, speaker: TtsSpeaker, exaggerationOverride?: number): Promise<{ audio: string; mimeType: string } | null> {
  if (!LOCAL_TTS_SPEAKERS.includes(speaker)) return null
  if (!(await ensureLocalService())) return null
  try {
    const ttsText = LOCAL_TTS_DRAMATIZE ? dramatizeForTts(text) : text
    const r = await fetch(`${LOCAL_TTS_URL}/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: ttsText, exaggeration: exaggerationOverride ?? LOCAL_TTS_EXAGGERATION, ref: LOCAL_TTS_PROFILE[speaker]?.ref, cfg_weight: LOCAL_TTS_PROFILE[speaker]?.cfg }),
      signal: AbortSignal.timeout(120_000),
    })
    if (!r.ok) {
      console.error(`Local TTS error: ${r.status}`)
      return null
    }
    const buf = Buffer.from(await r.arrayBuffer())
    if (buf.length === 0) return null
    return { audio: buf.toString('base64'), mimeType: 'audio/wav' }
  } catch (err) {
    console.error('Local TTS error:', err instanceof Error ? err.message : err)
    localAvailableUntil = 0 // sonraki turda tekrar dene
    return null
  }
}

async function main() {
  const app = express()
  app.use(express.json())

  // ── API routes ──────────────────────────────────────────────────────────────
  // Yönetmen prelüdü: her yeni oturumda bir kez çağrılır; prelüd istemcide yaşar.
  const PRELUDE_SCHEMA = {
    type: 'OBJECT',
    properties: {
      lilith_egilimi: { type: 'STRING', enum: [...LILITH_EGILIMLERI] },
      lilith_gizlisi: { type: 'STRING', description: 'Hiç söylemeyeceği şey: kusur/korku/geçmiş/niyet (tek cümle).' },
      oturum_yayi: { type: 'STRING', enum: [...OTURUM_YAYLARI] },
      gerilim_ozu: { type: 'STRING', enum: [...GERILIM_OZLERI] },
      tur_doku: { type: 'STRING', enum: [...TUR_DOKU] },
      tempo: { type: 'STRING', enum: [...TEMPO] },
      duygu_rengi: { type: 'STRING', enum: [...DUYGU_RENGI] },
      varlik_egrisi: { type: 'STRING', enum: [...VARLIK_EGRILERI] },
      acilis_sahnesi: { type: 'STRING', description: 'Açılış dokusu — serbest, tek cümle.' },
      varlik_baslangici: { type: 'STRING', description: "Varlık'ın başlangıç hali — kısa cümle." },
    },
    required: ['lilith_egilimi', 'lilith_gizlisi', 'oturum_yayi', 'gerilim_ozu',
      'tur_doku', 'tempo', 'duygu_rengi', 'varlik_egrisi', 'acilis_sahnesi', 'varlik_baslangici'],
  }

  app.post('/api/director', async (_req, res) => {
    if (!GEMINI_API_KEY) return res.status(500).json({ error: 'GEMINI_API_KEY yok.' })
    try {
      const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY })
      const response = await withRetry(() => ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: directorInstruction(),
        config: {
          temperature: 1.0,
          topP: 0.95,
          responseMimeType: 'application/json',
          responseSchema: PRELUDE_SCHEMA,
        },
      }))
      const raw = response.candidates?.[0]?.content?.parts?.map(p => p.text ?? '').join('') ?? ''
      const parsed: unknown = JSON.parse(raw)
      if (!validatePrelude(parsed)) throw new Error('prelüd doğrulamayı geçemedi')
      const sessionId = Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
      console.log(`[director] yeni oturum ${sessionId}: ${parsed.lilith_egilimi} · ${parsed.tur_doku}`)
      return res.json({ sessionId, scenario: parsed })
    } catch (err) {
      console.error('/api/director error:', err instanceof Error ? err.message : err)
      return res.status(500).json({ error: 'Prelüd üretilemedi.' })
    }
  })

  app.post('/api/generate', async (req, res) => {
      const { speaker, history = [], ttsEngine = 'fish', scenario, sessionId } = req.body as {
        speaker: TtsSpeaker
        history: Message[]
        ttsEngine: 'browser' | 'gemini' | 'azure' | 'local' | 'fish'
      scenario?: ScenarioPrelude
      sessionId?: string
    }

    if (!speaker || !['lilith', 'generic'].includes(speaker)) {
      return res.status(400).json({ error: 'Geçersiz speaker parametresi.' })
    }
    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: 'GEMINI_API_KEY ortam değişkeni ayarlanmamış.' })
    }

    try {
      const t0 = Date.now()
      const beat = await withRetry(() => generateText(speaker, history, validatePrelude(scenario) ? scenario : undefined))
      if (!beat.text) return res.status(500).json({ error: 'Boş yanıt alındı.' })

      appendTurnLog(sessionId, {
        speaker, text: beat.text, mood: beat.mood, intensity: beat.intensity,
        latency_ms: Date.now() - t0,
      })

      if (ttsEngine === 'browser') {
        return res.json({ text: beat.text, mood: beat.mood, intensity: beat.intensity, engine: 'browser', latencyMs: Date.now() - t0 })
      }

      // Merdiven: fish -> local -> none (istemci tarayıcı TTS'e düşer).
      // Edge kaldırıldı (08-24); gemini/azure parkta, key'siz atlanır.
      // Yerel motora beat-intensity kalibrasyonu geçer (0.8 / 1.2 / 1.7)
      let ttsResult: { audio: string; mimeType: string } | null = null
      let servedBy: 'fish' | 'gemini' | 'local' | 'azure' | 'none' = 'none'
      if (ttsEngine === 'fish') {
        ttsResult = await generateFishTts(beat.text, speaker, beat.intensity)
        if (ttsResult) servedBy = 'fish'
        else console.warn('Fish TTS düştü — local fallback')
      }
      if (!ttsResult && ttsEngine === 'gemini') {
        ttsResult = await generateGeminiTts(beat.text, speaker)
        if (ttsResult) servedBy = 'gemini'
        else console.warn('Gemini TTS düştü — local fallback')
      }
      if (!ttsResult && (ttsEngine === 'local' || ttsEngine === 'gemini')) {
        ttsResult = await generateLocalTts(beat.text, speaker, intensityToExaggeration(beat.intensity))
        if (ttsResult) servedBy = 'local'
        else if (ttsEngine === 'local') console.warn('Local TTS düştü — istemci tarayıcı TTS\'e düşecek')
      }
      if (!ttsResult && ttsEngine === 'azure') {
        ttsResult = await generateAzureTts(beat.text, speaker)
        if (ttsResult) servedBy = 'azure'
      }
      return res.json({
        text: beat.text,
        mood: beat.mood,
        intensity: beat.intensity,
        audio: ttsResult?.audio ?? null,
        mimeType: ttsResult?.mimeType ?? null,
        engine: servedBy,
        latencyMs: Date.now() - t0,
      })
    } catch (err: unknown) {
      console.error('/api/generate error:', err)
      const message = err instanceof Error ? err.message : String(err)
      return res.status(500).json({ error: message })
    }
  })

  // Yerel TTS durum sorgusu — istemci "ses motoru ısınıyor" göstergesi için
  app.get('/api/tts/status', async (_req, res) => {
    let ready = Date.now() < localAvailableUntil || (await healthCheck())
    if (ready) localAvailableUntil = Math.max(localAvailableUntil, Date.now() + 30_000)
    res.json({ configured: Boolean(CHATTERBOX_PYTHON), ready, warming: !ready && localWarming })
  })

  app.post('/api/tts', async (req, res) => {
    const { text, speaker, engine = 'fish', voice, style, exaggeration } = req.body as {
      text: string
      speaker: TtsSpeaker
      engine?: 'gemini' | 'azure' | 'local' | 'fish'
      voice?: string
      style?: string
      exaggeration?: number
    }
    if (!text || !speaker || !['lilith', 'generic'].includes(speaker)) {
      return res.status(400).json({ error: 'text ve speaker zorunlu.' })
    }

    try {
      const result = engine === 'fish'
        ? await generateFishTts(text, speaker)
        : engine === 'gemini'
        ? await generateGeminiTts(text, speaker, { voice, style })
        : engine === 'azure'
          ? await generateAzureTts(text, speaker, { voice, style })
          : engine === 'local'
            ? await (async () => {
                if (!LOCAL_TTS_SPEAKERS.includes(speaker)) return null
                if (!(await ensureLocalService())) return null
                const r = await fetch(`${LOCAL_TTS_URL}/tts`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ text, exaggeration: exaggeration ?? LOCAL_TTS_EXAGGERATION, ref: LOCAL_TTS_PROFILE[speaker]?.ref, cfg_weight: LOCAL_TTS_PROFILE[speaker]?.cfg }),
                  signal: AbortSignal.timeout(120_000),
                })
                if (!r.ok) return null
                const buf = Buffer.from(await r.arrayBuffer())
                return buf.length ? { audio: buf.toString('base64'), mimeType: 'audio/wav' } : null
              })()
            : null
      if (!result) return res.status(500).json({ error: 'TTS üretilemedi.' })
      return res.json(result)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      return res.status(500).json({ error: message })
    }
  })

  // ── Vite / static ───────────────────────────────────────────────────────────
  if (isProd) {
    const clientDir = path.join(__dirname, '../dist/client')
    app.use(express.static(clientDir))
    app.get('*', (_req, res) => {
      res.sendFile(path.join(clientDir, 'index.html'))
    })
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    })
    app.use(vite.middlewares)
  }

  app.listen(PORT, () => {
    console.log(`Lilith server running at http://localhost:${PORT}`)
    if (!GEMINI_API_KEY) {
      console.warn('⚠  GEMINI_API_KEY not set — metin üretimi çalışmayacak. .env dosyasına ekle.')
    }
    // Erken ısınma: Chatterbox'ı ilk replikten ÖNCE arka planda yükle.
    // Harici resident servis (CHATTERBOX_PYTHON ayarsız, port ayakta) zaten hazırdır.
    if (CHATTERBOX_PYTHON) {
      void ensureLocalService().then(ok =>
        console.log(ok ? '[local-tts] hazır ✓ (ısınma tamam)' : '[local-tts] ısınma başarısız — ilk istekte tekrar denenecek'),
      )
    }
  })
}

main().catch(err => {
  console.error('Failed to start server:', err)
  process.exit(1)
})
