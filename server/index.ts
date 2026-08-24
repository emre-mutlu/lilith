import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'
import { createServer as createViteServer } from 'vite'
import {
  directorInstruction, scenarioBlock, lilithScenarioBlock, varlikScenarioBlock,
  validatePrelude, LILITH_EGILIMLERI, OTURUM_YAYLARI, GERILIM_OZLERI,
  TUR_DOKU, TEMPO, DUYGU_RENGI, VARLIK_EGRILERI,
} from './director.js'
import type { ScenarioPrelude } from './director.js'
import type { Message, TtsSpeaker } from '../shared/types'
import { intensityToExaggeration } from './ttsText.js'
import { generateFishTts } from './fishTts.js'
import { generateGeminiTts } from './geminiTts.js'
import { generateAzureTts } from './azureTts.js'
import { generateLocalTts, localTtsStatus, warmLocalTts } from './localTts.js'
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

// ── Gemini TTS → server/geminiTts.ts · Azure → azureTts.ts · Fish → fishTts.ts
// ── Chatterbox yerel TTS → server/localTts.ts

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
    res.json(await localTtsStatus())
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
            ? await generateLocalTts(text, speaker, exaggeration)
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
    warmLocalTts()
  })
}

main().catch(err => {
  console.error('Failed to start server:', err)
  process.exit(1)
})
