# Lilith — Duality / Conversations

Turkish-language AI dialogue simulation. Two characters — Kraliçe Lilith and Varlık — hold an autonomous, looping conversation via Gemini. The user watches in real time, can pause, and can inject messages.

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18 + TypeScript + Tailwind CSS v4 |
| Build | Vite 5 (middleware mode in dev) |
| Backend | Express + TypeScript (`server/index.ts`) |
| AI | `@google/genai` — Gemini 3.5 Flash-Lite (text, **pinned**) · TTS: **Fish Audio** default (`s2.1-pro-free`, bulut) → Chatterbox yerel fallback (bağlıysa) → tarayıcı · Azure/Edge/Gemini-TTS PARK'ta veya kaldırıldı (08-24) |
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
| `CHATTERBOX_PYTHON` | No | Chatterbox venv python yolu → yerel TTS servisi (port 8777). **Açılışta ısınmaz** — yalnız kullanıcı yerel motoru seçince ilk istekte başlar; kapanışta çocuğu öldürülür. Ayarsızsa katman atlanır |
| `LOCAL_TTS_EXAGGERATION` | No | Chatterbox duygu şiddeti default'u. Default 1.2 — beat intensity varsa override edilir (low 0.8 / mid 1.2 / high 1.7) |
| `LOCAL_TTS_DRAMATIZE` | No | TTS metnine dramatik `…` duraksamaları (transcript'e dokunmaz). Default 1 |
| `LOCAL_TTS_SPEAKERS` | No | Yerel motorun konuştuğu karakterler (iç kimlikler). Default `lilith,generic` (referanslar: assets/voices/{lilith,varlik}-ref.wav) |
| `PORT` | No | Default 3000 |

## Project structure

```
shared/
  types.ts          Tek tip kaynağı: Message, ScenarioPrelude, TtsSpeaker, VoiceEngine…
server/
  index.ts          Express routes (/api/director, /api/generate, /api/tts, /api/tts/status) + TTS merdiveni
  dialogue.ts       Diyalog çekirdeği: system instructions, roleContents, pin-bellek, generateText
  director.ts       Senaryo sistemi: 24 eğilim + yay/tür/tempo eksenleri, prelüd şeması + doğrulama
  fishTts.ts        Fish Audio bulut katmanı (s2.1-pro-free)
  geminiTts.ts      Gemini TTS katmanı (parkta, kota düşük) + casting aday listesi
  azureTts.ts       Azure Speech katmanı (PARK — key ayarsızsa atlanır)
  localTts.ts       Chatterbox istemcisi: sağlık-cache, spawn/ısınma/temiz kapanış
  fishText.ts       prepareFishText (duygu etiketleri + [break])
  ttsText.ts        dramatizeForTts (… duraksamaları) + intensityToExaggeration kalibrasyonu
  chatterbox_service.py  Yerel TTS servisi (port 8777, resident — spawn yolu güvenilmez)
  faz2.test.ts · intervention.test.ts · dialogue.test.ts   vitest: 30 test
src/
  App.tsx           Conversation loop, audio playback, senaryo akışı, telemetri state
  lib/
    sentiment.ts    Per-message scoring + global sentiment (no API)
    browserTts.ts   Tarayıcı-TTS yardımcıları: ses seçimi, prosodi, PCM decoder
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
{ "speaker": "lilith" | "generic", "history": [...], "ttsEngine": "fish"|"local"|"gemini"|"browser",
  "scenario"?, "sessionId"? }
→ { "text", "mood", "intensity": "low"|"mid"|"high", "audio"?, "mimeType"?,
    "engine": "fish"|"local"|"gemini"|"browser"|"none", "latencyMs" }
```
Beat şeması: her replik {text, mood, intensity} — intensity Chatterbox abartısını sürer. High-intensity anlar pin-belleğe (≤6) işlenir. Her tur `sessions/<sessionId>.jsonl`'e loglanır.

**POST /api/tts** — standalone TTS endpoint (engine parametreli).

## Characters

| Character | System prompt role | TTS voice | Color |
|-----------|-------------------|-----------|-------|
| Kraliçe Lilith | Zarif, manipülatif kraliçe | Fish: L4 LEILA (geçici) · Chatterbox bağlıysa `lilith-ref.wav` | #D4AF37 (gold) |
| Varlık | Tabula rasa, şekillenmemiş | Fish: V3 mazlum kiper (geçici) · Chatterbox bağlıysa `varlik-ref.wav` | #D0D0D0 (white) |

Ses kimliği v2 (08-23 casting): ref'ler Resemble resmi demo kliplerinden (FR/IT), `LOCAL_TTS_PROFILE` kişi-bazlı ref+cfg taşır. İlk nesil Achernar/Iapetus Gemini-damıtmaları + casting kaynakları `~/Documents/Claude/arsiv/lilith-eser`'de.

## Audio playback

- **Fish mode (default)**: server returns base64 WAV (`audio/wav`, 44.1kHz) → client decodes via Web Audio API (`decodeAudioData`). Raw 16-bit LE PCM @ 24 kHz also handled as fallback.
- **Browser mode**: SpeechSynthesis with character-specific prosody (Lilith: slow+low, Varlık: faster+higher) and emotional modulation based on sentiment score.
- **Voice engine default `fish`** (Fish Audio bulutu, s2.1-pro-free; ~1–3s) — merdiven otomatik düşer: fish → local (bağlıysa) → tarayıcı TTS. Chatterbox açılışta ısınmaz — yalnız seçilirse ilk istekte spawn edilir; footer "Simulation Parameters" panelinde `● ısınıyor…/hazır` durumu canlı telemetriyle (`/api/tts/status`). Fish intensity→temperature eşlemesi: low 0.65 / mid 0.75 / high 0.9. Ses seçimi kütüphaneden: L4 LEILA (Lilith) · V3 mazlum kiper (Varlık) — geçici, Voice Design ile yükseltilecek
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
npm test          # vitest run (30 test)
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
