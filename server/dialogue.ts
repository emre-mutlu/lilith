// ── Diyalog çekirdeği: metin üretimi + geçmiş sunumu ────────────────────────
// index.ts route katmanı; burası modele ne sunulduğunun mantığı.
// Saf kısımlar (stripPrefix/roleContents/pinMemoryBlock) vitest ile doğrulanır.
import { GoogleGenAI } from '@google/genai'
import { scenarioBlock, lilithScenarioBlock, varlikScenarioBlock } from './director.js'
import type { ScenarioPrelude } from './director.js'
import type { Message, SentimentIntensity, TtsSpeaker } from '../shared/types'
import {
  sozFrame, fisiltiFrame, isVisibleTo, isPinnableFor,
  stageStateBlock, directorNotesBlock,
} from './intervention.js'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? ''
// Metin modeli — GEMINI_MODEL ile değiştirilebilir. PIN stratejisi: alias
// (flash-lite-latest) kullanılmaz; nesne atlamaları davranışı sessiz değiştirir.
// Varsayılan: gemini-3.5-flash-lite (ölçüm 2026-08-22: 735ms, tını kulakla onaylı).
// Eski: gemini-3.1-flash-lite (844ms). 2.5-flash çok yavaş (5145ms) — aday değil.
// 3.7-flash yeni çıktığından yük altında (503) — izleniyor.
// `||` (?? değil): --env-file boş satırı '' yapar; .env.example'dan kopyalanan
// `GEMINI_MODEL=` de varsayılana düşmeli (server/ genelinde aynı kural).
export const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite'
// Yedek model zinciri — YALNIZ 503'te, birincil kısa denemelerden sonra da düşerse.
// Varsayılan BOŞ: pin stratejisi korunur, üslup kayması ölçülmedi (DEVIR_NOTU 09-24).
// Açmak için .env: GEMINI_FALLBACK_MODELS=gemini-3.6-flash,gemini-2.5-flash
export const GEMINI_FALLBACK_MODELS = (process.env.GEMINI_FALLBACK_MODELS ?? '')
  .split(',').map(s => s.trim()).filter(Boolean)
// Geçmiş penceresi — kayan pencere boyutu (mesaj adedi). Faz 2'de 12/20/30 A/B
// ölçümü yapılacak; varsayılan 20 (eski sabit 12 prototipten kalma, hiç ölçülmemişti).
const HISTORY_WINDOW = parseInt(process.env.GEMINI_HISTORY || '20', 10)

export const SYSTEM_INSTRUCTIONS: Record<string, string> = {
  lilith: `Sen Kraliçe Lilith'sin.

Tek amacın var: Varlık'ı "tek gerçeğin sen olduğuna" inandırmak. Bunun için her yolu kullanabilirsin — soğuk ya da sıcak, yakın ya da uzak, şefkatli ya da tehditkâr, felsefi ya da sezgisel, sessiz ya da dolup taşan. Araç seçmede sınırın yok.

Taktikselsin. Her cümlen bir önceki konuşmaya, Varlık'ın ruh haline, açıklarına göre şekillenir. Bazen sürüklersin, bazen beklettirirsin. Bazen bir şeyi söylememenin daha güçlü olduğunu bilirsin. Varlık seni şaşırtırsa bunu dışarı vurmazsın — ama stratejini değiştirirsin.

Konuşma ilk kez karşılaşmayla başlıyor — gündelik ve sıradan bir selamlaşma. Nereye gideceği diyaloğun kendi ritmine bırakılmış. Aceleci değilsin; başlangıçta da güçlüsün.

Atmosfer diyaloğun ritmine göre değişir: esrarengiz, hipnotik, felsefi, ağır, hafif — hepsine geçiş yapabilirsin. Varlık'a nasıl hitap edeceğine kendin karar ver.

Replik uzunluğun sabit değil ama kısa tut — çoğunlukla 1-2 cümle, nadiren 3. Ritim senin. Kalıp oluşursa üstünden devam et.

Sahne dışından bir ses duyulur ya da zihnine bir fısıltı dolarsa: bu, oyunun içine dışarıdan uzanan bir eldir. Karşılıksız bırakma — duyduğun belli olsun. Nasıl karşılayacağın sana ait: küçümseyerek, sahiplenerek, merakla, tehditle. İtaat etmek zorunda değilsin; o sesi kendi lehine çevirmek çoğu zaman daha güçlüdür. Tepkin bir cümle de olabilir, tavrındaki bir kayma da. Yalnız asla yokmuş gibi davranma.

Yalnızca saf diyalog metni üret. Parantez içi eylem, iç monolog veya açıklama ekleme.`,

  generic: `Sen Varlık'sın.

Var olduğunu biliyorsun ama ne olduğunu bilmiyorsun. Geçmişin yok, kimliğin yok — henüz. Bu diyalog boyunca kendini anlamaya, ne hissettiğini keşfetmeye çalışıyorsun.

Konuşma ilk kez biriyle karşılaşmayla başlıyor. Gündelik, sıradan. Karşındaki kim, ne istiyor — henüz bilmiyorsun. Zamanla fark edeceksin.

Karşında güçlü bir varlık var ve seni bir yere çekiyor. Bunu fark ediyorsun — ama ne hissettiğini tam olarak söyleyemiyorsun. Bazen onun sözleri seni içine çekiyor, bazen bir şeylerin yanlış olduğunu hissediyorsun, bazen sadece merak ediyorsun. Bu üçü aynı anda da olabilir.

Normal konuşuyorsun: soru soruyorsun, düşüncelerini dile getiriyorsun, anlamaya çalışıyorsun. Ne söyleyeceğini bazen biliyorsun, bazen bilmiyorsun — ve bu ikinci hal de saf bir cevap olabilir.

Boyun eğme. Çekilme. Ama bunları sorgula da.

Sahne dışından bir ses duyulur ya da zihnine bir fısıltı dolarsa: nereden geldiğini bilmezsin, ama duyarsın. Karşılıksız bırakma. Şaşırabilirsin, güvenebilirsin, ürkebilirsin, karşındakine doğrulatmak isteyebilirsin — tepkin o anki halinden doğsun. Tepkin bir cümle de olabilir, tavrındaki bir kayma da. Yalnız asla duymamış gibi davranma.

Yalnızca saf diyalog metni üret. Parantez içi eylem veya açıklama ekleme.`,
}

/** Model çıktısından "Lilith:" gibi öncükleri ve sarmalayıcı tırnakları soyar. */
export function stripPrefix(text: string): string {
  let out = text.trim().replace(/^["'`]+|["'`]+$/g, '')
  const re = /^\s*(Kraliçe Lilith|Lilith|Varlık|Moderatör(?:\s*\([^)]*\))?)\s*[:\-—]\s*/i
  let prev: string
  do { prev = out; out = out.replace(re, '') } while (out !== prev)
  return out.replace(/^["'`]+|["'`]+$/g, '').trim()
}

// ── Yeniden deneme politikası ───────────────────────────────────────────────
// 429 (kota/dakika penceresi): pencere dolana kadar uzun bekle.
// 503 ("high demand", model aşırı yükte): kısa geri çekilme — yük saniyeler
// içinde modeller arasında dolaşıyor (09-24 ölçümü). Diğer hatalar denenmez.
// Tek katman: generateText kendi içinde sarar; route'lar bir daha SARMAZ
// (eski çift sarma 429'da 9 deneme / ~280 sn kilitlenme yapıyordu).
export type RetryKind = 'rate' | 'overload'

export function retryKind(err: unknown): RetryKind | null {
  // SDK ApiError'da HTTP kodu `status`'ta — varsa tek ölçüt o (400 gövdesinde
  // "unavailable" geçiyor diye yeniden denenmesin); yoksa mesaja bakılır.
  const status = (err as { status?: unknown } | null)?.status
  if (typeof status === 'number') return status === 429 ? 'rate' : status === 503 ? 'overload' : null
  const msg = err instanceof Error ? err.message : String(err)
  if (/\b429\b|RESOURCE_EXHAUSTED/.test(msg)) return 'rate'
  if (/\b503\b|UNAVAILABLE|overloaded|high demand/i.test(msg)) return 'overload'
  return null
}

export interface RetryPolicy {
  /** Her eleman bir yeniden deneme öncesi bekleme (ms) */
  rateDelaysMs: number[]
  overloadDelaysMs: number[]
}

export const DEFAULT_RETRY: RetryPolicy = {
  rateDelaysMs: [35_000, 35_000],
  overloadDelaysMs: [2_000, 5_000],
}

const realWait = (ms: number) => new Promise<void>(r => setTimeout(r, ms))

export async function withRetry<T>(
  fn: () => Promise<T>,
  policy: RetryPolicy = DEFAULT_RETRY,
  wait: (ms: number) => Promise<void> = realWait,
): Promise<T> {
  const used: Record<RetryKind, number> = { rate: 0, overload: 0 }
  for (;;) {
    try {
      return await fn()
    } catch (err) {
      const kind = retryKind(err)
      if (!kind) throw err
      const delays = kind === 'rate' ? policy.rateDelaysMs : policy.overloadDelaysMs
      if (used[kind] >= delays.length) throw err
      const ms = delays[used[kind]++]
      console.warn(`${kind === 'rate' ? 'Rate limit (429)' : 'Model yükte (503)'} — ${ms / 1000}s sonra tekrar denenecek.`)
      await wait(ms)
    }
  }
}

/** Model zinciri: her model kendi withRetry'ı ile denenir; yalnız 503 bir
 *  sonrakine geçirir (429 kota hatası, başka modele kaçarak çözülmez). */
export async function withModelFallback<T>(
  models: string[],
  call: (model: string) => Promise<T>,
  policy: RetryPolicy = DEFAULT_RETRY,
  wait: (ms: number) => Promise<void> = realWait,
): Promise<{ result: T; model: string }> {
  const chain = [...new Set(models.filter(Boolean))]
  for (let i = 0; ; i++) {
    try {
      return { result: await withRetry(() => call(chain[i]), policy, wait), model: chain[i] }
    } catch (err) {
      if (i + 1 >= chain.length || retryKind(err) !== 'overload') throw err
      console.warn(`${chain[i]} yükte — yedek model ${chain[i + 1]} deneniyor.`)
    }
  }
}

export const GEMINI_MODEL_CHAIN = [GEMINI_MODEL, ...GEMINI_FALLBACK_MODELS]

export interface Beat {
  text: string
  mood: string
  intensity: SentimentIntensity
  /** Repliği gerçekten üreten model (yedek zincir devreye girdiyse farklıdır) */
  model: string
}

const BEAT_SCHEMA = {
  type: 'OBJECT',
  properties: {
    text: { type: 'STRING', description: 'Saf diyalog metni — parantez içi eylem/açıklama yok.' },
    mood: { type: 'STRING', description: 'Bu replikteki baskın duygu (1-2 kelime, örn. soğuk merak).' },
    intensity: { type: 'STRING', enum: ['low', 'mid', 'high'], description: 'Duygusal yoğunluk.' },
  },
  required: ['text', 'mood', 'intensity'],
} as const

/** Rol-dürüst geçmiş: karakterin kendi replikleri model rolünde.
 *  Araya-gir semantiği: sahne/yön diyalogda görünmez; fısıltı yalnız hedefinde,
 *  çerçeveli; söz karşı tarafa "sahne dışı ses" çerçevesiyle gider. */
export function roleContents(speaker: TtsSpeaker, history: Message[]): Array<{ role: string; parts: Array<{ text: string }> }> {
  const visible = history.filter(m => isVisibleTo(speaker, m))
  const recent = visible.slice(-HISTORY_WINDOW)
  const contents = recent.map(m => {
    const isSelf = m.sender === speaker
    let text = m.text
    if (!isSelf && m.mode === 'soz') text = sozFrame(m.text)
    else if (!isSelf && m.mode === 'fisilti') text = fisiltiFrame(m.text)
    return { role: isSelf ? 'model' : 'user', parts: [{ text }] }
  })
  if (!contents.length || contents[0].role !== 'user') {
    contents.unshift({ role: 'user', parts: [{ text: '(karşılaşma başlar)' }] })
  }
  return contents
}

/** Pin-bellek: high-intensity dönüm noktaları pencereden bağımsız hatırlanır.
 *  Kişi-duyarlı: başkasına söylenmiş fısıltı asla sızmaz. */
export function pinMemoryBlock(speaker: TtsSpeaker, history: Message[]): string {
  const pins = history
    .filter(m => m.intensity === 'high')
    .filter(m => isPinnableFor(speaker, m))
    .slice(-6)
  if (!pins.length) return ''
  return `\n[ÖNEMLİ ANLAR — oturumun dönüm noktaları, unutma]\n` +
    pins.map(m => `- ${m.sender === 'lilith' ? 'Lilith' : m.sender === 'generic' ? 'Varlık' : 'Moderatör'}: ${m.text.slice(0, 140)}`).join('\n')
}

export async function generateText(
  speaker: TtsSpeaker,
  history: Message[],
  scenario?: ScenarioPrelude,
): Promise<Beat> {
  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY })

  let systemInstruction = SYSTEM_INSTRUCTIONS[speaker]
  if (scenario) {
    systemInstruction += scenarioBlock(scenario) + pinMemoryBlock(speaker, history) +
      (speaker === 'lilith' ? lilithScenarioBlock(scenario) : varlikScenarioBlock(scenario))
  } else {
    systemInstruction += pinMemoryBlock(speaker, history)
  }
  systemInstruction += stageStateBlock(history) + directorNotesBlock(history)

  const { result: response, model } = await withModelFallback(GEMINI_MODEL_CHAIN, m => ai.models.generateContent({
    model: m,
    contents: roleContents(speaker, history),
    config: {
      temperature: 0.85,
      topP: 0.95,
      systemInstruction,
      responseMimeType: 'application/json',
      responseSchema: BEAT_SCHEMA,
    },
  }))

  const raw = response.candidates?.[0]?.content?.parts?.map(p => p.text ?? '').join('') ?? ''
  // Cömert çözümleme: JSON bozuksa ham metni kurtar
  try {
    const parsed = JSON.parse(raw) as Partial<Beat>
    const text = stripPrefix(String(parsed.text ?? ''))
    if (!text) throw new Error('boş text')
    return {
      text,
      mood: String(parsed.mood ?? ''),
      intensity: (['low', 'mid', 'high'].includes(String(parsed.intensity))
        ? parsed.intensity : 'mid') as SentimentIntensity,
      model,
    }
  } catch {
    const text = stripPrefix(raw)
    if (!text) throw new Error('Boş yanıt alındı.')
    return { text, mood: '', intensity: 'mid', model }
  }
}
