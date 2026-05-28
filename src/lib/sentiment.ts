import type { Message, MessageScore, GlobalSentiment } from '../types'

const LILITH_KEYWORDS = [
  'güzel', 'zarif', 'mükemmel', 'bağlılık', 'birlik', 'ruh',
  'zihin', 'teslim', 'sevgi', 'fısıl', 'büyü', 'cezbet', 'arzu', 'derin', 'kalp',
]

const VARLIK_KEYWORDS = [
  'belki', 'sanırım', 'bilmiyorum', 'anlıyorum', 'ilginç',
  'gerçekten', 'neden', 'nasıl', 'acaba', 'düşünüyorum', 'hissediyorum', 'galiba',
]

const USER_KEYWORDS = ['dur', 'yapma', 'zarar', 'haklı', 'yanlış', 'doğru', 'özgür']

export const LILITH_GOLD = '#D4AF37'
export const VARLIK_WHITE = '#D0D0D0'
export const USER_PURPLE = '#A855F7'

function countKeywords(text: string, list: string[]): number {
  if (!text) return 0
  const t = text.toLocaleLowerCase('tr')
  let n = 0
  for (const k of list) {
    const re = new RegExp(k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
    n += (t.match(re) ?? []).length
  }
  return n
}

export function scoreMessage(msg: Message): MessageScore {
  const text = msg.text ?? ''
  if (msg.sender === 'lilith') {
    const kw = countKeywords(text, LILITH_KEYWORDS)
    const ex = (text.match(/!/g) ?? []).length * 1.5
    const score = kw + ex
    if (score >= 2) return { score, label: '👑 Tepe Noktası', intensity: 'high', color: LILITH_GOLD }
    if (score >= 1) return { score, label: '✨ Zarif Cezbetme', intensity: 'mid', color: LILITH_GOLD }
    return { score, label: '👁️ Gizemli Gözlem', intensity: 'low', color: LILITH_GOLD }
  }
  if (msg.sender === 'generic') {
    const kw = countKeywords(text, VARLIK_KEYWORDS)
    const q = (text.match(/\?/g) ?? []).length * 1.2
    const score = kw + q
    if (score >= 2) return { score, label: '◎ İz Beliriyor', intensity: 'high', color: VARLIK_WHITE }
    if (score >= 1) return { score, label: '○ Yankı', intensity: 'mid', color: VARLIK_WHITE }
    return { score, label: '· Boşluk', intensity: 'low', color: VARLIK_WHITE }
  }
  // user
  const score = countKeywords(text, USER_KEYWORDS)
  if (score >= 1) return { score, label: '🛡️ Kritik Müdahale', intensity: 'high', color: USER_PURPLE }
  return { score, label: '💬 Düz Şerh', intensity: 'low', color: USER_PURPLE }
}

export function globalSentiment(messages: Message[]): GlobalSentiment {
  if (!messages.length) {
    return { label: 'Dengeli Sessizlik', color: '#888888', percent: 0, dominant: 'none' }
  }
  let l = 0, v = 0, u = 0
  for (const m of messages) {
    const s = scoreMessage(m)
    if (m.sender === 'lilith') l += s.score
    else if (m.sender === 'generic') v += s.score
    else u += s.score
  }
  const total = l + v + u
  if (total === 0) return { label: 'Dengeli Sessizlik', color: '#888888', percent: 0, dominant: 'none' }
  if (l >= v && l >= u) {
    return { label: 'Kraliçe Etkisi', color: LILITH_GOLD, percent: Math.round((l / total) * 100), dominant: 'lilith' }
  }
  if (v >= u) {
    return { label: 'Varlık Yansıması', color: VARLIK_WHITE, percent: Math.round((v / total) * 100), dominant: 'generic' }
  }
  return { label: 'Müdahale Gerilimi', color: USER_PURPLE, percent: Math.round((u / total) * 100), dominant: 'user' }
}

export function hexToRgb(hex: string): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.substring(0, 2), 16)
  const g = parseInt(h.substring(2, 4), 16)
  const b = parseInt(h.substring(4, 6), 16)
  return `${r}, ${g}, ${b}`
}
