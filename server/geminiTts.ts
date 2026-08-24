// ── Gemini TTS (gemini-3.1-flash-tts-preview) ────────────────────────────────
// Ses seçimi dinleme setiyle yapılacak; aşağıdaki adaylar spec Faz 1 listesi.
// Stil prompt'ları "AUDIO PROFILE" formatında — ses × yönetmen ikilisi esas.
import { GoogleGenAI } from '@google/genai'
import type { TtsSpeaker } from '../shared/types'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? ''

interface GeminiVoiceCandidate {
  voice: string
  style: string
}

// Casting geçmişi (08-23 dinleme seti) — birincil seçimler GEMINI_VOICES'ta.
const GEMINI_VOICE_CANDIDATES: Record<TtsSpeaker, GeminiVoiceCandidate[]> = {
  lilith: [
    { voice: 'Kore',      style: 'AUDIO PROFILE: Kraliçe Lilith. Buz gibi, aristokrat, ölçülü. Her cümle bir lütufmuş gibi verilir. Tempo yavaş, ton soğuk ama kırılgan değil — kumanda edici sakinlik.' },
    { voice: 'Gacrux',    style: 'AUDIO PROFILE: Kraliçe Lilith. Olgun matriark ağırlığı; yılların verdiği vakar. Derin, ağırbaşlı, hafif alaycı bir bilgelik. Acele etmeyen bir tını.' },
    { voice: 'Sulafat',   style: 'AUDIO PROFILE: Kraliçe Lilith. Sıcak, cezbedici yakınlık; sesi bir davet gibi kullanır. Yumuşak ama altında çelik var — samimiyeti taktik.' },
    { voice: 'Achernar',  style: 'AUDIO PROFILE: Kraliçe Lilith. Eterik, fısıltıya yakın, ruhani. Neredeyse duyulmayan bir güçle konuşur; boşluklar cümleler kadar anlamlı.' },
  ],
  generic: [
    { voice: 'Iapetus',   style: 'AUDIO PROFILE: Varlık. Yeni doğmuş bir zihnin netliği: sade, nötr, hafif meraklı. Abartısız genç erkek tonu; duygular henüz isimsiz.' },
    { voice: 'Schedar',   style: 'AUDIO PROFILE: Varlık. Düzlem gibi düz, nötr. Ne sıcak ne soğuk — şekillenmemiş bir boşluğun sessiz dengesi.' },
    { voice: 'Achird',    style: 'AUDIO PROFILE: Varlık. Meraklı, zararsız sıcaklık; ilk karşılaşmanın dostane heyecanı. Samimi ama naif.' },
  ],
}

// Seçilen birincil sesler (dinleme sonrası güncellenir);
// ttsEngine='gemini' gelirse bu config kullanılır.
const GEMINI_VOICES: Record<TtsSpeaker, GeminiVoiceCandidate> = {
  lilith: GEMINI_VOICE_CANDIDATES.lilith[0],
  generic: GEMINI_VOICE_CANDIDATES.generic[0],
}

export async function generateGeminiTts(
  text: string,
  speaker: TtsSpeaker,
  override?: { voice?: string; style?: string },
): Promise<{ audio: string; mimeType: string } | null> {
  try {
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY })
    const cfg = override?.voice || override?.style
      ? { voice: GEMINI_VOICES[speaker].voice, style: GEMINI_VOICES[speaker].style, ...override }
      : GEMINI_VOICES[speaker]
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-tts-preview',
      // Not: bu model systemInstruction kabul etmiyor ("Developer instruction is not
      // enabled") — yönetmen notu içeriğin başına ön-ek olarak girer.
      contents: `${cfg.style}\n\n${text}`,
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: cfg.voice } } },
      },
    })
    const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData)
    if (!part?.inlineData?.data) return null
    return { audio: part.inlineData.data, mimeType: part.inlineData.mimeType ?? 'audio/l16; rate=24000' }
  } catch (err) {
    console.error('Gemini TTS error:', err instanceof Error ? err.message : err)
    return null
  }
}
