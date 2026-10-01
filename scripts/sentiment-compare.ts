// ── Sentiment kalibrasyon ölçümü: eski (10-01 öncesi alt-dize) vs yeni puanlama ──
// Gerçek oturum loglarını (sessions/*.jsonl) iki puanlayıcıdan geçirir; eşik
// kararı tahminle değil bu tabloyla verilsin. Salt-okur, hiçbir şey yazmaz.
//   npm run sentiment:compare               (varsayılan: ./sessions)
//   npm run sentiment:compare -- /yol/dizin
import fs from 'node:fs'
import path from 'node:path'
import { scoreMessage } from '../src/lib/sentiment'
import type { Message, SentimentIntensity } from '../shared/types'

type Speaker = 'lilith' | 'generic'
interface Turn { speaker: Speaker; text: string; intensity?: SentimentIntensity }

// ── Eski puanlayıcı: 10-01 öncesi sentiment.ts'in birebir kopyası (dondurulmuş) ──
const OLD_LILITH = ['gerçek', 'tek', 'mutlak', 'yalnızca', 'sonsuz', 'ötesi', 'gölge', 'ayna',
  'zihin', 'teslim', 'büyü', 'ruh', 'derin', 'sessizlik', 'benim', 'sen']
const OLD_VARLIK = ['bilmiyorum', 'kim', 'neden', 'nasıl', 'acaba', 'hissediyorum', 'sanırım',
  'ama', 'değil', 'kendi', 'anlıyorum', 'düşünüyorum', 'belki', 'ne']
function oldCount(text: string, list: string[]): number {
  const t = text.toLocaleLowerCase('tr')
  return list.reduce((n, k) => n + t.split(k).length - 1, 0)
}
function oldScore(t: Turn): number {
  return t.speaker === 'lilith'
    ? oldCount(t.text, OLD_LILITH) + (t.text.match(/!/g) ?? []).length * 1.5
    : oldCount(t.text, OLD_VARLIK) + (t.text.match(/\?/g) ?? []).length * 1.2
}
const tier = (s: number): SentimentIntensity => (s >= 2 ? 'high' : s >= 1 ? 'mid' : 'low')
const newScore = (t: Turn) => scoreMessage({ id: '', sender: t.speaker, text: t.text, timestamp: '' } as Message).score

// ── Logları oku ──────────────────────────────────────────────────────────────
const dir = path.resolve(process.argv[2] ?? 'sessions')
if (!fs.existsSync(dir)) { console.error(`Dizin yok: ${dir}`); process.exit(1) }
const turns: Turn[] = []
for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.jsonl'))) {
  for (const line of fs.readFileSync(path.join(dir, f), 'utf8').split('\n')) {
    if (!line.trim()) continue
    try {
      const e = JSON.parse(line) as Partial<Turn>
      if ((e.speaker === 'lilith' || e.speaker === 'generic') && typeof e.text === 'string') turns.push(e as Turn)
    } catch { /* bozuk satır atlanır */ }
  }
}
if (!turns.length) { console.error(`${dir} içinde replik bulunamadı.`); process.exit(1) }

const pct = (n: number, d: number) => (d ? `${Math.round((n / d) * 100)}%` : '—').padStart(4)
const TIERS: SentimentIntensity[] = ['low', 'mid', 'high']

for (const sp of ['lilith', 'generic'] as const) {
  const rows = turns.filter(t => t.speaker === sp).map(t => ({ t, o: oldScore(t), n: newScore(t) }))
  if (!rows.length) continue
  const N = rows.length
  console.log(`\n══ ${sp === 'lilith' ? 'Lilith' : 'Varlık'} — ${N} replik`)
  console.log('tier    eski   yeni')
  for (const k of TIERS) {
    console.log(`${k.padEnd(6)} ${pct(rows.filter(r => tier(r.o) === k).length, N)}   ${pct(rows.filter(r => tier(r.n) === k).length, N)}`)
  }
  const mean = (xs: number[]) => (xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(2)
  console.log(`ort. skor  eski ${mean(rows.map(r => r.o))} · yeni ${mean(rows.map(r => r.n))}`)

  // Eski "high" oranını koruyan eşik — eşik değişecekse çıpa bu
  const oldHigh = rows.filter(r => tier(r.o) === 'high').length / N
  const sorted = rows.map(r => r.n).sort((a, b) => b - a)
  const anchor = sorted[Math.max(0, Math.ceil(oldHigh * N) - 1)]
  console.log(`eski high oranını (${pct(oldHigh * N, N).trim()}) koruyan yeni eşik ≈ ${anchor?.toFixed(1) ?? '—'} (şu an 2)`)

  // Referans: modelin kendi beat intensity'si (tez izolasyonu gereği sentiment'i SÜRMEZ)
  const withBeat = rows.filter(r => r.t.intensity)
  if (withBeat.length) {
    const agree = (f: (r: typeof rows[number]) => number) =>
      pct(withBeat.filter(r => tier(f(r)) === r.t.intensity).length, withBeat.length).trim()
    console.log(`model beat intensity ile örtüşme  eski ${agree(r => r.o)} · yeni ${agree(r => r.n)}`)
  }

  const changed = rows.filter(r => tier(r.o) !== tier(r.n))
  console.log(`tier'ı değişen: ${changed.length}/${N}` + (changed.length ? ' — örnekler:' : ''))
  for (const r of changed.slice(0, 8)) {
    console.log(`  ${tier(r.o)}→${tier(r.n)}  ${r.t.text.slice(0, 90)}`)
  }
}
