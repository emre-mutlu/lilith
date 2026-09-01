import { describe, it, expect } from 'vitest'
import { ambientParams, WET_MIN, WET_MAX, NOTE_E3, NOTE_F3 } from './ambientParams'

const mood = (brightness: number, tension: number) => ({ brightness, tension })

describe('ambientParams', () => {
  it('yankı oranı gerilimle artar ve bandında kalır', () => {
    const calm = ambientParams(mood(0.5, 0))
    const tense = ambientParams(mood(0.5, 1))
    expect(calm.wetRatio).toBeCloseTo(WET_MIN, 5)
    expect(tense.wetRatio).toBeCloseTo(WET_MAX, 5)
    expect(tense.wetRatio).toBeGreaterThan(calm.wetRatio)
  })

  it('parlaklık filtreyi açar', () => {
    expect(ambientParams(mood(1, 0.3)).filterHz)
      .toBeGreaterThan(ambientParams(mood(0, 0.3)).filterHz)
  })

  it('gerilim notasını E3 ile F3 arasında yürütür', () => {
    const calm = ambientParams(mood(0.4, 0))
    const tense = ambientParams(mood(0.4, 1))
    expect(calm.tensionNoteHz).toBeCloseTo(NOTE_E3, 5)
    expect(tense.tensionNoteHz).toBeCloseTo(NOTE_F3, 5)
  })

  it('gerilim panoramayı ve nabzı hızlandırır', () => {
    const calm = ambientParams(mood(0.4, 0.1))
    const tense = ambientParams(mood(0.4, 0.9))
    expect(tense.panRate).toBeGreaterThan(calm.panRate)
    expect(tense.pulseHz).toBeGreaterThan(calm.pulseHz)
  })

  it('aralık dışı ruh hâlini sıkıştırır — sentiment taşarsa ses patlamaz', () => {
    expect(ambientParams(mood(-3, 5))).toEqual(ambientParams(mood(0, 1)))
    expect(ambientParams(mood(9, -2))).toEqual(ambientParams(mood(1, 0)))
  })

  it('tüm çıktılar sonlu sayı', () => {
    for (const v of Object.values(ambientParams(mood(0.7, 0.4)))) {
      expect(Number.isFinite(v)).toBe(true)
    }
  })
})
