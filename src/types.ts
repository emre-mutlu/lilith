export interface Message {
  id: string;
  sender: 'lilith' | 'generic' | 'user';
  text: string;
  timestamp: number;
}

export type SpeakerKey = 'lilith' | 'generic';

export interface SpeakerProfile {
  id: SpeakerKey;
  name: string;
  title: string;
  roleDescription: string;
  avatar: string;
  accentColor: string; // Tailwind color class or hex
  glowColor: string;
  neutralVoice: boolean;
}

export type SessionStatus = 'inactive' | 'running' | 'paused';

export interface VoiceConfig {
  voiceName: string;
  rate: number;
  pitch: number;
}
