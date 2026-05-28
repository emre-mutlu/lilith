export type Speaker = 'lilith' | 'generic' | 'user'
export type SessionState = 'inactive' | 'running' | 'paused'
export type SpeakerState = 'idle' | 'generating' | 'speaking'
export type VoiceEngine = 'edge' | 'browser'
export type SentimentIntensity = 'high' | 'mid' | 'low'

export interface Message {
  id: string
  sender: Speaker
  text: string
  timestamp: string
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
  audio?: string | null
  mimeType?: string | null
  error?: string
}
