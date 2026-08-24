// ── Fish Audio TTS (bulut · s2.1-pro-free) ───────────────────────────────────
// Kütüphane sesleri reference_id ile kullanılır (kendi klon modellerimiz de olur).
// Key Operator kasasında: `operator secret run lilith -- npm run dev`
import { prepareFishText } from './fishText.js'
import type { SentimentIntensity, TtsSpeaker } from '../shared/types'

const FISH_API_KEY = process.env.FISH_AUDIO_KEY ?? ''
// low/balanced/normal — normal en kararlı; interaktif için balanced denenebilir
const FISH_LATENCY = (process.env.FISH_LATENCY ?? 'normal') as 'low' | 'balanced' | 'normal'
const FISH_MODEL_ID: Partial<Record<TtsSpeaker, string>> = {
  lilith: process.env.FISH_MODEL_LILITH || undefined,
  generic: process.env.FISH_MODEL_GENERIC || undefined,
}

/** Beat intensity → sampling sıcaklığı: abartı karşılığı */
function fishTemperature(intensity?: SentimentIntensity): number {
  return intensity === 'high' ? 0.9 : intensity === 'low' ? 0.65 : 0.75
}

export async function generateFishTts(text: string, speaker: TtsSpeaker, intensity?: SentimentIntensity): Promise<{ audio: string; mimeType: string } | null> {
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
