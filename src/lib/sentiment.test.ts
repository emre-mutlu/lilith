import { describe, expect, it } from 'vitest'
import { scoreMessage, globalSentiment } from './sentiment'
import type { Message } from '../../shared/types'

const msg = (sender: Message['sender'], text: string): Message => ({
  id: 't', sender, text, timestamp: '00:00:00',
})
const score = (sender: Message['sender'], text: string) => scoreMessage(msg(sender, text)).score

describe('scoreMessage — kelime-içi sızıntı yok', () => {
  it('kısa anahtarlar başka kelimelerin içinde sayılmaz', () => {
    expect(score('lilith', 'teknik bir sorun')).toBe(0)        // tek ⊂ teknik
    expect(score('lilith', 'senaryo bozuldu')).toBe(0)         // sen ⊂ senaryo
    expect(score('lilith', 'büyük bir oda')).toBe(0)           // büyü ⊂ büyük
    expect(score('generic', 'söylenecek bir şey yok')).toBe(0) // ne ⊂ söylenecek
    expect(score('generic', 'nefesim kesildi')).toBe(0)        // ne ⊂ nefesim
    expect(score('generic', 'anlamak istiyorum')).toBe(0)      // ama ⊂ anlamak
    expect(score('generic', 'tamam, olamaz')).toBe(0)          // ama ⊂ tamam/olamaz
    expect(score('user', 'durum nedir')).toBe(0)               // dur ⊂ durum
    expect(score('user', 'bunu yapmak istiyorum')).toBe(0)     // yapma ⊂ yapmak
  })

  it("Türkçe harf sınırı: JS \\b'sinin aksine 'güne' içindeki 'ne' kelime değildir", () => {
    expect(score('generic', 'güne baktım, öne eğildim')).toBe(0)
  })

  it('"neden" tek kez sayılır (eski arama ne+neden diye iki kez sayıyordu)', () => {
    expect(score('generic', 'neden')).toBe(1)
  })
})

describe('scoreMessage — Türkçe ekli doğru eşleşmeler korunur', () => {
  it('Lilith: kök + ek', () => {
    expect(score('lilith', 'Gerçekten tek gerçek benim.')).toBe(4) // gerçekten, tek, gerçek, benim
    expect(score('lilith', 'Seni gölgelerin ötesinde bekliyorum.')).toBe(3)
    expect(score('lilith', 'Senin zihnin değil, ruhun konuşuyor.')).toBe(2) // senin, ruhun
    expect(score('lilith', 'Büyüsü bozulmadı; büyüleyici, değil mi?')).toBe(2)
  })

  it('Varlık: kimlik sorgusu', () => {
    expect(score('generic', 'Kimim ben?')).toBeCloseTo(2.2) // kimim + ? (1.2)
    expect(score('generic', 'Kimliğim yok, kendimi bilmiyorum.')).toBe(3)
    expect(score('generic', 'Anlıyorum ama inanmıyorum.')).toBe(2) // iki ayrı, tam kelime — sızıntı değil
  })

  it('büyük/küçük harf Türkçe kurallarıyla indirgenir (İ → i)', () => {
    expect(score('generic', 'KİMİM')).toBe(1)
  })

  it('Kullanıcı: müdahale fiilleri', () => {
    expect(scoreMessage(msg('user', 'Dur!')).intensity).toBe('high')
    expect(scoreMessage(msg('user', 'Bunu yapmayın.')).intensity).toBe('high')
    expect(scoreMessage(msg('user', 'Merhaba')).intensity).toBe('low')
  })
})

describe('scoreMessage — eşikler', () => {
  it('Lilith: ünlem 1.5 sayar; ≥2 high, ≥1 mid, aksi low', () => {
    expect(scoreMessage(msg('lilith', 'Dinle!')).intensity).toBe('mid')
    expect(scoreMessage(msg('lilith', 'Sonsuz bir sessizlik.')).intensity).toBe('high')
    expect(scoreMessage(msg('lilith', 'Merhaba.')).intensity).toBe('low')
  })
})

describe('globalSentiment', () => {
  it('boş ya da skorsuz geçmiş → dengeli sessizlik', () => {
    expect(globalSentiment([]).dominant).toBe('none')
    expect(globalSentiment([msg('lilith', 'merhaba')]).dominant).toBe('none')
  })
  it('baskın konuşan ve yüzdesi', () => {
    const g = globalSentiment([msg('lilith', 'Tek gerçek benim.'), msg('generic', 'Neden?')])
    expect(g.dominant).toBe('lilith')
    expect(g.percent).toBe(58) // 3 / (3 + 2.2)
  })
})
