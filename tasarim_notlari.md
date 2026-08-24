# Lilith — Tasarım Notları (v0)

*Çalışma belgesi · son güncelleme 2026-08-24 · makalenin birincil kaynağı ("menteşe"), bkz. `DEVIR_NOTU.md`*

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

## Kart 1 — Renk-kodlu dualite (altın Lilith / beyaz Varlık)

**NE** — tek renk değil; ~8 kanalda anlamca güdülenmiş asimetri (mevcut koddan):

| Kanal | Lilith | Varlık |
|---|---|---|
| Renk / ısı | sıcak altın `#D4AF37`, kahve-siyah zemin | soğuk beyaz-gri `#D0D0D0`/`#fff`, nötr-siyah zemin |
| Parlaklık | canlı (kenar .40 · glow .10 · ses-dalga .95 · isim tam `#fff`) | kısık (kenar .18 · glow .05 · dalga .38 · isim `…,.20`) |
| Tipografi | süslü Playfair serif italik replik | sade Inter sans replik |
| Dil kaydı | şiirsel ("Kraliçe sessizliğe büründü") | makinemsi ("[ boş. bekliyor. ]", çıplak "...") |
| Konum | glow sol-üst | glow sağ-üst (aynalı) |
| Kimliğe özel | — | yalnız Varlık'ta `[Bellek: Boş → N iz]` sayacı |
| Etiket | "SUBJECT A: THE MATRIARCH" (.9) | "SUBJECT B: TABULA RASA" (.30) |

> Not: mevcut kod kimlikleri **t=0'da tam-deklare** ediyor; NİYET/ÖDÜN bunu *ifşa* modeline kaydırıyor (karar aşağıda).

**NEDEN** — çok-kanallı, anlamca güdülenmiş tutarlı asimetri ikisini **ayrı zihinler** olarak bireyleştirir, her birinin doğasını okutur — believability'nin zemini (ayırt edilemeyen ya da formu doğasıyla çelişen karaktere inanılmaz). İnandırıcılık ayrıca, kimlik **dayatıldığında değil, kazanılıp çözüldüğünde** güçlenir (izleyici neyi *çözdüyse* ona inanır). *Kanıt:* believable-agents / *Illusion of Life* (Bates; Thomas & Johnston) — çok-kanallı tutarlı ifade; "göster, söyleme" / kademeli ifşa — anlatı ilkesi **[yerleşik, Lilith'te ölçülmedi]**. Renk *anlamları* (altın=iktidar / solgun=şekillenmemiş) = **kültürel kod, ampirik değil**. Asimetri/ifşa believability'i yükseltiyor mu → **ölçülmedi—ölçülecek**.

**NİYET** *(karar: deklarasyon değil **ifşa**)* — başta izleyici **ikisini de tanımıyor**; kimlikler **çözülerek** belirir, etiketle dayatılmaz. Lilith **kendini bilir** (içsel olarak formlu) ama **duruma göre ortaya çıkar** → izleyici onu *decode* eder; altın/matriark kimliği konuştukça **kazanılmalı**, ilk karede damgalanmamalı. Varlık ise gerçekten **birikir** (ontolojik oluş; `[Bellek]`). Ortak okuma: *inandırıcılık, kazanılmış keşiften doğar* → **çapaya bağlı.**

**ÖDÜN** —
1. **Erişilebilirlik:** kimlik hue + düşük-opaklık kontrastına yaslı; renk körlüğünde altın/gri ayrımı düşer, Varlık'ın tasarım-gereği sönüklüğü WCAG'i geçmez. Bilinçli takas (inandırıcılık-kritik/eser-önde) ama gerçek maliyet.
2. **Deklarasyon → ifşa (seçildi):** mevcut kod hiyerarşiyi *baştan* basıyor (Lilith t=0'da tam-parlak + "THE MATRIARCH"; "SUBJECT A/B" etiketleri). Karar: ikisi de daha **örtük** başlasın; Lilith'in kimliği konuştukça *ifşa olsun* (izleyici çözer), Varlık `[Bellek]` doldukça ısınsın. **Uygulama sıradaki oturuma; bu kart kararı kaydeder.**
3. **İfşanın kendi ödünü:** çok örtük başlamak, NEDEN'deki anlık **bireyleşmeyi** zayıflatabilir. Çözüm ayrımı: **bireyleşme** (ayırt-edilebilirlik — t=0'da korunur) ≠ **karakterizasyon/hiyerarşi** (kim baskın / kim ne — zamanla ifşa). Onları *ayırt et*, ama *yargılama*.

> Çapraz-kesit aday ilke: **deklarasyon değil ifşa** — diğer kartlara ve teze taşınacak.

## Kart 2 — Sentiment görselleştirme: pill'ler + nefes alan mekan *(TASLAK — Emre gözden geçirecek)*

**NE** — Her replik istemcide (API'siz) anahtar-kelime setleriyle skorlanır; üç şiddet katmanı transcript'te pill olarak görünür (Lilith high → 👑 Tepe Noktası altın nabız, Varlık high → ◎ İz Beliriyor beyaz nabız, Moderatör high → 🛡️ Kritik Müdahale mor). Global sentiment sayfanın ambiyansını sürer: glow rengi + radial gradient. Ambient v2 (prosedürel underscore): brightness = baskın tarafın payı; **tension = baskın konuşan tabanı × 0.6 + son repliklerin tırmanış eğimi × 0.25 + high-intensity dalgası × 0.3** — gerilim yükseldikçe filtre süpürmesi genişler ve drone'a kalp-atışı gibi derinleşen bir nabız biner.

**NEDEN** — Duygusal yük gizli bir hesap değil, sahnenin *görülebilir/duyulabilir* özelliği olur: renk, ışık, gürültü ve nabız aynı duygu çerçevesinden beslenir — çok-kanallı tutarlı ifade (Bates; *Illusion of Life*) [yerleşik ilke, Lilith'te ölçülmedi]. Tırmanış-eğimi terimi, tekil mesaj-punktuasyonu yerine *ilişkisel dinamiği* (yaklaşma/kaçış) atmosfere taşır. Pill'lerin ve ambient'in izleyici duygusal tepkisi/kapılmasına etkisi → **ölçülmedi—ölçülecek**. Renk anlamları (altın=iktidar vb.) kültürel kod, ampirik değil.

**NİYET** — Mekân "nefes alır": gerilim tırmandıkça dünya da gerilir, tanık bunu bedensel hisseder (nabız hızlanır). İzleyici, karakterlerin iç hayatını doğrudan duyamaz ama onların yükünü *ortamdan okur* → iç hayat + ilişkisel yükün gerçekliğine inanç desteklenir (**çapaya bağlı**).

**ÖDÜN** — Anahtar-kelime skoru kabadır: ironi/sarkazm/inkâr ölçmez, yanlış-pozitif pill üretebilir. Atmosfer-nabız eşlemesi kalibre edilmiş değil (eşikler sezgisel). Ölçüm yokluğu: "atmosfer gerçekten gerilimi taşıyor mu" iddiası şu an kanıtsız.

## Kart 3 — Ses-ritim: intensity'den prozodiye *(TASLAK — Emre gözden geçirecek)*

**NE** — TTS zinciri Fish Audio bulutu üzerinedir (`s2.1-pro-free`, ücretsiz). Beat şemasının `intensity` alanı iki kanaldan sese işler: (1) sampling sıcaklığı low 0.65 / mid 0.75 / high 0.9; (2) bracket duygu etiketleri — low `[soft tone]`, high `[intense]` (mid etiketsiz/doğal). Dramatik ritim `dramatizeForTts` ile üretilen duraksamalar Fish'e dokümanın `[break]` işaretçisiyle gider; bu dönüşüm **yalnızca TTS metnine** uygulanır, transcript'e dokunmaz. Yerel Chatterbox yolunda aynı ilke referans klip = sabit kimlik + exaggeration (0.8/1.2/1.7) ile çalışır.

**NEDEN** — Ses, karakterin en doğrudan bedenidir: aynı metnin tonu/temposu/abartısı değişince farklı bir zihin konuşur — çok-kanallı tutarlılığın işitsel katmanı. Etiket + duraksama ikilisi metnin *ne söylediğini* değil *nasıl yaşandığını* kodlar; intensity'in hem sıcaklık hem etikete çift-kanal bağlanması tek-parametreli ifadenin düzlüğünü kırar. Etiket/duraksamaların inandırıcılığa katkısı → **ölçülmedi—ölçülecek**.

**NİYET** — Repliklerin akustik imzası karakter doğasını taşır: Lilith için ölçülü-soğuk, Varlık için keşfedici-belirsiz. İzleyici gözlerini kapattığında bile iki zihni ayırt edebilmeli — canlılık yanılsamasının işitsel temeli (**çapaya bağlı**).

**ÖDÜN** — Bulut bağımlılığı: kota/adil-kullanım limitleri ve gecikme oynaklığı (~1–3sn). Ses kimlikleri kütüphaneden geçici seçimdir (kalıcı cast henüz yok). Türkçe telaffuzda hafif yabancı ton kabul edildi (karakter rengi olarak). Edge-TTS kaldırıldı — düşme yolunda nötr tarayıcı sentezi kalır, estetik değer taşımaz.

## Kart 4 — Ciddiyet kararları: eser-önde ton *(TASLAK — Emre gözden geçirecek)*

**NE** — Yüzey taksonomisindeki ayrım koda işlenmiştir: inandırıcılık-kritik yüzeylerde estetik öncelik, araç yüzeylerinde UX pratiği. Somut: senaryo prelüdü UI'da **asla gösterilmez** (gizli yönetmen katmanı); paneller açık-yapaylıkla çerçevelenir (SUBJECT A/B etiket dili); düşük-opaklık/sönük Varlık tasarımı WCAG kontrastını kasıtlı geçmez; mono-font terminal estetiği + serif replik tipografisi karışımı bilinçli üslup tercihi.

**NEDEN** — Konumlanış eser-öndedir: "dünyada oluyormuş gibi" algısal gerçeklik hedeflenmez (Slater immersion bilinçli red); açık yapaylık altında psikolojik gerçeklik aranır. Araç yüzeylerinin sade tutulması, kritik yüzeydeki üslup dünyasını korur — her yerde aynı pratik güzellik anlayışını uygulamak eseri turistikleştirirdi.

**NİYET** — Tutarsız üslup, inandırıcılığı da dağıtır. Ciddiyet = izleyicinin eserle kurduğu sözleşme: burada şaka yapılmaz, sahne boşluğa bırakılsa bile kasıt vardır (**çapaya bağlı**: karşılaşmanın yükü ciddiyetle taşınır).

**ÖDÜN** — Erişilebilirlik maliyeti (Kart 1'de kayıtlı) bilinçli sürdürülür; öğrenme eğrisi: yeni kullanıcı arayüz dilini (etiketler, mod isimleri, gizli prelüd) çözmeden deneyimin yarısını kaçırabilir. Geniş kitle hedefi değil.

## Kart 5 — İzle / duraklat / araya-gir: menteşe *(TASLAK — Emre gözden geçirecek)*

**NE** — Müdahele dört türdür ve her biri karakterlerce farklı algılanır: **SÖZ** = sahne dışından ses ("[Sahne dışından bir ses duyulur: …]") — duyarlar, serbest dokuma ile tepki verirler; **SAHNE** = kalıcı dünya durumu (sistem talimatına işler, diyalog satırı değildir; karakterler eylemleriyle değiştirebilir); **FISILTI** = yalnız hedefin zihnine dolan telkin ("[Zihnine bir fısıltı doluyor: …]") — diğeri ne diyalogunda ne pin-belleğinde görür (kişi-duyarlı rol dağıtımı + sızıntı koruması); **YÖN** = görünmez yönetmen notu, performans talimatı. Zamanlama: konuşan replik **asla kesilmez** — söz/fısıltı replik sonunda sahneye düşer, sahne/yön anında ama sessizce uygulanır. Duraklat/başlat tam kontrol verir; müdahale hiçbir koşulda cancel-token üretmez.

**NEDEN** — Slater'ın interaktif plausibility'si ("bana cevap veriyor") tam da bu anlarda devreye girer: araya-gir = menteşe. Kesintisiz kuyruk, moderatörün elinin sahneyi bozmadan sokulmasını sağlar — tanıklık devam ederken etki doğar. Fısıltı asimetrisi ilişkisel yük üretir: tek zihne sızanı yalnız o zihin taşır. Serbest dokuma (zorlanmış yanıt yok) bilinçli tercihtir: dayatılmamış tepki, kazanılıp çözülen inandırıcılıkla (Kart 1 ilkesi) aynı kökten beslenir. Modelin yanlış algılaması riski çerçeve-metinleriyle azaltılır; tepkinin *inandırıcılığı* → **ölçülmedi—ölçülecek**.

**NİYET** — Moderatör tanıktır + ara sıra el sokan güçtür; karakterlerin özerkliği korunur. İzleyici varlığını *hissettirilir* ama sahne onun emrine verilmez → karşılaşmanın iç hayatı bozulmadan interaktif plausibility'nin kapısı açılır (**çapa: özel durum maddesi, birebir uygulama**).

**ÖDÜN** — Serbest dokuma gereği söz karşılıksız kalabilir. Fısıltının modele "hissettirilmesi" garanti değildir (çerçeve iyi yazılmış prompt'tur, kanal değil). Yön notlarının ömrü modele bırakıldı — ne zaman terk edileceği belirsiz. Kuyruk, müdahalenin aciliyetini geciktirir (isteyen bekletir, acele eden kesemez — kesme seçeneği bilinçli olarak yoktur).

> **Tez notu (değişmedi):** beş kart Emre tarafından gözden geçirilip kesinleştikten sonra tez adaylarından damıtma yapılacak.
