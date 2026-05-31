# Lilith — Tasarım Notları (v0)

*Çalışma belgesi · son güncelleme 2026-06-01 · makalenin birincil kaynağı ("menteşe"), bkz. `DEVIR_NOTU.md`*

> **Deneyim tezi — adaylar (kartlardan sonra kesinleşecek).**
> Çapa kilitli (aşağı bkz.); tez, 5 kart yazıldıktan sonra onlardan damıtılacak (pratik-önce). Aday cümleler:
> 1. *Lilith'in tasarımı, iki zihin arasındaki karşılaşmayı — model kalitesiyle değil, estetik/çok-kipli tasarımla (renk dualitesi, sentiment-ambient, ses-ritim) — inandırıcı kılar: izleyen, açık yapaylığa rağmen iç hayatın ve yükün gerçek olduğuna inanır.*
> 2. *Lilith bir "gerçekçilik" değil bir inandırıcılık eseridir: amaç sahnenin dünyada oluyormuş gibi görünmesi değil, iki zihin arasındaki canlılık yanılsamasının — tasarımın taşıdığı — gerçek hissettirmesidir.*
> 3. *(empirik omurgaya en yakın)* *Lilith'te inandırıcılık modelden değil tasarımdan doğar: model sabitken tasarım, karşılaşmayı inandırıcı bir sahneye dönüştürür — tez budur, inandırıcılık tasarımı takip eder, modeli değil.*

## Çapa (North Star) — *kilitli*

- **Birincil: inandırıcılık / "canlılık yanılsaması"** (believability — Bates, *believable agents*; **inandırıcı ≠ gerçekçi**). İki zihnin karşılaşması, açık yapaylık altında *gerçek* gelir — bu **psikolojik** gerçeklik (iç hayat + ilişkisel yük), **algısal** değil.
- **Ne DEĞİL:**
  - Slater *immersion* (duyusal sarmalama) — mecra zaten düşük, hedef de değil.
  - Algısal *experienced realism* ("dünyada oluyormuş gibi") — eser üsluplu / eser-önde; bu yanlış **ve** kazanılamaz hedef.
  - *Sosyal presence* ("beni gören bir zihin") — kalp değil. (Önceki devir notundaki "Lilith beni görüyor" ifadesi fazla bu yöne kaymıştı; düzeltildi.)
- **Özel durum: interaktif plausibility** (Slater Psi, "bana cevap veriyor") — yalnız **araya-gir** anında devreye girer; tanıklık edilen inandırıcılık, müdahalede etkileşimliye yükselir. → "Araya-gir = menteşe" bununla güçlenir.
- **Destekleyici / opsiyonel: engagement / kapılma** (Jennett IEQ) — düşük kalabilir veya olmayabilir; duyusal-zayıf mecrada tutarlı (duyusal-immersion ipliği ikisini komşu yapar — Ermi & Mäyrä).
- **Ölçüm yönü:** karakter-inandırıcılığı + duygusal tepki (görece *bespoke*); IPQ'nun mekânsal / realism alt-ölçekleri **değil**. Ödün: daha az standart ölçüm, ama doğru şeyi ölçer.
- **Terminoloji:** "immersion" aşırı yüklü (Slater = sistem özelliği / Jennett = kapılma); ikisi de bu eserin kastı değil. Omurga etiketi bu yüzden **inandırıcılık-kritik** (eski "immersion-kritik" yanıltıcıydı).

## Nasıl okunur — gerekçe-kartı şablonu

Her tasarım kararı dört satırlık bir kart:

- **NE** — kararın kendisi (somut; koddan zemine oturur).
- **NEDEN** — iddia **+ kanıt bağı**. Kanıt ya adıyla anılır (karakter-inandırıcılığı / duygusal-tepki ölçümleri; ikincil: Jennett IEQ engagement) ya da açıkça **"ölçülmedi — ölçülecek"** etiketlenir. Bu dosya makalenin kaynağı; hiçbir iddia kanıtsız bırakılmaz.
- **NİYET** — kararın **çapaya** (inandırıcılık) ve deneyim tezine bağı (ne hissettirmeli).
- **ÖDÜN** — neyi feda ettik / hangi risk açık kaldı.

## Yüzey taksonomisi

Konumlanış **yüzeye göre** (DEVIR kararı): **inandırıcılık-kritik** yüzeylerde eser/sanat önde; **araç** yüzeylerinde UX best-practice. Her kart, ait olduğu yüzey sınıfının önceliğine göre yargılanır.

| Yüzey | Bileşen | Sınıf | Öncelik |
|-------|---------|-------|---------|
| Karakter panelleri (renk dualitesi) | `panels/LilithPanel` · `panels/VarlikPanel` | inandırıcılık-kritik | estetik tutarlılık |
| Ambient glow + sentiment görselleştirme | `Header` (HUD) · global glow | inandırıcılık-kritik | atmosfer / duygusal yük |
| Aktif-söz kartı | `CenterOverlay` (yalnız masaüstü) | inandırıcılık-kritik | odak |
| Ses-ritim / prozodi | TTS katmanı (Edge / browser) | inandırıcılık-kritik | canlılık yanılsaması |
| Başlat / duraklat / sıfırla · mute | `ControlBar` | araç | netlik / erişilebilirlik |
| Sim-parametreleri · ses motoru seçici · sliderlar | `footer/SimParameters` | araç | netlik |
| Transcript akışı (sentiment-pill'li) | `footer/TranscriptStream` | araç (melez) | okunabilirlik + atmosfer |
| **Araya-gir girişi** (müdahale) | `ControlBar` | **melez / menteşe** | araç olarak girer; interaktif plausibility burada doğar |

## Kartlar — sıradaki adımlar *(her biri birlikte yazılacak; NİYET satırı çapaya bağlanacak)*

1. Renk-kodlu dualite — altın Lilith (`#D4AF37`) / beyaz Varlık (`#D0D0D0`)
2. Sentiment görselleştirme — mesaj-pill'leri + global ambient glow
3. Ses-ritim — karaktere özel prozodi + Edge sesleri
4. "Ciddiyet" kararları — kalite-kapısı / "eser önde" tonu
5. İzle / duraklat / araya-gir etkileşimi — tanıklık + (araya-gir'de) interaktif plausibility

> **Tez**, 5 kart bittikten sonra geri dönülüp bu kartlardan netleştirilecek (yukarıdaki adaylardan biri / harmanı).
