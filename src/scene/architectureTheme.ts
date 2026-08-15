/**
 * Mimari katmanın renkleri. Seçim rengi buraya kopyalanmaz —
 * sceneTheme.ts → SCENE_COLORS.selection kullanılır.
 */
export const ARCHITECTURE_COLORS = {
  wall: '#3e4a5a',
  /** Deliği "boşluk" gibi göstermek için opak dolgu: altındaki duvarı kapatır. */
  openingFill: '#ffffff',
  opening: '#5a6675',
  previewValid: '#4a5a6d',
  /** Reddedilen yerleştirme. Marka sarısı DEĞİL — tuvalde sarı = gaz hattı. */
  previewInvalid: '#d64545',
  /**
   * Sembol çizgisi — TÜM cihazlar için tek renk. Referans uygulamada cihazlar
   * nötr koyu konturla çiziliyor, tip başına renklendirilmiyor: ilk bakışta
   * görülen turkuaz/mor, yeni yerleştirilen ögenin vurgusuymuş. Cihazı ayırt
   * eden şey RENK değil ŞEKİL ve yanındaki metin.
   */
  pointSymbol: '#2f3a49',
  /**
   * Alan nesnesi (merdiven/kolon/baca şaftı) konturu. Duvar renginden bir tık
   * daha KOYU: plan üstünde "bu bir yapı elemanı, duvardan da katı" okunsun.
   */
  areaObjectStroke: '#4e5661',
  /**
   * Gövdenin içi ARTIK saydam dolgulu (eski "tümüyle şeffaf" tasarımı kalktı):
   * nesne bir duvar köşesinin üstüne oturduğunda içinin boş kalması "burada bir
   * şey yok" izlenimi veriyordu. Oda dolgusundan (roomFill) belirgin biçimde
   * SOLUK — altındaki duvar/ızgara okunmaya devam etmeli, dolgu yalnız nesnenin
   * gövdesini işaret eder.
   */
  areaObjectFill: '#4e5661',
  areaObjectFillOpacity: 0.12,
  /**
   * Açıklık GENİŞLİĞİNİN ölçü yazısı. Duvar parçalarının ölçüsü duvar renginde
   * yazılıyor; açıklığınki aynı hizada yan yana duruyor ve hangisinin boşluk
   * olduğu yalnız konumdan okunamıyor. Mor seçildi çünkü tuvalde boş kalan tek
   * anlamlı hue: sarı gaz hattının (K27), mavi seçimin, yeşil yakalama
   * işaretinin, kırmızı ise reddedilen yerleştirmenin rengi.
   */
  openingDimension: '#7a5ba6',
  /**
   * Alt kat gölgesi (KK-13). Duvar renginden belirgin biçimde soluk: hizalama
   * referansı okunabilmeli ama aktif katın duvarıyla karıştırılmamalı.
   */
  floorBelowGhost: '#d3d8e0',
} as const

