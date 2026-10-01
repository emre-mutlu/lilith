# Rapor Doğrulaması + İyileştirme Turu — 2026-10-01

> **Kaynak:** `cline/f61e1` dalındaki iki rapor (`INCELEME_RAPORU.md`, `PRUNE_RAPORU.md`, commit `12ebf9c`).
> Dal için PR açılmamış. Bu belge raporları **olduğu gibi kabul etmez**: her iddia kodla, testle
> ya da canlı ölçümle kontrol edildi. Doğru çıkanlar için uygulanan değişiklikler §3'te.

## 1. Hüküm özeti

| # | İddia | Hüküm | Not |
|---|---|---|---|
| 4.1 | Fish düşünce local denenmiyor | ✅ **Doğru** — ama önerilen düzeltme **yanlış** | Bkz. §2.1 |
| 4.1b | `'Fish TTS düştü — local fallback'` logu yanıltıcı | ✅ Doğru | |
| 4.2 | 503 yeniden denenmiyor, 429'da 35 sn | ✅ Doğru | DEVIR_NOTU 09-24 önerisi koda girmemişti |
| 4.3 | Çift `withRetry`: 429'da 9 deneme, ~280 sn | ✅ Doğru (INCELEME'nin hesabı doğru) | PRUNE'daki "6×35 + istek ≈ 280" hesabı yanlış: 8 bekleme × 35 sn = 280 sn saf bekleme |
| 4.4 | Sentiment'te kelime-içi sızıntı | ⚠️ **Hata gerçek, gerekçesi ve önerisi kısmen yanlış** | Bkz. §2.2 |
| 4.5 | Pollinations 402 → sahne kartı bozuk | 🔶 Burada ölçülemedi (sandbox proxy'si engelliyor) | Dış kaynaklar anonim ucun ücretli/anahtarlı düzene geçtiğini doğruluyor |
| 4.6a | `sentiment.ts` testsiz | ✅ Doğru | |
| 4.6b | `ErrorBoundary` yok | ✅ Doğru | |
| 4.6c | `fishTts.ts` fetch'inde `signal` yok | ❌ **Yanlış** | `server/fishTts.ts:39` → `AbortSignal.timeout(30_000)` |
| 4.7a | CLAUDE.md "Vite 5" diyor | ✅ Doğru | Express/TS sürümleri de eksikti |
| 4.7b | README'de `LOCAL_TTS_DRAMATIZE/SPEAKERS` yok | ✅ Doğru | |
| 4.7c | "CLAUDE.md 0 vulnerability diyor" + `qs` açığı | ⚠️ Açık doğru (1 moderate), **yer yanlış** | "0 vulnerability" cümlesi DEVIR_NOTU:28'de |
| §3 | 45/45 test, typecheck temiz, 195.31 / 61.56 kB | ✅ Birebir aynı ölçüldü | |
| §5 | 24 eğilim, eksen sayıları (5/10/12/4/6/4) | ✅ Doğru | |
| §2 | `App.tsx`'te 23 `useState` | ✅ Doğru | |
| §7 | `OTURUM_RAPORU_2026-10-01.md` "bu depoda" | ❌ Yok | Dalda yalnız iki rapor var |
| P1 | `project/` ölü kod: 1628 satır, import yok, tek commit | ✅ Doğru | Silme kararı sende (tasarım handoff'u) |
| P2 | `GenerateResponse` hiç kullanılmıyor | ✅ Doğru | Silmek yerine **kullanıldı** (App.tsx'teki iki el yazımı kopya yerine) |
| P4 | `azure` dropdown'da yok, `ENGINE_LABELS`'ta var | ✅ Doğru | `ENGINE_LABELS: Record<VoiceEngine,…>` olduğu için `azure` tipten çıkmadan silinemez |
| P5 | Gemini TTS seçilebilir ama kotası ~10/gün | ✅ Doğru | Ürün kararı |
| P-mikro | "19 export hiçbir yerde kullanılmıyor" | ❌ **Yanlış ve kendi içinde çelişkili** | Listede 17 sembol var; 10'u testlerden import ediliyor. Gerçekten dışarıda kullanılmayan 7. Sonuç ("dokunma") yine de doğru |
| P-git | `ajan-503-fix-backup`, 2 stash, `origin/...gnnqq` | 🔶 Yalnız senin yerel klonunda | `54abd1c` uzakta yok — burada incelenemedi |
| §6 | Piper/Kokoro/Groq/Cerebras araştırması | 🔶 Doğrulanmadı | Kod kararını etkilemiyor; Kokoro'da Türkçe olmadığı doğru |

## 2. Raporların yanıldığı yerler (önemli olanlar)

### 2.1 TTS merdiveni — "tek satırlık koşul düzeltmesi" Chatterbox kararını bozardı

Bulgu doğru: `fish` eklendiğinden beri (`85d96ea`, 08-24) `fish → local` dalı kodda **hiç olmadı**;
commit mesajı, README ve CLAUDE.md bunu vaat ediyordu. Ama raporun önerisi (`'fish'`'i koşula eklemek)
`generateLocalTts`'i varsayılan haliyle çağırır → **Chatterbox spawn edilir** ve model yüklenene kadar
60 sn'ye varan bekleme olur. Bu, 08-25 kararını ("Chatterbox açılışta ısınmaz — yalnız kullanıcı yerel
motoru seçince başlar") çiğner. Doğru okuma commit mesajındaki parantezde: **"local (bağlıysa)"**.

### 2.2 Sentiment — hata gerçek; ama `\b` önerisi Türkçe'de çalışmaz, etki alanı abartılmış

- **Gerçek sızıntılar** (eski kodla ölçüldü): `tek`⊂teknik, `sen`⊂senaryo, `ne`⊂söylenecek/nefesim;
  rapor dışında daha kötüleri: `ama`⊂anlamak/olamaz/tamam, `büyü`⊂büyük, `dur`⊂durum, `yapma`⊂yapmak.
  `neden` iki kez sayılıyordu (`ne` + `neden`).
- **Raporun 7 örneğinden 3'ü sızıntı değil:** `gölge`→gölgelenmiş ve `derin`→derinlemesine Türkçe kök
  eşleşmesidir (istenen davranış); "anlıyorum ama inanmıyorum" iki **tam kelime** eşleşmesidir — `high`
  çıkması tasarım gereği.
- **`\b` önerisi Türkçe'de bozuk:** JS `\b` ASCII'dir. Ölçüldü: `/\bne\b/` "güne"de eşleşir (hâlâ
  sızar), `/\bsen\b/` "seni"de, `/\bdeğil\b/` "değilim"de eşleşmez (doğru eşleşmeleri kaybeder).
- **"Bu tier TTS abartısını sürüyor" yanlış:** `intensityToExaggeration` modelin beat
  `intensity`'sini alır (`server/index.ts`), istemci sentiment'ini değil. Sentiment tier'ı HUD,
  paneller, transcript rozetleri, ambient parlaklık/eğim ve **yalnız tarayıcı-TTS** prosodisini sürer.

## 3. Uygulanan iyileştirmeler (spec)

| Alan | Davranış | Kabul ölçütü |
|---|---|---|
| **TTS merdiveni** (`server/ttsLadder.ts`, yeni) | `fish`/`gemini` düşerse local **yalnız zaten ayaktaysa** (`spawn:false`, sağlık kontrolü, başlatma yok); `local` seçiliyse gerekirse başlatır; bilinmeyen motor hiçbir katmanı çağırmaz. Log'lar gerçeği söyler | `ttsLadder.test.ts` — 7 test |
| **Yeniden deneme** (`server/dialogue.ts`) | Tek katman: 429 → 35 sn × 2 (değişmedi); 503/`UNAVAILABLE`/"high demand" → 2 sn, 5 sn; diğer hatalar anında. Route'lardaki dış sarma kaldırıldı → 429 en kötü 70 sn (eskisi ~280 sn) | `retry.test.ts` — gerçek SDK `ApiError` biçimiyle; canlı duman testi: 400 hatası 0.25 sn'de düştü |
| **Yedek model** | `GEMINI_FALLBACK_MODELS` (virgüllü), **varsayılan boş = kapalı**. Yalnız 503'te, birincil kısa denemelerden sonra da düşerse; 429'da geçmez. Replik başına `model` → `sessions/*.jsonl` | `retry.test.ts` |
| **Sentiment** (`src/lib/sentiment.ts`) | Unicode kelime sınırı (lookbehind, `\p{L}`) + kök/ek kalıpları; regex'ler modül yüklenirken bir kez derlenir | `sentiment.test.ts` — 10 test; sızıntı testleri (ve `neden` çift sayımına bağlı yüzde testi) eski kodda **kırmızı**, doğru-eşleşme testleri iki sürümde de yeşil |
| **Sahne kartı** | Görsel yüklenemezse sonsuz "SAHNE…" yerine "SAHNE YOK"; ↻ sıfırlar | typecheck/build |
| **ErrorBoundary** | Render hatasında boş ekran yerine "SAHNE ÇÖKTÜ" + yeniden yükle; konuşma sentezi susturulur | typecheck/build |
| **Tip** | `App.tsx` `GenerateResponse`'u kullanıyor (iki el yazımı kopya kalktı) | typecheck |
| **Env varsayılanları** *(raporlarda yoktu)* | `cp .env.example .env` sonrası boş satırlar (`GEMINI_MODEL=`) `--env-file` ile `''` olur; `??` yakalamaz → model adı boş, `GEMINI_HISTORY` NaN (pencere sınırsız), `PORT` NaN. Varsayılanlar `||` ile okunuyor | Node ile ölçüldü |
| **Bağımlılık** | `qs` 6.15.3 → 6.16.0 (yalnız bu giriş; buradaki eski npm'in `libc` silme gürültüsü atıldı) | `npm audit` → 0 |
| **Doküman** | CLAUDE.md (Vite 8 / Express 5 / TS 7, merdiven, sentiment kuralı, test sayısı), README env tablosu, `.env.example` | |

Sonuç: **75/75 test** (45 → 75), typecheck temiz, build 196.69 kB / 62.00 kB gzip.

## 4. Senin kararına bırakılanlar (uygulanmadı)

1. **Yedek model zinciri** açılsın mı? Altyapı hazır, `.env`'e `GEMINI_FALLBACK_MODELS=gemini-3.6-flash,gemini-2.5-flash`
   yazmak yeterli. Üslup kayması ölçülmedi; jsonl'deki `model` alanı bunu ölçmek için eklendi.
2. **`project/` klasörü** (Claude Design handoff prototipi, 1628 satır) — sil / arşivle / bırak.
3. **Azure kodu** (`azureTts.ts` + `VoiceEngine`'deki `azure`) ve **Gemini TTS dropdown seçeneği**.
4. **Sahne kartı sağlayıcısı:** Pollinations'ın yeni anahtarlı düzeni (publishable key) / başka sağlayıcı / kartı kaldırmak.
5. Yerel klonundaki **`ajan-503-fix-backup` + 2 stash**: bu turdan bağımsız yazıldı; içinde farklı bir fikir varsa karşılaştırılabilir.
6. **Sentiment eşikleri** (≥2 high, ≥1 mid) şişmiş skorlarla oluşmuştu; skorlar artık daha temiz → `high` daha seyrek
   görünecek. Gerekirse eşik yeniden ayarı. Bilinen geri-çağırma boşlukları (eskiden de vardı): ünsüz yumuşaması
   (`gerçeği`, `sessizliğin`), ünlü düşmesi (`zihnin`), `sana`.
