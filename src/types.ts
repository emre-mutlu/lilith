export type Speaker = 'lilith' | 'generic' | 'user'
export type SessionState = 'inactive' | 'running' | 'paused'
export type SpeakerState = 'idle' | 'generating' | 'speaking'
export type VoiceEngine = 'edge' | 'browser' | 'gemini' | 'azure' | 'local'
export type SentimentIntensity = 'high' | 'mid' | 'low'

export interface Message {
  id: string
  sender: Speaker
  text: string
  timestamp: string
  mood?: string
  intensity?: 'low' | 'mid' | 'high'
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
  error?: string
}
