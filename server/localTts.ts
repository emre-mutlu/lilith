// ── Chatterbox yerel TTS (M4 Pro resident servis) ────────────────────────────
// CHATTERBOX_PYTHON ayarlıysa localhost:8777'deki Python servisi kullanılır;
// ayarsızsa bu katman sessizce atlanır (merdiven tarayıcıya düşer).
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn, type ChildProcess } from 'node:child_process'
import { dramatizeForTts } from './ttsText.js'
import type { TtsSpeaker } from '../shared/types'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

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

export async function generateLocalTts(text: string, speaker: TtsSpeaker, exaggerationOverride?: number): Promise<{ audio: string; mimeType: string } | null> {
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

/** /api/tts/status için servis durumu — istemci "ısınıyor" göstergesi beslenir. */
export async function localTtsStatus(): Promise<{ configured: boolean; ready: boolean; warming: boolean }> {
  const ready = Date.now() < localAvailableUntil || (await healthCheck())
  if (ready) localAvailableUntil = Math.max(localAvailableUntil, Date.now() + 30_000)
  return { configured: Boolean(CHATTERBOX_PYTHON), ready, warming: !ready && localWarming }
}

