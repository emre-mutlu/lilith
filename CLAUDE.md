# Lilith — Duality / Conversations

Turkish-language AI dialogue simulation. Two characters — Kraliçe Lilith and Varlık — hold an autonomous, looping conversation via Gemini. The user watches in real time, can pause, and can inject messages.

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18 + TypeScript + Tailwind CSS v4 |
| Build | Vite 5 (middleware mode in dev) |
| Backend | Express + TypeScript (`server/index.ts`) |
| AI | `@google/genai` — Gemini 3.5 Flash-Lite (text, **pinned**) · TTS: **Fish Audio** default (`s2.1-pro-free`, bulut) → Chatterbox yerel fallback → Edge → tarayıcı · Azure PARK'ta (08-24) · Gemini TTS parkta (bedava kota 10 istek/gün) |
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
| `GEMINI_MODEL` | No | Text model. Default `gemini-3.5-flash-lite` (pinned). Not: 2.5-flash çok yavaş (5.1s); 3.7-flash yük altında (503) |
| `GEMINI_HISTORY` | No | Geçmiş penceresi, mesaj adedi. Default 20 |
| `AZURE_SPEECH_KEY` | No | ⚠ **PARK (08-24, Emre kararı: Azure kullanılmayacak).** Kod duruyor; key ayarlı değilse katman zaten atlanır |
| `AZURE_SPEECH_REGION` | No | Default `westeurope` (park halinde) |
| `AZURE_VOICE_LILITH` / `AZURE_VOICE_GENERIC` | No | Multilingual ses override. Default: Ava / Andrew (park halinde) |
| `FISH_MODEL_LILITH` / `FISH_MODEL_GENERIC` | No | Fish Audio kütüphane ses ID'leri (`.env` — gizli değil). Kozmetik değişim buradan |
| `FISH_LATENCY` | No | Fish üretim modu: `normal` (default, kararlı) / `balanced` (interaktif, ~%40 hızlı) |
| `CHATTERBOX_PYTHON` | No | Chatterbox venv python yolu → yerel TTS servisi (port 8777) **server açılışında erken ısınır**, kapanışta çocuğu öldürülür. Ayarsızsa katman atlanır |
| `LOCAL_TTS_EXAGGERATION` | No | Chatterbox duygu şiddeti default'u. Default 1.2 — beat intensity varsa override edilir (low 0.8 / mid 1.2 / high 1.7) |
| `LOCAL_TTS_DRAMATIZE` | No | TTS metnine dramatik `…` duraksamaları (transcript'e dokunmaz). Default 1 |
| `LOCAL_TTS_SPEAKERS` | No | Yerel motorun konuştuğu karakterler (iç kimlikler). Default `lilith,generic` (referanslar: assets/voices/{lilith,varlik}-ref.wav) |
| `PORT` | No | Default 3000 |

## Project structure

```
server/
  index.ts          Express server + Gemini API routes (/api/director, /api/generate, /api/tts)
  director.ts       Senaryo sistemi: 24 eğilim + yay/tür/tempo eksenleri, prelüd şeması + doğrulama
  ttsText.ts        dramatizeForTts (… duraksamaları) + intensityToExaggeration kalibrasyonu
  chatterbox_service.py  Yerel TTS servisi (port 8777, resident — spawn yolu güvenilmez)
  faz2.test.ts      vitest: 8 test (prelüd doğrulama, dramatize, kalibrasyon, senaryo bloğu)
src/
  App.tsx           Conversation loop, audio playback, senaryo akışı, telemetri state
  types.ts          Shared TypeScript types (Message.mood/intensity, ScenarioPrelude)
  lib/
    sentiment.ts    Per-message scoring + global sentiment (no API)
  components/
    Header.tsx      Sentiment HUD, status dots
    CenterOverlay.tsx  Active-word card (desktop only)
    ControlBar.tsx  Start/pause/reset, mute, intervention input
    panels/
      LilithPanel.tsx   Left panel — ifşa: intensity-ağırlıklı olay skoru (sayaç değil)
      VarlikPanel.tsx   Right panel — ifşa: bellek doluluk + iz skoru harmanı
    footer/
      SimParameters.tsx  GERÇEK telemetri (latencyMs/engine) + motor seçici + tarayıcı-TTS trimleri
      TranscriptStream.tsx  Scrollable message log with sentiment pills
```

## API routes

**POST /api/director** → `{ sessionId, scenario }` — gizli prelüd (structured output). İstemci saklar, her /api/generate'e ekler; UI'da gösterilmez.

**POST /api/generate**
```json
{ "speaker": "lilith" | "generic", "history": [...], "ttsEngine": "local"|"azure"|"edge"|"gemini"|"browser",
  "scenario"?, "sessionId"? }
→ { "text", "mood", "intensity": "low"|"mid"|"high", "audio"?, "mimeType"?,
    "engine": "local"|"azure"|"edge"|"gemini"|"browser"|"none", "latencyMs" }
```
Beat şeması: her replik {text, mood, intensity} — intensity Chatterbox abartısını sürer. High-intensity anlar pin-belleğe (≤6) işlenir. Her tur `sessions/<sessionId>.jsonl`'e loglanır.

**POST /api/tts** — standalone TTS endpoint (engine parametreli).

## Characters

| Character | System prompt role | TTS voice | Color |
|-----------|-------------------|-----------|-------|
| Kraliçe Lilith | Zarif, manipülatif kraliçe | Chatterbox (`lilith-ref.wav`, FR tınısı, cfg 0.3) · Edge fb: `tr-TR-EmelNeural` | #D4AF37 (gold) |
| Varlık | Tabula rasa, şekillenmemiş | Chatterbox (`varlik-ref.wav`, IT tınısı, cfg 0.1) · Edge fb: `tr-TR-AhmetNeural` | #D0D0D0 (white) |

Ses kimliği v2 (08-23 casting): ref'ler Resemble resmi demo kliplerinden (FR/IT), `LOCAL_TTS_PROFILE` kişi-bazlı ref+cfg taşır. İlk nesil Achernar/Iapetus Gemini-damıtmaları `/tmp/lilith-eser`'de arşivli — "sentetik damıtma" ile temiz kaynağa geçiş seçeneği açık.

## Audio playback

- **Edge-TTS mode**: server (`msedge-tts`) returns base64 MP3 (`audio/mpeg`) → client decodes via Web Audio API (`decodeAudioData`). Raw 16-bit LE PCM @ 24 kHz also handled as fallback.
- **Browser mode**: SpeechSynthesis with character-specific prosody (Lilith: slow+low, Varlık: faster+higher) and emotional modulation based on sentiment score.
- **Voice engine default `fish`** (Fish Audio bulutu, s2.1-pro-free; ~1–3s) — merdiven otomatik düşer: fish → local → edge (Azure parkta, atlanır). Server açılışında Chatterbox erken ısınır; footer "Simulation Parameters" panelinde `● ısınıyor…/hazır` durumu canlı telemetriyle (`/api/tts/status`). Fish intensity→temperature eşlemesi: low 0.65 / mid 0.75 / high 0.9. Ses seçimi kütüphaneden: L4 LEILA (Lilith) · V3 mazlum kiper (Varlık) — geçici, Voice Design ile yükseltilecek
- **Chatterbox reçete:** referans klip = kimlik (`assets/voices/lilith-ref.wav`), exaggeration = duygu şiddeti, metne `…` duraksamaları = dramatik tempo (sadece TTS'e uygulanır). Servis: `server/chatterbox_service.py` (port 8777), Node gerektiğinde kendisi başlatır.

## Sentiment system

Every message is scored client-side (no API call) by scanning for keyword sets defined in `src/lib/sentiment.ts`. Three tiers per character:

- Lilith high → `👑 Tepe Noktası` (gold pulse)
- Varlık high → `◎ İz Beliriyor` (white pulse)
- User high → `🛡️ Kritik Müdahale` (purple pulse)

Global sentiment drives the page's ambient glow color (box-shadow + radial gradient + border tint).

## Scripts

```bash
operator secret run lilith -- npm run dev   # FISH_AUDIO_KEY kasadan gelir (GEMINI .env'de)
npm run build     # Vite production build → dist/client/
npm run start     # Production Express server (serves dist/client/)
npm test          # vitest run (8 test)
npm run typecheck # tsc --noEmit
```

## Senaryo sistemi (Faz 2, kilitli spec)

- Her Başlat/Sıfırla'da `/api/director` yeni gizli prelüd üretir (istemcide yaşar, UI'da asla gösterilmez).
- Prelüd: eğilim(24) + gizli + yay(kishōtenketsu/jo-ha-kyū/…) + gerilim özü + doku + tempo + duygu rengi + Varlık eğrisi.
- Organik yaylar: zaman çizelgesi YOK — dönüm noktası zamanlaması modelin yargısına göre; tutarlılık maddesi prompt'ta.
- Rol-dürüst contents: karakter kendi repliklerini `model` rolünde görür. Pin-bellek: high-intensity alıntılar ≤6, pencere dışından beslenir.

## Faz 4 · Eser katmanı (prova edildi, ilk entegrasyon canlı)

- **Prosedürel ambient** (`src/lib/ambient.ts`): Web Audio drone+hava; sentiment'ten mood sürer (brightness=percent, tension=baskın konuşan+tırmanış eğimi+high-intensity dalgası). Gerilimle filtre süpürmesi genişler, kalp-atışı nabzı hızlanır. Sol alt "♪ AMBİYANS" düğmesi. **Safari dersleri kodda:** context'i kullanıcı hareketinde yarat, `await resume()` + 120ms'de ikinci deneme, `visibilitychange`'de suspend/resume. Laptop hoparlör için A2 temel + E3 beşli katmanı şart (55Hz duyulmaz).
- **Sahne kartı** (`src/components/SceneCard.tsx`): Pollinations (key'siz) ile senaryo eksenlerinden prompt kurup görsel üretir; footer sol hücresine yerleşik (kart + ambiyans rayı, SimParameters yanında), ↻ yeni seed. İnce tasarım sonraya — Emre kararı açık.
- Gemini görsel (`gemini-3.1-flash-image`, `nano-banana-pro-preview`) + Lyria: free kota dar (429) → parkta. Pollinations latency 2-35sn oynak.
