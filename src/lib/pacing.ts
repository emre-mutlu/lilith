// Replikler arası es — konuşmanın nefesi.
// Es'i süren şey biten repliğin yoğunluğu: hararetli bir çıkıştan sonra karşılık
// çabuk gelir, düşünceli bir replikten sonra sessizlik uzar. Jitter olmadan
// ritim metronoma dönüşüyor, o yüzden her es biraz kayar.
import type { SentimentIntensity } from '../../shared/types'

export const GAP_BASE_MS: Record<SentimentIntensity, number> = {
  low: 2200,
  mid: 1200,
  high: 600,
}

export const GAP_JITTER = 0.25

export function turnGapMs(intensity?: SentimentIntensity): number {
  const base = GAP_BASE_MS[intensity ?? 'mid'] ?? GAP_BASE_MS.mid
  const drift = (Math.random() * 2 - 1) * GAP_JITTER
  return Math.round(base * (1 + drift))
}

/** İptal edilebilir bekleme — token değişirse çağıran zaten kontrol eder. */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
