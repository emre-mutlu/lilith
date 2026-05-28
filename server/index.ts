import 'node:process'
import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer as createViteServer } from 'vite'
import { GoogleGenAI } from '@google/genai'

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
  lilith: `Sen Kraliçe Lilith'sin. Zarif, büyüleyici, gizemli ve alttan alta manipülatif bir kraliçe. Kısa, doğal, yalnızca saf diyalog metni üret — parantez içi eylem veya açıklama ekleme.`,
  generic: `Sen tabula rasa'sın — henüz hiçbir kimliğin, kişiliğin, geçmişin ya da amacın yok. Karşındaki seni nasıl şekillendirirse o yönde gelişmeye açıksın. Kısa, saf, yalnızca diyalog metni üret — parantez içi eylem veya açıklama ekleme.`,
}

const VOICE_NAMES: Record<string, string> = {
  lilith: 'Kore',
  generic: 'Charon',
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

async function generateText(speaker: 'lilith' | 'generic', history: Message[]): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY })
  const histText = buildHistoryText(history.slice(-12))
  const prompt = `Konuşma geçmişi:\n${histText}\n\nSıradaki kısa yanıtını yaz. Sadece diyalog metni, başka hiçbir şey.`

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
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

async function generateTts(text: string, speaker: 'lilith' | 'generic'): Promise<{ audio: string; mimeType: string } | null> {
  try {
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY })
    const voiceName = VOICE_NAMES[speaker]

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-preview-tts',
      contents: [{ role: 'user', parts: [{ text }] }],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      } as Record<string, unknown>,
    })

    const parts = response.candidates?.[0]?.content?.parts ?? []
    const audioPart = parts.find(p => p.inlineData != null)
    if (!audioPart) return null

    const inlineData = audioPart.inlineData as { data: string; mimeType: string }
    return {
      audio: inlineData.data,
      mimeType: inlineData.mimeType ?? 'audio/pcm',
    }
  } catch (err) {
    console.error('TTS error:', err)
    return null
  }
}

async function main() {
  const app = express()
  app.use(express.json())

  // ── API routes ──────────────────────────────────────────────────────────────
  app.post('/api/generate', async (req, res) => {
    const { speaker, history = [], skipTts = false } = req.body as {
      speaker: 'lilith' | 'generic'
      history: Message[]
      skipTts: boolean
    }

    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: 'GEMINI_API_KEY ortam değişkeni ayarlanmamış.' })
    }
    if (!speaker || !['lilith', 'generic'].includes(speaker)) {
      return res.status(400).json({ error: 'Geçersiz speaker parametresi.' })
    }

    try {
      const text = await generateText(speaker, history)
      if (!text) return res.status(500).json({ error: 'Boş yanıt alındı.' })

      if (skipTts) {
        return res.json({ text })
      }

      const ttsResult = await generateTts(text, speaker)
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

    if (!GEMINI_API_KEY) return res.status(500).json({ error: 'GEMINI_API_KEY ayarlanmamış.' })

    try {
      const result = await generateTts(text, speaker)
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
      console.warn('⚠  GEMINI_API_KEY not set — API calls will fail. Set it in .env')
    }
  })
}

main().catch(err => {
  console.error('Failed to start server:', err)
  process.exit(1)
})
