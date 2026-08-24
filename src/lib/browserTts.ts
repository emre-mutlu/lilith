// ── Tarayıcı TTS yardımcıları (saf) ──────────────────────────────────────────
// SpeechSynthesis ses seçimi, prosodi ve Web Audio PCM çözümü.
import type { Message } from '../../shared/types'
import { scoreMessage } from './sentiment'

export function listTtsVoices(): SpeechSynthesisVoice[] {
  if (!window.speechSynthesis) return []
  return window.speechSynthesis.getVoices()
}

const FEMALE_HINTS = ['female', 'feminine', 'woman', 'girl', 'yelda', 'filiz', 'emel', 'seda',
  'samantha', 'victoria', 'kathy', 'ava', 'allison', 'google türkçe', 'zira', 'jenny', 'aria', 'elsa']
const MALE_HINTS = ['male', 'masculine', 'man', 'boy', 'tolga', 'ahmet',
  'alex', 'fred', 'daniel', 'tom', 'david', 'mark', 'guy', 'ryan', 'thomas']

function classifyVoice(v: SpeechSynthesisVoice): 'f' | 'm' | '?' {
  const name = v.name.toLowerCase()
  if (FEMALE_HINTS.some(h => name.includes(h))) return 'f'
  if (MALE_HINTS.some(h => name.includes(h))) return 'm'
  return '?'
}

export function autoPickVoices(voices: SpeechSynthesisVoice[]): [string, string] {
  if (!voices.length) return ['', '']
  const turkish = voices.filter(v => /^tr/i.test(v.lang))
  const pool = turkish.length ? turkish : voices
  let lilith = pool.find(v => classifyVoice(v) === 'f') ?? pool[0]
  let varlik = pool.find(v => classifyVoice(v) === 'm' && v.voiceURI !== lilith.voiceURI)
           ?? pool.find(v => v.voiceURI !== lilith.voiceURI)
           ?? lilith
  return [lilith.voiceURI, varlik.voiceURI]
}

const CHAR_PROSODY: Record<string, { rate: number; pitch: number }> = {
  lilith:  { rate: 0.88, pitch: 0.82 },
  generic: { rate: 1.02, pitch: 1.18 },
}

export function emotionalProsody(msg: Message): { rate: number; pitch: number } {
  const base = CHAR_PROSODY[msg.sender as keyof typeof CHAR_PROSODY] ?? { rate: 1, pitch: 1 }
  const s = scoreMessage(msg)
  let { rate, pitch } = base
  if (msg.sender === 'lilith') {
    if (s.intensity === 'high') { rate *= 0.92; pitch *= 0.94 }
    else if (s.intensity === 'mid') { rate *= 0.96 }
  } else if (msg.sender === 'generic') {
    if (s.intensity === 'high') { pitch *= 0.96; rate *= 0.98 }
    else if (s.intensity === 'low') { pitch *= 1.04; rate *= 1.04 }
  }
  rate = Math.max(0.5, Math.min(1.6, rate))
  pitch = Math.max(0.5, Math.min(1.6, pitch))
  return { rate, pitch }
}

export function splitForProsody(text: string): string[] {
  const parts: string[] = []
  const sentences: string[] = []
  let buf = ''
  for (const ch of text) {
    buf += ch
    if (/[.!?…]/.test(ch)) { sentences.push(buf.trim()); buf = '' }
  }
  if (buf.trim()) sentences.push(buf.trim())
  for (const s of sentences) {
    if (s.length <= 60) { parts.push(s); continue }
    const clauses = s.split(/(?<=[,;:])\s+/)
    for (const c of clauses) parts.push(c)
  }
  return parts.filter(Boolean)
}

// ── Web Audio API PCM decoder ────────────────────────────────────────────────

export async function decodeAudioData(base64Audio: string, mimeType: string | null | undefined, ctx: AudioContext): Promise<AudioBuffer> {
  const bytes = Uint8Array.from(atob(base64Audio), c => c.charCodeAt(0))
  // WAV (RIFF)
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) {
    return ctx.decodeAudioData(bytes.buffer.slice(0))
  }
  // MP3 — ID3 tag or MPEG sync frame
  const isMP3 = mimeType?.includes('mpeg') || mimeType?.includes('mp3')
    || (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33)
    || (bytes[0] === 0xFF && (bytes[1] & 0xE0) === 0xE0)
  if (isMP3) {
    return ctx.decodeAudioData(bytes.buffer.slice(0))
  }
  // Raw 16-bit signed little-endian PCM at 24000 Hz
  const samples = bytes.length / 2
  const buffer = ctx.createBuffer(1, samples, 24000)
  const channel = buffer.getChannelData(0)
  const view = new DataView(bytes.buffer)
  for (let i = 0; i < samples; i++) {
    channel[i] = view.getInt16(i * 2, true) / 32768.0
  }
  return buffer
}
