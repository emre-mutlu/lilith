// Kazanan reçete: replikte dramatik duraksamalar (transcript'e DEĞİL sadece TTS'e uygulanır)
// Kalibrasyon: A7-agir-noktalama grid denemesi (Ağustos 2026 oturumu)
export function dramatizeForTts(text: string): string {
  const sentences = text.split(/(?<=[.!?…])\s+/)
  return sentences.map(s => {
    const words = s.split(/\s+/)
    if (words.length < 6) return s
    return [words[0] + '…', ...words.slice(1, -2), '…' + words.slice(-2).join(' ')].join(' ')
      .replace('……', '…')
  }).join(' ')
}

/** beat intensity → Chatterbox exaggeration kalibrasyonu */
export function intensityToExaggeration(i?: 'low' | 'mid' | 'high'): number {
  return i === 'high' ? 1.7 : i === 'low' ? 0.8 : 1.2
}
