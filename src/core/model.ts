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

/**
 * Dört kişi arasındaki sözleşme — izinsiz alan eklenmez.
 * Ekran kabuğu issue'su yalnızca kat bağlamını ve id sayacını tanımlar;
 * Point/Wall/Opening/Room/Node/Pipe/Fitting/Equipment/Riser/ServiceBox
 * kendi issue'larında ekip onayıyla eklenecek.
 */
export type ProjectData = {
  nextUniqueId: Id
  activeFloorId: Id
  floors: Floor[]
}
