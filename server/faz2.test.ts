import { describe, expect, it } from 'vitest'
import { dramatizeForTts, intensityToExaggeration } from './ttsText'
import { prepareFishText } from './fishText'
import {
  validatePrelude, scenarioBlock, lilithScenarioBlock,
  LILITH_EGILIMLERI, type ScenarioPrelude,
} from './director'

const validPrelude: ScenarioPrelude = {
  lilith_egilimi: 'gerçeklik çerçevesi',
  lilith_gizlisi: 'kendi yok olma korkusunu saklıyor',
  oturum_yayi: 'kishōtenketsu',
  gerilim_ozu: 'tanrıyla çatışma',
  tur_doku: 'gerçeküstü',
  tempo: 'temkinli',
  duygu_rengi: 'melankolik-hafif',
  varlik_egrisi: 'yükselen',
  acilis_sahnesi: 'kapı eşiğinde bekleyen sessizlik',
  varlik_baslangici: 'meraklı ama tedirgin',
}

describe('dramatizeForTts', () => {
  it('uzun cümlelere duraksama ekler', () => {
    const out = dramatizeForTts('Ben senin karşında duran tek gerçeklik. Sen ise henüz bir sorusun.')
    expect(out).toContain('Ben…')
    expect(out).toContain('…')
  })
  it('kısa cümlelere dokunmaz', () => {
    expect(dramatizeForTts('Merhaba.')).toBe('Merhaba.')
  })
})

describe('intensityToExaggeration (grid kalibrasyonu)', () => {
  it('eşleme doğru', () => {
    expect(intensityToExaggeration('low')).toBe(0.8)
    expect(intensityToExaggeration('mid')).toBe(1.2)
    expect(intensityToExaggeration('high')).toBe(1.7)
    expect(intensityToExaggeration(undefined)).toBe(1.2)
  })
})

describe('validatePrelude', () => {
  it('geçerli prelüdü kabul eder', () => {
    expect(validatePrelude(validPrelude)).toBe(true)
  })
  it('enum dışı eğilimi reddeder', () => {
    expect(validatePrelude({ ...validPrelude, lilith_egilimi: 'olmayan taktik' })).toBe(false)
  })
  it('boş gizliyi reddeder', () => {
    expect(validatePrelude({ ...validPrelude, lilith_gizlisi: '' })).toBe(false)
  })
  it('24 eğilim listesi eksiksiz', () => {
    expect(LILITH_EGILIMLERI.length).toBe(24)
  })
})

describe('scenarioBlock enjeksiyonu', () => {
  it('senaryo alanları sistem bloğuna girer', () => {
    const block = scenarioBlock(validPrelude)
    expect(block).toContain('gerçeküstü')
    expect(block).toContain('kishōtenketsu')
    expect(lilithScenarioBlock(validPrelude)).toContain('yok olma korkusu')
    expect(lilithScenarioBlock(validPrelude)).toContain('ASLA söyleme')
  })
})

describe('prepareFishText', () => {
  // 09-01 kararı (Emre, A/B dinleme): yapay duraksama Fish yolundan kalktı.
  // S2.1 prozodiyi noktalamadan kendisi üretiyor; kelime sayısına göre konan
  // [break]'ler her repliği aynı kalıba sokup tempoyu %11 yavaşlatıyordu.
  it('metne yapay duraksama eklemez', () => {
    const ham = 'Ben senin karşında duran tek gerçeklik. Sen ise henüz bir sorusun.'
    expect(prepareFishText(ham)).toBe(ham)
  })
  it('soru cümlesini olduğu gibi bırakır — vurgu taşıyan son öbek bölünmez', () => {
    const soru = 'Senin kontrol edemediğin bir şey mi bu?'
    expect(prepareFishText(soru, 'mid')).toBe(soru)
  })
  it('high intensity → [emphasis] (Fish tag listesinde geçerli)', () => {
    expect(prepareFishText('Hiçbir şeydin!', 'high')).toBe('[emphasis] Hiçbir şeydin!')
  })
  it('low intensity → [soft tone] etiketi', () => {
    expect(prepareFishText('Merhaba.', 'low')).toBe('[soft tone] Merhaba.')
  })
  it('etiket sözcüğe yapışmaz', () => {
    expect(prepareFishText('Bir şey mi bu?', 'high')).toMatch(/^\[emphasis\] \S/)
  })
})
