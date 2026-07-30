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

/**
 * Dört kişi arasındaki sözleşme — izinsiz alan eklenmez.
 * Room/Node/Pipe/Fitting/Equipment/Riser/ServiceBox henüz eklenmedi,
 * kendi issue'larında ekip onayıyla eklenecek.
 */
export type ProjectData = {
  nextUniqueId: Id
  activeFloorId: Id
  floors: Floor[]
  points: Point[]
  walls: Wall[]
  openings: Opening[]
}
