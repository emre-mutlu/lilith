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
React 18 + TS + Tailwind v4  ←→  Express + TS (server/)
        │                            ├─ /api/director → gizli senaryo prelüdü
        │ Web Audio / SpeechSynthesis├─ /api/generate → beat {text,mood,intensity} + TTS merdiveni
        └────────────────────────────┴─ /api/tts      → tekil TTS
                                     └─ Chatterbox servisi (ops., port 8777)
```

## Ses merdiveni

`local → azure → edge → tarayıcı` — seçilen motor düşerse sıradaki katman devralır; yanıtın `engine` alanı sesi kimin verdiğini söyler.

| Katman | Not |
|---|---|
| **local** | Chatterbox (MPS, ~1.2× gerçek-zamanlı). Referans klip = Lilith'in sabit ses kimliği (`assets/voices/lilith-ref.wav`), abartısı = performans. `CHATTERBOX_PYTHON` ayarlıysa Node servisi kendisi başlatır |
| **azure** | Azure Speech F0 (500K kar/ay) — key gerekli |
| **edge** | `msedge-tts`, ücretsiz, tr-TR Emel/Ahmet Neural |
| **gemini** | Bedava kota 10 istek/gün — özel anlar için parkta |
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
| `GEMINI_HISTORY` | — | Geçmiş penceresi (default 20) |
| `CHATTERBOX_PYTHON` | — | Chatterbox venv python yolu → port 8777 servisi |
| `LOCAL_TTS_EXAGGERATION` | — | Default 1.2 (beat intensity override eder) |
| `AZURE_SPEECH_KEY` / `AZURE_SPEECH_REGION` | — | Ayarsızsa Azure katmanı atlanır |
| `PORT` | — | Default 3000 |

## Komutlar

```bash
npm run dev        # Express + Vite (hot reload)
npm run build      # dist/client/
npm start          # prod sunucu
npm test           # vitest (director/dramatize/kalibrasyon)
npm run typecheck  # tsc --noEmit
```
