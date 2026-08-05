/** Kalıcı id: proje bazlı artan tamsayı. Bkz. knowledge/id-scheme.md. */
export type Id = number

export type Floor = {
  id: Id
  name: string
}

export const DEFAULT_FLOOR_NAME = 'Zemin Kat'

/** Proje açıldığında oluşan tek kat 1 numarayı alır, sayaç 2'den devam eder. */
export const DEFAULT_FLOOR_ID: Id = 1
export const FIRST_FREE_ID: Id = 2

/** Duvar köşeleri ortak bu havuzda durur; duvar kendi koordinatını taşımaz. */
export type Point = {
  id: Id
  floorId: Id
  x: number
  y: number
}

/** İki Point'i birbirine bağlar; koordinat tekrarlamaz, p1Id/p2Id ile referans verir. */
export type Wall = {
  id: Id
  floorId: Id
  p1Id: Id
  p2Id: Id
  thickness: number
  height: number
}

export type OpeningType = 'door' | 'window'

/**
 * Duvar BÖLÜNMEZ (K9): açıklık, tek parça duvarın üstünde wallId + offsetCm ile
 * duran bir "delik"tir. Duvar taşınınca kendiliğinden taşınır.
 * floorId yok — duvardan türetilir; iki yerde tutulursa zamanla ayrışır.
 * Yükseklik yok — 2B planda çizilmiyor, gerekince ayrı kararla eklenir.
 */
export type Opening = {
  id: Id
  wallId: Id
  /** Açıklığın ORTASI, duvarın p1 ucundan (K10). Kenarı DEĞİL. */
  offsetCm: number
  widthCm: number
  type: OpeningType
}

export const DEFAULT_ROOM_NAME = 'Oda'

/**
 * Duvarların çevrelediği kapalı alan. Geometri KOPYALAMAZ: sınırını oluşturan
 * duvarların id'lerini tutar, poligon her seferinde onlardan türetilir. Kopyalasaydı
 * duvar oynayınca oda yerinde donar ve hata ekranda görünmezdi.
 *
 * Kimlik `wallIds` kümesiyle korunur (K31): duvar ikiye bölününce küme bölme
 * anında güncellenir, oda aynı oda kalır ve kullanıcının verdiği ad yaşar.
 * İçinden duvar geçip oda ikiye ayrılırsa eski çevrim yok olur — iki YENİ oda
 * doğar, ikisi de varsayılan adı alır.
 *
 * floorId yok — duvardan türetilir; Opening ile aynı gerekçe (K9).
 */
export type Room = {
  id: Id
  wallIds: Id[]
  name: string
}

/**
 * Paletteki "nokta sembolü" ailesi (tutanak K-0, Desen A). Yedi araç aynı alan
 * kümesini paylaşır; aralarındaki tek fark çizilen şekildir.
 * Kolon/Kiriş/Merdiven (Desen B) ölçü taşıdığı, Baca Şaftı/Kolon Havalandırması
 * (Desen C) katlar arası eksen kimliği taşıdığı için buraya GİRMEZ.
 */
export type PointSymbolType =
  | 'mainCutoffSwitch'
  | 'panel'
  | 'lighting'
  | 'fireExtinguisher'
  | 'alarmDevice'
  | 'earthquakeSensor'
  | 'vent'

/**
 * Açıklığın aksine kendi koordinatını TAŞIR: duvara bağlı değil, boşluğa da
 * bırakılabilir (araç yerleşimin uygunluğunu denetlemez — tutanak K-6).
 *
 * `roomId` HENÜZ YOK: tutanak menfez için zorunlu tutuyor ama `Room` modelde
 * yok. Varsayarak açmak, mahal modeli geldiğinde geri alınacak alan üretir.
 */
export type PointSymbol = {
  id: Id
  floorId: Id
  type: PointSymbolType
  x: number
  y: number
  /** 0-359. Adım yakalaması core/transform.ts → snapAngleDeg ile. */
  rotationDeg: number
  /** Tip kısaltması + sıra ("P-01"); otomatik üretilir, düzenlenebilir. */
  label: string
  /**
   * Serbest açıklama. Opsiyonel DEĞİL, boş string: `JSON.stringify` undefined
   * alanı atlar ve iki projenin JSON şekli ayrışırdı — kabul testi alan sırasına
   * dayanıyor (serialize.ts).
   */
  note: string
}

/**
 * Dört kişi arasındaki sözleşme — izinsiz alan eklenmez.
 * Node/Pipe/Fitting/Equipment/Riser/ServiceBox henüz eklenmedi,
 * kendi issue'larında ekip onayıyla eklenecek.
 */
export type ProjectData = {
  nextUniqueId: Id
  activeFloorId: Id
  floors: Floor[]
  points: Point[]
  walls: Wall[]
  openings: Opening[]
  rooms: Room[]
  symbols: PointSymbol[]
}
