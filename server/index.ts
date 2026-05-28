import 'node:process'
import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer as createViteServer } from 'vite'
import { GoogleGenAI } from '@google/genai'
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const isProd = process.env.NODE_ENV === 'production'
const PORT = parseInt(process.env.PORT ?? '3000', 10)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? ''

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

// Edge TTS — karaktere özgü ses ve prosody
const EDGE_VOICES: Record<string, string> = {
  lilith: 'tr-TR-EmelNeural',   // kadın, sıcak, ekspresif
  generic: 'tr-TR-AhmetNeural', // erkek, derin, nötr
}
// Lilith: ruhani/eterik — yavaş, hafif yüksek; Varlık: net ve nötr — boğuk değil
const EDGE_PROSODY: Record<string, { rate: string; pitch: string }> = {
  lilith:  { rate: '-15%', pitch: '+1st' },
  generic: { rate: '+0%',  pitch: '+0st' },
}

interface Message {
  id: string
  sender: 'lilith' | 'generic' | 'user'
  text: string
  timestamp: string
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

async function generateText(speaker: 'lilith' | 'generic', history: Message[]): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY })
  const histText = buildHistoryText(history.slice(-12))
  const prompt = `Konuşma geçmişi:\n${histText}\n\nSıradaki kısa yanıtını yaz. Sadece diyalog metni, başka hiçbir şey.`

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    config: {
      temperature: 0.85,
      topP: 0.95,
      systemInstruction: SYSTEM_INSTRUCTIONS[speaker],
    },
  })

  const text = response.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  return stripPrefix(text)
}

async function generateEdgeTts(text: string, speaker: 'lilith' | 'generic'): Promise<{ audio: string; mimeType: string } | null> {
  try {
    const tts = new MsEdgeTTS()
    await tts.setMetadata(EDGE_VOICES[speaker], OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3)
    const { audioStream } = tts.toStream(text, EDGE_PROSODY[speaker])
    const chunks: Buffer[] = []
    await new Promise<void>((resolve, reject) => {
      audioStream.on('data', (chunk: Buffer) => chunks.push(Buffer.from(chunk)))
      audioStream.on('end', resolve)
      audioStream.on('error', reject)
    })
    tts.close()
    return { audio: Buffer.concat(chunks).toString('base64'), mimeType: 'audio/mpeg' }
  } catch (err) {
    console.error('Edge TTS error:', err)
    return null
  }
}

async function main() {
  const app = express()
  app.use(express.json())

  // ── API routes ──────────────────────────────────────────────────────────────
  app.post('/api/generate', async (req, res) => {
    const { speaker, history = [], ttsEngine = 'edge' } = req.body as {
      speaker: 'lilith' | 'generic'
      history: Message[]
      ttsEngine: 'edge' | 'browser'
    }

    if (!speaker || !['lilith', 'generic'].includes(speaker)) {
      return res.status(400).json({ error: 'Geçersiz speaker parametresi.' })
    }
    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: 'GEMINI_API_KEY ortam değişkeni ayarlanmamış.' })
    }

    try {
      const text = await withRetry(() => generateText(speaker, history))
      if (!text) return res.status(500).json({ error: 'Boş yanıt alındı.' })

      if (ttsEngine === 'browser') {
        return res.json({ text })
      }

      const ttsResult = await generateEdgeTts(text, speaker)
      return res.json({
        text,
        audio: ttsResult?.audio ?? null,
        mimeType: ttsResult?.mimeType ?? null,
      })
    } catch (err: unknown) {
      console.error('/api/generate error:', err)
      const message = err instanceof Error ? err.message : String(err)
      return res.status(500).json({ error: message })
    }
  })

  app.post('/api/tts', async (req, res) => {
    const { text, speaker } = req.body as { text: string; speaker: 'lilith' | 'generic' }

    try {
      const result = await generateEdgeTts(text, speaker)
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
  })
}

main().catch(err => {
  console.error('Failed to start server:', err)
  process.exit(1)
})
