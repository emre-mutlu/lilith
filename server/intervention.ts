// Araya-gir semantiği — müdahale türlerinin modele sunuluş biçimi.
// Tasarım: tasarim_notlari.md "araya-gir = menteşe" (interaktif plausibility).
// Tüm fonksiyonlar saf — vitest ile doğrulanır.
import type { InterventionMode, Speaker } from '../shared/types'

export type HistMsg = {
  sender: Speaker
  text: string
  mode?: InterventionMode
  target?: Exclude<Speaker, 'user'>
  intensity?: 'low' | 'mid' | 'high'
}

export function sozFrame(text: string): string {
  return `[Sahne dışından bir ses duyulur: "${text}"]`
}

export function fisiltiFrame(text: string): string {
  return `[Zihnine bir fısıltı doluyor: "${text}"]`
}

/** Karakterin diyalog görüş alanı: sahne/yön hiçbir zaman görünmez;
 *  fısıltı yalnız hedefinde görünür. */
export function isVisibleTo(speaker: Speaker, m: HistMsg): boolean {
  if (m.mode === 'sahne' || m.mode === 'yon') return false
  if (m.mode === 'fisilti' && m.target !== speaker) return false
  return true
}

/** Pin-bellek adayları: diğerinin fısıltısı asla sızmaz. */
export function isPinnableFor(speaker: Speaker, m: HistMsg): boolean {
  return !(m.mode === 'fisilti' && m.target !== speaker)
}

/** Kalıcı dünya durumu — son N not; karakterler eylemleriyle değiştirebilir. */
export function stageStateBlock(history: HistMsg[], keep = 5): string {
  const notes = history.filter(m => m.mode === 'sahne').slice(-keep)
  if (!notes.length) return ''
  return '\n[Sahne durumu — dünyanın güncel hali. Karakterler bu koşullarda yaşar; eylemleriyle doğal olarak değiştirebilirler]\n' +
    notes.map(m => `- ${m.text}`).join('\n')
}

/** Görünmez yönetmen notları — replik değil, performans yönetimi. */
export function directorNotesBlock(history: HistMsg[], keep = 4): string {
  const notes = history.filter(m => m.mode === 'yon').slice(-keep)
  if (!notes.length) return ''
  return '\n[Yönetmen notları — kimse bunları duymaz, bilmez; yalnızca senin performansını yönlendirir. Hedefine ulaştığını hissettiğinde kendiliğinden terk edebilirsin]\n' +
    notes.map(m => `- ${m.text}`).join('\n')
}
