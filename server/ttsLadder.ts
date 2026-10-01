// ── TTS merdiveni: seçili motor → yedek katman → none (istemci tarayıcıya düşer) ──
// Katmanlar dışarıdan verilir (index.ts gerçek motorları bağlar, test sahtelerini);
// böylece düşme yolu ağsız test edilir. Kural:
//   fish   → local (yalnız zaten ayaktaysa) → none
//   gemini → local (yalnız zaten ayaktaysa) → none
//   local  → local (gerekirse başlatır)     → none
// (Azure katmanı 10-01'de kaldırıldı — Emre kararı, ücretsiz-katman ilkesi.)
// Chatterbox'ı yalnız kullanıcı "yerel" seçince ısıt (Emre kararı 08-25):
// yedek olarak çağrıldığında spawn=false gider, kapalıysa beklemeden atlanır.

export type LadderEngine = 'fish' | 'local' | 'gemini'
export type ServedBy = LadderEngine | 'none'
export type TtsAudio = { audio: string; mimeType: string }

export interface TtsLayers {
  fish: () => Promise<TtsAudio | null>
  gemini: () => Promise<TtsAudio | null>
  local: (opts: { spawn: boolean }) => Promise<TtsAudio | null>
}

export async function runTtsLadder(
  engine: LadderEngine,
  layers: TtsLayers,
): Promise<{ result: TtsAudio | null; servedBy: ServedBy }> {
  if (engine === 'fish' || engine === 'gemini') {
    const primary = await layers[engine]()
    if (primary) return { result: primary, servedBy: engine }
    const local = await layers.local({ spawn: false })
    if (local) return { result: local, servedBy: 'local' }
    console.warn(`${engine === 'fish' ? 'Fish' : 'Gemini'} TTS düştü, Chatterbox ayakta değil — istemci tarayıcı TTS'e düşecek`)
    return { result: null, servedBy: 'none' }
  }
  if (engine === 'local') {
    const local = await layers.local({ spawn: true })
    if (!local) console.warn('Local TTS düştü — istemci tarayıcı TTS\'e düşecek')
    return { result: local, servedBy: local ? 'local' : 'none' }
  }
  return { result: null, servedBy: 'none' } // bilinmeyen motor: istemci tarayıcıya düşer
}
