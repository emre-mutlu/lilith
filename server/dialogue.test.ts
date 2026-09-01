import { describe, expect, it } from 'vitest'
import { stripPrefix, roleContents, pinMemoryBlock, SYSTEM_INSTRUCTIONS } from './dialogue'
import { sozFrame, fisiltiFrame } from './intervention'
import type { Message } from '../shared/types'

const msg = (p: Partial<Message>): Message => ({
  id: 't1', sender: 'lilith', text: 'x', timestamp: '00:00:00', ...p,
})

describe('stripPrefix', () => {
  it('karakter öncüklerini soyar (tekrar eden dahil)', () => {
    expect(stripPrefix('Lilith: merhaba')).toBe('merhaba')
    expect(stripPrefix('Kraliçe Lilith — dinle')).toBe('dinle')
    expect(stripPrefix('Moderatör (Kullanıcı): dur')).toBe('dur')
    expect(stripPrefix('Varlık: Lilith: yuvalanmış')).toBe('yuvalanmış')
  })
  it('sarmalayıcı tırnakları kırpar', () => {
    expect(stripPrefix('"söz"')).toBe('söz')
    expect(stripPrefix("`Lilith: tırnaklı`")).toBe('tırnaklı')
  })
  it('öncüksüz metne dokunmaz', () => {
    expect(stripPrefix('zaten temiz')).toBe('zaten temiz')
  })
})

describe('roleContents', () => {
  it('kendi replikleri model rolünde, karşı taraf user rolünde', () => {
    const h: Message[] = [
      msg({ id: '1', sender: 'lilith', text: 'selam' }),
      msg({ id: '2', sender: 'generic', text: 'kim var' }),
    ]
    const lilith = roleContents('lilith', h)
    // kendi replikiyle açılan geçmişe karşılaşma açılışı eklenir (ilk rol user)
    expect(lilith[0]).toEqual({ role: 'user', parts: [{ text: '(karşılaşma başlar)' }] })
    expect(lilith[1]).toEqual({ role: 'model', parts: [{ text: 'selam' }] })
    expect(lilith[2]).toEqual({ role: 'user', parts: [{ text: 'kim var' }] })
  })

  it('sahne/yön hiçbir karakterin diyaloguna girmez', () => {
    const h: Message[] = [
      msg({ id: '1', sender: 'user', mode: 'sahne', text: 'çan çalar' }),
      msg({ id: '2', sender: 'user', mode: 'yon', text: 'tempo düşsün' }),
      msg({ id: '3', sender: 'generic', text: 'ses neydi' }),
    ]
    const contents = roleContents('lilith', h)
    expect(contents).toHaveLength(1)
    expect(contents[0].parts[0].text).toBe('ses neydi')
  })

  it('fısıltı yalnız hedefinde görünür; her ikisi de çerçeveli sunulur', () => {
    const h: Message[] = [
      msg({ id: '1', sender: 'user', mode: 'fisilti', target: 'lilith', text: 'kuşku duyar' }),
      msg({ id: '2', sender: 'generic', text: 'replik' }),
    ]
    // Hedef (Lilith): fısıltıyı görür — zihnine dolayan çerçeveyle
    const lilith = roleContents('lilith', h)
    expect(lilith).toHaveLength(2)
    expect(lilith[0].parts[0].text).toBe('[Zihnine bir fısıltı doluyor: "kuşku duyar"]')
    // Hedef değil (Varlık): fısıltı tamamen filtrelenir, sızmaz
    const generic = roleContents('generic', h)
    expect(generic).toHaveLength(2) // açılış + kendi repliği
    expect(generic[0].parts[0].text).toBe('(karşılaşma başlar)')
    expect(generic[1].parts[0].text).toBe('replik')
  })

  it('düz söz (soz) karşı tarafta sahne dışı ses çerçevesiyle görünür', () => {
    const h: Message[] = [
      msg({ id: '1', sender: 'user', mode: 'soz', text: 'kaçış yok' }),
      msg({ id: '2', sender: 'generic', text: 'replik' }),
    ]
    const contents = roleContents('lilith', h)
    expect(contents[0].parts[0].text).toBe('[Sahne dışından bir ses duyulur: "kaçış yok"]')
  })

  it('boş geçmişte karşılaşma açılışı eklenir (ilk rol user olur)', () => {
    expect(roleContents('lilith', [])[0]).toEqual({ role: 'user', parts: [{ text: '(karşılaşma başlar)' }] })
  })

  it('kendi replikiyle başlayan pencerede de ilk rol user olacak şekilde düzeltilir', () => {
    const h: Message[] = [
      msg({ id: '1', sender: 'user', mode: 'sahne', text: 'görünmez' }),
      msg({ id: '2', sender: 'lilith', text: 'ilk ben konuşurum' }),
    ]
    const contents = roleContents('lilith', h)
    expect(contents[0]).toEqual({ role: 'user', parts: [{ text: '(karşılaşma başlar)' }] })
    expect(contents[1]).toEqual({ role: 'model', parts: [{ text: 'ilk ben konuşurum' }] })
  })
})

describe('pinMemoryBlock', () => {
  it('high-intensity anlar pencereden bağımsız listelenir', () => {
    const h: Message[] = [
      msg({ id: '1', sender: 'lilith', text: 'dönüm noktası', intensity: 'high' }),
      msg({ id: '2', sender: 'generic', text: 'sıradan', intensity: 'low' }),
    ]
    const out = pinMemoryBlock('generic', h)
    expect(out).toContain('ÖNEMLİ ANLAR')
    expect(out).toContain('- Lilith: dönüm noktası')
    expect(out).not.toContain('sıradan')
  })
  it('high yoksa boş döner', () => {
    expect(pinMemoryBlock('lilith', [msg({ sender: 'generic', text: 'sakin' })])).toBe('')
  })
})

describe('müdahale talimatı', () => {
  const speakers = ['lilith', 'generic'] as const

  it('her iki karakter de söz ve fısıltı çerçevesini tanır', () => {
    // Çerçeveleri intervention.ts kurar; talimat aynı dili konuşmazsa
    // karakter metni tanımaz ve müdahaleyi es geçer.
    for (const speaker of speakers) {
      const s = SYSTEM_INSTRUCTIONS[speaker]
      expect(s).toContain('Sahne dışından')
      expect(s).toContain('fısıltı')
    }
  })

  it('çerçeve metinleri talimatla örtüşür', () => {
    expect(sozFrame('dur')).toContain('Sahne dışından')
    expect(fisiltiFrame('dur')).toContain('fısıltı')
  })

  it('tepkiyi zorunlu kılar ama biçimini karaktere bırakır', () => {
    for (const speaker of speakers) {
      expect(SYSTEM_INSTRUCTIONS[speaker]).toMatch(/karşılıksız bırakma|yok sayma/i)
    }
  })
})
