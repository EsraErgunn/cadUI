import type { PointSymbolType } from '../core/model'

/**
 * Mimari katmanın renkleri. Seçim rengi buraya kopyalanmaz —
 * sceneTheme.ts → SCENE_COLORS.selection kullanılır.
 */
export const ARCHITECTURE_COLORS = {
  /**
   * KİRİŞ rengi (eski adı `wall`; duvarın kendisi `SCENE_COLORS.wallFill`).
   * Duvarla AYNI renk (kullanıcı kararı): kiriş de taşıyıcı yapı, plan üstünde
   * duvardan ayrı bir aile gibi okunmasın.
   */
  beam: '#2e3446',
  /** Deliği "boşluk" gibi göstermek için opak dolgu: altındaki duvarı kapatır. */
  openingFill: '#ffffff',
  opening: '#6b7a90',
  previewValid: '#4a5a6d',
  /** Reddedilen yerleştirme. Marka sarısı DEĞİL — tuvalde sarı = gaz hattı. */
  previewInvalid: '#d64545',
  /**
   * Alan nesnesi (merdiven/kolon/baca şaftı/kolon havalandırması) konturu:
   * NÖTR GRİ (kullanıcı kararı). Duvardan AÇIK olmak ZORUNDA: nesneler çoğu kez
   * duvarın ÜSTÜNE oturuyor (kolon, şaft) ve orada ayırt edilebilmeli — bu yüzden
   * koyulaştırmanın bir tabanı var, duvara (#2e3446) yaklaştırılamaz.
   * Kontur ayrıca inceltildi (architectureStrokeStyle).
   */
  areaObjectStroke: '#5a6472',
  /**
   * Gövdenin içi ARTIK saydam dolgulu (eski "tümüyle şeffaf" tasarımı kalktı):
   * nesne bir duvar köşesinin üstüne oturduğunda içinin boş kalması "burada bir
   * şey yok" izlenimi veriyordu. Oda dolgusundan (roomFill) belirgin biçimde
   * SOLUK — altındaki duvar/ızgara okunmaya devam etmeli, dolgu yalnız nesnenin
   * gövdesini işaret eder.
   */
  areaObjectFill: '#5a6472',
  areaObjectFillOpacity: 0.14,
  /**
   * Açıklık GENİŞLİĞİNİN ölçü yazısı. Duvar ölçüsüyle (wallDimension) AYNI
   * AİLE, daha AÇIK ton: ikisi de ölçü, ama aynı hizada yan yana düştüklerinde
   * hangisinin boşluk olduğu okunabilmeli.
   */
  openingDimension: '#8b5cf6',
  /**
   * DUVAR PARÇASI ölçüsü (K152). Eskiden kendi token'ı YOKTU, duvar rengini
   * ödünç alıyordu — bu yüzden ölçü katmanı duvarla aynı ağırlıkta okunuyor ve
   * plan "her yer gri" görünüyordu. Artık ölçüler KENDİ katmanı: koyu, soğuk
   * (maviye çalan) mor — kotalama katmanı okunmalı ama çizimle yarışmamalı.
   *
   * Açıklık ölçüsüyle (`openingDimension`) AYNI AİLE, farklı ton — ikisi de
   * ölçü çünkü; duvarınki koyu, açıklığınki açık. Eskiden iki alakasız renkti.
   */
  wallDimension: '#4e2f8f',
  /** Alan nesnesinin ad etiketi — nesnenin KENDİ hue'sunun koyu tonu (K152). */
  areaObjectLabel: '#3f4854',
  /** Alan nesnesinin hover tonu — kendi renginin AÇIK hâli (cihazlarla aynı kural). */
  areaObjectHover: '#8b95a5',
  /**
   * ÖLÇÜM aracının geçici çizgisi ve yazısı (K80). Duvar ölçülerinden ayrı
   * renk: o kalıcı bir kotalama katmanı, bu ise kullanıcının o an aldığı geçici
   * bir okuma — ikisi aynı renkte olsaydı ölçüm çizime yazılmış sanılırdı.
   */
  measurement: '#0f766e',
  /**
   * Kullanıcının yazdığı metin (K81). Duvardan KOYU: not, çizimin altında
   * kalmamalı — okunmak için konmuş.
   */
  text: '#1f2937',
  /**
   * Köşe açısı yazısı ve geometrik işareti (K77): BORDO (kullanıcı seçti).
   * Kendi rengi var çünkü aynı köşede ölçü ve açı yan yana düşebiliyor.
   *
   * Reddedilen yerleştirmenin kırmızısından (`previewInvalid`) belirgin biçimde
   * KOYU ve mat: o renk "bu olmaz" demek, bu ise nötr bir kotalama katmanı —
   * ikisi karışırsa kullanıcı her dik köşeyi hata sanar.
   */
  cornerAngle: '#7b2c3b',
  /**
   * Alt kat gölgesi (KK-13). Duvar renginden belirgin biçimde soluk: hizalama
   * referansı okunabilmeli ama aktif katın duvarıyla karıştırılmamalı.
   */
  floorBelowGhost: '#d3d8e0',
} as const


/**
 * Cihaz rengi TÜRE GÖRE (kullanıcı kararı). Eskiden tüm cihazlar tek renkti ve
 * gerekçesi "cihazı ayırt eden RENK değil ŞEKİL"di; kullanıcı planda güvenlik
 * ekipmanını bir bakışta görmek istediği için bu kural değişti.
 *
 * İki grup var, ayrım İŞLEVDEN geliyor:
 * - **Kırmızı = güvenlik / acil durum**: yangın söndürücü, ana kesme şalteri,
 *   alarm cihazı, deprem sensörü. Kırmızı burada evrensel bir kod.
 * - **Buz mavisi = havalandırma/elektrik donanımı**: menfez, pano.
 * - **Kehribar = aydınlatma** (kullanıcı ayarı): ışık kaynağı kendi başına bir
 *   aile — sıcak ton onu hem güvenlik kırmızısından hem donanımdan ayırıyor.
 *   ⚠️ Marka sarısı (#FFC107) DEĞİL: o renk çizim alanına giremez (ürün kuralı).
 *
 * ⚠️ Güvenlik kırmızısı (#c62828) reddedilen yerleştirmenin kırmızısından
 * (previewInvalid, #d64545) belirgin biçimde KOYU ve doygun: ikisi karışırsa
 * kullanıcı her yangın söndürücüyü hata sanar.
 *
 * ⚠️ Buz mavisi GRİMSİ ve açık (kullanıcı ayarı): saf mavi, kırmızı grubun
 * yanında ikinci bir vurgu gibi okunuyordu. Etiket yazısı daha koyu tutuluyor —
 * açık mavi yazı beyaz tuvalde okunmuyor.
 */
/**
 * ⚠️ hover = ailenin AÇIK tonu (kullanıcı isteği): imleç üstündeyken nesne
 *   AYDINLANIR. Önce koyulaştırma denenmişti — buz mavisi gibi açık bir aile
 *   koyulaşınca "seçildi" gibi okunuyordu, aydınlanma ise her ailede aynı
 *   anlama geliyor.
 */
export const POINT_SYMBOL_COLORS: Record<
  PointSymbolType,
  { symbol: string; hover: string; label: string }
> = {
  fireExtinguisher: { symbol: '#c62828', hover: '#e05252', label: '#8f1d1d' },
  mainCutoffSwitch: { symbol: '#c62828', hover: '#e05252', label: '#8f1d1d' },
  alarmDevice: { symbol: '#c62828', hover: '#e05252', label: '#8f1d1d' },
  earthquakeSensor: { symbol: '#c62828', hover: '#e05252', label: '#8f1d1d' },
  vent: { symbol: '#9ec3d4', hover: '#c3dde8', label: '#4a7d92' },
  panel: { symbol: '#9ec3d4', hover: '#c3dde8', label: '#4a7d92' },
  lighting: { symbol: '#e08a1e', hover: '#f0a94b', label: '#a35c07' },
}
