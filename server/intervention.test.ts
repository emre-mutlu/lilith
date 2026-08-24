import { describe, expect, it } from 'vitest'
import {
  sozFrame, fisiltiFrame, isVisibleTo, isPinnableFor,
  stageStateBlock, directorNotesBlock, type HistMsg,
} from './intervention'

const msg = (p: Partial<HistMsg>): HistMsg => ({ sender: 'user', text: 'x', ...p })

describe('isVisibleTo', () => {
  it('sahne/yön hiç kimseye görünmez', () => {
    expect(isVisibleTo('lilith', msg({ mode: 'sahne' }))).toBe(false)
    expect(isVisibleTo('generic', msg({ mode: 'yon' }))).toBe(false)
  })
  it('fısıltı yalnız hedefinde görünür', () => {
    const w = msg({ mode: 'fisilti', target: 'lilith' })
    expect(isVisibleTo('lilith', w)).toBe(true)
    expect(isVisibleTo('generic', w)).toBe(false)
  })
  it('düz söz her ikisine görünür', () => {
    const s = msg({ mode: 'soz' })
    expect(isVisibleTo('lilith', s)).toBe(true)
    expect(isVisibleTo('generic', s)).toBe(true)
  })
})

describe('isPinnableFor', () => {
  it('başkasının fısıltısı pin-belleğe giremez (sızıntı koruması)', () => {
    const w = msg({ mode: 'fisilti', target: 'lilith', intensity: 'high' })
    expect(isPinnableFor('generic', w)).toBe(false)
    expect(isPinnableFor('lilith', w)).toBe(true)
  })
})

describe('çerçeveler', () => {
  it('sozFrame sahne dışı ses olarak çerçeveler', () => {
    expect(sozFrame('dur!')).toBe('[Sahne dışından bir ses duyulur: "dur!"]')
  })
  it('fisiltiFrame zihne dolan telkin olarak çerçeveler', () => {
    expect(fisiltiFrame('tereddüt et')).toBe('[Zihnine bir fısıltı doluyor: "tereddüt et"]')
  })
})

describe('bloklar', () => {
  it('stageStateBlock yalnız sahneyi alır, son N ile sınırlar', () => {
    const h: HistMsg[] = [
      msg({ text: 'SAHNE-A', mode: 'sahne' }),
      msg({ text: 'YON-B', mode: 'yon' }),
      msg({ sender: 'lilith', text: 'replik-satiri' }),
      msg({ text: 'SAHNE-C', mode: 'sahne' }),
    ]
    const out = stageStateBlock(h)
    expect(out).toContain('- SAHNE-A')
    expect(out).toContain('- SAHNE-C')
    expect(out).not.toContain('YON-B')
    expect(out).not.toContain('replik-satiri')
  })
  it('boş geçmişte blok üretilmez', () => {
    expect(stageStateBlock([])).toBe('')
    expect(directorNotesBlock([msg({ sender: 'lilith', text: 'selam' })])).toBe('')
  })
})
