# Lilith — Devir Notu

*Son güncelleme: 2026-06-01*

## Durum
Aktif. Model migration tamam. **Tasarım çapası (North Star) kilitlendi: inandırıcılık / believability** (Bates) — somutu `tasarim_notlari.md` v0'da. Bu "menteşe" dosyası makaleyi ve ürünü birlikte besliyor.

## Kaldığın yer
- **Migration TAMAM:** Metin modeli kota-tükenmiş `gemini-2.0-flash`'tan (gerçek 429) **`gemini-3.1-flash-lite`'a** geçti — yeni **`GEMINI_MODEL`** env (varsayılan bu; `.env`'de değiştirip restart ile A/B). Doğrulandı: 18/18 temiz çağrı (~13 rpm), uçtan uca smoke test yeşil (metin + Edge TTS `audio/mpeg`), `typecheck` temiz. Commit `4b0f47c`. `CLAUDE.md` + `.env.example` koda göre güncellendi.
- Bu oturum **kod inşası yapmadı**; yön/strateji tartışıldı. Kararlar aşağıda. Sıradaki oturumun ilk işi belirlendi: **v0 `tasarim_notlari.md`**.
- **(2026-06-01 · oturum #2) `tasarim_notlari.md` v0 YAZILDI** — Çapa bölümü + yüzey taksonomisi + gerekçe-kartı şablonu (NE/NEDEN/NİYET/ÖDÜN) + 3 tez adayı. **Çapa kilitlendi: inandırıcılık** (believability — Bates *believable agents*; *inandırıcı ≠ gerçekçi*). **Ne değil:** Slater immersion (aşırı yüklü/sistem özelliği), algısal experienced-realism, sosyal presence. **Özel durum:** interaktif plausibility (Slater Psi) sadece *araya-gir*'de → "araya-gir = menteşe" güçlendi. Engagement (Jennett) opsiyonel/düşük. **Ölçüm yönü:** karakter-inandırıcılığı + duygusal tepki (bespoke), IPQ mekânsal/realism *değil* (önceki sosyal-presence/Networked-Minds notu geçersiz). Terminoloji: omurga "immersion-kritik" → **"inandırıcılık-kritik"**.

## Bu oturumda alınan kararlar
- **Konumlanış:** *yüzeye göre* — immersion-kritik yüzeylerde eser/sanat önde; kontrol/araç yüzeylerinde UX best-practice.
- **Kanıt rejimi:** *pratik-önce* (research-through-design), **ampirik** (presence/immersion kullanıcı çalışması) sonra eklenecek **ayrı katman**. Hazır doğrulanmış araçlar var (IPQ / Witmer-Singer / Jennett IEQ). "Killer" tasarım: **modeli sabit tut, tasarımı değiştir → presence tasarımı takip eder (modeli değil)** = tezin ampirik bel kemiği. Örneklem ~8–12 nitel / ~20–25 nicel. **AÇIK:** üniversite/kurum bağı + katılımcı erişimi (study aşamasında lazım); IRB lead-time'ını erken kontrol et.
- **İki katmanlı multimodal model** (maliyet endişesini çözen yapı):
  - **Canlı katman** (konuşma sırasında — ucuz, gerçek-zamanlı, presence): soyut/atmosferik görsel (diyalog geliştikçe *highlight*, per-tur hızlı olmak zorunda değil) + **sentiment-ağırlıklı ambient underscore** (Web Audio, ≈bedava, sıfır gecikme).
  - **Eser katmanı** (oturum sonu / on-demand — **tek seferlik**, maliyet sınırlı): tüm transcript'ten **çizgi-roman**, tüm olaydan kullanıcıya özel **Lyria şarkısı**. Arada kısa sözlü Lyria anları opsiyonel ama **kalite-kapılı** ("komik kaçıyorsa" koyma).
- **Araçlar zaten Gemini key'inde** (yeni sağlayıcı yok): görsel = `gemini-2.5-flash-image`, `gemini-3.1-flash-image`, `nano-banana-pro-preview`; müzik = `lyria-3-pro-preview`.
- **Yapısal keystone:** her tura **per-beat "an" meta verisi** (mood/scene/intensity + `imageUrl`/`audioAsset` slotları), **bir kez** hesapla → tek kaynak (ambient glow + görsel + müzik aynı sinyali okur, otomatik tutarlılık). **İlk canlı özellikte 1. ADIM olarak tetikle, önceden değil.** Mevcut prefetch pipeline (`App.tsx:383-388`) asenkron asset üretimine zaten uygun. Client-side sentiment'i (`sentiment.ts`) **modelden bağımsız tut** (tez izolasyonu için).
- **Backlog (ucuz, teze dokunur):** kullanıcı şu an "Moderatör" (dış ses) → **katılımcı**ya çevir; Lilith kullanıcıya *oradaymış gibi* hitap etsin → "Lilith *beni* görüyor" / presence.

## Sıradaki (öncelik sırası)
1. **`tasarim_notlari.md` — 5 kartı yaz** (v0 iskelet + çapa hazır): renk dualitesi · sentiment görselleştirme · ses-ritim · "ciddiyet" · izle/duraklat/araya-gir. Her kart **NE/NEDEN/NİYET/ÖDÜN**; NİYET satırı **inandırıcılık** çapasına bağlanır, NEDEN kanıtı adıyla anar ya da "ölçülmedi—ölçülecek". Kartlar bitince **tezi adaylardan damıt** (pratik-önce). Dosya makalenin "menteşe"si.
2. **Fizibilite sondası:** görsel + Lyria modelleri key'de gerçekten çalışıyor mu, gecikme/kota/maliyet ne — **node SDK ile** (`tsx --env-file=.env`; curl burst'leri sandbox proxy'sinde kesiliyor).
3. **İlk canlı özellik:** sentiment ambient underscore (keystone'u 1. adım olarak getirir).
4. **(Emre)** kulakla model A/B: `gemini-3.1-flash-lite` vs `gemini-2.5-flash` (`.env`'de `GEMINI_MODEL` + restart).
5. **TTS "Ahmet boğuk"** — hâlâ açık (önce SSML/format; yetmezse ElevenLabs/MiniMax).

## Notlar
- **Sandbox:** art arda `curl` burst'leri proxy tarafından boş-gövdeli 404 ile kesiliyor (gerçek API değil). Gemini testleri için **node SDK** yolu güvenilir.
- **Push:** migration commit `4b0f47c` bu devir notuyla birlikte push edildi.
- `gemini-2.0-flash` **emekli değil** (canlı listede var) — sorun kotaydı (429). Önceki "3 Mart'ta emekli" notu yanlıştı.
