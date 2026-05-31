# Lilith — Duality / Conversations

Turkish-language AI dialogue simulation. Two characters — Kraliçe Lilith and Varlık — hold an autonomous, looping conversation via Gemini. The user watches in real time, can pause, and can inject messages.

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18 + TypeScript + Tailwind CSS v4 |
| Build | Vite 5 (middleware mode in dev) |
| Backend | Express + TypeScript (`server/index.ts`) |
| AI | `@google/genai` — Gemini 3.1 Flash-Lite (text, via `GEMINI_MODEL`) · `msedge-tts` — Edge TTS (audio) |
| Audio | Web Audio API (PCM decode) → SpeechSynthesis fallback |

## First-time setup

```bash
cp .env.example .env       # add GEMINI_API_KEY
npm install
npm run dev                # http://localhost:3000
```

## Environment variables

| Variable | Required | Notes |
|----------|----------|-------|
| `GEMINI_API_KEY` | Yes | Gemini text generation |
| `GEMINI_MODEL` | No | Text model. Default `gemini-3.1-flash-lite`; alt `gemini-2.5-flash` |
| `PORT` | No | Default 3000 |

## Project structure

```
server/
  index.ts          Express server + Gemini API routes
src/
  App.tsx           Conversation loop, audio playback, all state
  types.ts          Shared TypeScript types
  lib/
    sentiment.ts    Per-message scoring + global sentiment (no API)
  components/
    Header.tsx      Sentiment HUD, status dots
    CenterOverlay.tsx  Active-word card (desktop only)
    ControlBar.tsx  Start/pause/reset, mute, intervention input
    panels/
      LilithPanel.tsx   Left character panel (gold)
      VarlikPanel.tsx   Right character panel (white/dim)
    footer/
      SimParameters.tsx  Stats + voice engine selector + sliders
      TranscriptStream.tsx  Scrollable message log with sentiment pills
```

## API routes

**POST /api/generate**
```json
{ "speaker": "lilith" | "generic", "history": [...], "ttsEngine": "edge" | "browser" }
→ { "text": "...", "audio": "<base64 MP3>", "mimeType": "audio/mpeg" }
```

**POST /api/tts** — standalone TTS endpoint, same response shape.

## Characters

| Character | System prompt role | TTS voice | Color |
|-----------|-------------------|-----------|-------|
| Kraliçe Lilith | Zarif, manipülatif kraliçe | `tr-TR-EmelNeural` | #D4AF37 (gold) |
| Varlık | Tabula rasa, şekillenmemiş | `tr-TR-AhmetNeural` | #D0D0D0 (white) |

## Audio playback

- **Edge-TTS mode**: server (`msedge-tts`) returns base64 MP3 (`audio/mpeg`) → client decodes via Web Audio API (`decodeAudioData`). Raw 16-bit LE PCM @ 24 kHz also handled as fallback.
- **Browser mode**: SpeechSynthesis with character-specific prosody (Lilith: slow+low, Varlık: faster+higher) and emotional modulation based on sentiment score.
- Voice engine toggled in footer "Simulation Parameters" panel.

## Sentiment system

Every message is scored client-side (no API call) by scanning for keyword sets defined in `src/lib/sentiment.ts`. Three tiers per character:

- Lilith high → `👑 Tepe Noktası` (gold pulse)
- Varlık high → `◎ İz Beliriyor` (white pulse)
- User high → `🛡️ Kritik Müdahale` (purple pulse)

Global sentiment drives the page's ambient glow color (box-shadow + radial gradient + border tint).

## Scripts

```bash
npm run dev       # Express + Vite dev server (hot reload)
npm run build     # Vite production build → dist/client/
npm run start     # Production Express server (serves dist/client/)
npm run typecheck # tsc --noEmit
```
