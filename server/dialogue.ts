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
export const GEMINI_MODEL = process.env.GEMINI_MODEL ?? 'gemini-3.5-flash-lite'
// Geçmiş penceresi — kayan pencere boyutu (mesaj adedi). Faz 2'de 12/20/30 A/B
// ölçümü yapılacak; varsayılan 20 (eski sabit 12 prototipten kalma, hiç ölçülmemişti).
const HISTORY_WINDOW = parseInt(process.env.GEMINI_HISTORY ?? '20', 10)

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

function isRateLimit(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  return msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')
}

export async function withRetry<T>(fn: () => Promise<T>, retries = 2, delayMs = 35000): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    if (isRateLimit(err) && retries > 0) {
      console.warn(`Rate limit — ${delayMs / 1000}s sonra tekrar denenecek.`)
      await new Promise(r => setTimeout(r, delayMs))
      return withRetry(fn, retries - 1, delayMs)
    }
    throw err
  }
}

export interface Beat {
  text: string
  mood: string
  intensity: SentimentIntensity
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

  const response = await withRetry(() => ai.models.generateContent({
    model: GEMINI_MODEL,
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
    }
  } catch {
    const text = stripPrefix(raw)
    if (!text) throw new Error('Boş yanıt alındı.')
    return { text, mood: '', intensity: 'mid' }
  }
}
