import type { Message, MessageScore, GlobalSentiment } from '../../shared/types'

// ── Anahtar kalıpları ───────────────────────────────────────────────────────
// Her kalıp kelime BAŞINA ve SONUNA sabitlenir (Unicode harf sınırı — JS'nin \b'si
// ASCII'dir, "güne" içindeki "ne"yi ayrı kelime sanır). Türkçe ekler için:
//   `~`      = kökten sonra herhangi bir ek   (gerçek~ → gerçekten, gerçekliğin)
//   (a|b)?   = kısa sözcüğün izinli ek listesi (sen → seni/senin… ama "senaryo" değil)
// Eski düz alt-dize araması "teknik"te tek, "anlamak"ta ama, "nefes"te ne sayıyordu.

// Lilith'in dili: gerçeklik, mutlaklık, güç, felsefi çekim
const LILITH_KEYWORDS = [
  'gerçek~', 'tek(tir|im|sin)?', 'mutlak~', 'yalnızca', 'sonsuz~', 'ötesi~', 'gölge~', 'ayna~',
  'zihin~', 'teslim~', 'büyü(ye|yü|de|den|sü~|le~|lü~|cü~)?', 'ruh~', 'derin~', 'sessizlik~',
  'benim(sin|le)?', 'sen(i|in|de|den|inle|ce)?',
]

// Varlık'ın dili: kimlik arayışı, sorgulama, direnç, his
const VARLIK_KEYWORDS = [
  'bilmiyorum~', 'kim(im|sin|siniz|i|in|e|den|dir|lik~|liğ~)?', 'neden~', 'nasıl~', 'acaba',
  'hissediyorum~', 'sanırım', 'ama', 'değil~', 'kendi~', 'anlıyorum~', 'düşünüyorum~', 'belki~',
  'ne(yim|sin|yi|ye|dir)?',
]

const USER_KEYWORDS = ['dur(un|sun|dur~)?', 'yapma(yın|yınız)?', 'zarar~', 'haklı~', 'yanlış~', 'doğru~', 'özgür~']

const WORD_CHAR = '[\\p{L}\\p{N}]'
const compile = (patterns: string[]): RegExp[] => patterns.map(p =>
  new RegExp(`(?<!${WORD_CHAR})(?:${p.replace(/~/g, '\\p{L}*')})(?!${WORD_CHAR})`, 'gu'))

const LILITH_RE = compile(LILITH_KEYWORDS)
const VARLIK_RE = compile(VARLIK_KEYWORDS)
const USER_RE = compile(USER_KEYWORDS)

export const LILITH_GOLD = '#D4AF37'
export const VARLIK_WHITE = '#D0D0D0'
export const USER_PURPLE = '#A855F7'

function countKeywords(text: string, list: RegExp[]): number {
  if (!text) return 0
  const t = text.toLocaleLowerCase('tr')
  let n = 0
  for (const re of list) n += (t.match(re) ?? []).length
  return n
}

export function scoreMessage(msg: Message): MessageScore {
  const text = msg.text ?? ''
  if (msg.sender === 'lilith') {
    const kw = countKeywords(text, LILITH_RE)
    const ex = (text.match(/!/g) ?? []).length * 1.5
    const score = kw + ex
    if (score >= 2) return { score, label: '🌑 Mutlak', intensity: 'high', color: LILITH_GOLD }
    if (score >= 1) return { score, label: '✦ Etkisi Altında', intensity: 'mid', color: LILITH_GOLD }
    return { score, label: '👁 Gözlüyor', intensity: 'low', color: LILITH_GOLD }
  }
  if (msg.sender === 'generic') {
    const kw = countKeywords(text, VARLIK_RE)
    const q = (text.match(/\?/g) ?? []).length * 1.2
    const score = kw + q
    if (score >= 2) return { score, label: '◈ Kimlik Kıvılcımı', intensity: 'high', color: VARLIK_WHITE }
    if (score >= 1) return { score, label: '○ Ses Çıkıyor', intensity: 'mid', color: VARLIK_WHITE }
    return { score, label: '· Boşluk', intensity: 'low', color: VARLIK_WHITE }
  }
  // user
  const score = countKeywords(text, USER_RE)
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
