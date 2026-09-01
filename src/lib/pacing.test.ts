import { describe, it, expect } from 'vitest'
import { turnGapMs, GAP_BASE_MS, GAP_JITTER } from './pacing'

/** Jitter rastgele olduğu için dağılıma bakıyoruz: tek örnek yanıltır. */
function sample(intensity: Parameters<typeof turnGapMs>[0], n = 400): number[] {
  return Array.from({ length: n }, () => turnGapMs(intensity))
}

describe('turnGapMs', () => {
  it('her yoğunluk için tabanın ±%25 bandında kalır', () => {
    for (const level of ['low', 'mid', 'high'] as const) {
      const base = GAP_BASE_MS[level]
      const values = sample(level)
      expect(Math.min(...values)).toBeGreaterThanOrEqual(base * (1 - GAP_JITTER))
      expect(Math.max(...values)).toBeLessThanOrEqual(base * (1 + GAP_JITTER))
    }
  })

  it('hararetli replikten sonra kısa, düşünceli replikten sonra uzun es verir', () => {
    const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length
    expect(avg(sample('high'))).toBeLessThan(avg(sample('mid')))
    expect(avg(sample('mid'))).toBeLessThan(avg(sample('low')))
  })

  it('yoğunluk bilinmiyorsa orta tempoya düşer', () => {
    const values = sample(undefined)
    const base = GAP_BASE_MS.mid
    expect(Math.min(...values)).toBeGreaterThanOrEqual(base * (1 - GAP_JITTER))
    expect(Math.max(...values)).toBeLessThanOrEqual(base * (1 + GAP_JITTER))
  })

  it('aynı yoğunlukta bile değişkenlik üretir — mekanik tekrar yok', () => {
    expect(new Set(sample('mid', 50)).size).toBeGreaterThan(1)
  })
})
