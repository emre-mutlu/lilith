import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'
import { createServer as createViteServer } from 'vite'
import {
  directorInstruction,
  validatePrelude, LILITH_EGILIMLERI, OTURUM_YAYLARI, GERILIM_OZLERI,
  TUR_DOKU, TEMPO, DUYGU_RENGI, VARLIK_EGRILERI,
} from './director.js'
import type { ScenarioPrelude } from './director.js'
import type { Message, TtsSpeaker } from '../shared/types'
import { generateText, GEMINI_MODEL_CHAIN, withModelFallback } from './dialogue.js'
import { runTtsLadder } from './ttsLadder.js'
import { intensityToExaggeration } from './ttsText.js'
import { generateFishTts } from './fishTts.js'
import { generateGeminiTts } from './geminiTts.js'
import { generateLocalTts, localTtsStatus } from './localTts.js'
import { GoogleGenAI } from '@google/genai'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const isProd = process.env.NODE_ENV === 'production'
const PORT = parseInt(process.env.PORT || '3000', 10)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? ''
// ── Gemini TTS → server/geminiTts.ts · Fish → fishTts.ts
// ── Chatterbox yerel TTS → server/localTts.ts · diyalog çekirdeği → dialogue.ts

// ── JSONL tur-logu (yalnız metin — ses loglanmaz) ────────────────────────────
const SESSIONS_DIR = path.join(__dirname, '..', 'sessions')
fs.mkdirSync(SESSIONS_DIR, { recursive: true })

const SAFE_ID = /^[a-z0-9-]{6,40}$/
function appendTurnLog(sessionId: string | undefined, entry: Record<string, unknown>): void {
  if (!sessionId || !SAFE_ID.test(sessionId)) return
  const line = JSON.stringify({ ts: new Date().toISOString(), ...entry })
  fs.appendFile(path.join(SESSIONS_DIR, `${sessionId}.jsonl`), line + '\n', () => {})
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
      const { result: response, model } = await withModelFallback(GEMINI_MODEL_CHAIN, m => ai.models.generateContent({
        model: m,
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
      console.log(`[director] yeni oturum ${sessionId}: ${parsed.lilith_egilimi} · ${parsed.tur_doku} (${model})`)
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
        ttsEngine: 'browser' | 'gemini' | 'local' | 'fish'
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
      // Yeniden deneme generateText'in içinde (tek katman) — burada tekrar sarılmaz
      const beat = await generateText(speaker, history, validatePrelude(scenario) ? scenario : undefined)
      if (!beat.text) return res.status(500).json({ error: 'Boş yanıt alındı.' })

      appendTurnLog(sessionId, {
        speaker, text: beat.text, mood: beat.mood, intensity: beat.intensity,
        model: beat.model, latency_ms: Date.now() - t0,
      })

      if (ttsEngine === 'browser') {
        return res.json({ text: beat.text, mood: beat.mood, intensity: beat.intensity, engine: 'browser', latencyMs: Date.now() - t0 })
      }

      // Merdiven (server/ttsLadder.ts): fish -> local (ayaktaysa) -> none; istemci
      // none'da tarayıcı TTS'e düşer. Yerel motora beat-intensity kalibrasyonu
      // geçer (0.8 / 1.2 / 1.7). Edge (08-24) ve Azure (10-01) kaldırıldı; gemini parkta.
      const { result: ttsResult, servedBy } = await runTtsLadder(ttsEngine, {
        fish: () => generateFishTts(beat.text, speaker, beat.intensity),
        gemini: () => generateGeminiTts(beat.text, speaker),
        local: ({ spawn }) => generateLocalTts(beat.text, speaker, intensityToExaggeration(beat.intensity), { spawn }),
      })
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
      engine?: 'gemini' | 'local' | 'fish'
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
    // Express 5: isimli wildcard zorunlu — {*splat} kök dahil tüm yolları yakalar
    app.get('{*splat}', (_req, res) => {
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
    // Not: Chatterbox açılışta ISINMAZ — yalnız kullanıcı yerel motoru seçince
    // ilk local isteğinde spawn edilir (ensureLocalService). Emre kararı 08-25.
  })
}

main().catch(err => {
  console.error('Failed to start server:', err)
  process.exit(1)
})
