# Lilith — Duality / Conversations

Turkish-language AI dialogue simulation. Two characters — Kraliçe Lilith and Varlık — hold an autonomous, looping conversation via Gemini. The user watches in real time, can pause, and can inject messages.

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18 + TypeScript + Tailwind CSS v4 |
| Build | Vite 5 (middleware mode in dev) |
| Backend | Express + TypeScript (`server/index.ts`) |
| AI | `@google/genai` — Gemini 2.5 Flash (text) + Preview TTS (audio) |
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
| `GEMINI_API_KEY` | Yes | Gemini text + TTS calls |
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
{ "speaker": "lilith" | "generic", "history": [...], "skipTts": false }
→ { "text": "...", "audio": "<base64 PCM>", "mimeType": "audio/pcm" }
```

**POST /api/tts** — standalone TTS endpoint, same response shape.

## Characters

| Character | System prompt role | TTS voice | Color |
|-----------|-------------------|-----------|-------|
| Kraliçe Lilith | Zarif, manipülatif kraliçe | Kore | #D4AF37 (gold) |
| Varlık | Tabula rasa, şekillenmemiş | Charon | #D0D0D0 (white) |

## Audio playback

- **Gemini-TTS mode**: server returns base64 PCM → client decodes via Web Audio API at 24 kHz. Raw 16-bit LE PCM or WAV container both handled.
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
