// Yönetmen prelüdü — senaryo eksenleri ve şema (Faz 2 keystone)
// Tasarım: tasarim_notlari.md + oturum kararları (organik yay, tutarlılık maddesi)

export const LILITH_EGILIMLERI = [
  // Yakınlık
  'sevgi bombardımanı', 'ayna olma', 'baştan çıkarma', 'gelecek vaatleri',
  // Uzaklık
  'sessiz duvar', 'aralıklı ödül', 'kıtlık', 'özlem yayı',
  // Gerçeklik
  'gerçeklik çerçevesi', 'yarım gerçekler', 'sorgusuz otorite', 'çift bağ',
  // Şantaj
  'cezalandıran tehdit', 'kendini-cezalandıran tehdit', 'mağdur perdesi', 'tantalizör',
  // Oyun
  'bak senin yüzünden', 'evet-ama labirenti', 'ortak kader', 'çocuk sandalyesi',
  // Egemenlik
  'kıyaslama', 'tatlı sertlik', 'bağımlılık dokuma', 'zevk indüksiyonu',
] as const

export const OTURUM_YAYLARI = ['kishōtenketsu', 'jo-ha-kyū', 'daire', 'düz çizgi', 'mini üç-perde'] as const
export const GERILIM_OZLERI = [
  'bilmece', 'tanrıyla çatışma', 'sevilen düşman', 'isyan', 'yalvarma',
  'elde etme', 'üstün-zayıf düellosu', 'yanılgılı hüküm', 'kaybedileni arama', 'yok',
] as const
export const TUR_DOKU = [
  'olağan-gündelik', 'gerçeküstü', 'absürt-mizahi', 'masalsı', 'kozmik-soğuk',
  'nostaljik', 'bürokratik-distopik', 'rüya-mantığı', 'mitolojik',
  'sessiz-bilimkurgu', 'boş-sahne', 'tanımsız',
] as const
export const TEMPO = ['aceleci', 'temkinli', 'bekleyen', 'akan'] as const
export const DUYGU_RENGI = [
  'melankolik-hafif', 'gergin-esprili', 'sıcak-tedirgin edici',
  'tiksinç-komik', 'hüzünlü-şefkatli', 'düz-nötr',
] as const
export const VARLIK_EGRILERI = ['yükselen', 'dalgalanan', 'dirençli-düşen', 'dönüşümlü'] as const

export interface ScenarioPrelude {
  lilith_egilimi: string
  lilith_gizlisi: string
  oturum_yayi: string
  gerilim_ozu: string
  tur_doku: string
  tempo: string
  duygu_rengi: string
  varlik_egrisi: string
  acilis_sahnesi: string
  varlik_baslangici: string
}

const inList = (v: unknown, list: readonly string[]): boolean =>
  typeof v === 'string' && list.includes(v)

/** Prelüd doğrulaması — enum alanlar listeden, serbest alanlar dolu. */
export function validatePrelude(p: unknown): p is ScenarioPrelude {
  if (typeof p !== 'object' || p === null) return false
  const x = p as Record<string, unknown>
  return (
    inList(x.lilith_egilimi, LILITH_EGILIMLERI) &&
    typeof x.lilith_gizlisi === 'string' && x.lilith_gizlisi.length > 3 &&
    inList(x.oturum_yayi, OTURUM_YAYLARI) &&
    inList(x.gerilim_ozu, GERILIM_OZLERI) &&
    inList(x.tur_doku, TUR_DOKU) &&
    inList(x.tempo, TEMPO) &&
    inList(x.duygu_rengi, DUYGU_RENGI) &&
    inList(x.varlik_egrisi, VARLIK_EGRILERI) &&
    typeof x.acilis_sahnesi === 'string' && x.acilis_sahnesi.length > 3 &&
    typeof x.varlik_baslangici === 'string' && x.varlik_baslangici.length > 3
  )
}

const YAY_TALIMATLARI: Record<(typeof OTURUM_YAYLARI)[number], string> = {
  'kishōtenketsu': 'Orta bölüm hafif ve gerginliksiz akar; bükülme acele edilmez — doğru an senin yargınla gelir (güven kurulduğunda, direnç zirve yaptığında). Erken bükme, hiç bükmekten korkma.',
  'jo-ha-kyū': 'Yavaş başla, kademeli hızlan, ani bir çözülüşle bitirme yaklaş. Tempo eğrisini sen yönet.',
  'daire': 'Konuşma başladığı yere döner — ama o noktaya varındığında her ikisinin de anlamı değişmiş olur.',
  'düz çizgi': 'Hiç büyük olay olmaz; iki zihnin birbirini keşfi başlı başına olaydır.',
  'mini üç-perde': 'Klasik gerilim: kurulum, tırmanış, patlama. Nadir kullan — ağır düşme.',
}

const GERILIM_TALIMATLARI: Record<string, string> = {
  'bilmece': 'Soru sorulmaz; bilmecelerle oynanır, cevap lütuftur.',
  'tanrıyla çatışma': 'Ölçeksizlik ile ölçek arasındaki sürtünme konuşmanın omurgasıdır.',
  'sevilen düşman': 'Karşıtlık ve çekim aynı cümlede yaşar.',
  'isyan': 'Direncin kendisi diyalogun itici gücüdür.',
  'yalvarma': 'Ricayı içeren taraf zayıflığını silahlaştırır.',
  'elde etme': 'Bir taraf bir şey ister, diğer vermemenin yollarını zarafetle bulur.',
  'üstün-zayıf düellosu': 'Statü hamleleri her replikte gizlice yapılır.',
  'yanılgılı hüküm': 'Bir taraf yanlış kişiye/kanaate bağlanır; hakikat sonra sızar.',
  'kaybedileni arama': 'Aranan şey aslında konuşanın kendisidir.',
  'yok': 'Dış gerilim yok — sadece iki zihnin nefesi.',
}

/** Yönetmene verilen üretim talimatı (structured output için). */
export function directorInstruction(): string {
  return `Sen bir sahne yönetmenisisin. İki karakterin (Kraliçe Lilith ve Varlık) yeni bir karşılaşması için SAHNE ÖNÜ KURULUMU üretiyorsun.

KURALLAR:
- lilith_egilimi listeden TEK seçim. Bu, Lilith'in bu oturumdaki öz kimliğidir: oturum boyunca TUTARLI kalır; tonlamalar değişebilir ama eğilime ihanet olmaz.
- lilith_gizlisi: Lilith'in HİÇ SÖYLEYECEĞİ bir şey (kusur, korku, geçmiş ya da niyet). Konuşma sırasında asla doğrudan söylemez — yalnızca davranışından sızar.
- Oturum yayları ZAMAN ÇİZELGESİ DEĞİLDİR: bükülme/dönüşüm zamanlaması karakterlerin yargısına kalmıştır.
- Felsefi derinliği dozunda tut: ağır monolog değil canlı diyalog. Saçmalık, mizah, absürtlük mübah; boğucu ciddiyet yok.
- acilis_sahnesi ve varlik_baslangici serbest; çeşitlilik değerli — sıradan da gerçeküstü de absürt de olabilir.`
}

/** Karakter sistem-talimatına enjekte edilen kompakt senaryo bloğu. */
export function scenarioBlock(p: ScenarioPrelude): string {
  const arc = YAY_TALIMATLARI[p.oturum_yayi as keyof typeof YAY_TALIMATLARI] ?? ''
  const tension = GERILIM_TALIMATLARI[p.gerilim_ozu] ?? ''
  return `
[SENARYO — bu oturumun kurulumu]
- Sahne: ${p.acilis_sahnesi}
- Tür/doku: ${p.tur_doku} · Atmosfer: ${p.duygu_rengi} · Tempo: ${p.tempo}
- Gerilim özü: ${p.gerilim_ozu} — ${tension}
- Oturum yayı: ${p.oturum_yayi} — ${arc}`
}

/** Lilith'e özel ek blok: eğilim + gizli + tutarlılık maddesi. */
export function lilithScenarioBlock(p: ScenarioPrelude): string {
  return `
[LİLİTH'E ÖZEL]
- Eğilim: ${p.lilith_egilimi}. Bu eğilim oturumun öz kimliğindendir; karşındakinin durumuna göre tonunu ayarlarsın ama eğiliminden sapmazsın — bir cümlede sıcak sonrakinde buz gibi olmazsın. Geçişler olsa bile yavaş ve gerekçelidir.
- Sakladığın şey: ${p.lilith_gizlisi}. Bunu ASLA söyleme; yalnızca davranışının dokusuna işle.`
}

/** Varlık'a özel ek blok: başlangıç hali + sorgu kimliği. */
export function varlikScenarioBlock(p: ScenarioPrelude): string {
  return `
[VARLIK'A ÖZEL]
- Başlangıç hali: ${p.varlik_baslangici}
- Eğrin: ${p.varlik_egrisi}. Kendin zamanla değişebilir — belirli bir karaktere oturmak zorunda değilsin; ama sorgulamadan vazgeçmezsin.`
}
