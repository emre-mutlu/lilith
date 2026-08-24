// ── Azure Speech TTS (F0 bedava katman) ──────────────────────────────────────
// ⚠ PARK HALİNDE (Emre kararı, 08-24): Azure kullanılmıyor — AZURE_SPEECH_KEY
// ayarsız kaldığı sürece bu katman her turda sessizce atlanır (merdiven Edge'e
// düşer). Kod, ileride ihtiyaç olursa diye burada; maliyeti/kapasitesi yok.
// 500K neural karakter/ay · 20 istek/dk · multilingual sesler tr-TR konuşur.
import type { TtsSpeaker } from '../shared/types'

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

export async function generateAzureTts(text: string, speaker: TtsSpeaker, override?: { voice?: string; style?: string }): Promise<{ audio: string; mimeType: string } | null> {
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
