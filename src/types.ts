export type Speaker = 'lilith' | 'generic' | 'user'
export type SessionState = 'inactive' | 'running' | 'paused'
export type SpeakerState = 'idle' | 'generating' | 'speaking'
export type VoiceEngine = 'edge' | 'browser' | 'gemini' | 'azure' | 'local' | 'fish'

/** Araya-gir türü — her biri karakterler tarafından farklı algılanır:
 *  soz    → sahne dışından bir ses (duyarlar, serbest dokuma ile tepki verirler)
 *  sahne  → dünya olayı/durumu (kimse dışarıdan geldiğini bilmez, kalıcıdır)
 *  fisilti→ yalnız hedefin zihnine dolan telkin (diğeri asla bilmez)
 *  yon    → görünmez yönetmen notu (replik değil, sistem talimatına işler) */
export type InterventionMode = 'soz' | 'sahne' | 'fisilti' | 'yon'
export type SentimentIntensity = 'high' | 'mid' | 'low'

export interface Message {
  id: string
  sender: Speaker
  text: string
  timestamp: string
  mood?: string
  intensity?: SentimentIntensity
  /** Yalnız sender='user' için — eski mesajlarda yoktur (düz söz gibi davranır) */
  mode?: InterventionMode
  /** Yalnız mode='fisilti' için — telkinin hedefi */
  target?: Exclude<Speaker, 'user'>
}

/** Yönetmen prelüdü — her yeni oturumda bir kez üretilir, istemcide yaşar, UI'da gösterilmez. */
export interface ScenarioPrelude {
  lilith_egilimi: string
  lilith_gizlisi: string
  oturum_yayi: string
  gerilim_ozu: string
  tur_doku: string
  tempo: string
  duygu_rengi: string
  varlik_egrisi: string
  acilis_sahnesi: string
  varlik_baslangici: string
}

export interface MessageScore {
  score: number
  label: string
  intensity: SentimentIntensity
  color: string
}

export interface GlobalSentiment {
  label: string
  color: string
  percent: number
  dominant: 'lilith' | 'generic' | 'user' | 'none'
}

export interface GenerateResponse {
  text: string
  mood?: string
  intensity?: 'low' | 'mid' | 'high'
  audio?: string | null
  mimeType?: string | null
  /** Sesfi gerçekten hangi katman verdi: fish/local/azure/edge/gemini/browser/none */
  engine?: 'fish' | 'local' | 'azure' | 'edge' | 'gemini' | 'browser' | 'none'
  /** Toplam tur süresi (metin+ses), ms */
  latencyMs?: number
  error?: string
}
