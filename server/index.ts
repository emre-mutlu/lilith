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

// Seçilen birincil sesler (dinleme sonrası güncellenir). Şimdilik Edge birincil;
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
  const histText = buildHistoryText(history.slice(-HISTORY_WINDOW))
  const prompt = `Konuşma geçmişi:\n${histText}\n\nSıradaki kısa yanıtını yaz. Sadece diyalog metni, başka hiçbir şey.`

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
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

// ── Azure Speech TTS (F0 bedava katman) ──────────────────────────────────────
// 500K neural karakter/ay · 20 istek/dk · multilingual sesler tr-TR konuşur.
// Key yoksa bu katman sessizce atlanır (merdiven Edge'e düşer).
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

async function main() {
  const app = express()
  app.use(express.json())

  // ── API routes ──────────────────────────────────────────────────────────────
  app.post('/api/generate', async (req, res) => {
    const { speaker, history = [], ttsEngine = 'edge' } = req.body as {
      speaker: TtsSpeaker
      history: Message[]
      ttsEngine: 'edge' | 'browser' | 'gemini' | 'azure'
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

      // Merdiven: gemini -> azure -> edge -> null (istemci tarayıcı TTS'e düşer)
      let ttsResult: { audio: string; mimeType: string } | null = null
      if (ttsEngine === 'gemini') {
        ttsResult = await generateGeminiTts(text, speaker)
        if (!ttsResult) console.warn('Gemini TTS düştü — Azure/Edge fallback')
      }
      if (!ttsResult && (ttsEngine === 'azure' || ttsEngine === 'gemini')) {
        ttsResult = await generateAzureTts(text, speaker)
        if (!ttsResult && ttsEngine === 'azure') console.warn('Azure TTS düştü — Edge fallback')
      }
      if (!ttsResult) ttsResult = await generateEdgeTts(text, speaker)
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
    const { text, speaker, engine = 'edge', voice, style } = req.body as {
      text: string
      speaker: TtsSpeaker
      engine?: 'edge' | 'gemini' | 'azure'
      voice?: string
      style?: string
    }
    if (!text || !speaker || !['lilith', 'generic'].includes(speaker)) {
      return res.status(400).json({ error: 'text ve speaker zorunlu.' })
    }

    try {
      const result = engine === 'gemini'
        ? await generateGeminiTts(text, speaker, { voice, style })
        : engine === 'azure'
          ? await generateAzureTts(text, speaker, { voice, style })
          : await generateEdgeTts(text, speaker)
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
