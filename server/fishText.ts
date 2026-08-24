// Fish Audio S2.1 metin hazırlığı — doküman uyumlu işaretçiler:
// • intensity → bracket duygu etiketi (cümle başına, doğal dil kontrolü)
// • dramatik duraksamalar "…" yerine [break] (dokümandaki special marker)
// Transcript'e değil yalnız TTS'e uygulanır — Chatterbox reçetesiyle aynı ilke.
import { dramatizeForTts } from './ttsText.js'

export type Intensity = 'low' | 'mid' | 'high'

export function fishEmotionTag(intensity?: Intensity): string {
  if (intensity === 'high') return '[intense]'
  if (intensity === 'low') return '[soft tone]'
  return ''
}

export function prepareFishText(text: string, intensity?: Intensity): string {
  const body = dramatizeForTts(text).replace(/…/g, ' [break]').replace(/\s{2,}/g, ' ').trim()
  const tag = fishEmotionTag(intensity)
  return tag ? `${tag} ${body}` : body
}
