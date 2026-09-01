// Fish Audio S2.1 metin hazırlığı.
// 09-01 (Emre, A/B dinleme kararı): yapay duraksama katmanı KALDIRILDI.
// Önceden dramatizeForTts + "…"→"[break]" uygulanıyordu; break'ler kelime
// sayısına göre (içerikten bağımsız) hep aynı iki yere düşüyor, her repliği
// aynı ritim kalıbına sokuyor ve konuşmayı ~%11 yavaşlatıyordu — üstelik
// "[break]mi" gibi sözcüğe yapışık üretiliyorlardı. S2.1 prozodiyi zaten
// noktalamadan üretir. Chatterbox yolunda dramatizeForTts duruyor (ayrı motor).
export type Intensity = 'low' | 'mid' | 'high'

/** Doküman-geçerli tonlama etiketleri (docs.fish.audio → Tone/Delivery). */
export function fishEmotionTag(intensity?: Intensity): string {
  if (intensity === 'high') return '[emphasis]'
  if (intensity === 'low') return '[soft tone]'
  return ''
}

export function prepareFishText(text: string, intensity?: Intensity): string {
  const body = text.replace(/\s{2,}/g, ' ').trim()
  const tag = fishEmotionTag(intensity)
  return tag ? `${tag} ${body}` : body
}
