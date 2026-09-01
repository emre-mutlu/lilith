// Ambiyansın ruh hâli → sentez parametreleri. Saf eşleme; Web Audio bilmez,
// bu yüzden test edilebilir. AmbientEngine bunu her setMood'da sürer.

export interface AmbientMood {
  /** 0..1 — filtre açıklığı + hava parlaklığı */
  brightness: number
  /** 0..1 — akordsuzluk + daralma + gürültü + yankı */
  tension: number
}

/** Yankı bandı: kuru bir oda ile geniş bir mahzen arası. */
export const WET_MIN = 0.10
export const WET_MAX = 0.50

/** Üst katmanın gezindiği aralık: beşli (huzur) → minör altı (gerilim). */
export const NOTE_E3 = 164.81
export const NOTE_F3 = 174.61

const clamp01 = (x: number) => (Number.isFinite(x) ? Math.min(1, Math.max(0, x)) : 0)
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

export interface AmbientParams {
  filterHz: number
  filterQ: number
  detuneHz: number
  noiseHz: number
  noiseGain: number
  sweepDepth: number
  pulseHz: number
  pulseDepth: number
  /** Kuru/ıslak karışım — Emre'nin istediği değişken yankı oranı */
  wetRatio: number
  /** Stereo dolaşma hızı (Hz) — gerilimle huzursuzlaşır */
  panRate: number
  /** Üst katmanın perdesi — gerilimle beşliden minör altıya kayar */
  tensionNoteHz: number
  /** Seyrek shimmer olaylarının olasılık ağırlığı */
  shimmerChance: number
}

export function ambientParams(mood: AmbientMood): AmbientParams {
  const b = clamp01(mood.brightness)
  const t = clamp01(mood.tension)
  return {
    filterHz: 280 + b * 950,
    filterQ: 1 + t * 2.4,
    detuneHz: 110.6 + t * 2.6,
    noiseHz: 750 + b * 1250,
    noiseGain: 0.06 + t * 0.09,
    sweepDepth: 120 + t * 180,
    pulseHz: 0.12 + t * 0.45,
    pulseDepth: 0.012 + t * 0.055,
    wetRatio: lerp(WET_MIN, WET_MAX, t),
    panRate: 0.03 + t * 0.05,
    tensionNoteHz: lerp(NOTE_E3, NOTE_F3, t),
    shimmerChance: 0.25 + b * 0.35 + t * 0.25,
  }
}
