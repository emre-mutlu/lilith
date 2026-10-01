# Lilith — Duality

Türkçe otonom AI diyalog simülasyonu. İki karakter — **Kraliçe Lilith** (altın, manipülatif, her oturumda gizli bir eğilimle doğar) ve **Varlık** (tabula rasa, konuşma belleğiyle şekillenir) — Gemini ile sonsuz döngüde konuşur. Kullanıcı gerçek zamanlı izler, duraklatabilir, araya girebilir.

## Hızlı başlangıç

```bash
cp .env.example .env   # GEMINI_API_KEY ekle
npm install
npm run dev            # http://localhost:3000
```

## Mimari

```
React 18 + TS + Tailwind v4  ←→  Express 5 + TS (server/)
        │                            ├─ /api/director → gizli senaryo prelüdü
        │ Web Audio / SpeechSynthesis├─ /api/generate → beat {text,mood,intensity} + TTS merdiveni
        └────────────────────────────┴─ /api/tts      → tekil TTS
                                     └─ Chatterbox servisi (ops., port 8777)
```

## Ses merdiveni

`fish → local (yalnız zaten ayaktaysa) → tarayıcı` — seçilen motor düşerse sıradaki katman devralır; yanıtın `engine` alanı sesi kimin verdiğini söyler. Chatterbox yedek olarak **başlatılmaz**: yalnız kullanıcı "yerel" motoru seçince ısınır, Fish düştüğünde ancak zaten çalışıyorsa devralır (`server/ttsLadder.ts`, testli).

| Katman | Not |
|---|---|
| **fish** | Fish Audio bulutu (`s2.1-pro-free`, ücretsiz) — kütüphane sesleri `.env`'deki model ID'lerinden |
| **local** | Chatterbox (MPS, ~1.2× gerçek-zamanlı). Referans klip = sabit ses kimliği (`assets/voices/*.wav`). `CHATTERBOX_PYTHON` ayarlıysa Node servisi ilk kullanımda kendisi başlatır (açılışta ısınmaz) |
| **gemini** | Bedava kota 10 istek/gün — özel anlar için parkta; UI menüsünde yok (yalnız API) |
| **browser** | SpeechSynthesis, karakter prosodisi + duygu modülasyonu |

Beat şemasından gelen `intensity`, Chatterbox abartısını sürer: low→0.8 · mid→1.2 · high→1.7.

## Senaryo sistemi (Faz 2)

Her yeni oturumda `/api/director` gizli bir prelüd üretir: Lilith'in 24 eğilimden biri, sakladığı bir sır, oturum yayı (kishōtenketsu, jo-ha-kyū…), tür dokusu, tempo, duygu rengi ve Varlık'ın gelişim eğrisi. Prelüd UI'da gösterilmez — yalnızca repliklerin dokusuna sızar.

- **Rol-dürüst içerik:** model kendi önceki repliklerini `model` rolünde görür (yönerge kirliliği yok).
- **Pin-bellek:** yüksek yoğunluklu anlar ≤6 alıntıyla pencere dışından taşınır.
- **Organik yaylar:** zaman çizelgesi yok; dönüm noktası zamanlamasını modelin yargısı belirler.
- Her tur `sessions/<id>.jsonl`'e metin olarak loglanır (gitignore'lu).

## Telemetri

Footer "Simulation Parameters" paneli sahte sayı göstermez: son tur / ortalama tur süresi ve sesfi veren katman `/api/generate` yanıtındaki `latencyMs` + `engine` alanlarından gelir. Panel ifşası davranışla çalışır: Lilith konuştukça altınlaşır, Varlık'ın bellek penceresi (~20 tur) doldukça beliri hale gelir.

## Ortam değişkenleri

| Değişken | Zorunlu | Not |
|---|---|---|
| `GEMINI_API_KEY` | ✅ | Metin üretimi |
| `GEMINI_MODEL` | — | Pinned: `gemini-3.5-flash-lite`. Alias kullanma |
| `GEMINI_FALLBACK_MODELS` | — | Virgüllü yedek zincir, yalnız 503'te devreye girer. Default `gemini-3.6-flash,gemini-2.5-flash`; kapatmak `off` |
| `GEMINI_HISTORY` | — | Geçmiş penceresi (default 20) |
| `FISH_MODEL_LILITH` / `FISH_MODEL_GENERIC` | — | Fish Audio kütüphane ses ID'leri (default motor) |
| `FISH_LATENCY` | — | `normal` (default, kararlı) / `balanced` (interaktif, ~%40 hızlı) |
| `CHATTERBOX_PYTHON` | — | Chatterbox venv python yolu → port 8777 servisi |
| `LOCAL_TTS_EXAGGERATION` | — | Default 1.2 (beat intensity override eder) |
| `LOCAL_TTS_DRAMATIZE` | — | `1` (default): Chatterbox metnine dramatik `…` duraksamaları |
| `LOCAL_TTS_SPEAKERS` | — | Yerel motorun konuştuğu karakterler (default `lilith,generic`) |
| `PORT` | — | Default 3000 |

## Komutlar

```bash
npm run dev        # Express + Vite (hot reload)
npm run build      # dist/client/
npm start          # prod sunucu
npm test           # vitest (director/diyalog/retry/merdiven/sentiment/pacing/ambient)
npm run typecheck  # tsc --noEmit
npm run sentiment:compare  # sentiment eşik kalibrasyonu (sessions/*.jsonl)
```
